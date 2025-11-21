const express = require('express');
const fs = require('fs');
const ExcelParserService = require('../services/excel-parser');
const DataProcessorService = require('../services/data-processor');
const upload = require('../middleware/upload-config');

const router = express.Router();

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