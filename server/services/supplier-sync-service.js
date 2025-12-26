/**
 * 供应商数据同步服务
 *
 * 功能:
 * 1. 从IQC数据中提取供应商信息
 * 2. 创建/更新suppliers表记录
 * 3. 处理数据去重和合并
 * 4. 返回同步结果统计
 *
 * @author 浮浮酱
 * @version 1.0
 * @since 2025-12-26
 */

const IQCData = require('../models/IQCData');
const Supplier = require('../models/Supplier');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class SupplierSyncService {
    /**
     * 从IQC数据同步供应商信息
     * @param {Object} options - 同步选项
     * @param {string} options.mode - 同步模式（incremental增量/full全量）
     * @param {number} options.iqcFileId - 指定IQC数据ID（可选，默认使用最新）
     * @returns {Promise<Object>} 同步结果
     */
    async syncFromIQC(options = {}) {
        const { mode = 'incremental', iqcFileId } = options;

        try {
            logger.info('🔄 开始同步供应商数据...');
            logger.info(`同步模式: ${mode}, IQC数据ID: ${iqcFileId || '所有'}`);

            // 1. 获取IQC数据
            const iqcDataResult = await this.getIQCData(iqcFileId);

            // 2. 提取供应商列表
            let suppliers = [];
            let iqcFileNames = [];

            if (Array.isArray(iqcDataResult)) {
                // 多条IQC记录
                iqcDataResult.forEach(record => {
                    if (record && record.rawData && record.rawData.length > 0) {
                        const recordSuppliers = this.extractSuppliers(record.rawData);
                        suppliers = suppliers.concat(recordSuppliers);
                        iqcFileNames.push(record.fileName);
                    }
                });
                logger.info(`从 ${iqcDataResult.length} 个IQC文件中提取到 ${suppliers.length} 个供应商`);
            } else {
                // 单条IQC记录
                if (!iqcDataResult || !iqcDataResult.rawData || iqcDataResult.rawData.length === 0) {
                    throw new Error('IQC数据为空或格式不正确');
                }
                suppliers = this.extractSuppliers(iqcDataResult.rawData);
                iqcFileNames.push(iqcDataResult.fileName);
                logger.info(`提取到 ${suppliers.length} 个供应商`);
            }

            if (suppliers.length === 0) {
                return {
                    success: true,
                    message: '未找到供应商数据',
                    stats: { created: 0, updated: 0, skipped: 0 }
                };
            }

            // 3. 去重
            const uniqueSuppliers = this.deduplicateSuppliers(suppliers);
            logger.info(`去重后剩余 ${uniqueSuppliers.length} 个供应商`);

            // 4. 同步供应商数据
            const stats = await this.syncSuppliers(uniqueSuppliers, mode);

            logger.info(`✅ 同步完成：新增 ${stats.created} 个，更新 ${stats.updated} 个，跳过 ${stats.skipped} 个`);

            return {
                success: true,
                message: `同步完成：新增 ${stats.created} 个，更新 ${stats.updated} 个，跳过 ${stats.skipped} 个`,
                stats,
                iqcFileNames: iqcFileNames.join(', ')
            };
        } catch (error) {
            logger.error(`❌ 同步失败：${error.message}`);
            throw new Error(`同步失败：${error.message}`);
        }
    }

    /**
     * 获取IQC数据
     * @param {number} iqcFileId - 指定IQC数据ID（可选）
     * @returns {Promise<Object>} IQC数据记录（单条）或数组（多条）
     */
    async getIQCData(iqcFileId) {
        if (iqcFileId) {
            // 如果指定了ID，只获取单条记录
            const record = await IQCData.findOne({
                where: { id: iqcFileId }
            });

            if (!record) {
                throw new Error('未找到指定的IQC数据');
            }

            return record;
        } else {
            // 如果没有指定ID，获取所有IQC数据
            const records = await IQCData.findAll({
                order: [['uploadTime', 'DESC']]
            });

            if (!records || records.length === 0) {
                throw new Error('未找到IQC数据，请先上传IQC检验数据');
            }

            return records;
        }
    }

    /**
     * 从rawData中提取供应商列表（去重）
     * @param {Array} rawData - IQC原始数据
     * @returns {Array} 供应商列表
     */
    extractSuppliers(rawData) {
        const supplierSet = new Map(); // 使用Map保持顺序并去重

        rawData.forEach((row, index) => {
            if (row && row.supplier && typeof row.supplier === 'string') {
                const supplierName = row.supplier.trim();
                if (supplierName) {
                    // 只记录第一次出现的供应商
                    if (!supplierSet.has(supplierName)) {
                        supplierSet.set(supplierName, {
                            name: supplierName,
                            source: 'IQC',
                            firstSeenIndex: index
                        });
                    }
                }
            }
        });

        return Array.from(supplierSet.values());
    }

    /**
     * 供应商去重
     * @param {Array} suppliers - 供应商列表
     * @returns {Array} 去重后的供应商列表
     */
    deduplicateSuppliers(suppliers) {
        const supplierMap = new Map();

        suppliers.forEach(supplier => {
            if (!supplierMap.has(supplier.name)) {
                supplierMap.set(supplier.name, supplier);
            }
        });

        return Array.from(supplierMap.values());
    }

    /**
     * 同步供应商数据
     * @param {Array} suppliers - 供应商列表
     * @param {string} mode - 同步模式（incremental/full）
     * @returns {Promise<Object>} 统计信息
     */
    async syncSuppliers(suppliers, mode) {
        let stats = { created: 0, updated: 0, skipped: 0 };

        for (const supplierData of suppliers) {
            try {
                const existing = await Supplier.findOne({
                    where: { name: supplierData.name }
                });

                if (existing) {
                    // 增量模式：跳过已存在的供应商
                    if (mode === 'incremental') {
                        stats.skipped++;
                        logger.debug(`跳过已存在的供应商: ${supplierData.name}`);
                        continue;
                    }
                    // 全量模式：更新供应商信息
                    await existing.update({
                        updatedAt: new Date()
                    });
                    stats.updated++;
                    logger.debug(`更新供应商: ${supplierData.name}`);
                } else {
                    // 创建新供应商
                    await Supplier.create({
                        name: supplierData.name,
                        status: 'Active',
                        level: 'General'
                    });
                    stats.created++;
                    logger.debug(`创建新供应商: ${supplierData.name}`);
                }
            } catch (error) {
                // 单个供应商同步失败不影响整体
                logger.error(`同步供应商失败 [${supplierData.name}]: ${error.message}`);
                stats.skipped++;
            }
        }

        return stats;
    }

    /**
     * 获取供应商统计信息
     * @returns {Promise<Object>} 统计信息
     */
    async getSupplierStats() {
        try {
            const total = await Supplier.count();
            const active = await Supplier.count({ where: { status: 'Active' } });
            const inactive = await Supplier.count({ where: { status: 'Inactive' } });

            return {
                total,
                active,
                inactive
            };
        } catch (error) {
            logger.error(`获取供应商统计失败：${error.message}`);
            throw error;
        }
    }

    /**
     * 获取最新的IQC数据信息
     * @returns {Promise<Object|null>} IQC数据信息
     */
    async getLatestIQCInfo() {
        try {
            const record = await IQCData.findOne({
                attributes: ['id', 'fileName', 'uploadTime', 'recordCount', 'dataType'],
                order: [['uploadTime', 'DESC']]
            });

            if (!record) {
                return null;
            }

            return {
                id: record.id,
                fileName: record.fileName,
                uploadTime: record.uploadTime,
                recordCount: record.recordCount,
                dataType: record.dataType
            };
        } catch (error) {
            logger.error(`获取最新IQC信息失败：${error.message}`);
            throw error;
        }
    }
}

// 导出单例实例
module.exports = new SupplierSyncService();