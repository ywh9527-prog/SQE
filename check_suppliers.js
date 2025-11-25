const path = require('path');
const fs = require('fs');

// 简单的数据库查询
const dbPath = path.join(__dirname, 'sqe_database.sqlite');
console.log('数据库路径:', dbPath);
console.log('数据库存在:', fs.existsSync(dbPath));

try {
  const { Sequelize, DataTypes } = require('sequelize');
  
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false
  });
  
  // 定义模型
  const IQCData = sequelize.define('IQCData', {
    fileName: DataTypes.STRING,
    dataType: DataTypes.STRING,
    rawData: DataTypes.JSON
  });
  
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('数据库连接成功');
      
      const records = await IQCData.findAll({
        attributes: ['id', 'fileName', 'dataType', 'uploadTime'],
        order: [['uploadTime', 'DESC']]
      });
      
      console.log('\n=== 数据库记录 ===');
      records.forEach(record => {
        console.log(`ID: ${record.id}, 文件: ${record.fileName}, 类型: ${record.dataType}`);
      });
      
      // 检查每个记录中的供应商
      for (const record of records) {
        console.log(`\n=== ${record.fileName} (${record.dataType}) 供应商列表 ===`);
        const suppliers = new Set();
        const targetSuppliers = ['幸福电子', '宜益', '中科', '亦高', '锐盛', '旷视'];
        
        record.rawData.forEach(item => {
          if (item.supplier) {
            suppliers.add(item.supplier);
          }
        });
        
        // 检查目标供应商
        console.log('目标供应商检查:');
        targetSuppliers.forEach(target => {
          const found = Array.from(suppliers).filter(s => s.includes(target));
          if (found.length > 0) {
            console.log(`  ✅ ${target}: ${found.join(', ')}`);
          }
        });
        
        console.log(`总供应商数: ${suppliers.size}`);
      }
      
      process.exit(0);
    } catch (error) {
      console.error('错误:', error);
      process.exit(1);
    }
  })();
  
} catch (error) {
  console.error('模块加载错误:', error);
  process.exit(1);
}