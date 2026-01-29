const PerformanceEvaluation = require('../models/PerformanceEvaluation');
const PerformanceEvaluationDetail = require('../models/PerformanceEvaluationDetail');
const { sequelize, Op } = require('../database/config');
const logger = require('../utils/logger');

/**
 * PerformanceEvaluationService
 *
 * 供应商绩效评价业务逻辑服务
 */
class PerformanceEvaluationService {
    /**
     * 创建评价周期
     * @param {Object} data - 评价周期数据
     * @returns {Promise<Object>} 创建的评价周期
     */
    async createEvaluation(data) {
        const transaction = await sequelize.transaction();

        try {
            // 获取当前配置
            const configService = require('./evaluation-config-service');
            const currentConfig = await configService.getCurrentConfig();

            // 创建评价周期
            const evaluation = await PerformanceEvaluation.create({
                period_name: data.period_name,
                period_type: data.period_type,
                start_date: data.start_date,
                end_date: data.end_date,
                status: 'draft',
                config_snapshot: currentConfig
            }, { transaction });

            await transaction.commit();
            logger.info(`创建评价周期成功: ${evaluation.period_name}`);
            return evaluation;
        } catch (error) {
            await transaction.rollback();
            logger.error('创建评价周期失败:', error);
            throw error;
        }
    }

    /**
     * 获取所有评价周期列表
     * @returns {Promise<Array>} 评价周期列表
     */
    async getAllEvaluations() {
        try {
            const evaluations = await PerformanceEvaluation.findAll({
                order: [['created_at', 'DESC']]
            });
            return evaluations;
        } catch (error) {
            logger.error('获取评价周期列表失败:', error);
            throw error;
        }
    }

    /**
     * 获取指定评价周期的详细信息
     * @param {number} id - 评价周期ID
     * @returns {Promise<Object>} 评价周期详情
     */
    async getEvaluationById(id) {
        try {
            const evaluation = await PerformanceEvaluation.findByPk(id, {
                include: [{
                    model: PerformanceEvaluationDetail,
                    as: 'details'
                }]
            });

            if (!evaluation) {
                throw new Error('评价周期不存在');
            }

            return evaluation;
        } catch (error) {
            logger.error('获取评价周期详情失败:', error);
            throw error;
        }
    }

    /**
     * 删除评价周期
     * @param {number} id - 评价周期ID
     * @returns {Promise<boolean>} 删除结果
     */
    async deleteEvaluation(id) {
        const transaction = await sequelize.transaction();

        try {
            const evaluation = await PerformanceEvaluation.findByPk(id);

            if (!evaluation) {
                throw new Error('评价周期不存在');
            }

            // 删除关联的评价详情
            await PerformanceEvaluationDetail.destroy({
                where: { evaluation_id: id }
            }, { transaction });

            // 删除评价周期
            await evaluation.destroy({ transaction });

            await transaction.commit();
            logger.info(`删除评价周期成功: ${evaluation.period_name}`);
            return true;
        } catch (error) {
            await transaction.rollback();
            logger.error('删除评价周期失败:', error);
            throw error;
        }
    }

    /**

         * 开始评价

         * @param {number} id - 评价周期ID

         * @returns {Promise<Object>} 评价周期和供应商列表

         */

        async startEvaluation(id) {

            const transaction = await sequelize.transaction();

    

            try {

                const evaluation = await PerformanceEvaluation.findByPk(id);

    

                if (!evaluation) {

                    throw new Error('评价周期不存在');

                }

    

                // 如果状态为draft，开始评价

                if (evaluation.status === 'draft') {

                    // 更新状态为进行中

                    evaluation.status = 'in_progress';

                    await evaluation.save({ transaction });

    

                    // 获取已启用绩效评价的供应商

                    const VendorConfig = require('../models/VendorConfig');

                    const vendors = await VendorConfig.findAll({

                        where: {

                            enable_performance_mgmt: true,

                            status: 'Active'

                        }

                    });

    

                                        // 提取质量数据（按数据类型分别提取，确保外协/外购数据分开统计）

    

                                        const qualityExtractionService = require('./quality-data-extraction-service');

    

                                        

    

                                        // 提取外购质量数据

    

                                        const purchaseQualityDataMap = await qualityExtractionService.extractQualityData(

    

                                            evaluation.start_date,

    

                                            evaluation.end_date,

    

                                            'purchase'

    

                                        );

    

                                        

    

                                        // 提取外协质量数据

    

                                        const externalQualityDataMap = await qualityExtractionService.extractQualityData(

    

                                            evaluation.start_date,

    

                                            evaluation.end_date,

    

                                            'external'

    

                                        );

    

                    

    

                                                                                // 创建评价详情记录

    

                    

    

                                        

    

                    

    

                                                                                                    for (const vendor of vendors) {

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                                                                                        // 根据供应商类型获取对应的质量数据

    

                    

    

                                        

    

                    

    

                                                                                                        const dataType = vendor.data_type || 'purchase';

    

                    

    

                                        

    

                    

    

                                                                                                        const qualityDataMap = dataType === 'purchase' ? purchaseQualityDataMap : externalQualityDataMap;

    

                    

    

                                        

    

                    

    

                                                                                                        

    

                    

    

                                        

    

                    

    

                                                                                                        const qualityData = qualityDataMap[vendor.supplier_name] || {

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                                                                                            totalBatches: 0,

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                                                                                            okBatches: 0,

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                                                                                            ngBatches: 0,

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                                                                                            passRate: 0

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                                                                                        };

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                                                                    await PerformanceEvaluationDetail.create({

    

                    

    

                                        

    

                    

    

                                                                                        evaluation_id: id,

    

                    

    

                                        

    

                    

    

                                                                                        evaluation_entity_name: vendor.supplier_name,

    

                    

    

                                        

    

                    

    

                                                                                        data_type: vendor.data_type || 'purchase',

    

                    

    

                                        

    

                    

    

                                                                                        scores: {},

    

                    

    

                                        

    

                    

    

                                                                                        total_score: null,

    

                    

    

                                        

    

                    

    

                                                                                        grade: null,

    

                    

    

                                        

    

                    

    

                                                                                        remarks: null,

    

                    

    

                                        

    

                    

    

                                                                                        quality_data_snapshot: qualityData

    

                    

    

                                        

    

                    

    

                                                                                    }, { transaction });

    

                    

    

                                        

    

                    

    

                                                                                }

    

                    

    

                                        

    

                    

    

                                                            await transaction.commit();

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                                                                logger.info(`开始评价成功: ${evaluation.period_name}`);

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                        

    

                    

    

                                                                                // 合并外购和外协的质量数据

    

                    

    

                                                                                const allQualityDataMap = { ...purchaseQualityDataMap, ...externalQualityDataMap };

    

                    

    

                                        

    

                    

    

                                                                                return {

    

                    

    

                                        

    

                    

    

                                                                                    evaluation,

    

                    

    

                                        

    

                    

    

                                                                                    evaluationEntities: vendors.map(v => ({

    

                    

    

                                        

    

                    

    

                                                                                                                                    entityName: v.supplier_name,

    

                    

    

                                        

    

                    

    

                                                                                                                                    name: v.supplier_name,

    

                    

    

                                        

    

                    

    

                                                                                                                                    data_type: v.data_type || 'purchase',

    

                    

    

                                        

    

                    

    

                                                                                                                                    qualityData: allQualityDataMap[v.supplier_name] || {

    

                    

    

                                        

    

                    

    

                                                                                                                                        totalBatches: 0,

    

                    

    

                                        

    

                    

    

                                                                                                                                        okBatches: 0,

    

                    

    

                                        

    

                    

    

                                                                                                                                        ngBatches: 0,

    

                    

    

                                        

    

                    

    

                                                                                                                                        passRate: 0

    

                    

    

                                        

    

                    

    

                                                                                                                                    }

    

                    

    

                                        

    

                    

    

                                                                                                                                }))

    

                    

    

                                        

    

                    

    

                                                                                };

                } 

                // 如果状态为in_progress，继续评价

                else if (evaluation.status === 'in_progress') {

                    // 获取已有的评价详情记录

                    const details = await PerformanceEvaluationDetail.findAll({

                        where: { evaluation_id: id },

                        order: [['evaluation_entity_name', 'ASC']]

                    });

    

                    // 获取已启用绩效评价的供应商

                    const VendorConfig = require('../models/VendorConfig');

                    const vendors = await VendorConfig.findAll({

                        where: {

                            enable_performance_mgmt: true,

                            status: 'Active'

                        }

                    });

    

                    // 提取质量数据（按数据类型分别提取，确保外协/外购数据分开统计）
                    const qualityExtractionService = require('./quality-data-extraction-service');
                    
                    // 提取外购质量数据
                    const purchaseQualityDataMap = await qualityExtractionService.extractQualityData(
                        evaluation.start_date,
                        evaluation.end_date,
                        'purchase'
                    );
                    
                    // 提取外协质量数据
                    const externalQualityDataMap = await qualityExtractionService.extractQualityData(
                        evaluation.start_date,
                        evaluation.end_date,
                        'external'
                    );

                    await transaction.commit();

                    logger.info(`继续评价成功: ${evaluation.period_name}`);

                    return {
                        evaluation,
                        evaluationEntities: vendors.map(v => {
                            const dataType = v.data_type || 'purchase';
                            // 同时按供应商名称和data_type查找对应的评价详情
                            const detail = details.find(d => 
                                d.evaluation_entity_name === v.supplier_name && 
                                d.data_type === dataType
                            );
                            const qualityDataMap = dataType === 'purchase' ? purchaseQualityDataMap : externalQualityDataMap;
                            return {
                                entityName: v.supplier_name,
                                name: v.supplier_name,
                                data_type: dataType,
                                qualityData: qualityDataMap[v.supplier_name] || {
                                    totalBatches: 0,
                                    okBatches: 0,
                                    ngBatches: 0,
                                    passRate: 0
                                },
                                scores: detail ? detail.scores : {},
                                totalScore: detail ? detail.total_score : null,
                                grade: detail ? detail.grade : null,
                                remarks: detail ? detail.remarks : null
                            };
                        })
                    };

                }

                // 其他状态不允许

                else {

                    throw new Error('评价周期已完成，无法继续评价');

                }

            } catch (error) {

                await transaction.rollback();

                logger.error('开始评价失败:', error);

    

                throw error;

            }

        }

    /**
     * 获取评价周期的所有评价实体
     * @param {number} id - 评价周期ID
     * @returns {Promise<Array>} 供应商列表
     */
    async getEvaluationEntities(id) {
        try {
            const details = await PerformanceEvaluationDetail.findAll({
                where: { evaluation_id: id },
                order: [['evaluation_entity_name', 'ASC']]  // 按供应商名称升序排序（SQLite默认按拼音排序）
            });

            // 按拼音首字母排序（A-Z）
            const sortedDetails = details.sort((a, b) => {
                const nameA = a.evaluation_entity_name || '';
                const nameB = b.evaluation_entity_name || '';
                return nameA.localeCompare(nameB, 'zh-CN');
            });

            return sortedDetails.map(detail => ({
                entityName: detail.evaluation_entity_name,
                data_type: detail.data_type || 'purchase',
                scores: detail.scores,
                totalScore: detail.total_score,
                grade: detail.grade,
                remarks: detail.remarks,
                qualityData: detail.quality_data_snapshot
            }));
        } catch (error) {
            logger.error('获取评价实体列表失败:', error);
            throw error;
        }
    }

    /**
     * 保存单个评价实体的评价
     * @param {number} id - 评价周期ID
     * @param {string} entityName - 评价实体名称
     * @param {string} dataType - 数据类型（purchase-外购/external-外协）
     * @param {Object} data - 评价数据
     * @returns {Promise<Object>} 保存的评价详情
     */
    async saveEntityEvaluation(id, entityName, dataType, data) {
        logger.info(`保存评价实体评价: id=${id}, entityName=${entityName}, dataType=${dataType}`);
        try {
            const detail = await PerformanceEvaluationDetail.findOne({
                where: {
                    evaluation_id: id,
                    evaluation_entity_name: entityName,
                    data_type: dataType  // 根据数据类型查找对应记录
                },
                include: [{
                    model: require('../models/PerformanceEvaluation'),
                    as: 'evaluation'
                }]
            });

            logger.info(`查询结果: detail=${detail ? '找到记录(id=' + detail.id + ')' : '未找到记录'}`);

            if (!detail) {
                throw new Error('评价详情不存在');
            }

            // 计算总分和等级
            const configService = require('./evaluation-config-service');
            const { totalScore, grade } = configService.calculateScoreAndGrade(
                data.scores,
                detail.evaluation.config_snapshot
            );

            // 更新评价详情
            detail.scores = data.scores;
            detail.total_score = totalScore;
            detail.grade = grade;
            detail.remarks = data.remarks || null;
            await detail.save();

            logger.info(`保存评价实体评价成功: ${entityName}`);
            return detail;
        } catch (error) {
            logger.error('保存评价实体评价失败:', error);
            throw error;
        }
    }

    /**
     * 提交评价
     * @param {number} id - 评价周期ID
     * @returns {Promise<Object>} 提交的评价周期
     */
    async submitEvaluation(id) {
        try {
            const evaluation = await PerformanceEvaluation.findByPk(id);

            if (!evaluation) {
                throw new Error('评价周期不存在');
            }

            if (evaluation.status !== 'in_progress') {
                throw new Error('评价周期未开始或已完成');
            }

            // 检查是否所有有来料的评价实体都已评价
            const details = await PerformanceEvaluationDetail.findAll({
                where: { evaluation_id: id }
            });

            // 只检查有来料的供应商（totalBatches > 0）
            const unevaluatedCount = details.filter(d => {
                // 解析质量数据快照（可能是对象或字符串）
                const qualityData = d.quality_data_snapshot 
                    ? (typeof d.quality_data_snapshot === 'string' 
                        ? JSON.parse(d.quality_data_snapshot) 
                        : d.quality_data_snapshot)
                    : { totalBatches: 0 };
                const hasMaterial = qualityData.totalBatches > 0;
                
                // 只统计有来料但未评价的供应商
                return hasMaterial && (d.total_score === null || d.total_score === undefined);
            }).length;

            if (unevaluatedCount > 0) {
                throw new Error(`还有 ${unevaluatedCount} 个有来料的评价实体未完成评价`);
            }

            // 更新状态为已完成
            evaluation.status = 'completed';
            await evaluation.save();

            logger.info(`提交评价成功: ${evaluation.period_name}`);
            return evaluation;
        } catch (error) {
            logger.error('提交评价失败:', error);
            throw error;
        }
    }

    /**
     * 获取评价结果
     * @param {number} id - 评价周期ID
     * @returns {Promise<Object>} 评价结果
     */
    async getEvaluationResults(id) {
        try {
            const evaluation = await PerformanceEvaluation.findByPk(id, {
                include: [{
                    model: PerformanceEvaluationDetail,
                    as: 'details'
                }]
            });

            if (!evaluation) {
                throw new Error('评价周期不存在');
            }

            // 计算统计数据
            const details = evaluation.details || [];
            const totalEntities = details.length;
            const evaluatedCount = details.filter(d => d.total_score !== null).length;
            const averageScore = evaluatedCount > 0
                ? details.reduce((sum, d) => sum + (d.total_score || 0), 0) / evaluatedCount
                : 0;

            // 统计各等级数量
            const gradeCount = {
                '优秀': 0,
                '合格': 0,
                '整改后合格': 0,
                '不合格': 0
            };

            details.forEach(d => {
                if (d.grade && gradeCount[d.grade] !== undefined) {
                    gradeCount[d.grade]++;
                }
            });

            return {
                evaluation,
                details: details.map(d => ({
                    entityName: d.evaluation_entity_name,
                    scores: d.scores,
                    totalScore: d.total_score,
                    grade: d.grade,
                    remarks: d.remarks,
                    qualityData: d.quality_data_snapshot
                })),
                statistics: {
                    totalEntities,
                    evaluatedCount,
                    unevaluatedCount: totalEntities - evaluatedCount,
                    averageScore: parseFloat(averageScore.toFixed(2)),
                    gradeCount
                }
            };
        } catch (error) {
            logger.error('获取评价结果失败:', error);
            throw error;
        }
    }

    /**
     * 获取趋势数据
     * @param {string} entityName - 评价实体名称
     * @returns {Promise<Array>} 趋势数据
     */
    async getTrendData(entityName) {
        try {
            const evaluations = await PerformanceEvaluation.findAll({
                where: { status: 'completed' },
                order: [['start_date', 'ASC']],
                include: [{
                    model: PerformanceEvaluationDetail,
                    as: 'details',
                    where: { evaluation_entity_name: entityName },
                    required: true
                }]
            });

            return evaluations.map(e => ({
                periodName: e.period_name,
                startDate: e.start_date,
                endDate: e.end_date,
                scores: e.details[0].scores,
                totalScore: e.details[0].total_score,
                grade: e.details[0].grade
            }));
        } catch (error) {
            logger.error('获取趋势数据失败:', error);
            throw error;
        }
    }

    /**
     * 获取年度累计数据
     * @param {number} year - 年份
     * @param {string} type - 数据类型（purchase-外购/external-外协）
     * @returns {Promise<Object>} 累计数据
     */
    async getAccumulatedResults(year, type) {
        try {
            // 查询该年份所有已完成的评价周期
            // 使用日期范围查询（SQLite兼容）
            const startDate = `${year}-01-01`;
            const endDate = `${parseInt(year) + 1}-01-01`;

            const evaluations = await PerformanceEvaluation.findAll({
                where: {
                    status: 'completed',
                    [Op.or]: [
                        {
                            [Op.and]: [
                                { start_date: { [Op.gte]: startDate } },
                                { start_date: { [Op.lt]: endDate } }
                            ]
                        },
                        {
                            [Op.and]: [
                                { end_date: { [Op.gte]: startDate } },
                                { end_date: { [Op.lt]: endDate } }
                            ]
                        }
                    ]
                },
                order: [['start_date', 'ASC']],
                include: [{
                    model: PerformanceEvaluationDetail,
                    as: 'details',
                    where: type ? { data_type: type } : undefined,
                    required: false
                }]
            });

            if (evaluations.length === 0) {
                return {
                    year,
                    type,
                    evaluations: [],
                    statistics: {
                        totalEntities: 0,
                        evaluatedCount: 0,
                        unevaluatedCount: 0,
                        averageScore: 0,
                        gradeCount: {
                            '优秀': 0,
                            '合格': 0,
                            '整改后合格': 0,
                            '不合格': 0
                        }
                    },
                    details: [],
                    trendData: []
                };
            }

            // 收集所有评价详情
            const allDetails = [];
            evaluations.forEach(evaluation => {
                if (evaluation.details && evaluation.details.length > 0) {
                    evaluation.details.forEach(detail => {
                        allDetails.push({
                            ...detail.dataValues,
                            evaluation: evaluation.dataValues
                        });
                    });
                }
            });

            // 使用Set去重统计唯一供应商数量
            const uniqueEntityNames = new Set(allDetails.map(d => d.evaluation_entity_name));
            const totalEntities = uniqueEntityNames.size;

            // 构建供应商评价状态映射（去重）
            const entityStatusMap = new Map();
            allDetails.forEach(d => {
                const entityName = d.evaluation_entity_name;
                // 如果该供应商已经有评价记录，就标记为已评价
                if (d.total_score !== null && !entityStatusMap.has(entityName)) {
                    entityStatusMap.set(entityName, 'evaluated');
                } else if (!entityStatusMap.has(entityName)) {
                    entityStatusMap.set(entityName, 'unevaluated');
                }
            });

            // 计算统计数据（基于去重后的供应商）
            const evaluatedCount = Array.from(entityStatusMap.values()).filter(status => status === 'evaluated').length;
            const unevaluatedCount = totalEntities - evaluatedCount;

            // 计算平均得分（基于所有评价记录，不去重）
            const evaluatedDetails = allDetails.filter(d => d.total_score !== null);
            const averageScore = evaluatedDetails.length > 0
                ? evaluatedDetails.reduce((sum, d) => sum + (d.total_score || 0), 0) / evaluatedDetails.length
                : 0;

            // 统计各等级数量（基于所有评价记录，不去重）
            const gradeCount = {
                '优秀': 0,
                '合格': 0,
                '整改后合格': 0,
                '不合格': 0
            };

            evaluatedDetails.forEach(d => {
                if (d.grade && gradeCount[d.grade] !== undefined) {
                    gradeCount[d.grade]++;
                }
            });

            // 获取趋势数据（按周期）
            const trendData = evaluations.map(evaluation => {
                const periodDetails = evaluation.details || [];
                const periodAverageScore = periodDetails.length > 0
                    ? periodDetails
                        .filter(d => d.total_score !== null)
                        .reduce((sum, d) => sum + (d.total_score || 0), 0) / periodDetails.filter(d => d.total_score !== null).length
                    : 0;

                return {
                    periodName: evaluation.period_name,
                    startDate: evaluation.start_date,
                    endDate: evaluation.end_date,
                    averageScore: parseFloat(periodAverageScore.toFixed(2)),
                    detailsCount: periodDetails.length
                };
            });

            return {
                year,
                type,
                evaluations: evaluations.map(e => ({
                    id: e.id,
                    periodName: e.period_name,
                    startDate: e.start_date,
                    endDate: e.end_date,
                    status: e.status
                })),
                statistics: {
                    totalEntities,
                    evaluatedCount,
                    unevaluatedCount: totalEntities - evaluatedCount,
                    averageScore: parseFloat(averageScore.toFixed(2)),
                    gradeCount
                },
                details: allDetails.map(d => ({
                    evaluationId: d.evaluation_id,
                    periodName: d.evaluation.period_name,
                    entityName: d.evaluation_entity_name,
                    scores: d.scores,
                    totalScore: d.total_score,
                    grade: d.grade,
                    remarks: d.remarks,
                    qualityData: d.quality_data_snapshot
                })),
                trendData
            };
        } catch (error) {
            logger.error('获取年度累计数据失败:', error);
            throw error;
        }
    }
}

module.exports = new PerformanceEvaluationService();