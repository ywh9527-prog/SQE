const express = require('express');
const fs = require('fs');
const crypto = require('crypto');
const ExcelParserService = require('../services/excel-parser');
const DataProcessorService = require('../services/data-processor');
const SupplierService = require('../services/supplier-service');
const upload = require('../middleware/upload-config');
const IQCData = require('../models/IQCData');

const router = express.Router();

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

// 文件上传路由 - 持久化存储
router.post('/upload', upload.single('excelFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    // 计算文件 Hash
    const fileBuffer = fs.readFileSync(req.file.path);
    const hashSum = crypto.createHash('md5');
    hashSum.update(fileBuffer);
    const fileHash = hashSum.digest('hex');

    // 解析Excel文件（使用改进的版本，自动选择最新年份工作表）
    const parseResult = ExcelParserService.parseExcelFileWithSheets(req.file.path);
    const jsonData = parseResult.data;

    ExcelParserService.validateExcelData(jsonData);

    // 处理数据并返回结果
    const dataProcessor = new DataProcessorService();
    const result = dataProcessor.processIQCData(jsonData, null, null, req.file.originalname);

    // 保存到数据库
    const record = await IQCData.create({
      fileName: req.file.originalname,
      fileHash: fileHash,
      summary: result.summary,
      monthlyData: result.monthlyData,
      rawData: result.rawData,
      sheetName: parseResult.selectedSheet
    });

    // 添加工作表信息到结果中
    result.sheetInfo = {
      selectedSheet: parseResult.selectedSheet,
      allSheets: parseResult.allSheets,
      message: `已分析工作表: ${parseResult.selectedSheet}`
    };

    // 使用数据库 ID 作为 fileId
    result.fileId = record.id;

    // 从响应中移除原始数据以减少传输量
    delete result.rawData;

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

// 基于数据库数据的筛选路由
router.post('/filter-data', express.json(), async (req, res) => {
  const { fileId, supplierName, timeFilterType, timeFilterValue } = req.body;

  if (!fileId) {
    return res.status(400).json({ error: 'File ID is required.' });
  }

  try {
    const record = await IQCData.findByPk(fileId);
    if (!record) {
      return res.status(404).json({ error: '记录不存在或已过期' });
    }

    const dataProcessor = new DataProcessorService();
    const timeFilter = timeFilterType && timeFilterValue ? { type: timeFilterType, value: timeFilterValue } : null;

    // 使用 recalculate 方法重新计算
    const result = dataProcessor.recalculate(record.rawData, supplierName, timeFilter);

    // 保持 fileId
    result.fileId = record.id;
    result.fileName = record.fileName;

    res.json(result);
  } catch (error) {
    console.error('Error filtering data:', error);
    res.status(500).json({ error: `筛选失败: ${error.message}` });
  }
});

// 获取指定月份详细数据路由 - 从数据库读取
router.post('/get-month-details', express.json(), async (req, res) => {
  const { fileId, month, supplierName } = req.body;

  if (!fileId) {
    return res.status(400).json({ error: 'File ID is required.' });
  }

  try {
    const record = await IQCData.findByPk(fileId);
    if (!record) {
      return res.status(404).json({ error: '记录不存在或已过期' });
    }

    // 筛选指定月份的数据
    const monthData = record.rawData.filter(item => {
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

// 获取上传历史记录
router.get('/history', async (req, res) => {
  try {
    const history = await IQCData.findAll({
      attributes: ['id', 'fileName', 'uploadTime', 'sheetName'],
      order: [['uploadTime', 'DESC']],
      limit: 20
    });
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: '获取历史记录失败' });
  }
});

// 获取最新上传的数据（用于自动加载）
router.get('/latest-data', async (req, res) => {
  try {
    const record = await IQCData.findOne({
      order: [['uploadTime', 'DESC']]
    });

    if (!record) {
      return res.status(404).json({ error: 'No data found' });
    }

    // 转换月度数据为趋势格式
    const monthlyTrend = [];
    if (record.monthlyData) {
      Object.keys(record.monthlyData).forEach(month => {
        const data = record.monthlyData[month];
        monthlyTrend.push({
          month: month,
          total: data.total,
          passRate: data.total > 0 ? ((data.ok / data.total) * 100).toFixed(2) : 0,
          returnCount: data.return || 0,
          specialCount: data.special || 0
        });
      });
      // 按月份排序
      monthlyTrend.sort((a, b) => a.month.localeCompare(b.month));
    }

    // 直接使用已存储的统计数据，包装成前端期望的格式
    const result = {
      summary: record.summary,
      monthlyData: record.monthlyData,
      monthlyTrend: monthlyTrend,
      fileId: record.id,
      fileName: record.fileName,
      sheetInfo: {
        selectedSheet: record.sheetName,
        message: `已自动加载: ${record.fileName}`
      }
    };

    // 重新计算供应商排名、缺陷分布和周度对比（基于已处理的rawData）
    if (record.rawData && record.rawData.length > 0) {
      const dataProcessor = new DataProcessorService();
      const supplierRanking = dataProcessor.calculateSupplierRanking(record.rawData);
      const defectDistribution = dataProcessor.calculateDefectDistribution(record.rawData);
      const recentTwoWeeks = dataProcessor.calculateWeekComparison(record.rawData);
      
      result.supplierRanking = supplierRanking;
      result.defectDistribution = defectDistribution;
      result.supplierDefectDistribution = []; // 空数组，前端会根据需要重新计算
      result.recentTwoWeeks = recentTwoWeeks;
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching latest data:', error);
    res.status(500).json({ error: 'Failed to fetch latest data' });
  }
});

module.exports = router;