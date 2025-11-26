const { sequelize } = require('./server/database/config');
const IQCData = require('./server/models/IQCData');

async function check2026Data() {
    try {
        await sequelize.authenticate();
        console.log('数据库连接成功');
        
        // 查询所有2026相关的记录
        const records = await IQCData.findAll({
            where: {
                [sequelize.Op.or]: [
                    { sheetName: '2026' },
                    { sheetName: '2026年' }
                ]
            }
        });
        
        console.log(`找到${records.length}条2026年相关记录:`);
        records.forEach((record, index) => {
            console.log(`记录${index}: sheetName="${record.sheetName}", {
                id: record.id,
                dataType: record.dataType,
                totalCount: record.recordCount,
                uploadTime: record.uploadTime,
                fileId: record.fileId
            });
        });
        
        // 查询数据库中是否有其他2026格式的数据
        const other2026Formats = await IQCData.findAll({
            where: {
                sheetName: {
                    [sequelize.Op.like]: '%2026%'
                }
            }
        });
        
        console.log(`包含"2026"的所有记录: ${other2026Formats.length}条`);
        other2026Formats.forEach((record, index) => {
            console.log(`其他2026格式记录${index}: sheetName="${record.sheetName}"`, {
                id: record.id,
                dataType: record.dataType,
                totalCount: record.recordCount
            });
        });
        
    } catch (error) {
        console.error('检查失败:', error);
    } finally {
        await sequelize.close();
    }
}

check2026Data();