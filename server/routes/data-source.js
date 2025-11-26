const express = require('express');
const { sequelize } = require('../database/config');
const { Op } = require('sequelize');
const IQCData = require('../models/IQCData');

const router = express.Router();

// 数据源统计接口
router.get('/data-source-stats', async (req, res) => {
  const { year } = req.query;
  try {
    // 构建查询条件
    const whereCondition = year ? { 
      [Op.or]: [
        { sheetName: year },
        { sheetName: `${year}年` }
      ]
    } : {};
    
    // 分别获取外购和外协的最新记录
    const [latestPurchase, latestExternal] = await Promise.all([
      IQCData.findOne({
        where: { dataType: 'purchase', ...whereCondition },
        order: [['uploadTime', 'DESC']]
      }),
      IQCData.findOne({
        where: { dataType: 'external', ...whereCondition },
        order: [['uploadTime', 'DESC']]
      })
    ]);

    // 自定义更新提醒时间：7天
    const UPDATE_WARNING_DAYS = 7;
    const now = new Date();

    const formatStats = (record) => {
      if (!record) {
        return {
          totalCount: 0,
          lastUpdate: null,
          timeRange: { start: null, end: null },
          recentCount: 0,
          needsUpdate: true,
          hasData: false
        };
      }

      const daysSinceUpdate = Math.floor((now - record.uploadTime) / (1000 * 60 * 60 * 24));
      
      return {
        totalCount: record.recordCount || 0,
        lastUpdate: record.uploadTime,
        timeRange: {
          start: record.timeRangeStart,
          end: record.timeRangeEnd
        },
        recentCount: record.recordCount || 0,
        needsUpdate: daysSinceUpdate > UPDATE_WARNING_DAYS,
        hasData: true,
        fileId: record.id,
        fileName: record.fileName
      };
    };

    res.json({
      purchase: formatStats(latestPurchase),
      external: formatStats(latestExternal),
      settings: {
        updateWarningDays: UPDATE_WARNING_DAYS
      }
    });
  } catch (error) {
    console.error('Error fetching data source stats:', error);
    res.status(500).json({ error: '获取数据源统计失败' });
  }
});

// 获取可用年份列表接口
router.get('/available-years', async (req, res) => {
  try {
    // 使用更简单的查询方式获取不重复年份
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

    // 手动去重并过滤年份格式
    const yearSet = new Set();
    records.forEach(record => {
      if (record.sheetName) {
        const yearMatch = record.sheetName.trim().match(/(\d{4})/);
        if (yearMatch) {
          yearSet.add(yearMatch[1]);
        }
      }
    });

    const yearList = Array.from(yearSet).sort((a, b) => b - a); // 倒序排列
    
    console.log('所有可用年份:', yearList);
    
    res.json({
      years: yearList,
      count: yearList.length
    });
  } catch (error) {
    console.error('Error fetching available years:', error);
    res.status(500).json({ error: '获取可用年份列表失败' });
  }
});

// 按数据类型和年份获取可用年份列表
router.get('/available-years/:dataType', async (req, res) => {
  try {
    const { dataType } = req.params;
    
    // 验证数据类型
    if (!['purchase', 'external'].includes(dataType)) {
      return res.status(400).json({ error: '无效的数据类型' });
    }

    // 使用更简单的查询方式获取不重复年份
    const records = await IQCData.findAll({
      attributes: ['sheetName'],
      where: {
        dataType: dataType,
        sheetName: {
          [Op.ne]: null,
          [Op.not]: ''
        }
      },
      order: [['sheetName', 'DESC']]
    });

    // 手动去重并过滤年份格式
    const yearSet = new Set();
    records.forEach(record => {
      if (record.sheetName) {
        const yearMatch = record.sheetName.trim().match(/(\d{4})/);
        if (yearMatch) {
          yearSet.add(yearMatch[1]);
        }
      }
    });

    const yearList = Array.from(yearSet).sort((a, b) => b - a); // 倒序排列
    
    console.log(`${dataType} 可用年份:`, yearList);
    
    res.json({
      dataType: dataType,
      years: yearList,
      count: yearList.length
    });
  } catch (error) {
    console.error('Error fetching available years by type:', error);
    res.status(500).json({ error: '获取可用年份列表失败' });
  }
});

module.exports = router;