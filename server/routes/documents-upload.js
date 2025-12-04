/**
 * 资料上传 API 路由
 * 
 * 功能:
 * 1. 上传资料 (支持三层架构: supplier/material/component-作为备注)
 * 2. 查询即将过期的资料
 * 3. 查询已过期的资料
 * 4. 更新资料信息
 * 5. 删除资料
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sequelize } = require('../database/config');
const LocalFileSyncService = require('../services/local-file-sync-service');

// 创建本地文件同步服务实例
const localFileSyncService = new LocalFileSyncService();

// 配置文件上传（临时存储，后续会移动到正确位置）
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const tempPath = path.join(__dirname, '../../uploads/temp');
        
        // 确保临时目录存在
        if (!fs.existsSync(tempPath)) {
            fs.mkdirSync(tempPath, { recursive: true });
        }
        
        cb(null, tempPath);
    },
    filename: function (req, file, cb) {
        // 生成临时文件名
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const filename = `temp_${timestamp}_${Math.random().toString(36).substr(2, 9)}${ext}`;
        cb(null, filename);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
    },
    fileFilter: function (req, file, cb) {
        // 允许的文件类型
        const allowedTypes = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();

        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`不支持的文件类型: ${ext}。支持的类型: ${allowedTypes.join(', ')}`));
        }
    }
});

/**
 * POST /api/documents/upload
 * 上传资料 (支持三层架构)
 * 
 * Body (multipart/form-data):
 * - supplierId: 供应商ID (必填)
 * - level: 资料层级 supplier/material/component (必填)
 * - materialId: 物料ID (level=material或component时必填)
 * - componentId: 具体构成ID (level=component时必填)
 * - documentType: 资料类型 (必填)
 * - documentName: 资料名称/版本号 (必填)
 * - documentNumber: 协议编号/证书编号 (可选)
 * - expiryDate: 到期日期 (可选)
 * - isPermanent: 是否永久有效 (可选, 默认false)
 * - responsiblePerson: 责任人 (可选)
 * - issuingAuthority: 发证机构 (可选)
 * - remarks: 备注 (可选)
 * - file: 文件 (必填)
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const {
            supplierId,
            level,
            materialId,
            componentId,
            documentType,
            documentName,
            documentNumber,
            expiryDate,
            isPermanent,
            responsiblePerson,
            issuingAuthority,
            remarks
        } = req.body;

        // 验证必填字段
        if (!supplierId || !level || !documentType || !documentName) {
            return res.status(400).json({
                success: false,
                error: '缺少必填字段',
                message: 'supplierId, level, documentType, documentName 为必填项'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: '缺少文件',
                message: '请上传文件'
            });
        }

        // 验证层级相关字段
        if (level === 'component' && !materialId) {
            return res.status(400).json({
                success: false,
                error: '缺少必填字段',
                message: '物料资料上传时，materialId为必填项'
            });
        }

        // 注意：componentId不再是必填项，构成信息现在作为备注处理

        // 验证通用资料类型
        const supplierLevelTypes = ['quality_agreement', 'environmental_msds', 'iso_certification', 'csr', 'other'];
        const componentLevelTypes = ['environmental_rohs', 'environmental_reach', 'environmental_hf'];

        if (level === 'supplier' && !supplierLevelTypes.includes(documentType)) {
            const docTypeMap = {
                'environmental_rohs': 'ROHS认证',
                'environmental_reach': 'REACH合规声明',
                'environmental_hf': 'HF认证',
                'environmental_msds': 'MSDS安全数据表'
            };
            
            const suggestedType = docTypeMap[documentType];
            const documentTypeChinese = suggestedType || documentType;
            let message = `请选择正确的资料类型`;
            
            if (suggestedType) {
                message += `。"${documentTypeChinese}"属于物料资料类型，请上传到物料的对应构成部分`;
            } else {
                message += `。通用资料类型包括: 质量保证协议、MSDS安全数据表、ISO认证、CSR报告、其他证书`;
            }
            
            return res.status(400).json({
                success: false,
                error: '资料类型不匹配',
                message: message
            });
        }

        if (level === 'component' && !componentLevelTypes.includes(documentType)) {
            const supplierTypeMap = {
                'quality_agreement': '质量保证协议',
                'environmental_msds': 'MSDS安全数据表',
                'iso_certification': 'ISO认证',
                'csr': 'CSR报告',
                'other': '其他证书'
            };
            
            const suggestedType = supplierTypeMap[documentType];
            const documentTypeChinese = suggestedType || documentType;
            let message = `请选择正确的资料类型`;
            
            if (suggestedType) {
                message += `。"${documentTypeChinese}"属于通用资料类型，请上传到供应商的通用资料部分`;
            } else {
                message += `。物料资料类型包括: ROHS认证、REACH合规声明、HF认证`;
            }
            
            return res.status(400).json({
                success: false,
                error: '资料类型不匹配',
                message: message
            });
        }

        // 简化版本逻辑：每次上传都作为新文档，不做版本检查和替换
        let version = 1;

        // 获取供应商信息用于文件同步
        const [supplierData] = await sequelize.query(
            'SELECT name FROM suppliers WHERE id = ?',
            { replacements: [supplierId] }
        );
        
        let supplierName = `供应商${supplierId}`;
        if (supplierData.length > 0) {
            supplierName = supplierData[0].name;
        }

        // 获取物料信息（如果是物料资料）
        let materialName = '';
        console.log(`🔍 检查物料信息: materialId=${materialId}`);
        if (materialId) {
            const [materialData] = await sequelize.query(
                'SELECT material_name FROM materials WHERE id = ?',
                { replacements: [materialId] }
            );
            if (materialData.length > 0) {
                materialName = materialData[0].material_name;
                console.log(`✅ 获取到物料名: ${materialName}`);
            } else {
                console.log(`❌ 未找到物料ID ${materialId} 对应的物料`);
            }
        } else {
            console.log(`⚠️ materialId为空`);
        }

        // 转换文档类型为中文
        const documentTypeMap = {
            'quality_agreement': '质量协议',
            'environmental_msds': 'MSDS安全数据表',
            'iso_certification': 'ISO认证',
            'csr': 'CSR报告',
            'other': '其他证书',
            'environmental_rohs': 'ROHS认证',
            'environmental_reach': 'REACH合规声明',
            'environmental_hf': 'HF认证'
        };
        const documentTypeChinese = documentTypeMap[documentType] || documentType;

        // 从remarks中提取构成信息用于文件命名
        let componentName = '';
        console.log(`🔍 检查构成信息: remarks=${remarks}, level=${level}`);
        if (remarks && level === 'component') {
            const componentMatch = remarks.match(/构成:\s*(.+?)(?:\(|$)/);
            if (componentMatch) {
                componentName = componentMatch[1].trim();
                console.log(`✅ 从备注中提取构成信息: ${componentName}`);
            } else {
                console.log(`❌ 备注中没有找到构成信息: ${remarks}`);
            }
        }

        // 使用LocalFileSyncService同步文件到正确位置
        const syncResult = await localFileSyncService.syncUpload({
            tempFilePath: req.file.path,
            originalname: req.file.originalname,
            size: req.file.size
        }, {
            id: supplierId,
            supplierName: supplierName
        }, materialName ? {
            id: materialId,
            materialName: materialName
        } : null, documentTypeChinese, { componentName: componentName }, version);

        // 插入新资料记录
        const filePath = syncResult.finalPath.replace(/\\/g, '/'); // 统一使用正斜杠
        const fileSize = req.file.size;
        const isPermanentBool = isPermanent === 'true' || isPermanent === true ? 1 : 0;

        console.log(`📊 准备插入数据库记录:`, {
            supplierId,
            level,
            documentType,
            documentName,
            filePath,
            fileSize,
            version
        });

        const result = await sequelize.query(
            `INSERT INTO supplier_documents (
        supplier_id, level, material_id, component_id,
        document_type, document_name, document_number,
        file_path, file_size,
        expiry_date, is_permanent,
        status, responsible_person, issuing_authority, remarks,
        version, is_current,
        upload_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, 1, datetime('now'), datetime('now'), datetime('now'))`,
            {
                replacements: [
                    supplierId,
                    level,
                    materialId || null,
                    componentId || null,
                    documentType,
                    documentName,
                    documentNumber || null,
                    filePath,
                    fileSize,
                    expiryDate || null,
                    isPermanentBool,
                    responsiblePerson || null,
                    issuingAuthority || null,
                    remarks || null,
                    version
                ]
            }
        );

        // 验证插入结果并获取文档ID
        const changes = result[1]?.changes || 0;
        const documentId = result[1]?.lastID || null;
        
        console.log(`📊 数据库插入结果:`, {
            changes,
            documentId,
            result: result
        });
        
        if (changes !== 1 || !documentId) {
            console.error(`❌ 插入失败: changes=${changes}, documentId=${documentId}`);
            throw new Error(`插入失败: changes=${changes}, documentId=${documentId}`);
        }

        // 查询完整的资料信息
        const [documents] = await sequelize.query(
            'SELECT * FROM supplier_documents WHERE id = ?',
            { replacements: [documentId] }
        );

        const doc = documents[0];

        res.status(201).json({
            success: true,
            data: {
                documentId: doc.id,
                supplierId: doc.supplier_id,
                level: doc.level,
                materialId: doc.material_id,
                componentId: doc.component_id,
                documentType: doc.document_type,
                documentName: doc.document_name,
                documentNumber: doc.document_number,
                filePath: doc.file_path,
                fileSize: doc.file_size,
                expiryDate: doc.expiry_date,
                isPermanent: doc.is_permanent === 1,
                version: doc.version,
                createdAt: doc.created_at
            },
            message: '资料上传成功'
        });

    } catch (error) {
        console.error('上传资料失败:', error);

        // 如果上传失败，删除已上传的文件
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({
            success: false,
            error: '上传资料失败',
            message: error.message
        });
    }
});

/**
 * GET /api/documents/expiring
 * 查询即将过期的资料
 * 
 * Query:
 * - days: 未来多少天内过期 (默认30天)
 * - supplierId: 供应商ID (可选)
 */
router.get('/expiring', async (req, res) => {
    try {
        const { days = 30, supplierId } = req.query;

        const now = new Date();
        const futureDate = new Date(now.getTime() + (parseInt(days) * 24 * 60 * 60 * 1000));

        let query = `
      SELECT 
        sd.*,
        s.name as supplier_name,
        s.contact_person,
        s.contact_email,
        m.material_name,
        mc.component_name
      FROM supplier_documents sd
      JOIN suppliers s ON sd.supplier_id = s.id
      LEFT JOIN materials m ON sd.material_id = m.id
      LEFT JOIN material_components mc ON sd.component_id = mc.id
      WHERE sd.expiry_date BETWEEN ? AND ?
        AND sd.is_permanent = 0
        AND sd.status = 'active'
        AND sd.is_current = 1
    `;

        let params = [now.toISOString(), futureDate.toISOString()];

        if (supplierId) {
            query += ' AND sd.supplier_id = ?';
            params.push(supplierId);
        }

        query += ' ORDER BY sd.expiry_date ASC';

        const [documents] = await sequelize.query(query, { replacements: params });

        const result = documents.map(doc => {
            const daysUntilExpiry = Math.ceil((new Date(doc.expiry_date) - now) / (1000 * 60 * 60 * 24));

            return {
                documentId: doc.id,
                supplierId: doc.supplier_id,
                supplierName: doc.supplier_name,
                contactPerson: doc.contact_person,
                contactEmail: doc.contact_email,
                level: doc.level,
                materialName: doc.material_name,
                componentName: doc.component_name,
                documentType: doc.document_type,
                documentName: doc.document_name,
                expiryDate: doc.expiry_date,
                daysUntilExpiry: daysUntilExpiry,
                warningLevel: daysUntilExpiry <= 7 ? 'critical' : daysUntilExpiry <= 15 ? 'urgent' : 'warning'
            };
        });

        res.json({
            success: true,
            data: result,
            count: result.length
        });

    } catch (error) {
        console.error('查询即将过期资料失败:', error);
        res.status(500).json({
            success: false,
            error: '查询即将过期资料失败',
            message: error.message
        });
    }
});

/**
 * GET /api/documents/expired
 * 查询已过期的资料
 */
router.get('/expired', async (req, res) => {
    try {
        const { supplierId } = req.query;

        const now = new Date();

        let query = `
      SELECT 
        sd.*,
        s.name as supplier_name,
        s.contact_person,
        s.contact_email,
        m.material_name,
        mc.component_name
      FROM supplier_documents sd
      JOIN suppliers s ON sd.supplier_id = s.id
      LEFT JOIN materials m ON sd.material_id = m.id
      LEFT JOIN material_components mc ON sd.component_id = mc.id
      WHERE sd.expiry_date < ?
        AND sd.is_permanent = 0
        AND sd.status = 'active'
        AND sd.is_current = 1
    `;

        let params = [now.toISOString()];

        if (supplierId) {
            query += ' AND sd.supplier_id = ?';
            params.push(supplierId);
        }

        query += ' ORDER BY sd.expiry_date DESC';

        const [documents] = await sequelize.query(query, { replacements: params });

        const result = documents.map(doc => {
            const daysExpired = Math.ceil((now - new Date(doc.expiry_date)) / (1000 * 60 * 60 * 24));

            return {
                documentId: doc.id,
                supplierId: doc.supplier_id,
                supplierName: doc.supplier_name,
                contactPerson: doc.contact_person,
                contactEmail: doc.contact_email,
                level: doc.level,
                materialName: doc.material_name,
                componentName: doc.component_name,
                documentType: doc.document_type,
                documentName: doc.document_name,
                expiryDate: doc.expiry_date,
                daysExpired: daysExpired,
                warningLevel: 'expired'
            };
        });

        res.json({
            success: true,
            data: result,
            count: result.length
        });

    } catch (error) {
        console.error('查询已过期资料失败:', error);
        res.status(500).json({
            success: false,
            error: '查询已过期资料失败',
            message: error.message
        });
    }
});

/**
 * DELETE /api/documents/:documentId
 * 删除资料（同步到本地文件系统）
 */
router.delete('/:documentId', async (req, res) => {
    try {
        console.log(`🗑️ DELETE /api/documents/delete/:documentId 被调用，documentId: ${req.params.documentId}`);
        const { documentId } = req.params;

        if (!documentId) {
            return res.status(400).json({
                success: false,
                error: '缺少文档ID',
                message: 'documentId 为必填项'
            });
        }

        // 获取文档信息
        const [documents] = await sequelize.query(
            'SELECT * FROM supplier_documents WHERE id = ?',
            { replacements: [documentId] }
        );

        if (documents.length === 0) {
            return res.status(404).json({
                success: false,
                error: '文档不存在',
                message: '未找到指定的文档'
            });
        }

        const document = documents[0];

        // 使用LocalFileSyncService同步删除（移动到备份）
        console.log(`🗑️ 开始删除同步，文档信息:`, {
            id: document.id,
            filePath: document.file_path,
            documentType: document.document_type,
            supplierId: document.supplier_id,
            materialId: document.material_id
        });

        await localFileSyncService.syncDelete({
            id: document.id,
            filePath: document.file_path,
            documentType: document.document_type,
            supplierId: document.supplier_id,
            materialId: document.material_id
        });

        console.log('✅ 删除同步完成');

        // 删除数据库记录
        await sequelize.query(
            'DELETE FROM supplier_documents WHERE id = ?',
            { replacements: [documentId] }
        );

        res.json({
            success: true,
            message: '资料删除成功'
        });

    } catch (error) {
        console.error('删除资料失败:', error);
        res.status(500).json({
            success: false,
            error: '删除资料失败',
            message: error.message
        });
    }
});

module.exports = router;
