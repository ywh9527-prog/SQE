/**
 * 移除供应商资料表的UNIQUE约束
 * 解决同一资料类型无法重复上传的问题
 */

const { sequelize } = require('../database/config');

async function removeUniqueConstraints() {
  try {
    console.log('🔄 开始移除UNIQUE约束...');

    // 1. 删除通用资料的UNIQUE约束
    console.log('📋 删除通用资料UNIQUE约束...');
    await sequelize.query(`
      DROP INDEX IF EXISTS unique_supplier_document;
    `);
    console.log('✅ 通用资料UNIQUE约束已删除');

    // 2. 删除检测报告的UNIQUE约束
    console.log('📋 删除检测报告UNIQUE约束...');
    await sequelize.query(`
      DROP INDEX IF EXISTS unique_component_document;
    `);
    console.log('✅ 检测报告UNIQUE约束已删除');

    console.log('🎉 所有UNIQUE约束已成功移除！');
    console.log('📝 现在允许同一资料类型重复上传了');

  } catch (error) {
    console.error('❌ 移除UNIQUE约束失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  removeUniqueConstraints()
    .then(() => {
      console.log('✅ 迁移完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 迁移失败:', error);
      process.exit(1);
    });
}

module.exports = { removeUniqueConstraints };