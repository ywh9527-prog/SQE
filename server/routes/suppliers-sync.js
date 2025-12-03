/**
 * 供应商同步API - 从IQC系统同步供应商数据
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../database/config');

/**
 * POST /api/suppliers/sync-from-iqc
 * 从IQC系统同步供应商数据
 */
router.post('/sync-from-iqc', async (req, res) => {
  try {
    console.log('🔄 开始从IQC系统同步供应商数据...');
    
    // 1. 从IQC数据中提取供应商信息
    const [iqcRecords] = await sequelize.query('SELECT raw_data FROM iqc_data');
    
    const iqcSuppliers = new Set();
    const supplierStats = {};
    
    // 解析IQC数据中的供应商
    iqcRecords.forEach(record => {
      try {
        const rawData = JSON.parse(record.raw_data);
        rawData.forEach(item => {
          if (item.supplier) {
            iqcSuppliers.add(item.supplier);
            
            // 统计供应商的检验数据
            if (!supplierStats[item.supplier]) {
              supplierStats[item.supplier] = {
                totalBatches: 0,
                okBatches: 0,
                ngBatches: 0,
                firstInspection: item.time,
                lastInspection: item.time
              };
            }
            
            supplierStats[item.supplier].totalBatches++;
            if (item.result === 'OK') {
              supplierStats[item.supplier].okBatches++;
            } else {
              supplierStats[item.supplier].ngBatches++;
            }
            
            // 更新检验时间范围
            if (item.time < supplierStats[item.supplier].firstInspection) {
              supplierStats[item.supplier].firstInspection = item.time;
            }
            if (item.time > supplierStats[item.supplier].lastInspection) {
              supplierStats[item.supplier].lastInspection = item.time;
            }
          }
        });
      } catch (error) {
        console.warn('解析raw_data失败:', error.message);
      }
    });
    
    // 2. 查询现有供应商
    const [existingSuppliers] = await sequelize.query('SELECT name FROM suppliers');
    const existingSupplierNames = new Set(existingSuppliers.map(s => s.name));
    
    // 3. 找出新增的供应商
    const newSuppliers = Array.from(iqcSuppliers).filter(name => !existingSupplierNames.has(name));
    
    let addedCount = 0;
    const addedSuppliers = [];
    
    // 4. 添加新供应商到资料管理系统
    if (newSuppliers.length > 0) {
      for (const supplierName of newSuppliers) {
        try {
          const stats = supplierStats[supplierName];
          const passRate = ((stats.okBatches / stats.totalBatches) * 100).toFixed(2);
          
          await sequelize.query(`
            INSERT INTO suppliers (
              name, code, contact_person, contact_phone, contact_email,
              level, address, notes, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', datetime('now'), datetime('now'))
          `, {
            replacements: [
              supplierName,
              null, // 供应商编码
              null, // 联系人
              null, // 联系电话
              null, // 联系邮箱
              passRate >= 95 ? 'Core' : 'General', // 根据合格率设定等级
              null, // 地址
              `从IQC系统自动同步，检验批次: ${stats.totalBatches}, 合格率: ${passRate}%` // 备注
            ]
          });
          
          addedCount++;
          addedSuppliers.push(supplierName);
          console.log(`✅ 新增供应商: ${supplierName}`);
          
        } catch (error) {
          console.error(`❌ 添加供应商失败: ${supplierName}`, error.message);
        }
      }
    }
    
    console.log(`🎉 同步完成！新增 ${addedCount} 个供应商`);
    
    res.json({
      success: true,
      data: {
        newSuppliers: addedSuppliers,
        totalSuppliers: iqcSuppliers.size,
        existingSuppliers: existingSupplierNames.size,
        addedCount: addedCount
      },
      message: addedCount > 0 
        ? `同步完成，发现 ${addedCount} 个新供应商` 
        : '同步完成，没有发现新供应商'
    });
    
  } catch (error) {
    console.error('同步供应商数据失败:', error);
    res.status(500).json({
      success: false,
      error: '同步供应商数据失败',
      message: error.message
    });
  }
});

module.exports = router;