const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/config');

/**
 * 物料数据模型
 * 用于管理供应商的物料信息
 * 
 * 业务场景:
 * - 每个供应商可以有多个物料 (如: 电木粉、PIN脚等)
 * - 物料名称由用户自定义,不同供应商可以有相同名称的物料
 * - 每个物料下可以有多个具体构成
 */
const Material = sequelize.define('Material', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: '物料ID'
    },
    supplierId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'supplier_id',
        comment: '供应商ID'
    },
    materialName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'material_name',
        comment: '物料名称 (用户自定义,如: 电木粉、PIN脚等)'
    },
    materialCode: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'material_code',
        comment: '物料编码 (可选)'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '物料描述'
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
    tableName: 'materials',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['supplier_id']
        },
        {
            fields: ['material_name']
        },
        {
            // 同一供应商下物料名称唯一
            unique: true,
            fields: ['supplier_id', 'material_name']
        }
    ],
    comment: '物料信息表'
});

/**
 * 定义关联关系
 */
Material.associate = (models) => {
    // 一个物料属于一个供应商
    Material.belongsTo(models.Supplier, {
        foreignKey: 'supplier_id',
        as: 'supplier'
    });

    // 一个物料有多个具体构成
    Material.hasMany(models.MaterialComponent, {
        foreignKey: 'material_id',
        as: 'components'
    });
};

/**
 * 实例方法
 */
Material.prototype.getComponentCount = async function () {
    const MaterialComponent = require('./MaterialComponent');
    return await MaterialComponent.count({
        where: { materialId: this.id }
    });
};

/**
 * 类方法
 */
Material.findBySupplier = function (supplierId, options = {}) {
    return this.findAll({
        where: { supplierId, status: 'Active' },
        order: [['materialName', 'ASC']],
        ...options
    });
};

Material.findByName = function (supplierId, materialName) {
    return this.findOne({
        where: {
            supplierId,
            materialName,
            status: 'Active'
        }
    });
};

module.exports = Material;
