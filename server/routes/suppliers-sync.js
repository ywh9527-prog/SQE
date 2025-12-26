/**
 * 供应商同步路由
 *
 * 功能:
 * 1. 从IQC数据同步供应商信息到suppliers表
 * 2. 支持增量和全量两种同步模式
 * 3. 提供同步结果统计
 *
 * @author 浮浮酱
 * @version 1.0
 * @since 2025-12-26
 */

const express = require('express');
const router = express.Router();
const supplierSyncService = require('../services/supplier-sync-service');
const logger = require('../utils/logger');

/**
 * POST /api/suppliers/sync-from-iqc
 * 从IQC数据同步供应商信息
 *
 * 请求参数:
 * - mode: 同步模式（incremental增量/full全量，默认incremental）
 * - iqcFileId: 指定IQC数据ID（可选，默认使用最新）
 *
 * 响应数据:
 * - success: 是否成功
 * - message: 结果消息
 * - stats: 统计信息（created/updated/skipped）
 * - iqcFileName: IQC文件名
 * - iqcFileId: IQC数据ID
 */
router.post('/sync-from-iqc', async (req, res) => {
    try {
        const { mode = 'incremental', iqcFileId } = req.body;

        // 验证同步模式
        if (mode !== 'incremental' && mode !== 'full') {
            return res.status(400).json({
                success: false,
                error: '无效的同步模式，必须是 incremental 或 full'
            });
        }

        logger.info(`📥 收到同步请求 - 模式: ${mode}, IQC ID: ${iqcFileId || '最新'}`);

        // 调用同步服务
        const result = await supplierSyncService.syncFromIQC({ mode, iqcFileId });

        res.json(result);

    } catch (error) {
        logger.error(`❌ 同步接口错误: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/suppliers/sync-stats
 * 获取供应商统计信息
 *
 * 响应数据:
 * - total: 供应商总数
 * - active: 活跃供应商数
 * - inactive: 停用供应商数
 */
router.get('/sync-stats', async (req, res) => {
    try {
        const stats = await supplierSyncService.getSupplierStats();
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        logger.error(`❌ 获取统计信息错误: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/suppliers/last-iqc-info
 * 获取最新的IQC数据信息
 *
 * 响应数据:
 * - id: IQC数据ID
 * - fileName: 文件名
 * - uploadTime: 上传时间
 * - recordCount: 记录数
 * - dataType: 数据类型
 */
router.get('/last-iqc-info', async (req, res) => {
    try {
        const info = await supplierSyncService.getLatestIQCInfo();

        if (!info) {
            return res.status(404).json({
                success: false,
                error: '未找到IQC数据'
            });
        }

        res.json({
            success: true,
            info
        });
    } catch (error) {
        logger.error(`❌ 获取IQC信息错误: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;