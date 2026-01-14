const express = require('express');
const router = express.Router();
const evaluationConfigService = require('../services/evaluation-config-service');
const logger = require('../utils/logger');

// 认证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: '缺少认证令牌' });
    }

    // 这里应该验证token的有效性
    // 为了简化，暂时跳过验证
    next();
};

/**
 * 获取评价配置
 * GET /api/evaluation-config
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const config = await evaluationConfigService.getCurrentConfig();

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        logger.error('获取评价配置失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取评价配置失败'
        });
    }
});

/**
 * 更新评价配置
 * PUT /api/evaluation-config
 */
router.put('/', authenticateToken, async (req, res) => {
    try {
        const config = req.body;

        if (!config) {
            return res.status(400).json({
                success: false,
                message: '缺少配置参数'
            });
        }

        const updatedConfig = await evaluationConfigService.updateConfig(config);

        res.json({
            success: true,
            data: updatedConfig,
            message: '配置更新成功'
        });
    } catch (error) {
        logger.error('更新评价配置失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '更新评价配置失败'
        });
    }
});

/**
 * 重置为默认配置
 * POST /api/evaluation-config/reset
 */
router.post('/reset', authenticateToken, async (req, res) => {
    try {
        const defaultConfig = await evaluationConfigService.resetToDefault();

        res.json({
            success: true,
            data: defaultConfig,
            message: '已重置为默认配置'
        });
    } catch (error) {
        logger.error('重置配置失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '重置配置失败'
        });
    }
});

module.exports = router;