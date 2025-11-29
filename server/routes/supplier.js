const express = require('express');
const fs = require('fs');
const { sequelize } = require('../database/config');
const ExcelParserService = require('../services/excel-parser');
const DataProcessorService = require('../services/data-processor');
const upload = require('../middleware/upload-config');
const IQCData = require('../models/IQCData');

const router = express.Router();

// 认证中间件
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

// 获取供应商列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    // 从IQC数据中获取唯一的供应商列表
    const suppliers = await IQCData.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('supplier')), 'supplier']],
      where: {
        supplier: {
          [sequelize.Sequelize.Op.ne]: null
        }
      },
      order: [['supplier', 'ASC']]
    });

    const supplierList = suppliers.map(item => ({
      id: item.supplier, // 使用供应商名称作为ID
      name: item.supplier
    }));

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

// 供应商相关路由
router.post('/search-supplier', upload.single('excelFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const { supplierName, timeFilterType, timeFilterValue } = req.body;

  try {
    // 解析Excel文件
    const jsonData = ExcelParserService.parseExcelFile(req.file.path);
    ExcelParserService.validateExcelData(jsonData);

    // 创建时间筛选对象
    const timeFilter = timeFilterType && timeFilterValue ? { type: timeFilterType, value: timeFilterValue } : null;

    // 处理数据并返回结果
    const dataProcessor = new DataProcessorService();
    const result = dataProcessor.processIQCData(jsonData, supplierName, timeFilter, req.file.originalname);

    // 在返回结果后，删除上传的文件
    fs.unlinkSync(req.file.path);

    console.log('=== 服务器端调试 ===');
    console.log('接收到的supplierName:', supplierName);
    console.log('返回的result.supplierFilter:', result.supplierFilter);
    console.log('完整的返回数据:', JSON.stringify(result, null, 2));

    res.json(result);
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).send(`Error processing file: ${error.message}`);
  }
});

module.exports = router;