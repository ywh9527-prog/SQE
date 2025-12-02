/**
 * 资料上传 API 路由
 * 
 * 功能:
 * 1. 上传资料 (支持三级层级: supplier/material/component)
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

// 配置文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const { supplierId, level, materialId, componentId } = req.body;

        // 根据层级构建文件路径
        let uploadPath = path.join(__dirname, '../../uploads');

        if (supplierId) {
            uploadPath = path.join(uploadPath, `supplier_${supplierId}`);
        }

        if (level === 'component' && materialId && componentId) {
            uploadPath = path.join(uploadPath, `material_${materialId}`, `component_${componentId}`);
        } else if (level === 'material' && materialId) {
            uploadPath = path.join(uploadPath, `material_${materialId}`);
        }

        // 确保目录存在
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // 生成唯一文件名: 时间戳_原始文件名
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        const filename = `${basename}_${timestamp}${ext}`;
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
 * 上传资料 (支持三级层级)
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
        if ((level === 'material' || level === 'component') && !materialId) {
            return res.status(400).json({
                success: false,
                error: '缺少必填字段',
                message: 'level为material或component时，materialId为必填项'
            });
        }

        if (level === 'component' && !componentId) {
            return res.status(400).json({
                success: false,
                error: '缺少必填字段',
                message: 'level为component时，componentId为必填项'
            });
        }

        // 验证供应商级资料类型
        const supplierLevelTypes = ['quality_agreement', 'environmental_msds', 'iso_certification', 'csr', 'other'];
        const componentLevelTypes = ['environmental_rohs', 'environmental_reach', 'environmental_hf'];

        if (level === 'supplier' && !supplierLevelTypes.includes(documentType)) {
            return res.status(400).json({
                success: false,
                error: '资料类型错误',
                message: `供应商级资料类型应为: ${supplierLevelTypes.join(', ')}`
            });
        }

        if (level === 'component' && !componentLevelTypes.includes(documentType)) {
            return res.status(400).json({
                success: false,
                error: '资料类型错误',
                message: `具体构成级资料类型应为: ${componentLevelTypes.join(', ')}`
            });
        }

        // 检查是否已存在相同类型的当前版本资料
        let existingQuery = `
      SELECT id, version FROM supplier_documents 
      WHERE supplier_id = ? 
        AND document_type = ? 
        AND level = ?
        AND is_current = 1 
        AND status = 'active'
    `;
        let existingParams = [supplierId, documentType, level];

        if (level === 'component') {
            existingQuery += ' AND component_id = ?';
            existingParams.push(componentId);
        }

        const [existing] = await sequelize.query(existingQuery, { replacements: existingParams });

        let version = 1;
        if (existing.length > 0) {
            // 将旧版本标记为非当前版本
            await sequelize.query(
                'UPDATE supplier_documents SET is_current = 0 WHERE id = ?',
                { replacements: [existing[0].id] }
            );
            version = existing[0].version + 1;
        }

        // 插入新资料记录
        const filePath = req.file.path.replace(/\\/g, '/'); // 统一使用正斜杠
        const fileSize = req.file.size;
        const isPermanentBool = isPermanent === 'true' || isPermanent === true ? 1 : 0;

        const [result] = await sequelize.query(
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

        const documentId = result;

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

module.exports = router;
