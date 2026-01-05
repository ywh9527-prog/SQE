/**
 * 创建供应商配置中心表
 *
 * 目的: 创建vendor_config表，作为供应商配置管理中心的数据存储
 *
 * 主要变更:
 * 1. 创建vendor_config表
 * 2. 创建5个索引以优化查询性能
 *
 * 执行方式: node server/migrations/create_vendor_config.js
 */

const { sequelize } = require('../database/config');

async function createVendorConfigTable() {
    console.log('🚀 开始创建供应商配置中心表...\n');

    try {
        // Step 1: 检查表是否已存在
        console.log('📋 Step 1: 检查表是否已存在...');
        const [tables] = await sequelize.query(`
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='vendor_config'
        `);

        if (tables.length > 0) {
            console.log('⚠️  vendor_config表已存在，跳过创建\n');
            console.log('✅ 迁移脚本执行完成');
            process.exit(0);
            return;
        }

        console.log('  ✅ 表不存在，准备创建\n');

        // Step 2: 创建vendor_config表
        console.log('📋 Step 2: 创建vendor_config表...');
        await sequelize.query(`
            CREATE TABLE vendor_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                supplier_name VARCHAR(255) NOT NULL UNIQUE,
                source VARCHAR(50) DEFAULT 'IQC',
                enable_document_mgmt BOOLEAN DEFAULT 0,
                enable_performance_mgmt BOOLEAN DEFAULT 0,
                status VARCHAR(20) DEFAULT 'Active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ vendor_config表创建成功\n');

        // Step 3: 创建索引
        console.log('📋 Step 3: 创建索引...');

        await sequelize.query(`
            CREATE INDEX idx_vendor_config_supplier_name
            ON vendor_config(supplier_name)
        `);
        console.log('  ✅ 索引 idx_vendor_config_supplier_name 创建成功');

        await sequelize.query(`
            CREATE INDEX idx_vendor_config_source
            ON vendor_config(source)
        `);
        console.log('  ✅ 索引 idx_vendor_config_source 创建成功');

        await sequelize.query(`
            CREATE INDEX idx_vendor_config_status
            ON vendor_config(status)
        `);
        console.log('  ✅ 索引 idx_vendor_config_status 创建成功');

        await sequelize.query(`
            CREATE INDEX idx_vendor_config_enable_document
            ON vendor_config(enable_document_mgmt)
        `);
        console.log('  ✅ 索引 idx_vendor_config_enable_document 创建成功');

        await sequelize.query(`
            CREATE INDEX idx_vendor_config_enable_performance
            ON vendor_config(enable_performance_mgmt)
        `);
        console.log('  ✅ 索引 idx_vendor_config_enable_performance 创建成功\n');

        // Step 4: 验证表结构
        console.log('📋 Step 4: 验证表结构...');
        const [columns] = await sequelize.query(`
            PRAGMA table_info(vendor_config)
        `);

        console.log('  📊 表字段:');
        columns.forEach(col => {
            console.log(`    - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
        });

        const [indexes] = await sequelize.query(`
            PRAGMA index_list(vendor_config)
        `);

        console.log('\n  📊 表索引:');
        indexes.forEach(idx => {
            console.log(`    - ${idx.name}`);
        });

        console.log('\n✅ vendor_config表创建成功！\n');
        console.log('🎉 迁移脚本执行完成\n');

    } catch (error) {
        console.error('❌ 创建vendor_config表失败:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// 执行迁移
if (require.main === module) {
    createVendorConfigTable()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 迁移脚本执行失败:', error);
            process.exit(1);
        });
}

module.exports = createVendorConfigTable;