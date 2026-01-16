/**
 * 数据库迁移脚本：修复supplier_name字段的UNIQUE约束
 * 
 * 问题：supplier_name字段有UNIQUE约束，导致无法创建同一供应商的不同类型记录
 * 解决方案：重新创建表，移除supplier_name的UNIQUE约束，使用复合唯一索引代替
 * 
 * 执行方式：node server/migrations/fix_unique_constraint_v2.js
 */

const { sequelize } = require('../database/config.js');
const VendorConfig = require('../models/VendorConfig.js');

async function migrate() {
    try {
        console.log('========================================');
        console.log('开始迁移：修复supplier_name的UNIQUE约束');
        console.log('========================================\n');
        
        // 连接数据库
        await sequelize.authenticate();
        console.log('✓ 数据库连接成功\n');
        
        // 检查表结构，看是否有UNIQUE约束
        console.log('检查表结构...');
        const [createTable] = await sequelize.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='vendor_config'");
        const tableSQL = createTable[0].sql;
        console.log('当前表结构：');
        console.log(tableSQL);
        
        if (!tableSQL.includes('supplier_name VARCHAR(255) NOT NULL UNIQUE')) {
            console.log('\n✓ supplier_name字段没有UNIQUE约束，无需迁移');
            await sequelize.close();
            return;
        }
        
        console.log('\n⚠ 检测到supplier_name字段有UNIQUE约束，需要修复\n');
        
        // 步骤1：备份数据
        console.log('步骤1：备份数据...');
        const [vendors] = await sequelize.query('SELECT * FROM vendor_config');
        console.log(`✓ 备份了 ${vendors.length} 条记录\n`);
        
        // 步骤2：删除旧表
        console.log('步骤2：删除旧表...');
        await sequelize.query('DROP TABLE IF EXISTS vendor_config_backup');
        await sequelize.query('ALTER TABLE vendor_config RENAME TO vendor_config_backup');
        console.log('✓ 旧表已重命名为vendor_config_backup\n');
        
        // 步骤3：创建新表（没有supplier_name的UNIQUE约束）
        console.log('步骤3：创建新表...');
        await sequelize.query(`
            CREATE TABLE vendor_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                supplier_name VARCHAR(255) NOT NULL,
                data_type TEXT NOT NULL DEFAULT 'purchase',
                source VARCHAR(50) DEFAULT 'IQC',
                enable_document_mgmt BOOLEAN DEFAULT 0,
                enable_performance_mgmt BOOLEAN DEFAULT 0,
                status VARCHAR(20) DEFAULT 'Inactive',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ 新表创建成功\n');
        
        // 步骤4：恢复数据
        console.log('步骤4：恢复数据...');
        for (const vendor of vendors) {
            await sequelize.query(`
                INSERT INTO vendor_config (
                    id, supplier_name, data_type, source,
                    enable_document_mgmt, enable_performance_mgmt,
                    status, created_at, updated_at
                ) VALUES (
                    :id, :supplier_name, :data_type, :source,
                    :enable_document_mgmt, :enable_performance_mgmt,
                    :status, :created_at, :updated_at
                )
            `, {
                replacements: {
                    id: vendor.id,
                    supplier_name: vendor.supplier_name,
                    data_type: vendor.data_type || 'purchase',
                    source: vendor.source,
                    enable_document_mgmt: vendor.enable_document_mgmt,
                    enable_performance_mgmt: vendor.enable_performance_mgmt,
                    status: vendor.status,
                    created_at: vendor.created_at,
                    updated_at: vendor.updated_at
                }
            });
        }
        console.log(`✓ 恢复了 ${vendors.length} 条记录\n`);
        
        // 步骤5：创建索引
        console.log('步骤5：创建索引...');
        
        // 复合唯一索引
        try {
            await sequelize.query(`
                CREATE UNIQUE INDEX idx_vendor_config_supplier_name_type 
                ON vendor_config (supplier_name, data_type)
            `);
            console.log('✓ 创建复合唯一索引 idx_vendor_config_supplier_name_type');
        } catch (error) {
            console.log('⚠ 复合唯一索引已存在，跳过');
        }
        
        // data_type索引
        try {
            await sequelize.query(`
                CREATE INDEX idx_vendor_config_data_type 
                ON vendor_config (data_type)
            `);
            console.log('✓ 创建索引 idx_vendor_config_data_type');
        } catch (error) {
            console.log('⚠ data_type索引已存在，跳过');
        }
        
        // source索引
        try {
            await sequelize.query(`
                CREATE INDEX idx_vendor_config_source 
                ON vendor_config (source)
            `);
            console.log('✓ 创建索引 idx_vendor_config_source');
        } catch (error) {
            console.log('⚠ source索引已存在，跳过');
        }
        
        // status索引
        try {
            await sequelize.query(`
                CREATE INDEX idx_vendor_config_status 
                ON vendor_config (status)
            `);
            console.log('✓ 创建索引 idx_vendor_config_status');
        } catch (error) {
            console.log('⚠ status索引已存在，跳过');
        }
        
        // enable_document_mgmt索引
        try {
            await sequelize.query(`
                CREATE INDEX idx_vendor_config_enable_document 
                ON vendor_config (enable_document_mgmt)
            `);
            console.log('✓ 创建索引 idx_vendor_config_enable_document');
        } catch (error) {
            console.log('⚠ enable_document_mgmt索引已存在，跳过');
        }
        
        // enable_performance_mgmt索引
        try {
            await sequelize.query(`
                CREATE INDEX idx_vendor_config_enable_performance 
                ON vendor_config (enable_performance_mgmt)
            `);
            console.log('✓ 创建索引 idx_vendor_config_enable_performance');
        } catch (error) {
            console.log('⚠ enable_performance_mgmt索引已存在，跳过');
        }
        
        console.log();
        
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
        console.log('索引名'.padEnd(50) + '唯一');
        console.log('─'.repeat(70));
        indexStructure[0].forEach(index => {
            console.log(
                index.name.padEnd(50) + 
                (index.unique === 1 ? '是' : '否')
            );
        });
        
        // 测试创建同一供应商的不同类型
        console.log('\n========================================');
        console.log('测试：创建同一供应商的不同类型');
        console.log('========================================\n');
        
        try {
            const vendor1 = await VendorConfig.create({
                supplier_name: '测试供应商_迁移测试',
                data_type: 'purchase',
                source: 'MANUAL',
                enable_document_mgmt: 0,
                enable_performance_mgmt: 0,
                status: 'Inactive'
            });
            console.log(`✓ 创建外购类型: ID=${vendor1.id}, 名称=${vendor1.supplier_name}, 类型=${vendor1.data_type}`);
            
            const vendor2 = await VendorConfig.create({
                supplier_name: '测试供应商_迁移测试',
                data_type: 'external',
                source: 'MANUAL',
                enable_document_mgmt: 0,
                enable_performance_mgmt: 0,
                status: 'Inactive'
            });
            console.log(`✓ 创建外协类型: ID=${vendor2.id}, 名称=${vendor2.supplier_name}, 类型=${vendor2.data_type}`);
            
            // 清理测试数据
            await VendorConfig.destroy({
                where: {
                    supplier_name: '测试供应商_迁移测试'
                }
            });
            console.log('✓ 测试数据已清理');
            
        } catch (error) {
            console.log('✗ 测试失败:', error.message);
        }
        
        console.log('\n========================================');
        console.log('迁移完成！');
        console.log('========================================');
        console.log('⚠ 备份表 vendor_config_backup 仍然存在，确认无误后可手动删除');
        
        await sequelize.close();
        
    } catch (error) {
        console.error('\n========================================');
        console.error('迁移失败！');
        console.error('========================================');
        console.error('错误信息:', error.message);
        console.error('错误详情:', error);
        
        // 尝试恢复备份
        console.log('\n尝试恢复备份...');
        try {
            await sequelize.query('DROP TABLE IF EXISTS vendor_config');
            await sequelize.query('ALTER TABLE vendor_config_backup RENAME TO vendor_config');
            console.log('✓ 备份已恢复');
        } catch (restoreError) {
            console.error('✗ 恢复备份失败:', restoreError.message);
        }
        
        if (sequelize) {
            await sequelize.close();
        }
        
        process.exit(1);
    }
}

// 执行迁移
migrate();