const express = require('express');
const { sequelize, Op } = require('./server/database/config');
const IQCData = require('./server/models/IQCData');

const app = express();

// 测试API
app.get('/test-available-years', async (req, res) => {
  try {
    console.log('开始查询可用年份...');
    
    const records = await IQCData.findAll({
      attributes: ['sheetName'],
      where: {
        sheetName: {
          [Op.ne]: null,
          [Op.not]: ''
        }
      },
      order: [['sheetName', 'DESC']]
    });
    
    console.log('查询到记录数:', records.length);
    
    const yearSet = new Set();
    records.forEach(record => {
      if (record.sheetName) {
        const yearMatch = record.sheetName.trim().match(/(\d{4})/);
        if (yearMatch) {
          yearSet.add(yearMatch[1]);
        }
      }
    });
    
    const yearList = Array.from(yearSet).sort((a, b) => b - a);
    console.log('提取的年份:', yearList);
    
    res.json({
      years: yearList,
      count: yearList.length
    });
  } catch (error) {
    console.error('错误详情:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 8889;
app.listen(PORT, () => {
  console.log(`测试服务器运行在端口 ${PORT}`);
  
  // 测试API调用
  (async () => {
    try {
      const response = await fetch(`http://localhost:${PORT}/test-available-years`);
      const result = await response.json();
      console.log('API测试结果:', result);
    } catch (error) {
      console.error('API调用失败:', error);
    }
    process.exit(0);
  })();
});