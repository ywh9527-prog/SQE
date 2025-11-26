const express = require('express');
const fs = require('fs');
const ExcelParserService = require('../services/excel-parser');
const ComparisonService = require('../services/comparison-service');
const upload = require('../middleware/upload-config');
const IQCData = require('../models/IQCData');

const router = express.Router();

// 自定义时间段比较路由
router.post('/compare-custom-periods', upload.single('excelFile'), async (req, res) => {
  const { currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd, fileId } = req.body;

  if (!currentPeriodStart || !currentPeriodEnd || !previousPeriodStart || !previousPeriodEnd) {
    return res.status(400).send('请提供本周和上周的开始和结束日期');
  }

  if (!req.file && !fileId) {
    return res.status(400).send('No file uploaded or fileId provided.');
  }

  try {
    let jsonData;

    if (fileId) {
      // 从数据库获取数据
      const record = await IQCData.findByPk(fileId);
      if (!record) {
        return res.status(404).send('记录不存在或已过期');
      }
      jsonData = record.rawData;
    } else {
      // 从上传文件获取数据
      jsonData = ExcelParserService.parseExcelFile(req.file.path);
      ExcelParserService.validateExcelData(jsonData);

      // 在返回结果后，删除上传的文件
      setTimeout(() => {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      }, 10000); // 10秒后删除文件
    }

    // 执行自定义时间段比较分析
    const result = ComparisonService.compareCustomPeriods(
      jsonData,
      currentPeriodStart,
      currentPeriodEnd,
      previousPeriodStart,
      previousPeriodEnd
    );

    res.json(result);
  } catch (error) {
    console.error('处理自定义时间段请求时出现错误:', error);
    res.status(500).send(`处理自定义时间段比较时出现错误: ${error.message}`);
  }
});

module.exports = router;