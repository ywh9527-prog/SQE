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
const { sequelize, DataTypes } = require('../database/config');

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

        // 检查物料名称是否已存在（只检查活跃状态的物料）
        const [existing] = await sequelize.query(
            'SELECT id FROM materials WHERE supplier_id = ? AND material_name = ? AND status = "Active"',
            { replacements: [supplierId, materialName] }
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: '物料名称已存在',
                message: `该供应商下已存在名为"${materialName}"的物料`
            });
        }

        // 插入物料 - 改进版本
        try {
            console.log('📝 准备插入物料:', { supplierId, materialName, materialCode, description });
            
            // 验证插入结果
            const result = await sequelize.query(
                `INSERT INTO materials (supplier_id, material_name, material_code, description, status, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, 'Active', datetime('now'), datetime('now'))`,
                { replacements: [supplierId, materialName, materialCode || null, description || null] }
            );
            
            console.log('📝 插入操作完成:', result);
            
            // 验证插入是否真正成功
            const changes = result[1]?.changes || 0;
            const materialId = result[1]?.lastID || null;
            
            console.log('📝 插入验证:', { changes, materialId });
            
            if (changes !== 1 || !materialId) {
                throw new Error(`插入失败: changes=${changes}, materialId=${materialId}`);
            }

            // 验证数据是否真的插入成功（可选验证）
            try {
                const [verifyResult] = await sequelize.query(
                    `SELECT COUNT(*) as count FROM materials WHERE id = ?`,
                    { replacements: [materialId] }
                );
                
                if (verifyResult[0].count !== 1) {
                    throw new Error('插入验证失败：记录不存在');
                }
                
                console.log('✅ 插入验证成功');
            } catch (verifyError) {
                console.warn('⚠️ 插入验证失败，但插入操作可能成功:', verifyError.message);
                // 继续执行，不因为验证失败而中断
            }

            // 返回成功数据
            const responseData = {
                success: true,
                data: {
                    materialId: materialId,
                    materialName: materialName,
                    materialCode: materialCode || null,
                    description: description || null,
                    status: 'Active',
                    createdAt: new Date().toISOString()
                },
                message: '物料创建成功'
            };
            
            console.log('✅ 物料创建成功，返回数据:', responseData);
            res.status(201).json(responseData);
            
        } catch (insertError) {
            console.error('❌ 插入物料时发生错误:', insertError);
            console.error('❌ 错误堆栈:', insertError.stack);
            throw new Error(`插入失败: ${insertError.message}`);
        }

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

        console.log('🔍 后端接收到的数据:', { materialId, componentName, componentCode, description });

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
            'SELECT id, material_name FROM materials WHERE id = ? AND status = "Active"',
            { replacements: [materialId] }
        );

        if (materials.length === 0) {
            console.error(`❌ 物料不存在: materialId=${materialId}`);
            return res.status(404).json({
                success: false,
                error: '物料不存在',
                message: `找不到ID为 ${materialId} 的物料，请刷新页面重试`
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

        // 插入具体构成 - 使用命名参数避免位置参数问题
        const insertData = {
            material_id: materialId,
            component_name: componentName,
            component_code: componentCode || null,
            description: description || null,
            status: 'Active',
            created_at: new Date(),
            updated_at: new Date()
        };

        console.log('🔍 插入数据对象:', insertData);

        // 使用Sequelize但修复ID获取问题
        const result = await sequelize.query(
            `INSERT INTO material_components (material_id, component_name, component_code, description, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            {
                replacements: [
                    insertData.material_id,
                    insertData.component_name,
                    insertData.component_code,
                    insertData.description,
                    insertData.status,
                    insertData.created_at,
                    insertData.updated_at
                ],
                type: sequelize.QueryTypes.INSERT
            }
        );

        // Sequelize的INSERT操作返回格式
        console.log('🔍 Sequelize插入结果:', result);

        // 尝试多种方式获取ID
        let componentId = null;

        // 方式1: 检查result[0]（某些Sequelize版本）
        if (result && result[0] && result[0].insertId) {
            componentId = result[0].insertId;
        }
        // 方式2: 检查result本身
        else if (result && result.insertId) {
            componentId = result.insertId;
        }
        // 方式3: 查询最新记录（备用方案）
        else {
            const [latestRecord] = await sequelize.query(
                'SELECT id FROM material_components ORDER BY id DESC LIMIT 1',
                { type: sequelize.QueryTypes.SELECT }
            );
            componentId = latestRecord?.id;
        }

        console.log('🔍 获取到的构成ID:', componentId);

        if (!componentId) {
            throw new Error('插入失败：无法获取新记录ID');
        }

        console.log('🔍 获取到的构成ID:', componentId);

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
        console.log('🔍 查询构成列表，物料ID:', materialId);

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

        console.log('🔍 查询到的原始构成数据:', components);
        console.log('🔍 构成数量:', components.length);

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

/**
 * PUT /api/materials/components/:componentId
 * 编辑构成信息
 *
 * Params:
 * - componentId: 构成ID
 *
 * Body:
 * {
 *   "componentName": "构成名称",
 *   "componentCode": "构成编码",
 *   "description": "构成描述"
 * }
 */
router.put('/components/:componentId', async (req, res) => {
    try {
        const { componentId } = req.params;
        const { componentName, componentCode, description } = req.body;

        // 参数验证
        if (!componentName || componentName.trim() === '') {
            return res.status(400).json({
                success: false,
                error: '构成名称不能为空'
            });
        }

        // 检查构成是否存在
        const [existingComponents] = await sequelize.query(
            'SELECT * FROM material_components WHERE id = ? AND status = "Active"',
            { replacements: [componentId] }
        );

        if (existingComponents.length === 0) {
            return res.status(404).json({
                success: false,
                error: '构成不存在'
            });
        }

        const existingComponent = existingComponents[0];

        // 检查构成名称是否与其他构成重复（排除当前构成）
        const [duplicateComponents] = await sequelize.query(
            'SELECT id FROM material_components WHERE material_id = ? AND component_name = ? AND id != ? AND status = "Active"',
            { replacements: [existingComponent.material_id, componentName.trim(), componentId] }
        );

        if (duplicateComponents.length > 0) {
            return res.status(400).json({
                success: false,
                error: '构成名称已存在'
            });
        }

        // 更新构成信息
        await sequelize.query(
            `UPDATE material_components
             SET component_name = ?, component_code = ?, description = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            {
                replacements: [
                    componentName.trim(),
                    componentCode ? componentCode.trim() : null,
                    description ? description.trim() : null,
                    componentId
                ]
            }
        );

        // 查询更新后的构成信息
        const [updatedComponents] = await sequelize.query(
            'SELECT * FROM material_components WHERE id = ?',
            { replacements: [componentId] }
        );

        const updatedComponent = updatedComponents[0];

        res.json({
            success: true,
            data: {
                componentId: updatedComponent.id,
                materialId: updatedComponent.material_id,
                componentName: updatedComponent.component_name,
                componentCode: updatedComponent.component_code,
                description: updatedComponent.description,
                status: updatedComponent.status,
                createdAt: updatedComponent.created_at,
                updatedAt: updatedComponent.updated_at
            },
            message: '构成信息更新成功'
        });

    } catch (error) {
        console.error('更新构成信息失败:', error);
        res.status(500).json({
            success: false,
            error: '更新构成信息失败',
            message: error.message
        });
    }
});

/**
 * DELETE /api/materials/components/:componentId
 * 删除构成
 *
 * Params:
 * - componentId: 构成ID
 */
router.delete('/components/:componentId', async (req, res) => {
    try {
        const { componentId } = req.params;

        // 检查构成是否存在
        const [existingComponents] = await sequelize.query(
            'SELECT * FROM material_components WHERE id = ? AND status = "Active"',
            { replacements: [componentId] }
        );

        if (existingComponents.length === 0) {
            return res.status(404).json({
                success: false,
                error: '构成不存在'
            });
        }

        const component = existingComponents[0];

        // 检查是否有关联的文档
        const [documentCount] = await sequelize.query(
            'SELECT COUNT(*) as count FROM supplier_documents WHERE component_id = ? AND status = "active" AND is_current = 1',
            { replacements: [componentId] }
        );

        if (documentCount[0].count > 0) {
            return res.status(400).json({
                success: false,
                error: '该构成下还有文档，无法删除',
                message: `请先删除或转移该构成下的 ${documentCount[0].count} 个文档`
            });
        }

        // 软删除构成
        await sequelize.query(
            'UPDATE material_components SET status = "Deleted", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            { replacements: [componentId] }
        );

        res.json({
            success: true,
            message: '构成删除成功'
        });

    } catch (error) {
        console.error('删除构成失败:', error);
        res.status(500).json({
            success: false,
            error: '删除构成失败',
            message: error.message
        });
    }
});

/**
 * DELETE /api/materials/:materialId
 * 删除物料（包括其所有构成和文档）
 * 
 * Params:
 * - materialId: 物料ID
 * 
 * Body:
 * {
 *   "supplierId": 1  // 供应商ID，用于验证权限
 * }
 */
router.delete('/:materialId', async (req, res) => {
    try {
        const { materialId } = req.params;
        const { supplierId } = req.body;

        if (!supplierId) {
            return res.status(400).json({
                success: false,
                error: '缺少供应商ID'
            });
        }

        // 开始事务
        const transaction = await sequelize.transaction();

        try {
            // 0. 备份该物料的所有文件
            const LocalFileSyncService = require('../services/local-file-sync-service');
            const localFileSyncService = new LocalFileSyncService();
            
            // 获取该物料的所有文档进行备份
            const [materialDocs] = await sequelize.query(
                `SELECT id, file_path, document_type FROM supplier_documents 
                 WHERE material_id = ? AND status = 'active' AND is_current = 1`,
                { replacements: [materialId], transaction }
            );
            
            console.log(`📦 开始备份物料 ${materialId} 的 ${materialDocs.length} 个文件...`);
            
            for (const doc of materialDocs) {
                if (doc.file_path) {
                    try {
                        // 添加延迟确保文件释放
                        await new Promise(resolve => setTimeout(resolve, 200));
                        
                        await localFileSyncService.syncDelete({
                            id: doc.id,
                            filePath: doc.file_path,
                            documentType: doc.document_type,
                            supplierId: supplierId,
                            materialId: materialId
                        });
                        console.log(`✅ 已备份文件: ${doc.file_path}`);
                    } catch (backupError) {
                        console.error(`⚠️ 备份文件失败: ${doc.file_path}`, backupError);
                        // 不阻止删除操作，只记录错误
                    }
                }
            }

            // 1. 永久删除该物料所有构成的文档
            const deletedDocs = await sequelize.query(
                `DELETE FROM supplier_documents 
                 WHERE component_id IN (
                     SELECT id FROM material_components 
                     WHERE material_id = ?
                 )`,
                { replacements: [materialId], transaction }
            );
            console.log(`🗑️ 删除了 ${deletedDocs[1]} 个文档`);

            // 2. 永久删除该物料的所有构成
            const deletedComponents = await sequelize.query(
                `DELETE FROM material_components 
                 WHERE material_id = ?`,
                { replacements: [materialId], transaction }
            );
            console.log(`🗑️ 删除了 ${deletedComponents[1]} 个构成`);

            // 3. 永久删除物料本身
            const deletedMaterials = await sequelize.query(
                `DELETE FROM materials 
                 WHERE id = ? AND supplier_id = ?`,
                { replacements: [materialId, supplierId], transaction }
            );
            console.log(`🗑️ 删除了 ${deletedMaterials[1]} 个物料`);

            // 提交事务
            await transaction.commit();

            res.json({
                success: true,
                message: '物料删除成功'
            });

        } catch (error) {
            // 回滚事务
            await transaction.rollback();
            throw error;
        }

    } catch (error) {
        console.error('删除物料失败:', error);
        res.status(500).json({
            success: false,
            error: '删除物料失败',
            message: error.message
        });
    }
});

/**
 * GET /api/materials/test-db
 * 测试数据库连接
 */
router.get('/test-db', async (req, res) => {
    try {
        console.log('🧪 开始测试数据库连接...');
        
        // 测试认证
        await sequelize.authenticate();
        console.log('✅ 数据库认证成功');
        
        // 测试查询
        const [results] = await sequelize.query('SELECT COUNT(*) as count FROM materials');
        console.log('✅ 数据库查询成功，物料数量:', results[0].count);
        
        // 测试表结构
        const [tableInfo] = await sequelize.query("PRAGMA table_info(materials)");
        console.log('✅ materials表结构:', tableInfo);
        
        res.json({
            success: true,
            message: '数据库连接正常',
            data: {
                materialCount: results[0].count,
                tableColumns: tableInfo.length
            }
        });
        
    } catch (error) {
        console.error('❌ 数据库测试失败:', error);
        res.status(500).json({
            success: false,
            error: '数据库连接失败',
            details: error.message
        });
    }
});

module.exports = router;
