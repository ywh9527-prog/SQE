const { sequelize } = require('./server/database/config');
const { Op } = require('sequelize');
const IQCData = require('./server/models/IQCData');

async function testAPI() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 测试查询
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
    
    console.log('找到记录数:', records.length);
    
    // 测试年份提取
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
    
  } catch (error) {
    console.error('测试失败:', error);
  } finally {
    await sequelize.close();
  }
}

testAPI();