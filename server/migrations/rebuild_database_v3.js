/**
 * 数据库重构迁移脚本 v3.0
 * 
 * 目的: 重建供应商资料管理系统的数据库结构
 * 
 * 主要变更:
 * 1. 删除所有现有测试数据
 * 2. 重建表结构,支持三级层级 (供应商 → 物料 → 具体构成)
 * 3. MSDS归为供应商级资料
 * 4. 支持用户自定义物料和构成名称
 * 
 * 执行方式: node server/migrations/rebuild_database_v3.js
 */

const { sequelize } = require('../database/config');
const Supplier = require('../models/Supplier');
const Material = require('../models/Material');
const MaterialComponent = require('../models/MaterialComponent');
const SupplierDocument = require('../models/SupplierDocument');

async function rebuildDatabase() {
    console.log('🚀 开始数据库重构 v3.0...\n');

    try {
        // Step 1: 删除所有现有表 (包括测试数据)
        console.log('📋 Step 1: 删除现有表...');
        await sequelize.query('DROP TABLE IF EXISTS supplier_documents');
        await sequelize.query('DROP TABLE IF EXISTS material_components');
        await sequelize.query('DROP TABLE IF EXISTS materials');
        await sequelize.query('DROP TABLE IF EXISTS suppliers');
        console.log('✅ 现有表已删除\n');

        // Step 2: 创建新表结构
        console.log('📋 Step 2: 创建新表结构...');

        // 2.1 创建 suppliers 表
        await sequelize.query(`
      CREATE TABLE suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code VARCHAR(100),
        name VARCHAR(255) NOT NULL UNIQUE,
        contact_person VARCHAR(100),
        contact_email VARCHAR(100),
        contact_phone VARCHAR(50),
        level VARCHAR(20) DEFAULT 'General',
        status VARCHAR(20) DEFAULT 'Active',
        address VARCHAR(500),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('  ✅ suppliers 表创建成功');

        // 2.2 创建 materials 表
        await sequelize.query(`
      CREATE TABLE materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        material_name VARCHAR(255) NOT NULL,
        material_code VARCHAR(100),
        description TEXT,
        status VARCHAR(20) DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
        UNIQUE(supplier_id, material_name)
      )
    `);
        console.log('  ✅ materials 表创建成功');

        // 2.3 创建 material_components 表
        await sequelize.query(`
      CREATE TABLE material_components (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        material_id INTEGER NOT NULL,
        component_name VARCHAR(255) NOT NULL,
        component_code VARCHAR(100),
        description TEXT,
        status VARCHAR(20) DEFAULT 'Active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
        UNIQUE(material_id, component_name)
      )
    `);
        console.log('  ✅ material_components 表创建成功');

        // 2.4 创建 supplier_documents 表
        await sequelize.query(`
      CREATE TABLE supplier_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        level VARCHAR(20) DEFAULT 'supplier',
        material_id INTEGER,
        component_id INTEGER,
        document_type VARCHAR(50) NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        document_number VARCHAR(100),
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER NOT NULL,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        expiry_date DATE,
        is_permanent BOOLEAN DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        responsible_person VARCHAR(100),
        issuing_authority VARCHAR(100),
        remarks TEXT,
        version INTEGER DEFAULT 1,
        is_current BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
        FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
        FOREIGN KEY (component_id) REFERENCES material_components(id) ON DELETE CASCADE
      )
    `);
        console.log('  ✅ supplier_documents 表创建成功');

        // Step 3: 创建索引
        console.log('\n📋 Step 3: 创建索引...');

        await sequelize.query('CREATE INDEX idx_materials_supplier ON materials(supplier_id)');
        await sequelize.query('CREATE INDEX idx_components_material ON material_components(material_id)');
        await sequelize.query('CREATE INDEX idx_documents_supplier ON supplier_documents(supplier_id)');
        await sequelize.query('CREATE INDEX idx_documents_material ON supplier_documents(material_id)');
        await sequelize.query('CREATE INDEX idx_documents_component ON supplier_documents(component_id)');
        await sequelize.query('CREATE INDEX idx_documents_level ON supplier_documents(level)');
        await sequelize.query('CREATE INDEX idx_documents_type ON supplier_documents(document_type)');
        await sequelize.query('CREATE INDEX idx_documents_expiry ON supplier_documents(expiry_date)');

        console.log('✅ 索引创建成功\n');

        // Step 4: 插入示例数据 (可选)
        console.log('📋 Step 4: 插入示例数据...');

        // 4.1 插入供应商
        await sequelize.query(`
      INSERT INTO suppliers (name, contact_person, contact_email, contact_phone, level, status)
      VALUES 
        ('深圳XX电子', '张三', 'zhang@example.com', '13800138000', 'Core', 'Active'),
        ('东莞YY科技', '李四', 'li@example.com', '13800138001', 'General', 'Active'),
        ('广州ZZ实业', '王五', 'wang@example.com', '13800138002', 'General', 'Active')
    `);
        console.log('  ✅ 插入3家示例供应商');

        // 4.2 插入物料
        await sequelize.query(`
      INSERT INTO materials (supplier_id, material_name, material_code, description)
      VALUES 
        (1, '电木粉', 'DM-001', '用于生产电木产品'),
        (1, 'PIN脚', 'PIN-001', '金属PIN脚'),
        (2, '塑料外壳', 'PL-001', 'ABS塑料外壳'),
        (2, '电路板', 'PCB-001', 'FR4电路板')
    `);
        console.log('  ✅ 插入4个示例物料');

        // 4.3 插入具体构成
        await sequelize.query(`
      INSERT INTO material_components (material_id, component_name, component_code, description)
      VALUES 
        (1, '成分A', 'CA-001', '电木粉主要成分'),
        (1, '成分B', 'CB-001', '电木粉辅助成分'),
        (2, '铜材', 'CU-001', 'PIN脚铜材部分'),
        (3, 'ABS树脂', 'ABS-001', '外壳主要材料'),
        (4, 'FR4基材', 'FR4-001', '电路板基材')
    `);
        console.log('  ✅ 插入5个示例构成');

        // 4.4 插入供应商级资料 (质量保证协议、MSDS)
        await sequelize.query(`
      INSERT INTO supplier_documents 
        (supplier_id, level, document_type, document_name, file_path, file_size, expiry_date, is_permanent)
      VALUES 
        (1, 'supplier', 'quality_agreement', '质量保证协议 V1.0', '/uploads/supplier_1/quality_agreement_v1.pdf', 1024000, '2025-12-31', 0),
        (1, 'supplier', 'environmental_msds', 'MSDS报告 V2.0', '/uploads/supplier_1/msds_v2.pdf', 512000, '2026-06-30', 0),
        (2, 'supplier', 'quality_agreement', '质量保证协议 V1.0', '/uploads/supplier_2/quality_agreement_v1.pdf', 1024000, '2025-09-15', 0)
    `);
        console.log('  ✅ 插入3个供应商级资料');

        // 4.5 插入具体构成级资料 (ROHS、REACH、HF)
        await sequelize.query(`
      INSERT INTO supplier_documents 
        (supplier_id, level, material_id, component_id, document_type, document_name, file_path, file_size, expiry_date, is_permanent)
      VALUES 
        (1, 'component', 1, 1, 'environmental_rohs', 'ROHS V2.0', '/uploads/supplier_1/material_1/component_1/rohs_v2.pdf', 256000, '2025-06-30', 0),
        (1, 'component', 1, 1, 'environmental_reach', 'REACH V1.5', '/uploads/supplier_1/material_1/component_1/reach_v1.5.pdf', 256000, '2025-12-31', 0),
        (1, 'component', 1, 1, 'environmental_hf', 'HF V1.0', '/uploads/supplier_1/material_1/component_1/hf_v1.pdf', 256000, '2025-09-15', 0),
        (1, 'component', 1, 2, 'environmental_rohs', 'ROHS V2.0', '/uploads/supplier_1/material_1/component_2/rohs_v2.pdf', 256000, '2025-08-20', 0),
        (1, 'component', 2, 3, 'environmental_rohs', 'ROHS V2.0', '/uploads/supplier_1/material_2/component_3/rohs_v2.pdf', 256000, '2025-10-15', 0),
        (1, 'component', 2, 3, 'environmental_reach', 'REACH V1.5', '/uploads/supplier_1/material_2/component_3/reach_v1.5.pdf', 256000, '2025-11-30', 0)
    `);
        console.log('  ✅ 插入6个具体构成级资料');

        console.log('\n✅ 数据库重构完成！\n');

        // Step 5: 验证数据
        console.log('📋 Step 5: 验证数据...');
        const [suppliers] = await sequelize.query('SELECT COUNT(*) as count FROM suppliers');
        const [materials] = await sequelize.query('SELECT COUNT(*) as count FROM materials');
        const [components] = await sequelize.query('SELECT COUNT(*) as count FROM material_components');
        const [documents] = await sequelize.query('SELECT COUNT(*) as count FROM supplier_documents');

        console.log(`  📊 供应商: ${suppliers[0].count} 家`);
        console.log(`  📊 物料: ${materials[0].count} 个`);
        console.log(`  📊 具体构成: ${components[0].count} 个`);
        console.log(`  📊 资料: ${documents[0].count} 份`);

        console.log('\n🎉 数据库重构成功！可以开始使用新系统了。\n');

    } catch (error) {
        console.error('❌ 数据库重构失败:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// 执行迁移
if (require.main === module) {
    rebuildDatabase()
        .then(() => {
            console.log('✅ 迁移脚本执行完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 迁移脚本执行失败:', error);
            process.exit(1);
        });
}

module.exports = rebuildDatabase;
