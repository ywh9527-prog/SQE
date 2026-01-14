const express = require('express');
const router = express.Router();
const performanceEvaluationService = require('../services/performance-evaluation-service');
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
 * 创建评价周期
 * POST /api/evaluations
 */
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { period_name, period_type, start_date, end_date } = req.body;

        if (!period_name || !period_type || !start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }

        const evaluation = await performanceEvaluationService.createEvaluation({
            period_name,
            period_type,
            start_date,
            end_date
        });

        res.json({
            success: true,
            data: evaluation
        });
    } catch (error) {
        logger.error('创建评价周期失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '创建评价周期失败'
        });
    }
});

/**
 * 获取所有评价周期列表
 * GET /api/evaluations
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const evaluations = await performanceEvaluationService.getAllEvaluations();

        res.json({
            success: true,
            data: evaluations
        });
    } catch (error) {
        logger.error('获取评价周期列表失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取评价周期列表失败'
        });
    }
});

/**
 * 获取指定评价周期的详细信息
 * GET /api/evaluations/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const evaluation = await performanceEvaluationService.getEvaluationById(parseInt(id));

        res.json({
            success: true,
            data: evaluation
        });
    } catch (error) {
        logger.error('获取评价周期详情失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取评价周期详情失败'
        });
    }
});

/**
 * 删除评价周期
 * DELETE /api/evaluations/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        await performanceEvaluationService.deleteEvaluation(parseInt(id));

        res.json({
            success: true,
            message: '删除成功'
        });
    } catch (error) {
        logger.error('删除评价周期失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '删除评价周期失败'
        });
    }
});

/**
 * 开始评价
 * POST /api/evaluations/:id/start
 */
router.post('/:id/start', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await performanceEvaluationService.startEvaluation(parseInt(id));

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('开始评价失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '开始评价失败'
        });
    }
});

/**
 * 获取供应商列表
 * GET /api/evaluations/:id/vendors
 */
router.get('/:id/vendors', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const vendors = await performanceEvaluationService.getEvaluationVendors(parseInt(id));

        res.json({
            success: true,
            data: vendors
        });
    } catch (error) {
        logger.error('获取供应商列表失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取供应商列表失败'
        });
    }
});

/**
 * 保存单个供应商评价
 * PUT /api/evaluations/:id/vendors/:vendorName
 */
router.put('/:id/vendors/:vendorName', authenticateToken, async (req, res) => {
    try {
        const { id, vendorName } = req.params;
        const { scores, remarks } = req.body;

        if (!scores || typeof scores !== 'object') {
            return res.status(400).json({
                success: false,
                message: '缺少scores参数'
            });
        }

        const detail = await performanceEvaluationService.saveVendorEvaluation(
            parseInt(id),
            vendorName,
            { scores, remarks }
        );

        res.json({
            success: true,
            data: detail
        });
    } catch (error) {
        logger.error('保存供应商评价失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '保存供应商评价失败'
        });
    }
});

/**
 * 提交评价
 * PUT /api/evaluations/:id/submit
 */
router.put('/:id/submit', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const evaluation = await performanceEvaluationService.submitEvaluation(parseInt(id));

        res.json({
            success: true,
            data: evaluation
        });
    } catch (error) {
        logger.error('提交评价失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '提交评价失败'
        });
    }
});

/**
 * 获取评价结果
 * GET /api/evaluations/:id/results
 */
router.get('/:id/results', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const results = await performanceEvaluationService.getEvaluationResults(parseInt(id));

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        logger.error('获取评价结果失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取评价结果失败'
        });
    }
});

/**
 * 获取趋势数据
 * GET /api/evaluations/trend/:vendorName
 */
router.get('/trend/:vendorName', authenticateToken, async (req, res) => {
    try {
        const { vendorName } = req.params;
        const trendData = await performanceEvaluationService.getTrendData(vendorName);

        res.json({
            success: true,
            data: trendData
        });
    } catch (error) {
        logger.error('获取趋势数据失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取趋势数据失败'
        });
    }
});

module.exports = router;