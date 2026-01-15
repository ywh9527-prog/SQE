const PerformanceEvaluation = require('../models/PerformanceEvaluation');
const PerformanceEvaluationDetail = require('../models/PerformanceEvaluationDetail');
const { sequelize } = require('../database/config');
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

    

                    // 提取质量数据

                    const qualityExtractionService = require('./quality-data-extraction-service');

                    const qualityDataMap = await qualityExtractionService.extractQualityData(

                        evaluation.start_date,

                        evaluation.end_date

                    );

    

                    // 创建评价详情记录

                    for (const vendor of vendors) {

                        const qualityData = qualityDataMap[vendor.supplier_name] || {

                            totalBatches: 0,

                            okBatches: 0,

                            ngBatches: 0,

                            passRate: 0

                        };

    

                        await PerformanceEvaluationDetail.create({

                            evaluation_id: id,

                            evaluation_entity_name: vendor.supplier_name,

                            scores: {},

                            total_score: null,

                            grade: null,

                            remarks: null,

                            quality_data_snapshot: qualityData

                        }, { transaction });

                    }

    

                    await transaction.commit();

                    logger.info(`开始评价成功: ${evaluation.period_name}`);

    

                    return {

                        evaluation,

                        evaluationEntities: vendors.map(v => ({

                            name: v.supplier_name,

                            qualityData: qualityDataMap[v.supplier_name] || {

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

    

                    // 提取质量数据

                    const qualityExtractionService = require('./quality-data-extraction-service');

                    const qualityDataMap = await qualityExtractionService.extractQualityData(

                        evaluation.start_date,

                        evaluation.end_date

                    );

    

                    await transaction.commit();

                    logger.info(`继续评价成功: ${evaluation.period_name}`);

    

                    return {

                        evaluation,

                        evaluationEntities: vendors.map(v => {

                            const detail = details.find(d => d.evaluation_entity_name === v.supplier_name);

                            return {

                                name: v.supplier_name,

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
     * 获取评价周期的供应商列表
     * @param {number} id - 评价周期ID
     * @returns {Promise<Array>} 供应商列表
     */
    async getEvaluationEntities(id) {
        try {
            const details = await PerformanceEvaluationDetail.findAll({
                where: { evaluation_id: id },
                order: [['evaluation_entity_name', 'ASC']]
            });

            return details.map(detail => ({
                entityName: detail.evaluation_entity_name,
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
     * @param {Object} data - 评价数据
     * @returns {Promise<Object>} 保存的评价详情
     */
    async saveEntityEvaluation(id, entityName, data) {
        try {
            const detail = await PerformanceEvaluationDetail.findOne({
                where: {
                    evaluation_id: id,
                    evaluation_entity_name: entityName
                }
            });

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

            // 检查是否所有评价实体都已评价
            const details = await PerformanceEvaluationDetail.findAll({
                where: { evaluation_id: id }
            });

            const unevaluatedCount = details.filter(d => d.total_score === null).length;

            if (unevaluatedCount > 0) {
                throw new Error(`还有 ${unevaluatedCount} 个评价实体未完成评价`);
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
}

module.exports = new PerformanceEvaluationService();