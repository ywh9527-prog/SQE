/**
 * 数据库结构验证脚本
 * 用于验证三级层级数据是否正确
 */

const { sequelize } = require('../database/config');

async function verifyDatabase() {
    console.log('🔍 开始验证数据库结构...\n');

    try {
        // 查询供应商及其完整的层级结构
        const [results] = await sequelize.query(`
      SELECT 
        s.id as supplier_id,
        s.name as supplier_name,
        s.contact_person,
        m.id as material_id,
        m.material_name,
        mc.id as component_id,
        mc.component_name,
        sd.id as document_id,
        sd.level,
        sd.document_type,
        sd.document_name,
        sd.expiry_date
      FROM suppliers s
      LEFT JOIN materials m ON s.id = m.supplier_id
      LEFT JOIN material_components mc ON m.id = mc.material_id
      LEFT JOIN supplier_documents sd ON 
        (sd.supplier_id = s.id AND sd.level = 'supplier') OR
        (sd.component_id = mc.id AND sd.level = 'component')
      ORDER BY s.id, m.id, mc.id, sd.level, sd.document_type
    `);

        // 按供应商分组显示
        const supplierMap = {};

        results.forEach(row => {
            const supplierId = row.supplier_id;

            if (!supplierMap[supplierId]) {
                supplierMap[supplierId] = {
                    name: row.supplier_name,
                    contact: row.contact_person,
                    supplierDocs: [],
                    materials: {}
                };
            }

            // 供应商级资料
            if (row.level === 'supplier' && row.document_id) {
                const exists = supplierMap[supplierId].supplierDocs.find(d => d.id === row.document_id);
                if (!exists) {
                    supplierMap[supplierId].supplierDocs.push({
                        id: row.document_id,
                        type: row.document_type,
                        name: row.document_name,
                        expiry: row.expiry_date
                    });
                }
            }

            // 物料和构成
            if (row.material_id) {
                const materialId = row.material_id;

                if (!supplierMap[supplierId].materials[materialId]) {
                    supplierMap[supplierId].materials[materialId] = {
                        name: row.material_name,
                        components: {}
                    };
                }

                if (row.component_id) {
                    const componentId = row.component_id;

                    if (!supplierMap[supplierId].materials[materialId].components[componentId]) {
                        supplierMap[supplierId].materials[materialId].components[componentId] = {
                            name: row.component_name,
                            documents: []
                        };
                    }

                    // 具体构成级资料
                    if (row.level === 'component' && row.document_id) {
                        const exists = supplierMap[supplierId].materials[materialId].components[componentId].documents.find(d => d.id === row.document_id);
                        if (!exists) {
                            supplierMap[supplierId].materials[materialId].components[componentId].documents.push({
                                id: row.document_id,
                                type: row.document_type,
                                name: row.document_name,
                                expiry: row.expiry_date
                            });
                        }
                    }
                }
            }
        });

        // 打印树形结构
        console.log('📊 数据库层级结构:\n');

        Object.values(supplierMap).forEach(supplier => {
            console.log(`🏢 ${supplier.name} (联系人: ${supplier.contact})`);

            // 供应商级资料
            if (supplier.supplierDocs.length > 0) {
                console.log(`├── 📄 供应商级资料 (${supplier.supplierDocs.length}份)`);
                supplier.supplierDocs.forEach((doc, index) => {
                    const isLast = index === supplier.supplierDocs.length - 1 && Object.keys(supplier.materials).length === 0;
                    const prefix = isLast ? '└──' : '├──';
                    console.log(`│   ${prefix} ${doc.type}: ${doc.name} (到期: ${doc.expiry || '永久'})`);
                });
            }

            // 物料
            const materials = Object.values(supplier.materials);
            materials.forEach((material, mIndex) => {
                const isLastMaterial = mIndex === materials.length - 1;
                const materialPrefix = isLastMaterial ? '└──' : '├──';

                console.log(`${materialPrefix} 🏭 物料: ${material.name}`);

                // 具体构成
                const components = Object.values(material.components);
                components.forEach((component, cIndex) => {
                    const isLastComponent = cIndex === components.length - 1;
                    const componentPrefix = isLastComponent ? '└──' : '├──';
                    const indent = isLastMaterial ? '    ' : '│   ';

                    console.log(`${indent}${componentPrefix} 🧪 具体构成: ${component.name} (${component.documents.length}份资料)`);

                    // 资料
                    component.documents.forEach((doc, dIndex) => {
                        const isLastDoc = dIndex === component.documents.length - 1;
                        const docPrefix = isLastDoc ? '└──' : '├──';
                        const docIndent = isLastMaterial ? '        ' : '│       ';
                        const componentIndent = isLastComponent ? '    ' : '│   ';

                        console.log(`${indent}${componentIndent}${docPrefix} ${doc.type}: ${doc.name} (到期: ${doc.expiry || '永久'})`);
                    });
                });
            });

            console.log('');
        });

        console.log('✅ 数据库结构验证完成！\n');

    } catch (error) {
        console.error('❌ 验证失败:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// 执行验证
if (require.main === module) {
    verifyDatabase()
        .then(() => {
            console.log('✅ 验证脚本执行完成');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ 验证脚本执行失败:', error);
            process.exit(1);
        });
}

module.exports = verifyDatabase;
