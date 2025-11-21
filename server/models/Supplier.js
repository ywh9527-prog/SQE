const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/config');

const Supplier = sequelize.define('Supplier', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    code: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '供应商编码'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: '供应商名称'
    },
    contact_person: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '联系人'
    },
    contact_email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isEmail: true
        },
        comment: '联系邮箱'
    },
    contact_phone: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '联系电话'
    },
    level: {
        type: DataTypes.ENUM('Strategic', 'Core', 'General', 'Eliminated'),
        defaultValue: 'General',
        comment: '供应商等级: Strategic(战略), Core(核心), General(一般), Eliminated(淘汰)'
    },
    status: {
        type: DataTypes.ENUM('Active', 'Inactive', 'Blacklisted'),
        defaultValue: 'Active',
        comment: '状态: Active(活跃), Inactive(停用), Blacklisted(黑名单)'
    },
    address: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '地址'
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '备注'
    }
}, {
    tableName: 'suppliers',
    comment: '供应商基础信息表'
});

module.exports = Supplier;
