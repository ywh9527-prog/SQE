/**
 * 迁移脚本: 更新 vendor_config 表的 status 字段默认值
 * 从 'Active' 改为 'Inactive'
 */

const { sequelize } = require('../database/config');

async function updateVendorConfigDefaultStatus() {
    try {
        console.log('🔄 开始更新 vendor_config 表的 status 字段默认值...\n');

        // 检查表是否存在
        const [tables] = await sequelize.query(`
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='vendor_config'
        `);

        if (tables.length === 0) {
            console.log('❌ vendor_config 表不存在,跳过迁移\n');
            return;
        }

        console.log('✅ vendor_config 表存在\n');

        // 获取当前表结构
        const [columns] = await sequelize.query(`
            PRAGMA table_info(vendor_config)
        `);

        console.log('📊 当前表结构:');
        columns.forEach(col => {
            console.log(`  - ${col.name}: ${col.type}${col.dflt_value ? ` (默认值: ${col.dflt_value})` : ''}`);
        });
        console.log('');

        // SQLite 不支持直接修改列的默认值,需要重建表
        console.log('📋 SQLite 不支持直接修改列默认值,需要重建表...\n');

        // Step 1: 备份数据
        console.log('📋 Step 1: 备份现有数据...');
        const [vendors] = await sequelize.query(`
            SELECT * FROM vendor_config
        `);
        console.log(`  ✅ 备份了 ${vendors.length} 条记录\n`);

        // Step 2: 删除旧表
        console.log('📋 Step 2: 删除旧表...');
        await sequelize.query(`DROP TABLE vendor_config`);
        console.log('  ✅ 旧表已删除\n');

        // Step 3: 创建新表(使用新的默认值)
        console.log('📋 Step 3: 创建新表(使用新的默认值)...');
        await sequelize.query(`
            CREATE TABLE vendor_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                supplier_name VARCHAR(255) NOT NULL UNIQUE,
                source VARCHAR(50) DEFAULT 'IQC',
                enable_document_mgmt BOOLEAN DEFAULT 0,
                enable_performance_mgmt BOOLEAN DEFAULT 0,
                status VARCHAR(20) DEFAULT 'Inactive',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('  ✅ 新表创建成功\n');

        // Step 4: 恢复数据
        console.log('📋 Step 4: 恢复数据...');
        if (vendors.length > 0) {
            let successCount = 0;
            for (const vendor of vendors) {
                try {
                    // 验证数据完整性
                    if (!vendor.supplier_name) {
                        console.log(`  ⚠️  跳过无效数据: ${JSON.stringify(vendor)}`);
                        continue;
                    }

                    await sequelize.query(`
                        INSERT INTO vendor_config (
                            id, supplier_name, source, enable_document_mgmt,
                            enable_performance_mgmt, status, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        vendor.id,
                        vendor.supplier_name,
                        vendor.source || 'IQC',
                        vendor.enable_document_mgmt || 0,
                        vendor.enable_performance_mgmt || 0,
                        vendor.status || 'Inactive',
                        vendor.created_at || new Date(),
                        vendor.updated_at || new Date()
                    ]);
                    successCount++;
                } catch (error) {
                    console.log(`  ⚠️  恢复失败: ${vendor.supplier_name || vendor.id} - ${error.message}`);
                }
            }
            console.log(`  ✅ 成功恢复了 ${successCount}/${vendors.length} 条记录\n`);
        } else {
            console.log('  ✅ 没有数据需要恢复\n');
        }

        // Step 5: 重建索引
        console.log('📋 Step 5: 重建索引...');
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

        // Step 6: 验证新表结构
        console.log('📋 Step 6: 验证新表结构...');
        const [newColumns] = await sequelize.query(`
            PRAGMA table_info(vendor_config)
        `);

        console.log('📊 新表结构:');
        newColumns.forEach(col => {
            console.log(`  - ${col.name}: ${col.type}${col.dflt_value ? ` (默认值: ${col.dflt_value})` : ''}`);
        });
        console.log('');

        console.log('✅ 迁移完成! vendor_config 表的 status 字段默认值已更新为 \'Inactive\'\n');

    } catch (error) {
        console.error('❌ 迁移失败:', error);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    updateVendorConfigDefaultStatus()
        .then(() => {
            console.log('🎉 迁移脚本执行完成\n');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 迁移脚本执行失败\n');
            process.exit(1);
        });
}

module.exports = updateVendorConfigDefaultStatus;