/**
 * 供应商资料管理 API 路由 (重构版 v3.0)
 * 
 * 核心功能:
 * 1. 获取供应商树形数据 (供应商 → 物料 → 具体构成 → 资料)
 * 2. 新增物料
 * 3. 新增具体构成
 * 4. 上传资料 (支持三级层级)
 * 5. 获取即将过期资料
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../database/config');

/**
 * GET /api/suppliers/tree
 * 获取供应商树形数据
 * 
 * Query参数:
 * - supplierId (可选): 只获取特定供应商
 * - includeDocuments (可选): 是否包含资料详情,默认true
 * 
 * 返回数据结构:
 * {
 *   success: true,
 *   data: [
 *     {
 *       supplierId: 1,
 *       supplierName: "深圳XX电子",
 *       contactPerson: "张三",
 *       contactEmail: "zhang@example.com",
 *       status: "urgent",  // urgent | warning | normal
 *       supplierDocuments: [...],
 *       materials: [
 *         {
 *           materialId: 101,
 *           materialName: "电木粉",
 *           components: [
 *             {
 *               componentId: 1001,
 *               componentName: "成分A",
 *               documents: [...]
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
router.get('/tree', async (req, res) => {
    try {
        const { supplierId, includeDocuments = 'true' } = req.query;
        const shouldIncludeDocuments = includeDocuments === 'true';

        // 构建查询条件
        let whereClause = '';
        if (supplierId) {
            whereClause = `WHERE s.id = ${parseInt(supplierId)}`;
        }

        // 查询供应商及其完整的层级结构
        const [results] = await sequelize.query(`
      SELECT 
        s.id as supplier_id,
        s.name as supplier_name,
        s.contact_person,
        s.contact_email,
        s.contact_phone,
        s.level as supplier_level,
        s.status as supplier_status,
        m.id as material_id,
        m.material_name,
        m.material_code,
        m.description as material_description,
        mc.id as component_id,
        mc.component_name,
        mc.component_code,
        mc.description as component_description,
        sd.id as document_id,
        sd.level as document_level,
        sd.document_type,
        sd.document_name,
        sd.document_number,
        sd.file_path,
        sd.file_size,
        sd.expiry_date,
        sd.is_permanent,
        sd.status as document_status,
        sd.responsible_person,
        sd.issuing_authority,
        sd.created_at as document_created_at
      FROM suppliers s
      LEFT JOIN materials m ON s.id = m.supplier_id AND m.status = 'Active'
      LEFT JOIN material_components mc ON m.id = mc.material_id AND mc.status = 'Active'
      LEFT JOIN supplier_documents sd ON 
        ((sd.supplier_id = s.id AND sd.level = 'supplier') OR
         (sd.component_id = mc.id AND sd.level = 'component'))
        AND sd.status = 'active' 
        AND sd.is_current = 1
      ${whereClause}
      ORDER BY s.id, m.id, mc.id, sd.level, sd.document_type
    `);

        // 按供应商分组并构建树形结构
        const supplierMap = {};

        results.forEach(row => {
            const supplierId = row.supplier_id;

            // 初始化供应商
            if (!supplierMap[supplierId]) {
                supplierMap[supplierId] = {
                    supplierId: supplierId,
                    supplierName: row.supplier_name,
                    contactPerson: row.contact_person,
                    contactEmail: row.contact_email,
                    contactPhone: row.contact_phone,
                    supplierLevel: row.supplier_level,
                    supplierStatus: row.supplier_status,
                    status: 'normal',  // 将在后面计算
                    supplierDocuments: [],
                    materials: {}
                };
            }

            const supplier = supplierMap[supplierId];

            // 供应商级资料
            if (row.document_level === 'supplier' && row.document_id && shouldIncludeDocuments) {
                const exists = supplier.supplierDocuments.find(d => d.id === row.document_id);
                if (!exists) {
                    const doc = {
                        id: row.document_id,
                        documentType: row.document_type,
                        documentName: row.document_name,
                        documentNumber: row.document_number,
                        filePath: row.file_path,
                        fileSize: row.file_size,
                        expiryDate: row.expiry_date,
                        isPermanent: row.is_permanent === 1,
                        status: row.document_status,
                        responsiblePerson: row.responsible_person,
                        issuingAuthority: row.issuing_authority,
                        createdAt: row.document_created_at
                    };

                    // 计算到期天数和警告级别
                    if (!doc.isPermanent && doc.expiryDate) {
                        const daysUntilExpiry = Math.ceil((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                        doc.daysUntilExpiry = daysUntilExpiry;

                        if (daysUntilExpiry < 0) {
                            doc.warningLevel = 'expired';
                        } else if (daysUntilExpiry <= 7) {
                            doc.warningLevel = 'critical';
                        } else if (daysUntilExpiry <= 15) {
                            doc.warningLevel = 'urgent';
                        } else if (daysUntilExpiry <= 30) {
                            doc.warningLevel = 'warning';
                        } else {
                            doc.warningLevel = 'normal';
                        }
                    } else {
                        doc.warningLevel = 'normal';
                    }

                    supplier.supplierDocuments.push(doc);
                }
            }

            // 物料和构成
            if (row.material_id) {
                const materialId = row.material_id;

                if (!supplier.materials[materialId]) {
                    supplier.materials[materialId] = {
                        materialId: materialId,
                        materialName: row.material_name,
                        materialCode: row.material_code,
                        materialDescription: row.material_description,
                        status: 'normal',
                        components: {}
                    };
                }

                const material = supplier.materials[materialId];

                if (row.component_id) {
                    const componentId = row.component_id;

                    if (!material.components[componentId]) {
                        material.components[componentId] = {
                            componentId: componentId,
                            componentName: row.component_name,
                            componentCode: row.component_code,
                            componentDescription: row.component_description,
                            status: 'normal',
                            documents: []
                        };
                    }

                    const component = material.components[componentId];

                    // 具体构成级资料
                    if (row.document_level === 'component' && row.document_id && shouldIncludeDocuments) {
                        const exists = component.documents.find(d => d.id === row.document_id);
                        if (!exists) {
                            const doc = {
                                id: row.document_id,
                                documentType: row.document_type,
                                documentName: row.document_name,
                                documentNumber: row.document_number,
                                filePath: row.file_path,
                                fileSize: row.file_size,
                                expiryDate: row.expiry_date,
                                isPermanent: row.is_permanent === 1,
                                status: row.document_status,
                                responsiblePerson: row.responsible_person,
                                issuingAuthority: row.issuing_authority,
                                createdAt: row.document_created_at
                            };

                            // 计算到期天数和警告级别
                            if (!doc.isPermanent && doc.expiryDate) {
                                const daysUntilExpiry = Math.ceil((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
                                doc.daysUntilExpiry = daysUntilExpiry;

                                if (daysUntilExpiry < 0) {
                                    doc.warningLevel = 'expired';
                                } else if (daysUntilExpiry <= 7) {
                                    doc.warningLevel = 'critical';
                                } else if (daysUntilExpiry <= 15) {
                                    doc.warningLevel = 'urgent';
                                } else if (daysUntilExpiry <= 30) {
                                    doc.warningLevel = 'warning';
                                } else {
                                    doc.warningLevel = 'normal';
                                }
                            } else {
                                doc.warningLevel = 'normal';
                            }

                            component.documents.push(doc);
                        }
                    }
                }
            }
        });

        // 转换为数组并计算整体状态
        const suppliers = Object.values(supplierMap).map(supplier => {
            // 转换materials和components为数组
            supplier.materials = Object.values(supplier.materials).map(material => {
                material.components = Object.values(material.components);

                // 计算构成状态
                material.components.forEach(component => {
                    const warningLevels = component.documents.map(d => d.warningLevel);
                    if (warningLevels.includes('expired') || warningLevels.includes('critical')) {
                        component.status = 'urgent';
                    } else if (warningLevels.includes('urgent')) {
                        component.status = 'urgent';
                    } else if (warningLevels.includes('warning')) {
                        component.status = 'warning';
                    }
                });

                // 计算物料状态
                const componentStatuses = material.components.map(c => c.status);
                if (componentStatuses.includes('urgent')) {
                    material.status = 'urgent';
                } else if (componentStatuses.includes('warning')) {
                    material.status = 'warning';
                }

                return material;
            });

            // 计算供应商整体状态
            const supplierDocWarnings = supplier.supplierDocuments.map(d => d.warningLevel);
            const materialStatuses = supplier.materials.map(m => m.status);

            if (supplierDocWarnings.includes('expired') || supplierDocWarnings.includes('critical') || materialStatuses.includes('urgent')) {
                supplier.status = 'urgent';
            } else if (supplierDocWarnings.includes('urgent') || supplierDocWarnings.includes('warning') || materialStatuses.includes('warning')) {
                supplier.status = 'warning';
            }

            return supplier;
        });

        res.json({
            success: true,
            data: suppliers
        });

    } catch (error) {
        console.error('获取供应商树形数据失败:', error);
        res.status(500).json({
            success: false,
            error: '获取供应商数据失败',
            message: error.message
        });
    }
});

module.exports = router;
