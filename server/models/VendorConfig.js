const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/config');

/**
 * VendorConfig模型
 * 
 * 供应商配置中心表，用于统一管理供应商在各模块的启用状态
 * 
 * 字段说明:
 * - id: 主键
 * - supplier_name: 供应商名称（唯一）
 * - source: 数据来源（IQC/MANUAL/IMPORT）
 * - enable_document_mgmt: 是否启用资料管理
 * - enable_performance_mgmt: 是否启用绩效评价
 * - status: 状态（Active/Inactive）
 * - created_at: 创建时间
 * - updated_at: 更新时间
 */
const VendorConfig = sequelize.define('VendorConfig', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '主键ID'
    },
    supplier_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: '供应商名称（唯一）'
    },
    source: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'IQC',
        comment: '数据来源：IQC/MANUAL/IMPORT'
    },
    enable_document_mgmt: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否启用资料管理'
    },
    enable_performance_mgmt: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否启用绩效评价'
    },
    status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'Inactive',
        comment: '状态：Active/Inactive'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '创建时间'
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '更新时间'
    }
}, {
    tableName: 'vendor_config',
    comment: '供应商配置中心表',
    timestamps: true,
    underscored: true,
    indexes: [
        {
            name: 'idx_vendor_config_supplier_name',
            fields: ['supplier_name']
        },
        {
            name: 'idx_vendor_config_source',
            fields: ['source']
        },
        {
            name: 'idx_vendor_config_status',
            fields: ['status']
        },
        {
            name: 'idx_vendor_config_enable_document',
            fields: ['enable_document_mgmt']
        },
        {
            name: 'idx_vendor_config_enable_performance',
            fields: ['enable_performance_mgmt']
        }
    ]
});

/**
 * 定义关联关系
 */
VendorConfig.associate = (models) => {
    // VendorConfig与Supplier通过supplier_name关联
    // 注意：这是逻辑关联，不是外键关联
    // 因为Supplier表可能不存在或数据不一致
};

module.exports = VendorConfig;