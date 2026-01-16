/**
 * 数据库迁移脚本：添加data_type字段到vendor_configs表
 * 
 * 此脚本用于区分外购和外协供应商
 * 
 * 执行方式：node server/migrations/add_data_type_to_vendor_config.js
 */

const { sequelize } = require('../database/config.js');
const VendorConfig = require('../models/VendorConfig.js');

async function migrate() {
    try {
        console.log('========================================');
        console.log('开始迁移：添加data_type字段到vendor_config表');
        console.log('========================================\n');
        
        // 连接数据库
        await sequelize.authenticate();
        console.log('✓ 数据库连接成功\n');
        
        // 检查data_type字段是否已存在
        const tableInfo = await sequelize.query(`
            PRAGMA table_info(vendor_config)
        `);
        const hasDataTypeField = tableInfo[0].some(field => field.name === 'data_type');
        
        if (hasDataTypeField) {
            console.log('⚠ data_type字段已存在，跳过添加步骤\n');
        } else {
            // 步骤1：添加data_type字段
            console.log('步骤1：添加data_type字段...');
            await sequelize.query(`
                ALTER TABLE vendor_config 
                ADD COLUMN data_type TEXT NOT NULL DEFAULT 'purchase'
            `);
            console.log('✓ 添加data_type字段\n');
        }
        
        // 步骤2：移除旧的唯一索引
        console.log('步骤2：移除旧的唯一索引...');
        try {
            await sequelize.query(`
                ALTER TABLE vendor_config 
                DROP INDEX idx_vendor_config_supplier_name
            `);
            console.log('✓ 移除旧的唯一索引\n');
        } catch (error) {
            console.log('⚠ 旧的唯一索引不存在，跳过\n');
        }
        
        // 步骤3：检查新的复合唯一索引是否已存在
        const indexList = await sequelize.query(`
            PRAGMA index_list(vendor_config)
        `);
        const hasNewIndex = indexList[0].some(index => index.name === 'idx_vendor_config_supplier_name_type');
        
        if (hasNewIndex) {
            console.log('⚠ 新的复合唯一索引已存在，跳过添加步骤\n');
        } else {
            // 步骤3：添加新的复合唯一索引
            console.log('步骤3：添加新的复合唯一索引...');
            await sequelize.query(`
                CREATE UNIQUE INDEX idx_vendor_config_supplier_name_type ON vendor_config (supplier_name, data_type)
            `);
            console.log('✓ 添加新的复合唯一索引\n');
        }
        
        // 步骤4：检查data_type索引是否已存在
        const hasDataTypeIndex = indexList[0].some(index => index.name === 'idx_vendor_config_data_type');
        
        if (hasDataTypeIndex) {
            console.log('⚠ data_type索引已存在，跳过添加步骤\n');
        } else {
            // 步骤4：添加data_type索引
            console.log('步骤4：添加data_type索引...');
            await sequelize.query(`
                CREATE INDEX idx_vendor_config_data_type ON vendor_config (data_type)
            `);
            console.log('✓ 添加data_type索引\n');
        }
        
        // 验证迁移结果
        console.log('========================================');
        console.log('验证迁移结果');
        console.log('========================================\n');
        
        const count = await VendorConfig.count();
        console.log(`当前共有 ${count} 条供应商配置记录`);
        
        // 查看表结构
        const tableStructure = await sequelize.query(`
            PRAGMA table_info(vendor_config)
        `);
        console.log('\n表结构：');
        console.log('字段名'.padEnd(25) + '类型'.padEnd(20) + '允许NULL' + '默认值');
        console.log('─'.repeat(70));
        tableStructure[0].forEach(field => {
            console.log(
                field.name.padEnd(25) + 
                field.type.padEnd(20) + 
                (field.notnull === 0 ? '允许' : '不允许').padEnd(8) + 
                (field.dflt_value || 'NULL')
            );
        });
        
        // 查看索引
        const indexStructure = await sequelize.query(`
            PRAGMA index_list(vendor_config)
        `);
        console.log('\n索引：');
        console.log('索引名'.padEnd(50) + '字段名'.padEnd(20) + '唯一');
        console.log('─'.repeat(70));
        indexStructure[0].forEach(index => {
            console.log(
                index.name.padEnd(50) + 
                (index.table || '').padEnd(20) + 
                (index.unique === 1 ? '是' : '否')
            );
        });
        
        console.log('\n========================================');
        console.log('迁移完成！');
        console.log('========================================');
        
        await sequelize.close();
        
    } catch (error) {
        console.error('\n========================================');
        console.error('迁移失败！');
        console.error('========================================');
        console.error('错误信息:', error.message);
        console.error('错误详情:', error);
        
        if (sequelize) {
            await sequelize.close();
        }
        
        process.exit(1);
    }
}

// 执行迁移
migrate();