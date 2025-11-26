const { sequelize } = require('./server/database/config');
const { Op } = require('sequelize');
const IQCData = require('./server/models/IQCData');

async function checkDatabase() {
    try {
        await sequelize.authenticate();
        console.log('数据库连接成功');
        
        // 查询所有不重复的sheetName
        const records = await IQCData.findAll({
            attributes: ['sheetName'],
            where: {
                sheetName: {
                    [Op.ne]: null,
                    [Op.not]: ''
                }
            }
        });
        
        console.log('所有sheetName记录:');
        records.forEach(record => {
            console.log(`- ${record.sheetName}`);
        });
        
        // 过滤年份格式
        const yearSet = new Set();
        records.forEach(record => {
            if (record.sheetName && /^\d{4}$/.test(record.sheetName.trim())) {
                yearSet.add(record.sheetName.trim());
            }
        });
        
        const yearList = Array.from(yearSet).sort((a, b) => b - a);
        console.log('\n过滤后的年份列表:', yearList);
        
    } catch (error) {
        console.error('查询失败:', error);
    } finally {
        await sequelize.close();
    }
}

checkDatabase();