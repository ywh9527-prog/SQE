const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/config');

/**
 * PerformanceEvaluation模型
 *
 * 供应商绩效评价周期表
 *
 * 字段说明:
 * - id: 主键ID
 * - period_name: 周期名称（如"2025年1月"）
 * - period_type: 周期类型（monthly/quarterly/yearly/custom）
 * - start_date: 开始日期
 * - end_date: 结束日期
 * - status: 评价状态（draft/in_progress/completed）
 * - config_snapshot: 评价配置快照（维度、权重、等级规则）
 * - created_at: 创建时间
 * - updated_at: 更新时间
 */
const PerformanceEvaluation = sequelize.define('PerformanceEvaluation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键ID'
    },
    period_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '周期名称'
    },
    period_type: {
        type: DataTypes.ENUM('monthly', 'quarterly', 'yearly', 'custom'),
        allowNull: false,
        comment: '周期类型：monthly-月度, quarterly-季度, yearly-年度, custom-自定义'
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: '开始日期'
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: '结束日期'
    },
    status: {
        type: DataTypes.ENUM('draft', 'in_progress', 'completed'),
        defaultValue: 'draft',
        comment: '评价状态：draft-草稿, in_progress-进行中, completed-已完成'
    },
    config_snapshot: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '评价配置快照（维度、权重、等级规则）'
    }
}, {
    tableName: 'performance_evaluations',
    timestamps: true,
    underscored: true,
    comment: '供应商绩效评价周期表'
});

// 建立模型关联
PerformanceEvaluation.associate = (models) => {
    PerformanceEvaluation.hasMany(models.PerformanceEvaluationDetail, {
        foreignKey: 'evaluation_id',
        as: 'details'
    });
};

module.exports = PerformanceEvaluation;