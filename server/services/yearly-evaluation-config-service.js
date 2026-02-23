const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * YearlyEvaluationConfigService
 *
 * 年度评价配置管理服务
 */
class YearlyEvaluationConfigService {
    constructor() {
        this.configFilePath = path.join(__dirname, '../../data/yearly-evaluation-config.json');
    }

    /**
     * 获取默认配置
     * @returns {Object} 默认配置
     */
    getDefaultConfig() {
        return {
            dimensions: [
                {
                    name: "来料质量",
                    key: "quality",
                    weight: 0.30,
                    type: "auto",
                    calculationRule: "取全年各月质量维度平均分",
                    scoringStandard: "以月度来料质量得分平均值为准"
                },
                {
                    name: "使用情况",
                    key: "usage",
                    weight: 0.20,
                    type: "auto",
                    calculationRule: "取全年各月使用情况维度平均分",
                    scoringStandard: "以月度上线使用情况得分平均值为准"
                },
                {
                    name: "服务",
                    key: "service",
                    weight: 0.10,
                    type: "auto",
                    calculationRule: "取全年各月服务维度平均分",
                    scoringStandard: "以月度服务得分平均值为准"
                },
                {
                    name: "交付",
                    key: "delivery",
                    weight: 0.15,
                    type: "auto",
                    calculationRule: "取全年各月交付维度平均分",
                    scoringStandard: "以月度交付得分平均值为准"
                },
                {
                    name: "持续改进能力",
                    key: "improvement",
                    weight: 0.15,
                    type: "manual",
                    calculationRule: "考核改进事项完成情况，改进事项包含但不限于获取新体系认证证书、内部良率改善、产能提升、自动化改造等",
                    scoringStandard: "每项33.33分，3项满分"
                },
                {
                    name: "价格水平",
                    key: "price",
                    weight: 0.10,
                    type: "manual",
                    calculationRule: "市场行情无大幅度波动前提下，（上年度综合单价 - 评价期综合单价）/ 上年度综合单价 ×100%",
                    scoringStandard: "价格下降5%以上得100分；价格下降2%~5%得80分；价格平稳得60分；价格高于2%~5%得0分"
                },
                {
                    name: "绿色环保",
                    key: "environmental",
                    weight: 0,
                    type: "green",
                    calculationRule: "考核是否符合行业、国标环保要求",
                    scoringStandard: "需提供REACH、RoHs检测报告且结果合格，方可继续合作；未提供报告或未签订环境物质管理协议，或报告不合格，直接判定为不合格"
                }
            ],
            gradeRules: [
                { min: 95, max: 100, label: "优秀", color: "#16a34a", strategy: "同等条件优先采购" },
                { min: 85, max: 95, label: "良好", color: "#2563eb", strategy: "可保持正常采购" },
                { min: 70, max: 85, label: "合格", color: "#f59e0b", strategy: "要求供应商内部改善" },
                { min: 0, max: 70, label: "不合格", color: "#dc2626", strategy: "暂停供货或剔除供应商目录" }
            ]
        };
    }

    /**
     * 获取年度评价配置
     * @returns {Promise<Object>} 配置对象
     */
    async getConfig() {
        try {
            await fs.access(this.configFilePath);
            const data = await fs.readFile(this.configFilePath, 'utf-8');
            const config = JSON.parse(data);
            logger.info('获取年度评价配置成功');
            return config;
        } catch (error) {
            logger.warn('年度评价配置文件不存在，使用默认配置');
            const defaultConfig = this.getDefaultConfig();
            await this.saveConfig(defaultConfig);
            return defaultConfig;
        }
    }

    /**
     * 保存年度评价配置
     * @param {Object} config - 配置对象
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

            logger.info('保存年度评价配置成功');
            return config;
        } catch (error) {
            logger.error('保存年度评价配置失败:', error);
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

        // 验证权重总和（排除绿色环保类型）
        const weightedDimensions = config.dimensions.filter(d => d.type !== 'green');
        const totalWeight = weightedDimensions.reduce((sum, dim) => sum + (dim.weight || 0), 0);
        if (Math.abs(totalWeight - 1) > 0.01) {
            throw new Error(`权重总和必须为1，当前为${totalWeight.toFixed(2)}`);
        }

        // 验证每个维度
        for (const dimension of config.dimensions) {
            if (!dimension.name || !dimension.key) {
                throw new Error('维度必须包含name和key');
            }

            if (dimension.type !== 'green' && (typeof dimension.weight !== 'number' || dimension.weight <= 0)) {
                throw new Error(`维度${dimension.name}的权重必须为正数`);
            }

            // 验证type字段
            if (!['auto', 'manual', 'green'].includes(dimension.type)) {
                throw new Error(`维度${dimension.name}的type必须是auto、manual或green`);
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

        // 检查等级规则覆盖范围
        const sortedRules = [...config.gradeRules].sort((a, b) => a.min - b.min);
        if (sortedRules[0].min > 0) {
            throw new Error('等级规则未覆盖0分');
        }
        if (sortedRules[sortedRules.length - 1].max < 100) {
            throw new Error('等级规则未覆盖100分');
        }
    }

    /**
     * 重置为默认配置
     * @returns {Promise<Object>} 默认配置
     */
    async resetToDefault() {
        logger.info('重置年度评价为默认配置');
        const defaultConfig = this.getDefaultConfig();
        return await this.saveConfig(defaultConfig);
    }

    /**
     * 计算年度总分和等级
     * @param {Object} scores - 各维度分数
     * @param {Object} config - 年度配置
     * @param {boolean} environmentalPass - 绿色环保是否合格
     * @returns {Object} 总分和等级
     */
    calculateScoreAndGrade(scores, config, environmentalPass = true) {
        try {
            const effectiveConfig = config || this.getDefaultConfig();

            // 如果环保不合格，一票否决
            if (!environmentalPass) {
                return {
                    totalScore: 0,
                    grade: '不合格',
                    vetoed: true,
                    vetoReason: '绿色环保不合格'
                };
            }

            // 计算总分
            let totalScore = 0;
            for (const dimension of effectiveConfig.dimensions) {
                if (dimension.type !== 'green') {
                    const score = scores[dimension.key] || 0;
                    totalScore += score * dimension.weight;
                }
            }

            // 确定等级
            let grade = '不合格';
            const sortedRules = [...effectiveConfig.gradeRules].sort((a, b) => a.min - b.min);
            for (let i = 0; i < sortedRules.length; i++) {
                const rule = sortedRules[i];
                const isLast = i === sortedRules.length - 1;
                if (isLast) {
                    if (totalScore >= rule.min && totalScore <= rule.max) {
                        grade = rule.label;
                        break;
                    }
                } else {
                    if (totalScore >= rule.min && totalScore < rule.max) {
                        grade = rule.label;
                        break;
                    }
                }
            }

            return {
                totalScore: parseFloat(totalScore.toFixed(2)),
                grade,
                vetoed: false
            };
        } catch (error) {
            logger.error('计算年度总分和等级失败:', error);
            return {
                totalScore: 0,
                grade: '不合格',
                vetoed: false
            };
        }
    }
}

module.exports = new YearlyEvaluationConfigService();
