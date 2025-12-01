/**
 * 供应商管理API路由
 * 创建时间: 2025-12-01
 * 功能: 提供供应商的CRUD操作接口
 * 来由: 解决前端 /api/suppliers 404错误，为供应商资料管理模块提供后端支持
 * 
 * 问题背景:
 * - 前端supplier.js尝试访问 /api/suppliers 接口返回404
 * - 原有的supplier.js路由是为IQC数据分析设计的，不符合供应商资料管理需求
 * - 需要独立的供应商管理API来支持资料上传时的供应商选择功能
 */

const express = require('express');
const { sequelize } = require('../database/config');

const router = express.Router();

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
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [suppliers] = await sequelize.query(`
      SELECT id, name, code, short_name, english_name, contact_person, 
             contact_phone, contact_email, level, status 
      FROM suppliers 
      WHERE status = 'active' 
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      data: suppliers
    });
  } catch (error) {
    console.error('获取供应商列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取供应商列表失败'
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

// 从IQC数据导入供应商
// 路由: POST /api/suppliers/import-from-iqc
// 用途: 点击刷新按钮时，自动从IQC检验数据中提取供应商信息并导入到suppliers表
// 前端调用: supplier.js 中的 importSuppliersFromIQC() 方法
router.post('/import-from-iqc', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 开始从IQC数据导入供应商...');
    
    // 1. 检查IQC数据表
    const [iqcData] = await sequelize.query(`
      SELECT id, file_name, data_type, record_count FROM iqc_data 
      ORDER BY created_at DESC
    `);
    
    if (iqcData.length === 0) {
      return res.json({
        success: true,
        message: 'IQC数据表为空，没有供应商可导入',
        importedCount: 0
      });
    }
    
    // 2. 提取供应商名称
    const suppliers = new Set();
    
    for (const data of iqcData) {
      try {
        const [rawData] = await sequelize.query(`
          SELECT raw_data FROM iqc_data WHERE id = :id
        `, {
          replacements: { id: data.id }
        });
        
        if (rawData.length > 0 && rawData[0].raw_data) {
          const records = JSON.parse(rawData[0].raw_data);
          
          // 从不同字段名提取供应商名称
          records.forEach(record => {
            const supplierName = record['供应商名称'] || record['供应商'] || record['supplier'] || record['name'];
            if (supplierName && supplierName.trim()) {
              suppliers.add(supplierName.trim());
            }
          });
        }
      } catch (error) {
        console.error(`处理数据ID ${data.id} 时出错:`, error.message);
      }
    }
    
    // 3. 导入供应商到suppliers表
    let importCount = 0;
    
    for (const supplierName of suppliers) {
      try {
        // 检查是否已存在
        const [existing] = await sequelize.query(`
          SELECT id FROM suppliers WHERE name = :name
        `, {
          replacements: { name: supplierName }
        });
        
        if (existing.length === 0) {
          await sequelize.query(`
            INSERT INTO suppliers (name, status, created_at, updated_at)
            VALUES (:name, 'active', datetime('now'), datetime('now'))
          `, {
            replacements: { name: supplierName }
          });
          
          importCount++;
        }
      } catch (error) {
        console.error(`导入供应商 ${supplierName} 失败:`, error.message);
      }
    }
    
    console.log(`✅ 供应商导入完成，导入数量: ${importCount}`);
    
    res.json({
      success: true,
      message: `成功导入 ${importCount} 个供应商`,
      importedCount: importCount
    });
    
  } catch (error) {
    console.error('导入供应商失败:', error);
    res.status(500).json({
      success: false,
      error: '导入供应商失败'
    });
  }
});

module.exports = router;