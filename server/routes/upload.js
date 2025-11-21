const express = require('express');
const fs = require('fs');
const ExcelParserService = require('../services/excel-parser');
const DataProcessorService = require('../services/data-processor');
const SupplierService = require('../services/supplier-service');
const upload = require('../middleware/upload-config');

const router = express.Router();

// 简单的内存缓存，用于存储已解析的数据
const fileCache = new Map();

// 缓存清理机制：每小时清理一次过期数据（超过24小时）
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of fileCache.entries()) {
    if (now - value.timestamp > 24 * 60 * 60 * 1000) {
      fileCache.delete(key);
    }
  }
}, 60 * 60 * 1000);

// 获取Excel文件的工作表信息路由
router.post('/get-sheets', upload.single('excelFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    // 获取所有工作表名称
    const sheetNames = ExcelParserService.getAllSheetNames(req.file.path);

    // 找到推荐的工作表（最新的年份）
    const recommendedSheet = ExcelParserService.findLatestYearSheet(sheetNames);

    // 返回工作表信息
    const sheetInfo = {
      sheetNames,
      recommendedSheet: recommendedSheet || sheetNames[0],
      message: recommendedSheet
        ? `已自动选择最新的工作表: ${recommendedSheet}`
        : `默认选择第一个工作表: ${sheetNames[0]}`
    };

    res.json(sheetInfo);
  } catch (error) {
    console.error('Error getting sheet info:', error);
    res.status(500).send(`Error getting sheet info: ${error.message}`);
  } finally {
    // 确保文件被删除
    if (req.file && req.file.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
    }
  }
});

// 文件上传路由
router.post('/upload', upload.single('excelFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    // 解析Excel文件（使用改进的版本，自动选择最新年份工作表）
    const parseResult = ExcelParserService.parseExcelFileWithSheets(req.file.path);
    const jsonData = parseResult.data;

    ExcelParserService.validateExcelData(jsonData);

    // 处理数据并返回结果
    const dataProcessor = new DataProcessorService();
    const result = dataProcessor.processIQCData(jsonData, null, null, req.file.originalname);

    // 添加工作表信息到结果中
    result.sheetInfo = {
      selectedSheet: parseResult.selectedSheet,
      allSheets: parseResult.allSheets,
      message: `已分析工作表: ${parseResult.selectedSheet}`
    };

    // 生成文件ID并缓存原始数据
    const fileId = Date.now().toString();

    // 限制缓存大小，防止内存溢出
    if (fileCache.size > 50) {
      const firstKey = fileCache.keys().next().value;
      fileCache.delete(firstKey);
    }

    fileCache.set(fileId, {
      rawData: result.rawData,
      fileName: req.file.originalname,
      timestamp: Date.now()
    });

    // 从响应中移除原始数据以减少传输量
    delete result.rawData;
    result.fileId = fileId;

    res.json(result);
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).send(`Error processing file: ${error.message}`);
  } finally {
    // 确保文件被删除
    if (req.file && req.file.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
    }
  }
});

// 基于缓存数据的筛选路由（无需重新上传）
router.post('/filter-data', express.json(), (req, res) => {
  const { fileId, supplierName, timeFilterType, timeFilterValue } = req.body;

  if (!fileId || !fileCache.has(fileId)) {
    return res.status(400).json({ error: '文件会话已过期或无效，请重新上传文件。' });
  }

  try {
    const cachedData = fileCache.get(fileId);
    const dataProcessor = new DataProcessorService();

    const timeFilter = timeFilterType && timeFilterValue ? { type: timeFilterType, value: timeFilterValue } : null;

    // 使用 recalculate 方法重新计算
    const result = dataProcessor.recalculate(cachedData.rawData, supplierName, timeFilter);

    // 保持 fileId
    result.fileId = fileId;
    result.fileName = cachedData.fileName;

    res.json(result);
  } catch (error) {
    console.error('Error filtering data:', error);
    res.status(500).json({ error: `筛选失败: ${error.message}` });
  }
});

// 获取指定月份详细数据路由
router.post('/get-month-details', express.json(), (req, res) => {
  const { fileId, month, supplierName } = req.body;

  if (!fileId || !fileCache.has(fileId)) {
    return res.status(400).json({ error: '文件会话已过期或无效，请重新上传文件。' });
  }

  try {
    const cachedData = fileCache.get(fileId);

    // 筛选指定月份的数据
    const monthData = cachedData.rawData.filter(item => {
      // 1. 时间筛选
      const itemDate = new Date(item.time);
      const itemMonthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;

      if (itemMonthKey !== month) {
        return false;
      }

      // 2. 供应商筛选 (如果有)
      if (supplierName && supplierName.trim() !== '') {
        if (!item.supplier || !item.supplier.includes(supplierName)) {
          return false;
        }
      }

      return true;
    });

    res.json({
      month,
      details: monthData,
      total: monthData.length
    });
  } catch (error) {
    console.error('Error getting month details:', error);
    res.status(500).json({ error: `获取月度详情失败: ${error.message}` });
  }
});

// 供应商搜索路由
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

    res.json(result);
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).send(`Error processing file: ${error.message}`);
  } finally {
    // 确保文件被删除
    if (req.file && req.file.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
    }
  }
});

// 获取供应商列表路由
router.post('/get-suppliers', upload.single('excelFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    // 解析Excel文件
    const jsonData = ExcelParserService.parseExcelFile(req.file.path);
    ExcelParserService.validateExcelData(jsonData);

    // 提取供应商列表
    const suppliers = SupplierService.extractSuppliers(jsonData);

    res.json({ suppliers });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).send(`Error processing file: ${error.message}`);
  } finally {
    // 确保文件被删除
    if (req.file && req.file.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
    }
  }
});

// 获取供应商排名路由
router.post('/get-supplier-ranking', upload.single('excelFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const { timeFilterType, timeFilterValue } = req.body;

  try {
    // 解析Excel文件
    const jsonData = ExcelParserService.parseExcelFile(req.file.path);
    ExcelParserService.validateExcelData(jsonData);

    // 创建时间筛选对象
    const timeFilter = timeFilterType && timeFilterValue ? { type: timeFilterType, value: timeFilterValue } : null;

    // 处理数据并返回结果
    const dataProcessor = new DataProcessorService();
    const result = dataProcessor.processIQCData(jsonData, null, timeFilter, req.file.originalname);

    res.json({
      supplierRanking: result.supplierRanking,
      timeFilter: timeFilter
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).send(`Error processing file: ${error.message}`);
  } finally {
    // 确保文件被删除
    if (req.file && req.file.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
    }
  }
});

module.exports = router;