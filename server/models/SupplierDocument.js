const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/config');

/**
 * 供应商资料数据模型
 * 用于管理供应商质量相关资质资料
 */
const SupplierDocument = sequelize.define('SupplierDocument', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '资料ID'
  },
  supplierId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'supplier_id',
    comment: '供应商ID'
  },
  documentType: {
    type: DataTypes.ENUM('quality_agreement', 'environmental_rohs', 'environmental_reach', 'environmental_msds'),
    allowNull: false,
    field: 'document_type',
    comment: '资料类型: quality_agreement(质保协议), environmental_rohs(环保ROHS), environmental_reach(环保REACH), environmental_msds(环保MSDS)'
  },
  documentName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'document_name',
    comment: '资料名称'
  },
  documentNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'document_number',
    comment: '协议编号/证书编号'
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'file_path',
    comment: '文件存储路径'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'file_size',
    comment: '文件大小(字节)'
  },
  uploadDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'upload_date',
    comment: '上传日期'
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'expiry_date',
    comment: '到期日期'
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'archived'),
    allowNull: false,
    defaultValue: 'active',
    comment: '状态: active(有效), expired(已过期), archived(已归档)'
  },
  responsiblePerson: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'responsible_person',
    comment: '责任人'
  },
  issuingAuthority: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'issuing_authority',
    comment: '发证机构'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注'
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    comment: '版本号'
  },
  isCurrent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_current',
    comment: '是否为当前有效版本'
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
  tableName: 'supplier_documents',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      fields: ['supplier_id']
    },
    {
      fields: ['document_type']
    },
    {
      fields: ['expiry_date']
    },
    {
      fields: ['status']
    },
    {
      fields: ['supplier_id', 'document_type', 'is_current']
    }
  ]
});

/**
 * 实例方法
 */
SupplierDocument.prototype.isExpired = function() {
  return this.expiryDate && new Date() > new Date(this.expiryDate);
};

SupplierDocument.prototype.getWarningLevel = function() {
  if (!this.expiryDate) return null;
  
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 7) return 'critical';
  if (daysUntilExpiry <= 15) return 'urgent';
  if (daysUntilExpiry <= 30) return 'warning';
  return 'normal';
};

SupplierDocument.prototype.getDaysUntilExpiry = function() {
  if (!this.expiryDate) return null;
  
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
};

/**
 * 类方法
 */
SupplierDocument.findBySupplier = function(supplierId, options = {}) {
  return this.findAll({
    where: { supplierId },
    order: [['documentType', 'ASC'], ['version', 'DESC']],
    ...options
  });
};

SupplierDocument.findCurrentBySupplier = function(supplierId, documentType) {
  return this.findOne({
    where: {
      supplierId,
      documentType,
      isCurrent: true,
      status: 'active'
    }
  });
};

SupplierDocument.findExpiringDocuments = function(days = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.findAll({
    where: {
      expiryDate: {
        [sequelize.Sequelize.Op.between]: [new Date(), futureDate]
      },
      status: 'active',
      isCurrent: true
    },
    order: [['expiryDate', 'ASC']]
  });
};

SupplierDocument.findExpiredDocuments = function() {
  return this.findAll({
    where: {
      expiryDate: {
        [sequelize.Sequelize.Op.lt]: new Date()
      },
      status: 'active',
      isCurrent: true
    },
    order: [['expiryDate', 'ASC']]
  });
};

module.exports = SupplierDocument;