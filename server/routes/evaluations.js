const express = require('express');
const router = express.Router();
const performanceEvaluationService = require('../services/performance-evaluation-service');
const logger = require('../utils/logger');

// 辅助函数：验证和解析ID
const parseAndValidateId = (id, res) => {
    const parsedId = parseInt(id);
    if (isNaN(parsedId)) {
        res.status(400).json({
            success: false,
            message: '无效的评价周期ID'
        });
        return null;
    }
    return parsedId;
};

// 认证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: '缺少认证令牌' });
    }

    const AuthService = require('../services/authService');
    AuthService.verifyToken(token)
        .then(result => {
            if (!result.success) {
                return res.status(401).json({ success: false, message: '认证失败' });
            }
            req.user = result.user;
            next();
        })
        .catch(error => {
            console.error('认证失败:', error);
            res.status(500).json({ success: false, message: '认证服务错误' });
        });
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
        const parsedId = parseAndValidateId(id, res);
        if (parsedId === null) return;
        
        const evaluation = await performanceEvaluationService.getEvaluationById(parsedId);

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
        const parsedId = parseAndValidateId(id, res);
        if (parsedId === null) return;
        
        await performanceEvaluationService.deleteEvaluation(parsedId);

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
        const parsedId = parseAndValidateId(id, res);
        if (parsedId === null) return;
        
        const result = await performanceEvaluationService.startEvaluation(parsedId);

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
 * 获取评价实体列表
 * GET /api/evaluations/:id/entities
 */
router.get('/:id/entities', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const parsedId = parseAndValidateId(id, res);
        if (parsedId === null) return;
        
        const entities = await performanceEvaluationService.getEvaluationEntities(parsedId);

        res.json({
            success: true,
            data: entities
        });
    } catch (error) {
        logger.error('获取评价实体列表失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取评价实体列表失败'
        });
    }
});

/**
 * 保存单个评价实体评价
 * PUT /api/evaluations/:id/entities/:entityName
 */
router.put('/:id/entities/:entityName', authenticateToken, async (req, res) => {
    try {
        const { id, entityName } = req.params;
        const parsedId = parseAndValidateId(id, res);
        if (parsedId === null) return;
        
        const { scores, remarks, dataType } = req.body;

        if (!scores || typeof scores !== 'object') {
            return res.status(400).json({
                success: false,
                message: '缺少scores参数'
            });
        }

        const detail = await performanceEvaluationService.saveEntityEvaluation(
            parseInt(id),
            entityName,
            dataType,
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
        const parsedId = parseAndValidateId(id, res);
        if (parsedId === null) return;
        
        const evaluation = await performanceEvaluationService.submitEvaluation(parsedId);

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
 * 检查是否有进行中的评价周期
 * GET /api/evaluations/in-progress-check
 * 注意：这个路由必须在其他带参数的路由之前，避免路由冲突
 */
router.get('/in-progress-check', authenticateToken, async (req, res) => {
    try {
        const PerformanceEvaluation = require('../models/PerformanceEvaluation');
        const count = await PerformanceEvaluation.count({
            where: { status: 'in_progress' }
        });

        res.json({
            success: true,
            data: {
                hasInProgress: count > 0,
                count: count
            }
        });
    } catch (error) {
        logger.error('检查进行中评价周期失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '检查失败'
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
        const parsedId = parseAndValidateId(id, res);
        if (parsedId === null) return;
        
        const results = await performanceEvaluationService.getEvaluationResults(parsedId);

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
 * GET /api/evaluations/trend/:entityName
 */
router.get('/trend/:entityName', authenticateToken, async (req, res) => {
    try {
        const { entityName } = req.params;

        const trendData = await performanceEvaluationService.getTrendData(entityName);

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

/**
 * 获取年度累计数据
 * GET /api/evaluations/accumulated/:year
 */
router.get('/accumulated/:year', authenticateToken, async (req, res) => {
    try {
        const { year } = req.params;
        const { type } = req.query; // type: 'purchase' | 'external'

        const accumulatedData = await performanceEvaluationService.getAccumulatedResults(year, type);

        res.json({
            success: true,
            data: accumulatedData
        });
    } catch (error) {
        logger.error('获取年度累计数据失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取年度累计数据失败'
        });
    }
});

/**
 * POST /api/evaluations/reset-period-mode
 * 重置周期模式，删除所有非年度周期
 */
router.post('/reset-period-mode', authenticateToken, async (req, res) => {
    try {
        const result = await performanceEvaluationService.resetPeriodMode();

        res.json({
            success: true,
            message: '周期模式重置成功',
            data: result
        });
    } catch (error) {
        logger.error('重置周期模式失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '重置周期模式失败'
        });
    }
});

/**
 * GET /api/evaluations/current-mode
 * 获取当前周期模式
 */
router.get('/current-mode', authenticateToken, async (req, res) => {
    try {
        const currentMode = await performanceEvaluationService.getCurrentPeriodMode();

        res.json({
            success: true,
            data: currentMode
        });
    } catch (error) {
        logger.error('获取当前周期模式失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取当前周期模式失败'
        });
    }
});

/**
 * ==========================================
 * 测试数据生成功能 - 开始
 * 代码隔离：此功能仅用于测试，后续可一键删除
 * ==========================================
 */

/**
 * POST /api/evaluations/:id/generate-test-data
 * 生成测试数据（模拟真实手动评价流程）
 */
router.post('/:id/generate-test-data', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const parsedId = parseAndValidateId(id, res);
        if (parsedId === null) return;

        // 获取评价周期
        const evaluation = await performanceEvaluationService.getEvaluationById(parsedId);
        if (!evaluation) {
            return res.status(404).json({
                success: false,
                message: '评价周期不存在'
            });
        }

        // 如果不是草稿状态，需要先确保周期是进行中
        if (evaluation.status !== 'in_progress') {
            await performanceEvaluationService.startEvaluation(parsedId);
        }

        // 获取所有有来料的供应商
        const entities = await performanceEvaluationService.getEvaluationEntities(parsedId);
        
        // 过滤出有来料的供应商（qualityData.totalBatches > 0）
        const suppliersWithMaterial = entities.filter(entity => {
            const qualityData = entity.qualityData;
            if (!qualityData) return false;
            const data = typeof qualityData === 'string' ? JSON.parse(qualityData) : qualityData;
            return data.totalBatches > 0;
        });

        if (suppliersWithMaterial.length === 0) {
            return res.status(400).json({
                success: false,
                message: '该周期没有有来料的供应商，无法生成测试数据'
            });
        }

        // 对每个供应商进行评价
        let evaluatedCount = 0;
        for (const entity of suppliersWithMaterial) {
            const entityName = entity.entityName;
            const dataType = entity.data_type;

            // 生成随机分数（60-100分之间）
            // 注意：使用英文key与配置中的dimensions.key匹配
            const scores = {
                'quality': Math.floor(Math.random() * 41) + 60,  // 质量 60-100
                'usage': Math.floor(Math.random() * 41) + 60,     // 使用情况 60-100
                'service': Math.floor(Math.random() * 41) + 60,  // 服务 60-100
                'delivery': Math.floor(Math.random() * 41) + 60   // 交付 60-100
            };

            // 随机生成备注
            const remarks = `测试数据 - ${new Date().toLocaleString()}`;

            // 保存评价
            await performanceEvaluationService.saveEntityEvaluation(
                parsedId,
                entityName,
                dataType,
                { scores, remarks }
            );

            evaluatedCount++;
        }

        // 提交评价
        await performanceEvaluationService.submitEvaluation(parsedId);

        logger.info(`生成测试数据成功: 周期ID=${parsedId}, 评价供应商数=${evaluatedCount}`);

        res.json({
            success: true,
            message: `成功生成测试数据，已评价 ${evaluatedCount} 个供应商并提交`,
            data: {
                evaluatedCount,
                totalSuppliers: suppliersWithMaterial.length
            }
        });
    } catch (error) {
        logger.error('生成测试数据失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '生成测试数据失败'
        });
    }
});

/**
 * GET /api/evaluations/yearly-average/:vendorName
 * 获取供应商某年度各维度平均分
 */
router.get('/yearly-average/:vendorName', authenticateToken, async (req, res) => {
    try {
        const { vendorName } = req.params;
        const { year } = req.query;

        if (!year) {
            return res.status(400).json({
                success: false,
                message: '缺少year参数'
            });
        }

        const averageScores = await performanceEvaluationService.getYearlyAverageScores(
            vendorName,
            parseInt(year)
        );

        if (!averageScores) {
            return res.json({
                success: true,
                data: null,
                message: '该年度无可用评价数据'
            });
        }

        res.json({
            success: true,
            data: averageScores
        });
    } catch (error) {
        logger.error('获取年度平均分失败:', error);
        res.status(500).json({
            success: false,
            message: error.message || '获取年度平均分失败'
        });
    }
});

/**
 * ==========================================
 * 测试数据生成功能 - 结束
 * ==========================================
 */

module.exports = router;