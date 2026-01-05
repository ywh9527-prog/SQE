/**
 * 供应商同步服务
 * 负责将配置中心（vendor_config）的供应商同步到资料管理表（suppliers）
 *
 * 功能：
 * 1. 自动同步：配置中心修改后自动触发
 * 2. 手动同步：用户点击按钮触发
 */

const { sequelize } = require('../database/config');
const VendorConfig = require('../models/VendorConfig');
const Supplier = require('../models/Supplier');

class VendorToSupplierSyncService {
    /**
     * 同步供应商从 vendor_config 到 suppliers
     *
     * @returns {Promise<Object>} 同步结果
     */
    async syncToSuppliers() {
        try {
            // 1. 从 vendor_config 获取启用了资料管理的供应商
            const enabledVendors = await VendorConfig.findAll({
                where: {
                    enable_document_mgmt: 1,
                    status: 'Active'
                },
                order: [['supplier_name', 'ASC']]
            });

            // 2. 开始事务
            const transaction = await sequelize.transaction();

            try {
                // 3. 获取当前 suppliers 表中的所有供应商（不只是活跃的）
                const currentSuppliers = await Supplier.findAll({
                    transaction
                });

                // 4. 创建供应商名称映射（用于快速查找）
                const currentSupplierMap = new Map();
                currentSuppliers.forEach(s => {
                    currentSupplierMap.set(s.name, s);
                });

                // 5. 统计结果
                const stats = {
                    added: 0,
                    updated: 0,
                    reactivated: 0,
                    deactivated: 0,
                    total: enabledVendors.length
                };

                // 6. 同步启用的供应商
                for (const vendor of enabledVendors) {
                    const existingSupplier = currentSupplierMap.get(vendor.supplier_name);

                    if (existingSupplier) {
                        if (existingSupplier.status === 'Active') {
                            // 更新现有活跃供应商
                            await existingSupplier.update({
                                name: vendor.supplier_name,
                                status: 'Active'
                            }, { transaction });

                            stats.updated++;
                        } else {
                            // 重新激活供应商
                            await existingSupplier.update({
                                name: vendor.supplier_name,
                                status: 'Active'
                            }, { transaction });

                            stats.reactivated++;
                        }
                        currentSupplierMap.delete(vendor.supplier_name); // 标记为已处理
                    } else {
                        // 新增供应商
                        await Supplier.create({
                            name: vendor.supplier_name,
                            status: 'Active'
                        }, { transaction });

                        stats.added++;
                    }
                }

                // 7. 将不再启用的供应商设为 inactive
                for (const [name, supplier] of currentSupplierMap) {
                    if (supplier.status === 'Active') {
                        await supplier.update({
                            status: 'inactive'
                        }, { transaction });

                        stats.deactivated++;
                    }
                }

                // 8. 提交事务
                await transaction.commit();

                return {
                    success: true,
                    message: '供应商同步成功',
                    stats: stats
                };

            } catch (error) {
                // 回滚事务
                await transaction.rollback();
                throw error;
            }

        } catch (error) {
            console.error('同步供应商失败:', error);
            return {
                success: false,
                message: '同步供应商失败',
                error: error.message
            };
        }
    }

    /**
     * 获取同步状态
     *
     * @returns {Promise<Object>} 同步状态
     */
    async getSyncStatus() {
        try {
            // 获取启用的供应商数量
            const [enabledCount] = await sequelize.query(`
                SELECT COUNT(*) as count
                FROM vendor_config
                WHERE enable_document_mgmt = 1 AND status = 'Active'
            `);

            // 获取活跃供应商数量
            const [activeCount] = await sequelize.query(`
                SELECT COUNT(*) as count
                FROM suppliers
                WHERE status = 'active'
            `);

            // 检查是否需要同步
            const needsSync = enabledCount[0].count !== activeCount[0].count;

            return {
                success: true,
                enabledCount: enabledCount[0].count,
                activeCount: activeCount[0].count,
                needsSync: needsSync
            };

        } catch (error) {
            console.error('获取同步状态失败:', error);
            return {
                success: false,
                message: '获取同步状态失败',
                error: error.message
            };
        }
    }
}

module.exports = new VendorToSupplierSyncService();