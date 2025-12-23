const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const { sequelize } = require('../database/config');
const SupplierDocument = require('../models/SupplierDocument');
const EmailNotification = require('../models/EmailNotification');
const SystemLog = require('../models/SystemLog');
const logger = require('../utils/logger');

// 使用现有的上传配置，但为资料管理定制
const multer = require('multer');

// 专用于资料管理的上传配置
const documentStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/documents');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    cb(null, `${timestamp}_${name}${ext}`);
  }
});

const documentFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
};

const documentUpload = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});

// 中间件：获取用户信息
const getUserInfo = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: '未提供认证令牌' });
    }

    const AuthService = require('../services/authService');
    const result = await AuthService.verifyToken(token);
    
    if (!result.success) {
      return res.status(401).json({ success: false, error: '认证失败' });
    }

    req.user = result.user;
    next();
  } catch (error) {
    logger.error(`获取用户信息失败: ${error.message}`);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
};

// 记录系统日志
const logAction = async (userId, action, resourceType, resourceId, details, req) => {
  try {
    await SystemLog.logAction({
      userId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
  } catch (error) {
    logger.error(`记录系统日志失败: ${error.message}`);
  }
};

// 获取资料列表
router.get('/', getUserInfo, async (req, res) => {
  try {
    const {
      supplierId,
      documentType,
      status,
      page = 1,
      limit = 20
    } = req.query;

    const where = {};
    if (supplierId) where.supplierId = parseInt(supplierId);
    if (documentType) where.documentType = documentType;
    if (status) where.status = status;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await SupplierDocument.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        documents: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / parseInt(limit))
        }
      }
    });

    await logAction(req.user.userId, 'VIEW', 'document', null, { query: req.query }, req);
  } catch (error) {
    logger.error(`获取资料列表失败: ${error.message}`);
    res.status(500).json({ success: false, error: '获取资料列表失败' });
  }
});

// 获取单个资料详情
router.get('/:id', getUserInfo, async (req, res) => {
  try {
    const { id } = req.params;
    
    const document = await SupplierDocument.findByPk(id);
    if (!document) {
      return res.status(404).json({ success: false, error: '资料不存在' });
    }

    res.json({
      success: true,
      data: document
    });

    await logAction(req.user.userId, 'VIEW', 'document', parseInt(id), null, req);
  } catch (error) {
    logger.error(`获取资料详情失败: ${error.message}`);
    res.status(500).json({ success: false, error: '获取资料详情失败' });
  }
});

// 上传资料
router.post('/', getUserInfo, documentUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请选择文件' });
    }

    const {
      supplierId,
      documentType,
      documentName,
      documentNumber,
      expiryDate,
      isPermanent,
      responsiblePerson,
      issuingAuthority,
      remarks
    } = req.body;

    // 验证必填字段
    if (!supplierId || !documentType || (!expiryDate && !isPermanent)) {
      // 删除已上传的文件
      await fs.unlink(req.file.path);
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }

    // 智能默认值策略：如果用户没有填写版本号，自动生成
    const finalDocumentName = documentName || `V0_${new Date().toISOString().split('T')[0]}`;

    // 创建新资料记录
    const document = await SupplierDocument.create({
      supplierId: parseInt(supplierId),
      documentType,
      documentName: finalDocumentName,
      documentNumber,
      filePath: req.file.path,
      fileSize: req.file.size,
      expiryDate: (isPermanent === 'true' || isPermanent === true) ? null : (expiryDate || null),
      isPermanent: isPermanent === 'true' || isPermanent === true,
      responsiblePerson,
      issuingAuthority,
      remarks,
      version: 1,
      isCurrent: true
    });

    res.json({
      success: true,
      data: document,
      message: '资料上传成功'
    });

    await logAction(req.user.userId, 'UPLOAD', 'document', document.id, {
      documentName,
      documentType,
      fileSize: req.file.size
    }, req);
  } catch (error) {
    logger.error(`上传资料失败: ${error.message}`);
    logger.error(`错误详情: ${JSON.stringify(error.errors || error)}`);
    logger.error(`请求数据: ${JSON.stringify(req.body)}`);
    logger.error(`文件信息: ${req.file ? JSON.stringify(req.file) : '无文件'}`);
    
    // 删除已上传的文件
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error(`删除文件失败: ${unlinkError.message}`);
      }
    }
    
    res.status(500).json({ success: false, error: `上传资料失败: ${error.message}` });
  }
});

// 更新资料
router.put('/:id', getUserInfo, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};

    // 只更新允许的字段
    const allowedFields = [
      'documentName',
      'documentNumber',
      'expiryDate',
      'isPermanent',  // 🎯 [BUG-FIX] 添加isPermanent字段到允许更新列表
      'responsiblePerson',
      'issuingAuthority',
      'remarks',
      'status'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const document = await SupplierDocument.findByPk(id);
    if (!document) {
      return res.status(404).json({ success: false, error: '资料不存在' });
    }

    await document.update(updateData);

    res.json({
      success: true,
      data: document,
      message: '资料更新成功'
    });

    await logAction(req.user.userId, 'UPDATE', 'document', parseInt(id), updateData, req);
  } catch (error) {
    logger.error(`更新资料失败: ${error.message}`);
    res.status(500).json({ success: false, error: '更新资料失败' });
  }
});

// 删除资料
router.delete('/:id', getUserInfo, async (req, res) => {
  try {
    const { id } = req.params;

    // 使用原生SQL查询文档信息
    const [documents] = await sequelize.query(
      'SELECT * FROM supplier_documents WHERE id = ?',
      { replacements: [id] }
    );

    if (documents.length === 0) {
      return res.status(404).json({ success: false, error: '资料不存在' });
    }

    const document = documents[0];

    // 删除文件
    try {
      await fs.unlink(document.file_path);
    } catch (fileError) {
      logger.warn(`删除文件失败: ${fileError.message}`);
    }

    // 删除数据库记录
    await sequelize.query(
      'DELETE FROM supplier_documents WHERE id = ?',
      { replacements: [id] }
    );

    res.json({
      success: true,
      message: '资料删除成功'
    });

    await logAction(req.user.userId, 'DELETE', 'document', parseInt(id), {
      documentName: document.document_name
    }, req);
  } catch (error) {
    logger.error(`删除资料失败: ${error.message}`);
    res.status(500).json({ success: false, error: '删除资料失败' });
  }
});

// 下载资料
router.get('/:id/download', getUserInfo, async (req, res) => {
  try {
    const { id } = req.params;

    const document = await SupplierDocument.findByPk(id);
    if (!document) {
      return res.status(404).json({ success: false, error: '资料不存在' });
    }

    // 检查文件是否存在
    try {
      await fs.access(document.filePath);
    } catch (error) {
      return res.status(404).json({ success: false, error: '文件不存在' });
    }

    res.download(document.filePath, document.documentName, (error) => {
      if (error) {
        logger.error(`下载文件失败: ${error.message}`);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: '下载失败' });
        }
      } else {
        logAction(req.user.userId, 'DOWNLOAD', 'document', parseInt(id), {
          documentName: document.documentName
        }, req);
      }
    });
  } catch (error) {
    logger.error(`下载资料失败: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: '下载失败' });
    }
  }
});

// 获取即将到期的资料
router.get('/expiring/warning', getUserInfo, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const documents = await SupplierDocument.findExpiringDocuments(parseInt(days));
    
    res.json({
      success: true,
      data: documents
    });

    await logAction(req.user.userId, 'VIEW', 'document', null, { 
      action: 'expiring_warning', 
      days 
    }, req);
  } catch (error) {
    logger.error(`获取即将到期资料失败: ${error.message}`);
    res.status(500).json({ success: false, error: '获取即将到期资料失败' });
  }
});

// 获取已过期的资料
router.get('/expired/list', getUserInfo, async (req, res) => {
  try {
    const documents = await SupplierDocument.findExpiredDocuments();
    
    res.json({
      success: true,
      data: documents
    });

    await logAction(req.user.userId, 'VIEW', 'document', null, { 
      action: 'expired_list' 
    }, req);
  } catch (error) {
    logger.error(`获取已过期资料失败: ${error.message}`);
    res.status(500).json({ success: false, error: '获取已过期资料失败' });
  }
});

module.exports = router;