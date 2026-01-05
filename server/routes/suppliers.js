/**
 * 供应商管理API路由
 * 创建时间: 2025-12-01
 * 功能: 提供供应商的CRUD操作接口和资料汇总表格数据
 * 来由: 解决前端 /api/suppliers 404错误，为供应商资料管理模块提供后端支持
 * 
 * 问题背景:
 * - 前端supplier.js尝试访问 /api/suppliers 接口返回404
 * - 原有的supplier.js路由是为IQC数据分析设计的，不符合供应商资料管理需求
 * - 需要独立的供应商管理API来支持资料上传时的供应商选择功能
 * 
 * ⚠️ 重要架构说明:
 * 1. Express路由顺序问题: 具体路径必须在参数路径之前定义
 *    - 正确顺序: router.get('/documents-summary') → router.get('/:id')
 *    - 错误顺序: router.get('/:id') → router.get('/documents-summary') 会导致404
 * 
 * 2. 数据源策略:
 *    - 优先从suppliers表获取供应商数据
 *    - 如果suppliers表为空，自动从IQC数据导入供应商
 *    - 资料汇总按供应商ID关联supplier_documents表
 * 
 * 3. 路由匹配规则:
 *    - GET  /api/suppliers/                    → 获取供应商列表
 *    - GET  /api/suppliers/documents-summary   → 获取资料汇总表格 ⭐关键路由
 *    - GET  /api/suppliers/:id                → 获取单个供应商详情
 *    - POST /api/suppliers/import-from-iqc     → 从IQC数据导入供应商
 * 
 * 4. 调试经验:
 *    - 如果API返回404但路由存在，检查路由顺序
 *    - 服务器没有请求日志说明路由没有匹配到
 *    - 使用console.log在路由入口添加调试信息
 */

console.log('📦 正在加载 suppliers.js 路由文件...');

const express = require('express');
const router = express.Router();
const { sequelize } = require('../database/config');
const LocalFileSyncService = require('../services/local-file-sync-service');

// 创建本地文件同步服务实例
const localFileSyncService = new LocalFileSyncService();

console.log('✅ suppliers.js 路由文件加载完成');



// 认证中间件
// 来源: 复用现有的JWT认证机制，确保API安全性
// 用途: 验证用户身份，防止未授权访问供应商数据
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: '未提供认证令牌' });
  }

  const AuthService = require('../services/authService');
  AuthService.verifyToken(token)
    .then(result => {
      if (!result.success) {
        return res.status(401).json({ success: false, error: '认证失败' });
      }
      req.user = result.user;
      next();
    })
    .catch(error => {
      console.error('认证失败:', error);
      res.status(500).json({ success: false, error: '认证服务错误' });
    });
};

// 获取所有供应商列表
// 路由: GET /api/suppliers
// 用途: 为上传资料页面的供应商选择下拉框提供数据
// 前端调用: supplier.js 中的 loadSuppliers() 方法
// 🎯 [修改] 数据源已从suppliers表改为vendor_config表
router.get('/', authenticateToken, async (req, res) => {
  try {
    // 从vendor_config表获取已启用资料管理的供应商
    const [suppliers] = await sequelize.query(`
      SELECT vc.id, vc.supplier_name as name
      FROM vendor_config vc
      WHERE vc.enable_document_mgmt = 1 
        AND vc.status = 'Active'
      ORDER BY vc.supplier_name ASC
    `);

    let supplierList = suppliers.map(item => ({
      id: item.id,
      name: item.name
    }));

    console.log(`📋 从vendor_config表获取到 ${supplierList.length} 个已启用资料管理的供应商`);

    res.json({
      success: true,
      data: supplierList
    });
  } catch (error) {
    console.error('获取供应商列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取供应商列表失败'
    });
  }
});
// 获取供应商资料汇总表格数据
// 路由: GET /api/suppliers/documents-summary
// 用途: 为表格展示提供按供应商分组的资料汇总数据
// 前端调用: supplier.js 中的 loadDocumentsSummary() 方法
// 
// ⚠️ 关键路由: 这是供应商资料管理页面的核心API
// 🔧 调试经验: 必须放在 router.get('/:id') 之前，否则会被当作ID参数处理
// 📊 返回格式: [{supplierId, supplierName, documents: {type: {expiryDate, status, hasDocument}}}]
// 🎯 [修改] 数据源已从suppliers表改为vendor_config表
router.get('/documents-summary', authenticateToken, async (req, res) => {
  try {
    console.log('🎯 [DEBUG] documents-summary 路由被调用！');
    console.log('📊 获取供应商资料汇总数据...');
    console.log('👤 请求用户:', req.user ? req.user.username : 'unknown');
    
    // 1. 从vendor_config表获取已启用资料管理的供应商
    const [suppliers] = await sequelize.query(`
      SELECT vc.id, vc.supplier_name as name
      FROM vendor_config vc
      WHERE vc.enable_document_mgmt = 1 
        AND vc.status = 'Active'
      ORDER BY vc.supplier_name ASC
    `);
    
    console.log(`📋 找到 ${suppliers.length} 个已启用资料管理的供应商`);
    
    if (suppliers.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: '没有找到已启用资料管理的供应商'
      });
    }
    
    // 2. 获取每个供应商的资料
    const summaryData = [];
    
    for (const supplier of suppliers) {
      const [documents] = await sequelize.query(`
        SELECT document_type, expiry_date, status, created_at
        FROM supplier_documents 
        WHERE supplier_id = :supplierId 
        ORDER BY document_type, created_at DESC
      `, {
        replacements: { supplierId: supplier.id }
      });
      
      // 构建供应商资料汇总
      const supplierSummary = {
        supplierId: supplier.id,
        supplierName: supplier.name,
        documents: {}
      };
      
      // 按资料类型分组
      const documentTypes = ['quality_agreement', 'environmental_rohs', 'environmental_reach', 'environmental_msds', 'environmental_hf', 'csr'];
      
      documentTypes.forEach(type => {
        const typeDocs = documents.filter(doc => doc.document_type === type);
        if (typeDocs.length > 0) {
          // 取最新的资料
          const latestDoc = typeDocs[0];
          supplierSummary.documents[type] = {
            expiryDate: latestDoc.expiry_date,
            status: latestDoc.status,
            hasDocument: true
          };
        } else {
          supplierSummary.documents[type] = {
            expiryDate: null,
            status: 'missing',
            hasDocument: false
          };
        }
      });
      
      summaryData.push(supplierSummary);
    }
    
    console.log(`✅ 获取 ${summaryData.length} 个供应商的资料汇总`);
    
    res.json({
      success: true,
      data: summaryData
    });
    
  } catch (error) {
    console.error('获取供应商资料汇总失败:', error);
    res.status(500).json({
      success: false,
      error: '获取供应商资料汇总失败'
    });
  }
});

// 根据ID获取单个供应商
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [suppliers] = await sequelize.query(`
      SELECT * FROM suppliers WHERE id = :id AND status = 'active'
    `, {
      replacements: { id }
    });

    if (suppliers.length === 0) {
      return res.status(404).json({
        success: false,
        error: '供应商不存在'
      });
    }

    res.json({
      success: true,
      data: suppliers[0]
    });
  } catch (error) {
    console.error('获取供应商详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取供应商详情失败'
    });
  }
});

// 创建新供应商
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      code,
      short_name,
      english_name,
      contact_person,
      contact_phone,
      contact_email,
      address,
      level,
      main_products,
      cooperation_start_date,
      annual_purchase_amount
    } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: '供应商名称不能为空'
      });
    }

    const [result] = await sequelize.query(`
      INSERT INTO suppliers (
        name, code, short_name, english_name, contact_person, 
        contact_phone, contact_email, address, level, main_products,
        cooperation_start_date, annual_purchase_amount, status, created_at, updated_at
      ) VALUES (
        :name, :code, :short_name, :english_name, :contact_person,
        :contact_phone, :contact_email, :address, :level, :main_products,
        :cooperation_start_date, :annual_purchase_amount, 'active', datetime('now'), datetime('now')
      )
    `, {
      replacements: {
        name,
        code,
        short_name,
        english_name,
        contact_person,
        contact_phone,
        contact_email,
        address,
        level: level || 'general',
        main_products,
        cooperation_start_date,
        annual_purchase_amount
      }
    });

    res.json({
      success: true,
      message: '供应商创建成功',
      data: {
        id: result.insertId,
        name
      }
    });
  } catch (error) {
    console.error('创建供应商失败:', error);
    res.status(500).json({
      success: false,
      error: '创建供应商失败'
    });
  }
});

// 更新供应商信息
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = [];
    const replacements = { id };

    // 动态构建更新字段
    const allowedFields = [
      'name', 'code', 'short_name', 'english_name', 'contact_person',
      'contact_phone', 'contact_email', 'address', 'level', 'status',
      'main_products', 'cooperation_start_date', 'annual_purchase_amount'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = :${field}`);
        replacements[field] = req.body[field];
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有提供要更新的字段'
      });
    }

    updateFields.push('updated_at = datetime(\'now\')');

    const [result] = await sequelize.query(`
      UPDATE suppliers 
      SET ${updateFields.join(', ')}
      WHERE id = :id
    `, {
      replacements
    });

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: '供应商不存在'
      });
    }

    res.json({
      success: true,
      message: '供应商更新成功'
    });
  } catch (error) {
    console.error('更新供应商失败:', error);
    res.status(500).json({
      success: false,
      error: '更新供应商失败'
    });
  }
});

// 获取供应商详情
router.get('/:id/details', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [supplier] = await sequelize.query(`
      SELECT s.*, 
        COUNT(DISTINCT m.id) as material_count
      FROM suppliers s
      LEFT JOIN materials m ON s.id = m.supplier_id AND m.status = 'Active'
      WHERE s.id = ? AND s.status != 'Deleted'
      GROUP BY s.id
    `, {
      replacements: [id]
    });

    if (supplier.length === 0) {
      return res.status(404).json({
        success: false,
        error: '供应商不存在'
      });
    }

    const supplierData = supplier[0];
    
    // 获取文档汇总（包含层级信息）
    const [documents] = await sequelize.query(`
        SELECT sd.document_type, sd.expiry_date, sd.status, sd.created_at, sd.file_path as filePath,
               sd.document_name, sd.level, sd.material_id, sd.component_id, sd.is_permanent,
               m.material_name, mc.component_name
        FROM supplier_documents sd
        LEFT JOIN materials m ON sd.material_id = m.id
        LEFT JOIN material_components mc ON sd.component_id = mc.id
        WHERE sd.supplier_id = ?
        ORDER BY sd.level, sd.material_id, sd.component_id, sd.document_type, sd.created_at DESC
    `, {
      replacements: [id]
    });

    // 构建供应商资料汇总 - 正确分离通用资料和检测报告
    const commonDocuments = [];
    const materialsMap = {};

    // 分离通用资料和检测报告
    documents.forEach(doc => {
      let daysUntilExpiry = null;
      let warningLevel = 'normal';

      if (!doc.is_permanent && doc.expiry_date) {
        daysUntilExpiry = Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry < 0) {
          warningLevel = 'expired';
        } else if (daysUntilExpiry <= 15) {
          warningLevel = 'urgent';
        } else if (daysUntilExpiry <= 30) {
          warningLevel = 'warning';
        }
      }

      const docData = {
        id: doc.document_type,
        documentType: doc.document_type,
        documentName: doc.document_name,
        filePath: doc.filePath,
        expiryDate: doc.expiry_date,
        daysUntilExpiry: daysUntilExpiry,
        isPermanent: Boolean(doc.is_permanent),
        status: warningLevel,
        level: doc.level,
        materialId: doc.material_id,
        componentName: doc.component_name
      };

      // 根据level字段正确分离资料
      if (doc.level === 'supplier') {
        // 通用资料
        commonDocuments.push(docData);
      } else if (doc.level === 'component' && doc.material_id) {
        // 检测报告 - 按物料分组
        const materialKey = doc.material_id.toString();

        if (!materialsMap[materialKey]) {
          materialsMap[materialKey] = {
            materialId: doc.material_id,
            materialName: doc.material_name || `物料${doc.material_id}`,
            documents: []
          };
        }

        materialsMap[materialKey].documents.push(docData);
      }
    });

    const supplierSummary = {
      supplierId: supplierData.id,
      supplierName: supplierData.name,
      materialCount: supplierData.material_count || 0,
      commonDocuments: commonDocuments,
      materials: Object.values(materialsMap)
    };

    res.json({
      success: true,
      data: supplierSummary
    });

  } catch (error) {
    console.error('获取供应商详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取供应商详情失败'
    });
  }
});

// 删除供应商（软删除）
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await sequelize.query(`
      UPDATE suppliers 
      SET status = 'inactive', updated_at = datetime('now')
      WHERE id = :id
    `, {
      replacements: { id }
    });

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: '供应商不存在'
      });
    }

    res.json({
      success: true,
      message: '供应商删除成功'
    });
  } catch (error) {
    console.error('删除供应商失败:', error);
    res.status(500).json({
      success: false,
      error: '删除供应商失败'
    });
  }
});



module.exports = router;