/**
 * 供应商配置中心API路由
 *
 * 路由: /api/vendors/*
 * 功能: 提供供应商配置的CRUD操作接口
 *
 * 主要功能:
 * 1. 获取配置列表
 * 2. 更新配置
 * 3. 从IQC同步供应商
 * 4. 手动添加供应商
 * 5. 删除供应商配置
 * 6. 获取已启用的供应商（资料管理/绩效评价）
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../database/config');
const VendorConfig = require('../models/VendorConfig');
const VendorSyncService = require('../services/vendor-sync-service');
const vendorToSupplierSyncService = require('../services/vendor-to-supplier-sync-service');
const logger = require('../utils/logger');

// 创建供应商同步服务实例
const vendorSyncService = new VendorSyncService();

// 📋 定义所有管理模块字段
// 新增模块时，只需在此处添加字段名即可，无需修改其他逻辑
const MANAGEMENT_FIELDS = [
    'enable_document_mgmt',      // 资料管理
    'enable_performance_mgmt'    // 绩效评价
    // 未来新增模块，例如：
    // 'enable_monthly_performance',  // 月度绩效评价
    // 'enable_quality_tracking',     // 质量追踪
];

/**
 * 检查是否有任何一个管理模块被启用
 * @param {Object} vendor - 供应商数据
 * @returns {boolean} 是否有任何一个模块被启用
 */
function hasAnyManagementEnabled(vendor) {
    return MANAGEMENT_FIELDS.some(field => vendor[field] === 1 || vendor[field] === true);
}

// 认证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: '未提供认证令牌' });
    }

    const AuthService = require('../services/authService');
    AuthService.verifyToken(token)
        .then(result => {
            if (!result.success) {
                return res.status(401).json({ success: false, error: '认证失败' });
            }
            req.user = result.user;
            next();
        })
        .catch(error => {
            console.error('认证失败:', error);
            res.status(500).json({ success: false, error: '认证服务错误' });
        });
};

/**
 * 1. 获取配置列表
 * GET /api/vendors/config
 * Query: ?source=IQC&status=Active&keyword=xxx&data_type=purchase
 */
router.get('/config', authenticateToken, async (req, res) => {
    try {
        const { source, status, keyword, data_type } = req.query;

        const where = {};
        
        if (source) {
            where.source = source;
        }
        
        if (status) {
            where.status = status;
        }
        
        if (data_type) {
            where.data_type = data_type;
        }
        
        if (keyword) {
            where.supplier_name = {
                [require('sequelize').Op.like]: `%${keyword}%`
            };
        }

        const configs = await VendorConfig.findAll({
            where,
            order: [['supplier_name', 'ASC']]
        });

        res.json({
            success: true,
            data: configs
        });
    } catch (error) {
        logger.error('获取配置列表失败:', error);
        res.status(500).json({
            success: false,
            error: '获取配置列表失败'
        });
    }
});

/**
 * 2. 获取统计数据
 * GET /api/vendors/config/statistics
 * Query: ?data_type=purchase
 * 注意：必须放在 /config/:id 之前，否则会被 :id 参数匹配
 */
router.get('/config/statistics', authenticateToken, async (req, res) => {
    try {
        const { data_type } = req.query;
        logger.info(`📊 统计数据API调用，data_type参数: ${data_type}`);

        // 构建查询条件
        const where = {};
        if (data_type && data_type !== '') {
            where.data_type = data_type;
        }

        logger.info(`📊 查询条件:`, where);

        // 获取按类型筛选的供应商数
        const totalCount = await VendorConfig.count({ where });
        logger.info(`📊 按类型筛选的供应商数: ${totalCount}`);

        // 获取启用资料管理的供应商数
        const documentCount = await VendorConfig.count({
            where: {
                ...where,
                enable_document_mgmt: true,
                status: 'Active'
            }
        });

        // 获取启用绩效管理的供应商数
        const performanceCount = await VendorConfig.count({
            where: {
                ...where,
                enable_performance_mgmt: true,
                status: 'Active'
            }
        });

        // 获取最后更新时间
        const latestUpdate = await VendorConfig.findOne({
            order: [['updated_at', 'DESC']],
            attributes: ['updated_at']
        });

        let syncTime = '-';
        if (latestUpdate && latestUpdate.updated_at) {
            const now = new Date();
            const lastUpdate = new Date(latestUpdate.updated_at);
            const diffMs = now - lastUpdate;
            const diffMinutes = Math.floor(diffMs / (1000 * 60));

            if (diffMinutes < 1) {
                syncTime = '刚刚';
            } else if (diffMinutes < 60) {
                syncTime = `${diffMinutes}分钟前`;
            } else if (diffMinutes < 1440) {
                syncTime = `${Math.floor(diffMinutes / 60)}小时前`;
            } else {
                syncTime = `${Math.floor(diffMinutes / 1440)}天前`;
            }
        }

        res.json({
            success: true,
            data: {
                total: totalCount,
                document: documentCount,
                performance: performanceCount,
                syncTime: syncTime
            }
        });
    } catch (error) {
        logger.error('获取统计数据失败:', error);
        res.status(500).json({
            success: false,
            error: '获取统计数据失败'
        });
    }
});

/**
 * 2.1 获取类型统计数据
 * GET /api/vendors/config/type-statistics
 * 返回外购和外协的供应商数量
 */
router.get('/config/type-statistics', authenticateToken, async (req, res) => {
    try {
        // 获取已启用绩效评价的外购供应商数
        const purchaseCount = await VendorConfig.count({
            where: {
                data_type: 'purchase',
                enable_performance_mgmt: 1
            }
        });

        // 获取已启用绩效评价的外协供应商数
        const externalCount = await VendorConfig.count({
            where: {
                data_type: 'external',
                enable_performance_mgmt: 1
            }
        });

        res.json({
            success: true,
            data: {
                purchase: purchaseCount,
                external: externalCount
            }
        });
    } catch (error) {
        logger.error('获取类型统计数据失败:', error);
        res.status(500).json({
            success: false,
            error: '获取类型统计数据失败'
        });
    }
});

/**
 * 3. 批量更新配置
 * PUT /api/vendors/config/batch
 * 注意：必须放在 /config/:id 之前，否则会被 :id 参数匹配
 */
router.put('/config/batch', authenticateToken, async (req, res) => {
    try {
        const { ids, updates } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: '供应商ID列表不能为空'
            });
        }

        // 如果没有明确指定status，则自动判断
        let finalUpdates = { ...updates };
        if (finalUpdates.status === undefined) {
            // 获取所有供应商的当前数据
            const vendors = await VendorConfig.findAll({
                where: { id: ids }
            });

            // 检查是否有任何一个供应商启用了管理模块
            const hasAnyEnabled = vendors.some(vendor => {
                const tempVendor = { ...vendor.dataValues, ...updates };
                return hasAnyManagementEnabled(tempVendor);
            });

            // 如果有任何一个模块被启用，状态应该为"Active"
            if (hasAnyEnabled) {
                finalUpdates.status = 'Active';
            }
        }

        const result = await VendorConfig.update(
            {
                ...finalUpdates,
                updated_at: new Date()
            },
            {
                where: {
                    id: ids
                }
            }
        );

        // 检查是否修改了任何管理模块配置,自动同步到 suppliers 表
        // 支持所有以 enable_ 开头的字段,便于未来扩展
        const managementFields = Object.keys(updates).filter(key => key.startsWith('enable_'));
        if (managementFields.length > 0) {
            logger.info(`检测到管理模块配置变更(${managementFields.join(', ')})，自动同步到 suppliers 表...`);
            const syncResult = await vendorToSupplierSyncService.syncToSuppliers();

            if (syncResult.success) {
                logger.info(`自动同步成功: 新增 ${syncResult.stats.added}，更新 ${syncResult.stats.updated}，停用 ${syncResult.stats.deactivated}`);
            } else {
                logger.error(`自动同步失败: ${syncResult.message}`);
            }
        }

        res.json({
            success: true,
            message: `批量更新成功，影响 ${result[0]} 条记录`
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                error: '供应商名称和数据类型组合已存在'
            });
        }
        logger.error('批量更新配置失败:', error);
        res.status(500).json({
            success: false,
            error: '批量更新配置失败'
        });
    }
});

/**
 * 4. 批量删除配置
 * DELETE /api/vendors/config/batch
 * 注意：必须放在 /config/:id 之前，否则会被 :id 参数匹配
 */
router.delete('/config/batch', authenticateToken, async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: '供应商ID列表不能为空'
            });
        }

        const result = await VendorConfig.destroy({
            where: {
                id: ids
            }
        });

        res.json({
            success: true,
            message: `批量删除成功，删除 ${result} 条记录`
        });
    } catch (error) {
        logger.error('批量删除配置失败:', error);
        res.status(500).json({
            success: false,
            error: '批量删除配置失败'
        });
    }
});

/**
 * 5. 获取单个配置
 * GET /api/vendors/config/:id
 */
router.get('/config/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        
        const config = await VendorConfig.findByPk(id);
        
        if (!config) {
            return res.status(404).json({
                success: false,
                error: '配置不存在'
            });
        }

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        logger.error('获取配置失败:', error);
        res.status(500).json({
            success: false,
            error: '获取配置失败'
        });
    }
});

/**
 * 3. 更新配置
 * PUT /api/vendors/config/:id
 */
router.put('/config/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { data_type, enable_document_mgmt, enable_performance_mgmt, status } = req.body;

        const config = await VendorConfig.findByPk(id);

        if (!config) {
            return res.status(404).json({
                success: false,
                error: '配置不存在'
            });
        }

        // 验证data_type值
        if (data_type && data_type !== 'purchase' && data_type !== 'external') {
            return res.status(400).json({
                success: false,
                error: '数据类型必须是 purchase（外购）或 external（外协）'
            });
        }

        // 保存旧的 enable_document_mgmt 值
        const oldEnableDocumentMgmt = config.enable_document_mgmt;

        // 如果没有明确指定status，则自动判断
        let finalStatus = status;
        if (finalStatus === undefined) {
            // 临时更新数据以进行判断
            const tempConfig = {
                ...config.dataValues,
                data_type: data_type !== undefined ? data_type : config.data_type,
                enable_document_mgmt: enable_document_mgmt !== undefined ? enable_document_mgmt : config.enable_document_mgmt,
                enable_performance_mgmt: enable_performance_mgmt !== undefined ? enable_performance_mgmt : config.enable_performance_mgmt
            };

            // 如果有任何一个模块被启用，状态应该为"Active"
            if (hasAnyManagementEnabled(tempConfig)) {
                finalStatus = 'Active';
            } else {
                finalStatus = config.status;
            }
        }

        await config.update({
            data_type: data_type !== undefined ? data_type : config.data_type,
            enable_document_mgmt: enable_document_mgmt !== undefined ? enable_document_mgmt : config.enable_document_mgmt,
            enable_performance_mgmt: enable_performance_mgmt !== undefined ? enable_performance_mgmt : config.enable_performance_mgmt,
            status: finalStatus,
            updated_at: new Date()
        });

        // 如果修改了 enable_document_mgmt，自动同步到 suppliers 表
        if (enable_document_mgmt !== undefined && enable_document_mgmt !== oldEnableDocumentMgmt) {
            logger.info(`检测到资料管理配置变更，自动同步到 suppliers 表...`);
            const syncResult = await vendorToSupplierSyncService.syncToSuppliers();

            if (syncResult.success) {
                logger.info(`自动同步成功: 新增 ${syncResult.stats.added}，更新 ${syncResult.stats.updated}，停用 ${syncResult.stats.deactivated}`);
            } else {
                logger.error(`自动同步失败: ${syncResult.message}`);
            }
        }

        res.json({
            success: true,
            message: '配置更新成功',
            data: config
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                error: '供应商名称和数据类型组合已存在'
            });
        }
        logger.error('更新配置失败:', error);
        res.status(500).json({
            success: false,
            error: '更新配置失败'
        });
    }
});

/**
 * 4. 从IQC同步供应商
 * POST /api/vendors/sync-from-iqc
 */
router.post('/sync-from-iqc', authenticateToken, async (req, res) => {
    try {
        const { mode = 'incremental', iqcFileId } = req.body;

        // 验证同步模式
        if (mode !== 'incremental' && mode !== 'full') {
            return res.status(400).json({
                success: false,
                error: '无效的同步模式，必须是 incremental 或 full'
            });
        }

        // 调用同步服务
        const result = await vendorSyncService.syncFromIQC({ mode, iqcFileId });

        res.json(result);
    } catch (error) {
        logger.error('从IQC同步供应商失败:', error);
        res.status(500).json({
            success: false,
            error: '从IQC同步供应商失败'
        });
    }
});

/**
 * 5. 手动添加供应商
 * POST /api/vendors/config
 */
router.post('/config', authenticateToken, async (req, res) => {
    try {
        const { supplier_name, data_type, source, enable_document_mgmt, enable_performance_mgmt, status } = req.body;

        if (!supplier_name) {
            return res.status(400).json({
                success: false,
                error: '供应商名称不能为空'
            });
        }

        // 验证data_type值
        if (data_type && data_type !== 'purchase' && data_type !== 'external') {
            return res.status(400).json({
                success: false,
                error: '数据类型必须是 purchase（外购）或 external（外协）'
            });
        }

        const config = await VendorConfig.create({
            supplier_name,
            data_type: data_type || 'purchase',
            source: source || 'MANUAL',
            enable_document_mgmt: enable_document_mgmt || false,
            enable_performance_mgmt: enable_performance_mgmt || false,
            status: status || 'Inactive'
        });

        res.json({
            success: true,
            message: '供应商添加成功',
            data: config
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({
                success: false,
                error: '供应商名称和数据类型组合已存在'
            });
        }
        logger.error('添加供应商失败:', error);
        res.status(500).json({
            success: false,
            error: '添加供应商失败'
        });
    }
});

/**
 * 6. 删除供应商配置
 * DELETE /api/vendors/config/:id
 */
router.delete('/config/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const config = await VendorConfig.findByPk(id);
        
        if (!config) {
            return res.status(404).json({
                success: false,
                error: '配置不存在'
            });
        }

        await config.destroy();

        res.json({
            success: true,
            message: '供应商删除成功'
        });
    } catch (error) {
        logger.error('删除供应商失败:', error);
        res.status(500).json({
            success: false,
            error: '删除供应商失败'
        });
    }
});

/**
 * 7. 获取已启用的供应商（资料管理）
 * GET /api/vendors/active/document
 */
router.get('/active/document', authenticateToken, async (req, res) => {
    try {
        const vendors = await VendorConfig.findAll({
            where: {
                enable_document_mgmt: true,
                status: 'Active'
            },
            attributes: ['id', 'supplier_name'],
            order: [['supplier_name', 'ASC']]
        });

        res.json({
            success: true,
            data: vendors
        });
    } catch (error) {
        logger.error('获取已启用资料管理的供应商失败:', error);
        res.status(500).json({
            success: false,
            error: '获取供应商列表失败'
        });
    }
});

/**
 * 8. 获取已启用的供应商（绩效评价）
 * GET /api/vendors/active/performance
 */
router.get('/active/performance', authenticateToken, async (req, res) => {
    try {
        const vendors = await VendorConfig.findAll({
            where: {
                enable_performance_mgmt: true,
                status: 'Active'
            },
            attributes: ['id', 'supplier_name'],
            order: [['supplier_name', 'ASC']]
        });

        res.json({
            success: true,
            data: vendors
        });
    } catch (error) {
        logger.error('获取已启用绩效评价的供应商失败:', error);
        res.status(500).json({
            success: false,
            error: '获取供应商列表失败'
        });
    }
});

module.exports = router;