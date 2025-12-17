/**
 * 供应商资料管理 API 路由 v3.1
 * 优化版：表格预览 + 展开详情
 * 
 * 核心改进:
 * 1. 构成信息作为资料的备注，而不是独立层级
 * 2. 提供汇总统计 (ROHS/REACH/HF的数量和最差状态)
 * 3. 区分"通用资料"和"检测报告"
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../database/config');

// 认证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, error: '未提供认证令牌' });
    }

    const AuthService = require('../services/authService');
    AuthService.verifyToken(token)
        .then(result => {
            if (!result.success) {
                return res.status(401).json({ success: false, error: '认证失败' });
            }
            req.user = result.user;
            next();
        })
        .catch(error => {
            console.error('认证失败:', error);
            res.status(500).json({ success: false, error: '认证服务错误' });
        });
};

/**
 * GET /api/suppliers/summary
 * 获取供应商资料汇总 (用于表格预览)
 */
router.get('/summary', authenticateToken, async (req, res) => {
    try {
        const { supplierId } = req.query;

        // 构建查询条件
        let whereClause = '';
        if (supplierId) {
            whereClause = `WHERE s.id = ${parseInt(supplierId)}`;
        }

        // 查询供应商及其资料
        const [results] = await sequelize.query(`
            SELECT 
                s.id as supplier_id,
                s.name as supplier_name,
                s.contact_person,
                s.contact_email,
                m.id as material_id,
                m.material_name,
                mc.id as component_id,
                mc.component_name,
                sd.id as document_id,
                sd.level as document_level,
                sd.document_type,
                sd.document_name,
                sd.expiry_date,
                sd.is_permanent,
                sd.status as document_status
            FROM suppliers s
            LEFT JOIN materials m ON s.id = m.supplier_id AND m.status = 'Active'
            LEFT JOIN material_components mc ON m.id = mc.material_id AND mc.status = 'Active'
            LEFT JOIN supplier_documents sd ON 
                ((sd.supplier_id = s.id AND sd.level = 'supplier') OR
                 (sd.material_id = m.id AND sd.level = 'component'))
                AND sd.status = 'active' 
                AND sd.is_current = 1
            ${whereClause}
            ORDER BY s.id, m.id, mc.id, sd.document_type
        `);

        // 按供应商分组
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
                    materialCount: 0,
                    materialIds: new Set(),
                    commonDocuments: {},
                    materialDocumentsRaw: [] // 临时存储，用于后续统计
                };
            }

            const supplier = supplierMap[supplierId];

            // 统计物料数量
            if (row.material_id && !supplier.materialIds.has(row.material_id)) {
                supplier.materialIds.add(row.material_id);
                supplier.materialCount++;
            }

            // 处理通用资料
            if (row.document_level === 'supplier' && row.document_id) {
                const docType = row.document_type;

                // 计算到期信息
                let daysUntilExpiry = null;
                let warningLevel = 'normal';

                if (!row.is_permanent && row.expiry_date) {
                    daysUntilExpiry = Math.ceil((new Date(row.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));

                    if (daysUntilExpiry < 0) {
                        warningLevel = 'expired';
                    } else if (daysUntilExpiry <= 7) {
                        warningLevel = 'critical';
                    } else if (daysUntilExpiry <= 15) {
                        warningLevel = 'urgent';
                    } else if (daysUntilExpiry <= 30) {
                        warningLevel = 'warning';
                    }
                }

                supplier.commonDocuments[docType] = {
                    documentName: row.document_name,
                    expiryDate: row.expiry_date,
                    daysUntilExpiry: daysUntilExpiry,
                    isPermanent: row.is_permanent === 1,
                    status: warningLevel
                };
            }

            // 收集检测报告 (构成级)
            if (row.document_level === 'component' && row.document_id) {
                let daysUntilExpiry = null;
                let warningLevel = 'normal';

                if (!row.is_permanent && row.expiry_date) {
                    daysUntilExpiry = Math.ceil((new Date(row.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));

                    if (daysUntilExpiry < 0) {
                        warningLevel = 'expired';
                    } else if (daysUntilExpiry <= 7) {
                        warningLevel = 'critical';
                    } else if (daysUntilExpiry <= 15) {
                        warningLevel = 'urgent';
                    } else if (daysUntilExpiry <= 30) {
                        warningLevel = 'warning';
                    }
                }

                supplier.materialDocumentsRaw.push({
                    documentType: row.document_type,
                    status: warningLevel
                });
            }
        });

        // 统计检测报告 (ROHS/REACH/HF)
        const suppliers = Object.values(supplierMap).map(supplier => {
            delete supplier.materialIds; // 删除临时字段

            // 统计各类资料的数量和最差状态
            const stats = {
                rohs: { count: 0, worstStatus: 'normal' },
                reach: { count: 0, worstStatus: 'normal' },
                hf: { count: 0, worstStatus: 'normal' }
            };

            const statusPriority = { 'normal': 0, 'warning': 1, 'urgent': 2, 'critical': 3, 'expired': 4 };

            supplier.materialDocumentsRaw.forEach(doc => {
                let key = null;
                if (doc.documentType === 'environmental_rohs') key = 'rohs';
                else if (doc.documentType === 'environmental_reach') key = 'reach';
                else if (doc.documentType === 'environmental_hf') key = 'hf';

                if (key) {
                    stats[key].count++;

                    // 更新最差状态
                    if (statusPriority[doc.status] > statusPriority[stats[key].worstStatus]) {
                        stats[key].worstStatus = doc.status;
                    }
                }
            });

            supplier.materialDocuments = stats;
            delete supplier.materialDocumentsRaw; // 删除临时字段

            return supplier;
        });

        res.json({
            success: true,
            data: suppliers
        });

    } catch (error) {
        console.error('获取供应商资料汇总失败:', error);
        res.status(500).json({
            success: false,
            error: '获取供应商资料汇总失败',
            message: error.message
        });
    }
});

/**
 * GET /api/suppliers/:id/details
 * 获取单个供应商的详细资料 (用于展开视图)
 */
router.get('/:id/details', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        // 查询供应商详细资料
        const [results] = await sequelize.query(`
            SELECT
                s.id as supplier_id,
                s.name as supplier_name,
                m.id as material_id,
                m.material_name,
                sd.id as document_id,
                sd.level as document_level,
                sd.detection_type,
                sd.document_type,
                sd.document_name,
                sd.expiry_date,
                sd.is_permanent,
                sd.status as document_status,
                sd.component_id,
                mc.component_name,
                sd.file_path,
                sd.remarks
            FROM suppliers s
            LEFT JOIN materials m ON s.id = m.supplier_id AND m.status = 'Active'
            LEFT JOIN supplier_documents sd ON
                ((sd.supplier_id = s.id AND sd.level = 'supplier') OR
                 (sd.material_id = m.id AND sd.level = 'material'))
                AND sd.status = 'active'
                AND sd.is_current = 1
            LEFT JOIN material_components mc ON sd.component_id = mc.id
            WHERE s.id = :supplierId
            ORDER BY m.id, sd.detection_type, mc.component_name, sd.document_type
        `, {
            replacements: { supplierId: id }
        });

        if (results.length === 0) {
            return res.status(404).json({
                success: false,
                error: '供应商不存在'
            });
        }

        const commonDocuments = [];
        const materialsMap = {};

        results.forEach(row => {
            // 通用资料
            if (row.document_level === 'supplier' && row.document_id) {
                const exists = commonDocuments.find(d => d.id === row.document_id);
                if (!exists) {
                    let daysUntilExpiry = null;
                    let warningLevel = 'normal';

                    if (!row.is_permanent && row.expiry_date) {
                        daysUntilExpiry = Math.ceil((new Date(row.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));

                        if (daysUntilExpiry < 0) {
                            warningLevel = 'expired';
                        } else if (daysUntilExpiry <= 7) {
                            warningLevel = 'critical';
                        } else if (daysUntilExpiry <= 15) {
                            warningLevel = 'urgent';
                        } else if (daysUntilExpiry <= 30) {
                            warningLevel = 'warning';
                        }
                    }

                    commonDocuments.push({
                        id: row.document_id,
                        documentType: row.document_type,
                        documentName: row.document_name,
                        expiryDate: row.expiry_date,
                        daysUntilExpiry: daysUntilExpiry,
                        isPermanent: row.is_permanent === 1,
                        status: warningLevel,
                        filePath: row.file_path // 添加文件路径字段
                    });
                }
            }

            // 检测报告
            if (row.material_id) {
                if (!materialsMap[row.material_id]) {
                    materialsMap[row.material_id] = {
                        materialId: row.material_id,
                        materialName: row.material_name,
                        directDocuments: [],      // 本体检测文档
                        referencedComponents: {}  // 引用检测构成
                    };
                }

                if (row.document_level === 'material' && row.document_id) {
                    let daysUntilExpiry = null;
                    let warningLevel = 'normal';

                    if (!row.is_permanent && row.expiry_date) {
                        daysUntilExpiry = Math.ceil((new Date(row.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));

                        if (daysUntilExpiry < 0) {
                            warningLevel = 'expired';
                        } else if (daysUntilExpiry <= 7) {
                            warningLevel = 'critical';
                        } else if (daysUntilExpiry <= 15) {
                            warningLevel = 'urgent';
                        } else if (daysUntilExpiry <= 30) {
                            warningLevel = 'warning';
                        }
                    }

                    const document = {
                        documentId: row.document_id,
                        documentType: row.document_type,
                        documentName: row.document_name,
                        expiryDate: row.expiry_date,
                        daysUntilExpiry: daysUntilExpiry,
                        isPermanent: row.is_permanent === 1,
                        status: warningLevel,
                        filePath: row.file_path // 添加文件路径字段
                    };

                    // 根据检测类型分类
                    if (row.detection_type === 'direct') {
                        // 本体检测文档
                        materialsMap[row.material_id].directDocuments.push(document);
                    } else if (row.detection_type === 'referenced') {
                        // 引用检测文档，按构成分组
                        const componentName = row.component_name || '未分类构成';
                        if (!materialsMap[row.material_id].referencedComponents[componentName]) {
                            materialsMap[row.material_id].referencedComponents[componentName] = {
                                componentId: row.component_id,
                                componentName: componentName,
                                documents: []
                            };
                        }
                        materialsMap[row.material_id].referencedComponents[componentName].documents.push(document);
                    }
                }
            }
        });

        res.json({
            success: true,
            data: {
                supplierId: parseInt(id),
                supplierName: results[0].supplier_name,
                commonDocuments: commonDocuments,
                materials: Object.values(materialsMap)
            }
        });

    } catch (error) {
        console.error('获取供应商详细资料失败:', error);
        res.status(500).json({
            success: false,
            error: '获取供应商详细资料失败',
            message: error.message
        });
    }
});

module.exports = router;
