const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/config');

/**
 * 系统日志数据模型
 * 用于记录系统操作日志和审计信息
 */
const SystemLog = sequelize.define('SystemLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '日志ID'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id',
    comment: '操作用户ID'
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '操作类型: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, UPLOAD, DOWNLOAD等'
  },
  resourceType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'resource_type',
    comment: '资源类型: document, supplier, user, notification等'
  },
  resourceId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'resource_id',
    comment: '资源ID'
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '操作详情(JSON格式或描述文本)'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address',
    comment: 'IP地址'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent',
    comment: '用户代理信息'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
    comment: '创建时间'
  }
}, {
  tableName: 'system_logs',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false, // 不需要updatedAt字段
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['action']
    },
    {
      fields: ['resource_type']
    },
    {
      fields: ['resource_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

/**
 * 实例方法
 */
SystemLog.prototype.getActionDescription = function() {
  const actionMap = {
    'CREATE': '创建',
    'UPDATE': '更新',
    'DELETE': '删除',
    'LOGIN': '登录',
    'LOGOUT': '登出',
    'UPLOAD': '上传',
    'DOWNLOAD': '下载',
    'VIEW': '查看',
    'APPROVE': '审核',
    'SEND': '发送',
    'REPLY': '回复'
  };
  
  return actionMap[this.action] || this.action;
};

SystemLog.prototype.getResourceDescription = function() {
  const resourceMap = {
    'document': '资料',
    'supplier': '供应商',
    'user': '用户',
    'notification': '通知',
    'email': '邮件'
  };
  
  return resourceMap[this.resourceType] || this.resourceType;
};

/**
 * 类方法
 */
SystemLog.logAction = async function(data) {
  const {
    userId,
    action,
    resourceType,
    resourceId,
    details,
    ipAddress,
    userAgent
  } = data;

  return this.create({
    userId,
    action,
    resourceType,
    resourceId,
    details: typeof details === 'object' ? JSON.stringify(details) : details,
    ipAddress,
    userAgent
  });
};

SystemLog.findByUser = function(userId, options = {}) {
  return this.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    ...options
  });
};

SystemLog.findByAction = function(action, options = {}) {
  return this.findAll({
    where: { action },
    order: [['createdAt', 'DESC']],
    ...options
  });
};

SystemLog.findByResource = function(resourceType, resourceId, options = {}) {
  return this.findAll({
    where: {
      resourceType,
      resourceId
    },
    order: [['createdAt', 'DESC']],
    ...options
  });
};

SystemLog.findRecentLogs = function(limit = 100, options = {}) {
  return this.findAll({
    order: [['createdAt', 'DESC']],
    limit,
    ...options
  });
};

SystemLog.findByDateRange = function(startDate, endDate, options = {}) {
  return this.findAll({
    where: {
      createdAt: {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      }
    },
    order: [['createdAt', 'DESC']],
    ...options
  });
};

module.exports = SystemLog;