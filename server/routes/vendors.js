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
const VendorConfig = require('../models/VendorConfig');
const VendorSyncService = require('../services/vendor-sync-service');
const vendorToSupplierSyncService = require('../services/vendor-to-supplier-sync-service');
const logger = require('../utils/logger');

// 创建供应商同步服务实例
const vendorSyncService = new VendorSyncService();

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
 * Query: ?source=IQC&status=Active&keyword=xxx
 */
router.get('/config', authenticateToken, async (req, res) => {
    try {
        const { source, status, keyword } = req.query;

        const where = {};
        
        if (source) {
            where.source = source;
        }
        
        if (status) {
            where.status = status;
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
 * 2. 获取单个配置
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
        const { enable_document_mgmt, enable_performance_mgmt, status } = req.body;

        const config = await VendorConfig.findByPk(id);

        if (!config) {
            return res.status(404).json({
                success: false,
                error: '配置不存在'
            });
        }

        // 保存旧的 enable_document_mgmt 值
        const oldEnableDocumentMgmt = config.enable_document_mgmt;

        await config.update({
            enable_document_mgmt: enable_document_mgmt !== undefined ? enable_document_mgmt : config.enable_document_mgmt,
            enable_performance_mgmt: enable_performance_mgmt !== undefined ? enable_performance_mgmt : config.enable_performance_mgmt,
            status: status || config.status,
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
        const { supplier_name, source, enable_document_mgmt, enable_performance_mgmt } = req.body;

        if (!supplier_name) {
            return res.status(400).json({
                success: false,
                error: '供应商名称不能为空'
            });
        }

        const config = await VendorConfig.create({
            supplier_name,
            source: source || 'MANUAL',
            enable_document_mgmt: enable_document_mgmt || false,
            enable_performance_mgmt: enable_performance_mgmt || false,
            status: 'Active'
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
                error: '供应商名称已存在'
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

/**
 * 9. 批量更新配置
 * PUT /api/vendors/config/batch
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

        const result = await VendorConfig.update(
            {
                ...updates,
                updated_at: new Date()
            },
            {
                where: {
                    id: ids
                }
            }
        );

        res.json({
            success: true,
            message: `批量更新成功，影响 ${result[0]} 条记录`
        });
    } catch (error) {
        logger.error('批量更新配置失败:', error);
        res.status(500).json({
            success: false,
            error: '批量更新配置失败'
        });
    }
});

/**
 * 10. 批量删除配置
 * DELETE /api/vendors/config/batch
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

module.exports = router;