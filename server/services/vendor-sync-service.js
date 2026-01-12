const VendorConfig = require('../models/VendorConfig');
const IQCData = require('../models/IQCData');
const logger = require('../utils/logger');

/**
 * VendorSyncService
 * 
 * 供应商同步服务，负责从IQC数据中提取供应商信息并同步到配置中心
 * 
 * 主要功能:
 * 1. 从IQCData.rawData中提取供应商名称
 * 2. 去重处理
 * 3. 增量/全量同步到VendorConfig表
 */
class VendorSyncService {
    /**
     * 从IQC数据中提取供应商列表
     * @param {Array} rawData - IQC原始数据
     * @returns {Array} 供应商列表
     */
    extractSuppliers(rawData) {
        const supplierSet = new Map(); // 使用Map保持顺序并去重

        if (!Array.isArray(rawData)) {
            return [];
        }

        rawData.forEach((row, index) => {
            if (row && typeof row === 'object') {
                // 尝试从不同字段名提取供应商名称
                const supplierName = row.supplier_name || row['供应商名称'] || row.supplier || row['供应商'];

                if (supplierName && typeof supplierName === 'string') {
                    const trimmedName = supplierName.trim();
                    if (trimmedName && !supplierSet.has(trimmedName)) {
                        supplierSet.set(trimmedName, {
                            supplier_name: trimmedName,
                            source: 'IQC',
                            enable_document_mgmt: false,
                            enable_performance_mgmt: false,
                            status: 'Inactive',
                            firstSeenIndex: index
                        });
                    }
                }
            }
        });

        return Array.from(supplierSet.values());
    }

    /**
     * 去重供应商列表
     * @param {Array} suppliers - 供应商列表
     * @returns {Array} 去重后的供应商列表
     */
    deduplicateSuppliers(suppliers) {
        const seen = new Map();
        return suppliers.filter(supplier => {
            const key = supplier.supplier_name.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.set(key, true);
            return true;
        });
    }

    /**
     * 从IQC数据中获取供应商列表
     * @param {Number} iqcFileId - IQC文件ID（可选，为空则获取所有）
     * @returns {Array} 供应商列表
     */
    async getSuppliersFromIQC(iqcFileId = null) {
        try {
            let iqcDataRecords;

            if (iqcFileId) {
                // 获取指定IQC文件的数据
                iqcDataRecords = await IQCData.findByPk(iqcFileId);
                if (!iqcDataRecords) {
                    logger.warn(`IQC文件ID ${iqcFileId} 不存在`);
                    return [];
                }
                iqcDataRecords = [iqcDataRecords];
            } else {
                // 获取所有IQC文件的数据
                iqcDataRecords = await IQCData.findAll({
                    attributes: ['id', 'fileName', 'rawData']
                });
            }

            const allSuppliers = [];
            const fileNames = [];

            iqcDataRecords.forEach(record => {
                if (record && record.rawData) {
                    const suppliers = this.extractSuppliers(record.rawData);
                    allSuppliers.push(...suppliers);
                    fileNames.push(record.fileName);
                }
            });

            // 去重
            const uniqueSuppliers = this.deduplicateSuppliers(allSuppliers);

            logger.info(`从 ${fileNames.length} 个IQC文件中提取到 ${uniqueSuppliers.length} 个唯一供应商`);
            return uniqueSuppliers;

        } catch (error) {
            logger.error('从IQC数据获取供应商失败:', error);
            throw error;
        }
    }

    /**
     * 同步供应商到配置中心
     * @param {Array} suppliers - 供应商列表
     * @param {String} mode - 同步模式（full/incremental）
     * @returns {Object} 同步统计信息
     */
    async syncSuppliers(suppliers, mode = 'incremental') {
        let stats = { created: 0, updated: 0, skipped: 0 };

        for (const supplierData of suppliers) {
            try {
                const existing = await VendorConfig.findOne({
                    where: { supplier_name: supplierData.supplier_name }
                });

                if (existing) {
                    // 增量模式：跳过已存在的供应商
                    if (mode === 'incremental') {
                        stats.skipped++;
                        continue;
                    }
                    // 全量模式：更新供应商信息
                    await existing.update({
                        updated_at: new Date()
                    });
                    stats.updated++;
                } else {
                    // 创建新供应商
                    await VendorConfig.create({
                        supplier_name: supplierData.supplier_name,
                        source: supplierData.source || 'IQC',
                        enable_document_mgmt: supplierData.enable_document_mgmt || false,
                        enable_performance_mgmt: supplierData.enable_performance_mgmt || false,
                        status: supplierData.status || 'Inactive'
                    });
                    stats.created++;
                }
            } catch (error) {
                if (error.name === 'SequelizeUniqueConstraintError') {
                    logger.warn(`供应商 ${supplierData.supplier_name} 已存在，跳过`);
                    stats.skipped++;
                } else {
                    logger.error(`同步供应商 ${supplierData.supplier_name} 失败:`, error);
                    stats.skipped++;
                }
            }
        }

        return stats;
    }

    /**
     * 从IQC同步供应商到配置中心
     * @param {Object} options - 同步选项
     * @param {String} options.mode - 同步模式（full/incremental）
     * @param {Number} options.iqcFileId - IQC文件ID（可选）
     * @returns {Object} 同步结果
     */
    async syncFromIQC(options = {}) {
        const { mode = 'incremental', iqcFileId } = options;

        try {
            logger.info(`开始从IQC同步供应商，模式: ${mode}`);

            // 1. 获取IQC数据中的供应商
            const suppliers = await this.getSuppliersFromIQC(iqcFileId);

            if (suppliers.length === 0) {
                return {
                    success: true,
                    message: '没有找到供应商数据',
                    stats: { created: 0, updated: 0, skipped: 0 }
                };
            }

            // 2. 同步到配置中心
            const stats = await this.syncSuppliers(suppliers, mode);

            const message = `同步完成：新增 ${stats.created} 个，更新 ${stats.updated} 个，跳过 ${stats.skipped} 个`;

            logger.info(message);

            return {
                success: true,
                message,
                stats,
                total: suppliers.length
            };

        } catch (error) {
            logger.error('从IQC同步供应商失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = VendorSyncService;