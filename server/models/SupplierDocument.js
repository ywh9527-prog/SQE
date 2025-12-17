const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/config');

/**
 * 供应商资料数据模型 (重构版 v3.0)
 * 用于管理供应商质量相关资质资料
 * 
 * 核心改进:
 * 1. 支持三层架构: 供应商→物料→资料(构成作为备注)
 * 2. MSDS归为通用资料
 * 3. ROHS/REACH/HF归为检测报告(构成作为备注)
 * 
 * 层级说明:
 * - supplier: 通用资料 (质量保证协议、MSDS、ISO认证等)
 * - material: 检测报告 (ROHS、REACH、HF等，构成信息作为备注)
 * - component: 具体构成 (作为资料备注，不作为独立层级)
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
  level: {
    type: DataTypes.ENUM('supplier', 'material', 'component'),
    allowNull: false,
    defaultValue: 'supplier',
    comment: '资料层级: supplier(通用资料), material(检测报告), component(具体构成-作为备注)'
  },
  materialId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'material_id',
    comment: '物料ID (level=material或component时必填)'
  },
  componentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'component_id',
    comment: '具体构成ID (level=component时必填)'
  },
  detectionType: {
    type: DataTypes.ENUM('direct', 'referenced'),
    allowNull: false,
    defaultValue: 'direct',
    field: 'detection_type',
    comment: '检测类型：direct(本体检测), referenced(引用检测)'
  },
  documentType: {
    type: DataTypes.STRING(50),  // 改为STRING以支持动态文档类型ID
    allowNull: false,
    field: 'document_type',
    comment: '资料类型 (支持动态文档类型ID)'
  },
  documentName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'document_name',
    comment: '资料名称/版本号'
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
    comment: '到期日期（永久有效时为空）'
  },
  isPermanent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_permanent',
    comment: '是否永久有效'
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
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['supplier_id']
    },
    {
      fields: ['level']
    },
    {
      fields: ['material_id']
    },
    {
      fields: ['component_id']
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
    // 🎯 移除UNIQUE约束，允许同一资料类型重复上传
    // 原约束：同一供应商下同类型资料只能有一个当前版本
    // 修改原因：用户需要支持同一资料类型的重复上传
    // 🎯 移除检测报告的UNIQUE约束，保持一致性
    // 原约束：同一物料下同类型资料只能有一个当前版本
    // 修改原因：允许同一资料类型的重复上传
  ],
  comment: '供应商资料表 (支持三层架构: 供应商→物料→资料(构成备注))'
});

/**
 * 定义关联关系
 */
SupplierDocument.associate = (models) => {
  // 一个资料属于一个供应商
  SupplierDocument.belongsTo(models.Supplier, {
    foreignKey: 'supplier_id',
    as: 'supplier'
  });

  // 一个资料可能属于一个物料
  SupplierDocument.belongsTo(models.Material, {
    foreignKey: 'material_id',
    as: 'material'
  });

  // 一个资料可能属于一个具体构成
  SupplierDocument.belongsTo(models.MaterialComponent, {
    foreignKey: 'component_id',
    as: 'component'
  });
};

/**
 * 实例方法
 */
SupplierDocument.prototype.isExpired = function () {
  if (this.isPermanent) return false;
  return this.expiryDate && new Date() > new Date(this.expiryDate);
};

SupplierDocument.prototype.getWarningLevel = function () {
  if (this.isPermanent) return 'normal';
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

SupplierDocument.prototype.getDaysUntilExpiry = function () {
  if (this.isPermanent) return null;
  if (!this.expiryDate) return null;

  const now = new Date();
  const expiry = new Date(this.expiryDate);
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
};

/**
 * 类方法
 */

    // 查询通用资料
SupplierDocument.findSupplierDocuments = function (supplierId, options = {}) {
  return this.findAll({
    where: {
      supplierId,
      level: 'supplier',
      status: 'active',
      isCurrent: true
    },
    order: [['documentType', 'ASC']],
    ...options
  });
};

    // 查询检测报告
SupplierDocument.findComponentDocuments = function (componentId, options = {}) {
  return this.findAll({
    where: {
      componentId,
      level: 'component',
      status: 'active',
      isCurrent: true
    },
    order: [['documentType', 'ASC']],
    ...options
  });
};

// 查询即将过期的资料
SupplierDocument.findExpiringDocuments = function (days = 30) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));

  return this.findAll({
    where: {
      expiryDate: {
        [sequelize.Sequelize.Op.between]: [now, futureDate]
      },
      isPermanent: false,
      status: 'active',
      isCurrent: true
    },
    order: [['expiryDate', 'ASC']]
  });
};

// 查询已过期的资料
SupplierDocument.findExpiredDocuments = function () {
  return this.findAll({
    where: {
      expiryDate: {
        [sequelize.Sequelize.Op.lt]: new Date()
      },
      isPermanent: false,
      status: 'active',
      isCurrent: true
    },
    order: [['expiryDate', 'ASC']]
  });
};

// 查询特定类型的当前版本资料
SupplierDocument.findCurrentByType = function (supplierId, documentType, level = 'supplier', componentId = null) {
  const where = {
    supplierId,
    documentType,
    level,
    isCurrent: true,
    status: 'active'
  };

  if (level === 'component' && componentId) {
    where.componentId = componentId;
  }

  return this.findOne({ where });
};

module.exports = SupplierDocument;