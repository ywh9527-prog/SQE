const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * EvaluationConfigService
 *
 * 评价配置管理服务
 */
class EvaluationConfigService {
    constructor() {
        this.configFilePath = path.join(__dirname, '../../data/evaluation-config.json');
        this.defaultConfig = {
            dimensions: [
                { name: '质量', key: 'quality', weight: 0.4, calculationRule: '合格批次量 / 到货批次量 × 100%', scoringStandard: '当月合格批次/当月交付总批次×100%×权重' },
                { name: '使用情况', key: 'usage', weight: 0.3, calculationRule: '来料上线使用情况、下游客户端投诉', scoringStandard: '现场反馈性能/尺寸类-10分，外观类-5分，客诉一次-15分' },
                { name: '服务', key: 'service', weight: 0.15, calculationRule: '供应商评价期间业务、协作、共同提升、配合度考核', scoringStandard: '异常反馈等事项每次未及时响应扣4分；当月仅发生一次事项未及时响应扣10分，仅两次的每次扣5分' },
                { name: '交付', key: 'delivery', weight: 0.15, calculationRule: '按时按量到货批次量 / 到货批次量 × 100%', scoringStandard: '按时按量批次交付率低于100%每1%扣2分，不满1%按1%计算' }
            ],
            gradeColors: [
                '#16a34a',
                '#2563eb',
                '#f59e0b',
                '#dc2626',
                '#6b7280',
                '#1f2937'
            ],
            gradeRules: [
                { min: 95, max: 100, label: '优秀' },
                { min: 85, max: 95, label: '合格' },
                { min: 70, max: 85, label: '整改后合格' },
                { min: 0, max: 70, label: '不合格' }
            ]
        };
    }

    /**
     * 获取当前评价配置
     * @returns {Promise<Object>} 评价配置
     */
    async getCurrentConfig() {
        try {
            // 检查配置文件是否存在
            try {
                await fs.access(this.configFilePath);
            } catch (error) {
                // 文件不存在，创建默认配置
                await this.saveConfig(this.defaultConfig);
                return JSON.parse(JSON.stringify(this.defaultConfig));
            }

            // 读取配置文件
            const configData = await fs.readFile(this.configFilePath, 'utf-8');
            const config = JSON.parse(configData);

            logger.info('获取评价配置成功');
            return config;
        } catch (error) {
            logger.error('获取评价配置失败:', error);
            // 返回默认配置
            return JSON.parse(JSON.stringify(this.defaultConfig));
        }
    }

    /**
     * 保存评价配置
     * @param {Object} config - 评价配置
     * @returns {Promise<Object>} 保存的配置
     */
    async saveConfig(config) {
        try {
            // 验证配置
            this.validateConfig(config);

            // 确保data目录存在
            const dataDir = path.dirname(this.configFilePath);
            await fs.mkdir(dataDir, { recursive: true });

            // 保存配置文件
            await fs.writeFile(
                this.configFilePath,
                JSON.stringify(config, null, 2),
                'utf-8'
            );

            logger.info('保存评价配置成功');
            return config;
        } catch (error) {
            logger.error('保存评价配置失败:', error);
            throw error;
        }
    }

    /**
     * 更新评价配置
     * @param {Object} config - 新的评价配置
     * @returns {Promise<Object>} 更新后的配置
     */
    async updateConfig(config) {
        const { sequelize } = require('../database/config');
        const PerformanceEvaluation = require('../models/PerformanceEvaluation');
        const PerformanceEvaluationDetail = require('../models/PerformanceEvaluationDetail');
        const transaction = await sequelize.transaction();

        try {
            // 验证配置
            this.validateConfig(config);

            // 保存配置到文件
            await this.saveConfigToFile(config, transaction);

            // 检查是否存在进行中的评价周期
            const inProgressEvaluations = await PerformanceEvaluation.findAll({
                where: { status: 'in_progress' },
                transaction
            });

            if (inProgressEvaluations.length > 0) {
                logger.info(`检测到 ${inProgressEvaluations.length} 个进行中的评价周期，开始更新配置快照`);

                let totalRecalculated = 0;

                // 更新每个进行中评价周期的配置快照，并重新计算已评价的供应商分数
                for (const evaluation of inProgressEvaluations) {
                    // 获取该评价周期的所有评价详情
                    const details = await PerformanceEvaluationDetail.findAll({
                        where: { evaluation_id: evaluation.id },
                        transaction
                    });

                    if (details.length > 0) {
                        logger.info(`评价周期 ${evaluation.period_name} 已有 ${details.length} 条评价数据，开始重新计算`);

                        // 只重新计算已评价的供应商分数（scores 有实际内容才计算）
                        // 未评价的供应商保持 total_score 和 grade 为 null，显示为"待评价"状态
                        for (const detail of details) {
                            // 检查是否已评价（scores 不为空对象）
                            const isEvaluated = detail.scores && Object.keys(detail.scores).length > 0;
                            
                            if (isEvaluated) {
                                const { totalScore, grade } = this.calculateScoreAndGrade(
                                    detail.scores,
                                    config  // 使用新配置
                                );

                                detail.total_score = totalScore;
                                detail.grade = grade;
                                await detail.save({ transaction });
                                totalRecalculated++;
                            }
                            // 未评价的供应商不处理，保持原状（total_score = null）
                        }
                    }

                    // 更新配置快照
                    evaluation.config_snapshot = config;
                    await evaluation.save({ transaction });
                }

                await transaction.commit();
                logger.info(`已更新 ${inProgressEvaluations.length} 个评价周期的配置快照，重新计算了 ${totalRecalculated} 条评价数据`);

                return {
                    config,
                    updatedEvaluations: inProgressEvaluations.length,
                    recalculatedDetails: totalRecalculated
                };
            } else {
                await transaction.commit();
                logger.info('没有进行中的评价周期，仅更新配置文件');
                return {
                    config,
                    updatedEvaluations: 0,
                    recalculatedDetails: 0
                };
            }
        } catch (error) {
            await transaction.rollback();
            logger.error('更新评价配置失败:', error);
            throw error;
        }
    }

    /**
     * 保存配置到文件
     * @param {Object} config - 评价配置
     * @param {Object} transaction - 数据库事务
     * @returns {Promise<Object>} 保存的配置
     */
    async saveConfigToFile(config, transaction) {
        try {
            // 验证配置
            this.validateConfig(config);

            // 确保data目录存在
            const dataDir = path.dirname(this.configFilePath);
            await fs.mkdir(dataDir, { recursive: true });

            // 保存配置文件
            await fs.writeFile(
                this.configFilePath,
                JSON.stringify(config, null, 2),
                'utf-8'
            );

            logger.info('保存评价配置文件成功');
            return config;
        } catch (error) {
            logger.error('保存评价配置文件失败:', error);
            throw error;
        }
    }

    /**
     * 验证配置
     * @param {Object} config - 评价配置
     * @throws {Error} 配置无效时抛出错误
     */
    validateConfig(config) {
        if (!config) {
            throw new Error('配置不能为空');
        }

        if (!config.dimensions || !Array.isArray(config.dimensions)) {
            throw new Error('维度配置无效');
        }

        if (config.dimensions.length === 0) {
            throw new Error('至少需要一个评价维度');
        }

        // 验证权重总和为1
        const totalWeight = config.dimensions.reduce((sum, dim) => sum + (dim.weight || 0), 0);
        if (Math.abs(totalWeight - 1) > 0.01) {
            throw new Error(`权重总和必须为1，当前为${totalWeight.toFixed(2)}`);
        }

        // 验证每个维度
        for (const dimension of config.dimensions) {
            if (!dimension.name || !dimension.key) {
                throw new Error('维度必须包含name和key');
            }

            if (typeof dimension.weight !== 'number' || dimension.weight <= 0) {
                throw new Error(`维度${dimension.name}的权重必须为正数`);
            }
        }

        // 验证等级规则
        if (!config.gradeRules || !Array.isArray(config.gradeRules)) {
            throw new Error('等级规则配置无效');
        }

        if (config.gradeRules.length === 0) {
            throw new Error('至少需要一个等级规则');
        }

        // 验证每个等级规则
        for (const rule of config.gradeRules) {
            if (typeof rule.min !== 'number' || typeof rule.max !== 'number') {
                throw new Error('等级规则必须包含min和max');
            }

            if (rule.min >= rule.max) {
                throw new Error(`等级${rule.label}的min必须小于max`);
            }

            if (!rule.label) {
                throw new Error('等级规则必须包含label');
            }
        }

        // 验证等级规则覆盖范围
        const sortedRules = [...config.gradeRules].sort((a, b) => a.min - b.min);

        // 评级算法使用左闭右闭区间 [min, max]
        // 例如: 优秀[95,100] 合格[85,95] 整改后合格[70,85] 不合格[0,70]
        // 评分95分时只会匹配到"合格"(因为 <= 95)，不会同时匹配到"优秀"
        // 评分100分时会匹配到"优秀"(因为 <= 100)
        // 检查是否有重叠
        for (let i = 0; i < sortedRules.length - 1; i++) {
            if (sortedRules[i].max > sortedRules[i + 1].min) {
                throw new Error(`等级规则${sortedRules[i].label}和${sortedRules[i + 1].label}有重叠`);
            }
        }

        // 检查是否覆盖0-100范围
        if (sortedRules[0].min > 0) {
            throw new Error('等级规则未覆盖0分');
        }

        if (sortedRules[sortedRules.length - 1].max < 100) {
            throw new Error('等级规则未覆盖100分');
        }
    }

    /**
     * 计算总分和等级
     * @param {Object} scores - 各维度分数
     * @param {Object} config - 评价配置
     * @returns {Object} 总分和等级
     */
    calculateScoreAndGrade(scores, config) {
        try {
            // 如果没有提供配置，使用默认配置
            const effectiveConfig = config || this.defaultConfig;

            // 计算总分
            let totalScore = 0;
            for (const dimension of effectiveConfig.dimensions) {
                const score = scores[dimension.key] || 0;
                totalScore += score * dimension.weight;
            }

            // 确定等级 - 使用左闭右闭区间 [min, max]
            let grade = '不合格';
            for (const rule of effectiveConfig.gradeRules) {
                if (totalScore >= rule.min && totalScore <= rule.max) {
                    grade = rule.label;
                    break;
                }
            }

            return {
                totalScore: parseFloat(totalScore.toFixed(2)),
                grade
            };
        } catch (error) {
            logger.error('计算总分和等级失败:', error);
            return {
                totalScore: 0,
                grade: '不合格'
            };
        }
    }

    /**
     * 重置为默认配置
     * @returns {Promise<Object>} 默认配置
     */
    async resetToDefault() {
        logger.info('重置为默认配置');
        return await this.saveConfig(JSON.parse(JSON.stringify(this.defaultConfig)));
    }
}

module.exports = new EvaluationConfigService();