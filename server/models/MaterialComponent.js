const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/config');

/**
 * 物料具体构成数据模型
 * 用于管理物料的具体构成信息
 * 
 * 业务场景:
 * - 每个物料可以有多个具体构成 (如: 成分A、成分B等)
 * - 构成名称由用户自定义,不同物料可以有相同名称的构成
 * - 每个具体构成下可以有多个资料 (ROHS、REACH、HF等)
 */
const MaterialComponent = sequelize.define('MaterialComponent', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '构成ID'
    },
    materialId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'material_id',
        comment: '物料ID'
    },
    componentName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'component_name',
        comment: '具体构成名称 (用户自定义,如: 成分A、成分B等)'
    },
    componentCode: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'component_code',
        comment: '构成编码 (可选)'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '构成描述'
    },
    status: {
        type: DataTypes.ENUM('Active', 'Inactive'),
        allowNull: false,
        defaultValue: 'Active',
        comment: '状态: Active(活跃), Inactive(停用)'
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at',
        comment: '创建时间'
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at',
        comment: '更新时间'
    }
}, {
    tableName: 'material_components',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['material_id']
        },
        {
            fields: ['component_name']
        },
        {
            // 同一物料下构成名称唯一
            unique: true,
            fields: ['material_id', 'component_name']
        }
    ],
    comment: '物料具体构成表'
});

/**
 * 定义关联关系
 */
MaterialComponent.associate = (models) => {
    // 一个具体构成属于一个物料
    MaterialComponent.belongsTo(models.Material, {
        foreignKey: 'material_id',
        as: 'material'
    });

    // 一个具体构成有多个资料
    MaterialComponent.hasMany(models.SupplierDocument, {
        foreignKey: 'component_id',
        as: 'documents'
    });
};

/**
 * 实例方法
 */
MaterialComponent.prototype.getDocumentCount = async function () {
    const SupplierDocument = require('./SupplierDocument');
    return await SupplierDocument.count({
        where: {
            componentId: this.id,
            status: 'active',
            isCurrent: true
        }
    });
};

/**
 * 类方法
 */
MaterialComponent.findByMaterial = function (materialId, options = {}) {
    return this.findAll({
        where: { materialId, status: 'Active' },
        order: [['componentName', 'ASC']],
        ...options
    });
};

MaterialComponent.findByName = function (materialId, componentName) {
    return this.findOne({
        where: {
            materialId,
            componentName,
            status: 'Active'
        }
    });
};

module.exports = MaterialComponent;
