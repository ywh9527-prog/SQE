/**
 * 工作台API路由
 * 提供工作台所需的汇总统计数据
 */
const express = require('express');
const router = express.Router();
const { sequelize } = require('../database/config');
const VendorConfig = require('../models/VendorConfig');
const SupplierDocument = require('../models/SupplierDocument');
const PerformanceEvaluation = require('../models/PerformanceEvaluation');
const IQCData = require('../models/IQCData');
const logger = require('../utils/logger');

/**
 * 获取工作台概览数据
 * GET /api/dashboard/overview
 */
router.get('/overview', async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        // 1. 供应商总数统计
        const vendorCount = await VendorConfig.count({
            where: { status: 'Active' }
        });
        const purchaseCount = await VendorConfig.count({
            where: { status: 'Active', data_type: 'purchase' }
        });
        const externalCount = await VendorConfig.count({
            where: { status: 'Active', data_type: 'external' }
        });

        // 2. 资料到期预警统计
        const now = new Date();
        const days15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
        const days30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // 已过期
        const expiredCount = await SupplierDocument.count({
            where: {
                is_permanent: false,
                expiry_date: { [sequelize.Sequelize.Op.lt]: now },
                status: 'active',
                is_current: true
            }
        });

        // 紧急（15天内到期）
        const urgentCount = await SupplierDocument.count({
            where: {
                is_permanent: false,
                expiry_date: {
                    [sequelize.Sequelize.Op.gte]: now,
                    [sequelize.Sequelize.Op.lte]: days15
                },
                status: 'active',
                is_current: true
            }
        });

        // 警告（30天内到期）
        const warningCount = await SupplierDocument.count({
            where: {
                is_permanent: false,
                expiry_date: {
                    [sequelize.Sequelize.Op.gte]: now,
                    [sequelize.Sequelize.Op.lte]: days30
                },
                status: 'active',
                is_current: true
            }
        });

        // 3. 评价状态统计
        const draftCount = await PerformanceEvaluation.count({
            where: { status: 'draft' }
        });
        const inProgressCount = await PerformanceEvaluation.count({
            where: { status: 'in_progress' }
        });
        const completedCount = await PerformanceEvaluation.count({
            where: { status: 'completed' }
        });

        // 4. IQC数据状态
        const latestPurchaseData = await IQCData.findOne({
            where: { dataType: 'purchase' },
            order: [['uploadTime', 'DESC']]
        });
        const latestExternalData = await IQCData.findOne({
            where: { dataType: 'external' },
            order: [['uploadTime', 'DESC']]
        });

        // 5. 本月合格率计算（分别计算外购和外协）
        const currentYearNum = new Date().getFullYear();
        const currentMonthNum = new Date().getMonth() + 1;
        const currentMonthKey = `${currentYearNum}-${String(currentMonthNum).padStart(2, '0')}`;

        let purchaseMonthlyPassRate = null;
        let externalMonthlyPassRate = null;
        let displayMonth = currentMonthKey; // 显示的月份标签

        // 计算外购本月/最近月合格率
        if (latestPurchaseData && latestPurchaseData.monthlyData) {
            // 先尝试获取当前月
            let monthData = latestPurchaseData.monthlyData[currentMonthKey];
            
            // 如果没有当前月数据，获取最近一个月
            if (!monthData) {
                const months = Object.keys(latestPurchaseData.monthlyData).sort((a, b) => b.localeCompare(a));
                if (months.length > 0) {
                    displayMonth = months[0];
                    monthData = latestPurchaseData.monthlyData[months[0]];
                }
            }
            
            if (monthData && monthData.total > 0) {
                purchaseMonthlyPassRate = ((monthData.pass || monthData.ok || 0) / monthData.total * 100).toFixed(1);
            }
        }

        // 计算外协本月/最近月合格率
        if (latestExternalData && latestExternalData.monthlyData) {
            // 先尝试获取当前月
            let monthData = latestExternalData.monthlyData[currentMonthKey];
            
            // 如果没有当前月数据，获取最近一个月
            if (!monthData) {
                const months = Object.keys(latestExternalData.monthlyData).sort((a, b) => b.localeCompare(a));
                if (months.length > 0) {
                    monthData = latestExternalData.monthlyData[months[0]];
                }
            }
            
            if (monthData && monthData.total > 0) {
                externalMonthlyPassRate = ((monthData.pass || monthData.ok || 0) / monthData.total * 100).toFixed(1);
            }
        }

        // 6. 月度合格率趋势（近6个月）
        const monthlyTrend = await getMonthlyPassRateTrend(6);

        // 7. 供应商绩效Top5
        const topVendors = await getTopVendors(currentYear, 5);

        res.json({
            success: true,
            data: {
                // 供应商统计
                vendors: {
                    total: vendorCount,
                    purchase: purchaseCount,
                    external: externalCount
                },
                // 资料预警
                documents: {
                    expired: expiredCount,
                    urgent: urgentCount,
                    warning: warningCount,
                    totalAlerts: expiredCount + urgentCount + warningCount
                },
                // 评价状态
                evaluations: {
                    draft: draftCount,
                    inProgress: inProgressCount,
                    completed: completedCount
                },
                // IQC数据状态
                iqcData: {
                    purchaseLastUpdate: latestPurchaseData ? latestPurchaseData.uploadTime : null,
                    externalLastUpdate: latestExternalData ? latestExternalData.uploadTime : null,
                    purchaseMonthlyPassRate: purchaseMonthlyPassRate,
                    externalMonthlyPassRate: externalMonthlyPassRate,
                    displayMonth: displayMonth
                },
                // 月度趋势
                monthlyTrend: monthlyTrend,
                // Top5供应商
                topVendors: topVendors
            }
        });
    } catch (error) {
        logger.error(`获取工作台概览数据失败: ${error.message}`);
        res.status(500).json({
            success: false,
            message: '获取工作台概览数据失败',
            error: error.message
        });
    }
});

/**
 * 获取即将过期的资料列表
 * GET /api/dashboard/expiring-documents
 */
router.get('/expiring-documents', async (req, res) => {
    try {
        const { days = 30, limit = 20 } = req.query;
        const now = new Date();
        const futureDate = new Date(now.getTime() + parseInt(days) * 24 * 60 * 60 * 1000);

        const documents = await SupplierDocument.findAll({
            where: {
                is_permanent: false,
                expiry_date: {
                    [sequelize.Sequelize.Op.lte]: futureDate
                },
                status: 'active',
                is_current: true
            },
            order: [['expiry_date', 'ASC']],
            limit: parseInt(limit)
        });

        // 标记过期状态
        const result = documents.map(doc => {
            const docJson = doc.toJSON();
            const expiryDate = new Date(doc.expiry_date);
            const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

            docJson.daysUntilExpiry = daysUntilExpiry;
            docJson.warningLevel = daysUntilExpiry < 0 ? 'expired' :
                                   daysUntilExpiry <= 7 ? 'critical' :
                                   daysUntilExpiry <= 15 ? 'urgent' : 'warning';

            return docJson;
        });

        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error(`获取即将过期资料失败: ${error.message}`);
        res.status(500).json({
            success: false,
            message: '获取即将过期资料失败',
            error: error.message
        });
    }
});

/**
 * 获取月度合格率趋势
 * @param {number} months - 月数
 */
async function getMonthlyPassRateTrend(months) {
    try {
        // 同时获取外购和外协数据，合并计算
        const purchaseData = await IQCData.findOne({
            where: { dataType: 'purchase' },
            order: [['uploadTime', 'DESC']]
        });

        const externalData = await IQCData.findOne({
            where: { dataType: 'external' },
            order: [['uploadTime', 'DESC']]
        });

        // 合并两个数据源的月度数据
        const mergedMonthlyData = {};

        // 处理外购数据
        if (purchaseData && purchaseData.monthlyData) {
            for (const [month, data] of Object.entries(purchaseData.monthlyData)) {
                if (!mergedMonthlyData[month]) {
                    mergedMonthlyData[month] = { total: 0, pass: 0 };
                }
                mergedMonthlyData[month].total += data.total || 0;
                mergedMonthlyData[month].pass += data.pass || data.ok || 0;
            }
        }

        // 处理外协数据
        if (externalData && externalData.monthlyData) {
            for (const [month, data] of Object.entries(externalData.monthlyData)) {
                if (!mergedMonthlyData[month]) {
                    mergedMonthlyData[month] = { total: 0, pass: 0 };
                }
                mergedMonthlyData[month].total += data.total || 0;
                mergedMonthlyData[month].pass += data.pass || data.ok || 0;
            }
        }

        if (Object.keys(mergedMonthlyData).length === 0) {
            return [];
        }

        // 按月份排序并取最近N个月
        const sortedMonths = Object.keys(mergedMonthlyData).sort((a, b) => b.localeCompare(a)).slice(0, months);
        const result = [];

        for (const month of sortedMonths.reverse()) {
            const data = mergedMonthlyData[month];
            const passRate = data.total > 0 ? (data.pass / data.total * 100).toFixed(1) : null;
            
            result.push({
                month: month,
                passRate: passRate,
                totalCount: data.total,
                passCount: data.pass
            });
        }

        return result;
    } catch (error) {
        logger.error(`获取月度合格率趋势失败: ${error.message}`);
        return [];
    }
}

/**
 * 获取绩效排名Top供应商
 * @param {number} year - 年份
 * @param {number} limit - 数量限制
 */
async function getTopVendors(year, limit) {
    try {
        // 查询该年份已完成的年度评价
        const evaluations = await PerformanceEvaluation.findAll({
            where: {
                period_type: 'yearly',
                status: 'completed',
                start_date: {
                    [sequelize.Sequelize.Op.gte]: `${year}-01-01`,
                    [sequelize.Sequelize.Op.lte]: `${year}-12-31`
                }
            },
            include: [{
                model: require('../models/PerformanceEvaluationDetail'),
                as: 'details',
                where: { total_score: { [sequelize.Sequelize.Op.ne]: null } },
                required: false
            }],
            order: [['created_at', 'DESC']],
            limit: 1
        });

        if (!evaluations || evaluations.length === 0) {
            // 尝试获取月度评价的累计排名
            const monthlyEvaluations = await PerformanceEvaluation.findAll({
                where: {
                    period_type: 'monthly',
                    status: 'completed',
                    start_date: {
                        [sequelize.Sequelize.Op.gte]: `${year}-01-01`,
                        [sequelize.Sequelize.Op.lte]: `${year}-12-31`
                    }
                },
                include: [{
                    model: require('../models/PerformanceEvaluationDetail'),
                    as: 'details',
                    where: { total_score: { [sequelize.Sequelize.Op.ne]: null } },
                    required: false
                }],
                order: [['created_at', 'DESC']]
            });

            if (monthlyEvaluations.length === 0) {
                return [];
            }

            // 汇总月度评价分数
            const vendorScores = {};
            for (const eval of monthlyEvaluations) {
                if (eval.details) {
                    for (const detail of eval.details) {
                        if (!vendorScores[detail.entity_name]) {
                            vendorScores[detail.entity_name] = {
                                name: detail.entity_name,
                                totalScore: 0,
                                count: 0,
                                grade: detail.grade
                            };
                        }
                        vendorScores[detail.entity_name].totalScore += detail.total_score || 0;
                        vendorScores[detail.entity_name].count += 1;
                    }
                }
            }

            // 计算平均分并排序
            const result = Object.values(vendorScores)
                .map(v => ({
                    name: v.name,
                    avgScore: (v.totalScore / v.count).toFixed(1),
                    grade: v.grade
                }))
                .sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore))
                .slice(0, limit);

            return result;
        }

        const evaluation = evaluations[0];
        if (!evaluation.details || evaluation.details.length === 0) {
            return [];
        }

        // 按分数排序取Top
        const result = evaluation.details
            .filter(d => d.total_score !== null)
            .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
            .slice(0, limit)
            .map(d => ({
                name: d.entity_name,
                avgScore: d.total_score ? d.total_score.toFixed(1) : '-',
                grade: d.grade || '-'
            }));

        return result;
    } catch (error) {
        logger.error(`获取Top供应商失败: ${error.message}`);
        return [];
    }
}

/**
 * 获取最近操作记录
 * GET /api/dashboard/recent-activities
 */
router.get('/recent-activities', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const activities = [];

        // 获取最近的IQC数据上传
        const recentIQC = await IQCData.findAll({
            order: [['uploadTime', 'DESC']],
            limit: 3
        });

        for (const data of recentIQC) {
            activities.push({
                type: 'iqc_upload',
                time: data.uploadTime,
                description: `上传了IQC${data.dataType === 'purchase' ? '外购' : '外协'}数据`,
                detail: data.fileName
            });
        }

        // 获取最近的评价记录
        const recentEvaluations = await PerformanceEvaluation.findAll({
            order: [['updated_at', 'DESC']],
            limit: 3
        });

        for (const eval of recentEvaluations) {
            const statusText = {
                'draft': '创建了',
                'in_progress': '正在进行',
                'completed': '完成了'
            };
            activities.push({
                type: 'evaluation',
                time: eval.updated_at,
                description: `${statusText[eval.status] || '更新了'}评价周期「${eval.period_name}」`,
                detail: `状态: ${eval.status}`
            });
        }

        // 获取最近的资料上传
        const recentDocs = await SupplierDocument.findAll({
            order: [['created_at', 'DESC']],
            limit: 3
        });

        for (const doc of recentDocs) {
            activities.push({
                type: 'document_upload',
                time: doc.created_at,
                description: `上传了资料「${doc.document_name}」`,
                detail: doc.document_type
            });
        }

        // 按时间排序
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));

        res.json({
            success: true,
            data: activities.slice(0, parseInt(limit))
        });
    } catch (error) {
        logger.error(`获取最近操作记录失败: ${error.message}`);
        res.status(500).json({
            success: false,
            message: '获取最近操作记录失败',
            error: error.message
        });
    }
});

module.exports = router;
