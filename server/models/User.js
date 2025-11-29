/**
 * 用户模型
 * 负责处理用户认证相关的数据库操作
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/config');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: '用户名'
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '加密后的密码'
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '邮箱'
    },
    fullName: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '全名'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: '是否激活'
    },
    lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '最后登录时间'
    }
}, {
    tableName: 'users',
    timestamps: true,
    comment: '用户表'
});

module.exports = User;