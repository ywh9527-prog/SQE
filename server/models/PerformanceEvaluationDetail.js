const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/config');

/**
 * PerformanceEvaluationDetail模型
 *
 * 供应商绩效评价详情表
 *
 * 字段说明:
 * - id: 主键ID
 * - evaluation_id: 评价周期ID（外键）
 * - vendor_name: 供应商名称
 * - scores: 各维度分数（JSON格式，支持自定义维度）
 * - total_score: 总分（0-100）
 * - grade: 等级（优秀/合格/整改后合格/不合格）
 * - remarks: 评价备注
 * - quality_data_snapshot: 质量数据快照（总批次、合格批次、合格率）
 * - created_at: 创建时间
 * - updated_at: 更新时间
 */
const PerformanceEvaluationDetail = sequelize.define('PerformanceEvaluationDetail', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键ID'
    },
    evaluation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '评价周期ID'
    },
    vendor_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '供应商名称'
    },
    scores: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '各维度分数（JSON格式，如{quality: 90, delivery: 85, service: 88}）'
    },
    total_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: '总分（0-100）'
    },
    grade: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: '等级（优秀/合格/整改后合格/不合格）'
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '评价备注'
    },
    quality_data_snapshot: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '质量数据快照（totalBatches, okBatches, ngBatches, passRate）'
    }
}, {
    tableName: 'performance_evaluation_details',
    timestamps: true,
    underscored: true,
    comment: '供应商绩效评价详情表'
});

// 建立模型关联
PerformanceEvaluationDetail.associate = (models) => {
    PerformanceEvaluationDetail.belongsTo(models.PerformanceEvaluation, {
        foreignKey: 'evaluation_id',
        as: 'evaluation'
    });
};

module.exports = PerformanceEvaluationDetail;