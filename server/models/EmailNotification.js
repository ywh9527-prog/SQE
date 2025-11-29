const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/config');

/**
 * 邮件通知数据模型
 * 用于管理资料到期预警邮件记录
 */
const EmailNotification = sequelize.define('EmailNotification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '通知ID'
  },
  documentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'document_id',
    comment: '关联的资料ID'
  },
  notificationType: {
    type: DataTypes.ENUM('warning_30d', 'warning_15d', 'warning_7d', 'expired', 'custom'),
    allowNull: false,
    field: 'notification_type',
    comment: '通知类型: warning_30d(30天预警), warning_15d(15天预警), warning_7d(7天预警), expired(已过期), custom(自定义)'
  },
  recipientEmail: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'recipient_email',
    comment: '收件人邮箱'
  },
  subject: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '邮件主题'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '邮件内容'
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'sent_at',
    comment: '发送时间'
  },
  replyReceivedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reply_received_at',
    comment: '回复接收时间'
  },
  replyStatus: {
    type: DataTypes.ENUM('pending', 'received', 'resolved'),
    allowNull: false,
    defaultValue: 'pending',
    field: 'reply_status',
    comment: '回复状态: pending(待回复), received(已收到), resolved(已解决)'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'approved_by',
    comment: '审核人ID'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at',
    comment: '审核时间'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
    comment: '创建时间'
  }
}, {
  tableName: 'email_notifications',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false, // 不需要updatedAt字段
  indexes: [
    {
      fields: ['document_id']
    },
    {
      fields: ['notification_type']
    },
    {
      fields: ['recipient_email']
    },
    {
      fields: ['reply_status']
    },
    {
      fields: ['sent_at']
    }
  ]
});

/**
 * 实例方法
 */
EmailNotification.prototype.isPending = function() {
  return this.replyStatus === 'pending';
};

EmailNotification.prototype.isSent = function() {
  return this.sentAt !== null;
};

EmailNotification.prototype.isApproved = function() {
  return this.approvedAt !== null;
};

/**
 * 类方法
 */
EmailNotification.findByDocument = function(documentId, options = {}) {
  return this.findAll({
    where: { documentId },
    order: [['createdAt', 'DESC']],
    ...options
  });
};

EmailNotification.findPendingNotifications = function(options = {}) {
  return this.findAll({
    where: {
      replyStatus: 'pending'
    },
    order: [['createdAt', 'ASC']],
    ...options
  });
};

EmailNotification.findUnsentNotifications = function(options = {}) {
  return this.findAll({
    where: {
      sentAt: null,
      approvedAt: { [sequelize.Sequelize.Op.ne]: null }
    },
    order: [['createdAt', 'ASC']],
    ...options
  });
};

EmailNotification.findByType = function(notificationType, options = {}) {
  return this.findAll({
    where: { notificationType },
    order: [['createdAt', 'DESC']],
    ...options
  });
};

EmailNotification.createNotification = async function(data) {
  const {
    documentId,
    notificationType,
    recipientEmail,
    subject,
    content
  } = data;

  return this.create({
    documentId,
    notificationType,
    recipientEmail,
    subject,
    content
  });
};

module.exports = EmailNotification;