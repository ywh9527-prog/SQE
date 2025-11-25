const express = require('express');
const IQCData = require('../models/IQCData');

const router = express.Router();

// 数据源统计接口
router.get('/data-source-stats', async (req, res) => {
  try {
    // 分别获取外购和外协的最新记录
    const [latestPurchase, latestExternal] = await Promise.all([
      IQCData.findOne({
        where: { dataType: 'purchase' },
        order: [['uploadTime', 'DESC']]
      }),
      IQCData.findOne({
        where: { dataType: 'external' },
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

module.exports = router;