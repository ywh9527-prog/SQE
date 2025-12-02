/**
 * 物料管理 API 路由
 * 
 * 功能:
 * 1. 新增物料
 * 2. 新增具体构成
 * 3. 查询物料列表
 * 4. 查询构成列表
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../database/config');

/**
 * POST /api/materials
 * 新增物料
 * 
 * Body:
 * {
 *   "supplierId": 1,
 *   "materialName": "电木粉",
 *   "materialCode": "DM-001",
 *   "description": "用于生产XX产品"
 * }
 */
router.post('/', async (req, res) => {
    try {
        const { supplierId, materialName, materialCode, description } = req.body;

        // 验证必填字段
        if (!supplierId || !materialName) {
            return res.status(400).json({
                success: false,
                error: '缺少必填字段',
                message: 'supplierId 和 materialName 为必填项'
            });
        }

        // 检查供应商是否存在
        const [suppliers] = await sequelize.query(
            'SELECT id FROM suppliers WHERE id = ?',
            { replacements: [supplierId] }
        );

        if (suppliers.length === 0) {
            return res.status(404).json({
                success: false,
                error: '供应商不存在',
                message: `找不到ID为 ${supplierId} 的供应商`
            });
        }

        // 检查物料名称是否已存在
        const [existing] = await sequelize.query(
            'SELECT id FROM materials WHERE supplier_id = ? AND material_name = ?',
            { replacements: [supplierId, materialName] }
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: '物料名称已存在',
                message: `该供应商下已存在名为"${materialName}"的物料`
            });
        }

        // 插入物料
        const [result] = await sequelize.query(
            `INSERT INTO materials (supplier_id, material_name, material_code, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'Active', datetime('now'), datetime('now'))`,
            { replacements: [supplierId, materialName, materialCode || null, description || null] }
        );

        // 获取插入的物料ID
        const materialId = result;

        // 查询完整的物料信息
        const [materials] = await sequelize.query(
            'SELECT * FROM materials WHERE id = ?',
            { replacements: [materialId] }
        );

        res.status(201).json({
            success: true,
            data: {
                materialId: materials[0].id,
                materialName: materials[0].material_name,
                materialCode: materials[0].material_code,
                description: materials[0].description,
                status: materials[0].status,
                createdAt: materials[0].created_at
            },
            message: '物料创建成功'
        });

    } catch (error) {
        console.error('创建物料失败:', error);
        res.status(500).json({
            success: false,
            error: '创建物料失败',
            message: error.message
        });
    }
});

/**
 * POST /api/materials/components
 * 新增具体构成
 * 
 * Body:
 * {
 *   "materialId": 101,
 *   "componentName": "成分A",
 *   "componentCode": "CA-001",
 *   "description": "主要成分"
 * }
 */
router.post('/components', async (req, res) => {
    try {
        const { materialId, componentName, componentCode, description } = req.body;

        // 验证必填字段
        if (!materialId || !componentName) {
            return res.status(400).json({
                success: false,
                error: '缺少必填字段',
                message: 'materialId 和 componentName 为必填项'
            });
        }

        // 检查物料是否存在
        const [materials] = await sequelize.query(
            'SELECT id, material_name FROM materials WHERE id = ?',
            { replacements: [materialId] }
        );

        if (materials.length === 0) {
            return res.status(404).json({
                success: false,
                error: '物料不存在',
                message: `找不到ID为 ${materialId} 的物料`
            });
        }

        // 检查构成名称是否已存在
        const [existing] = await sequelize.query(
            'SELECT id FROM material_components WHERE material_id = ? AND component_name = ?',
            { replacements: [materialId, componentName] }
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: '构成名称已存在',
                message: `该物料下已存在名为"${componentName}"的具体构成`
            });
        }

        // 插入具体构成
        const [result] = await sequelize.query(
            `INSERT INTO material_components (material_id, component_name, component_code, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'Active', datetime('now'), datetime('now'))`,
            { replacements: [materialId, componentName, componentCode || null, description || null] }
        );

        // 获取插入的构成ID
        const componentId = result;

        // 查询完整的构成信息
        const [components] = await sequelize.query(
            'SELECT * FROM material_components WHERE id = ?',
            { replacements: [componentId] }
        );

        res.status(201).json({
            success: true,
            data: {
                componentId: components[0].id,
                materialId: components[0].material_id,
                materialName: materials[0].material_name,
                componentName: components[0].component_name,
                componentCode: components[0].component_code,
                description: components[0].description,
                status: components[0].status,
                createdAt: components[0].created_at
            },
            message: '具体构成创建成功'
        });

    } catch (error) {
        console.error('创建具体构成失败:', error);
        res.status(500).json({
            success: false,
            error: '创建具体构成失败',
            message: error.message
        });
    }
});

/**
 * GET /api/materials
 * 查询物料列表
 * 
 * Query:
 * - supplierId: 供应商ID (必填)
 */
router.get('/', async (req, res) => {
    try {
        const { supplierId } = req.query;

        if (!supplierId) {
            return res.status(400).json({
                success: false,
                error: '缺少必填参数',
                message: 'supplierId 为必填项'
            });
        }

        const [materials] = await sequelize.query(
            `SELECT 
        m.*,
        COUNT(mc.id) as component_count
       FROM materials m
       LEFT JOIN material_components mc ON m.id = mc.material_id AND mc.status = 'Active'
       WHERE m.supplier_id = ? AND m.status = 'Active'
       GROUP BY m.id
       ORDER BY m.material_name`,
            { replacements: [supplierId] }
        );

        res.json({
            success: true,
            data: materials.map(m => ({
                materialId: m.id,
                materialName: m.material_name,
                materialCode: m.material_code,
                description: m.description,
                componentCount: m.component_count,
                createdAt: m.created_at
            }))
        });

    } catch (error) {
        console.error('查询物料列表失败:', error);
        res.status(500).json({
            success: false,
            error: '查询物料列表失败',
            message: error.message
        });
    }
});

/**
 * GET /api/materials/:materialId/components
 * 查询具体构成列表
 * 
 * Params:
 * - materialId: 物料ID
 */
router.get('/:materialId/components', async (req, res) => {
    try {
        const { materialId } = req.params;

        const [components] = await sequelize.query(
            `SELECT 
        mc.*,
        COUNT(sd.id) as document_count
       FROM material_components mc
       LEFT JOIN supplier_documents sd ON mc.id = sd.component_id AND sd.status = 'active' AND sd.is_current = 1
       WHERE mc.material_id = ? AND mc.status = 'Active'
       GROUP BY mc.id
       ORDER BY mc.component_name`,
            { replacements: [materialId] }
        );

        res.json({
            success: true,
            data: components.map(c => ({
                componentId: c.id,
                componentName: c.component_name,
                componentCode: c.component_code,
                description: c.description,
                documentCount: c.document_count,
                createdAt: c.created_at
            }))
        });

    } catch (error) {
        console.error('查询具体构成列表失败:', error);
        res.status(500).json({
            success: false,
            error: '查询具体构成列表失败',
            message: error.message
        });
    }
});

module.exports = router;
