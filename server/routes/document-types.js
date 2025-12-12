/**
 * 供应商资料类型设置功能 - 服务器端API路由
 *
 * 功能概述：
 * 1. 提供文档类型的CRUD操作API
 * 2. 支持缓存和性能优化
 * 3. 数据验证和错误处理
 *
 * 创建时间: 2025-12-12
 * 设计: 浮浮酱 (猫娘工程师)
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// 数据存储路径
const DATA_DIR = path.join(__dirname, '../../data');
const DOCUMENT_TYPES_FILE = path.join(DATA_DIR, 'document-types.json');

// ==================== 数据管理工具 ====================

/**
 * 确保数据目录存在
 */
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch (error) {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

/**
 * 加载文档类型数据
 */
async function loadDocumentTypes() {
  try {
    await ensureDataDir();

    const data = await fs.readFile(DOCUMENT_TYPES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // 文件不存在，返回默认数据
      const defaultData = getDefaultDocumentTypes();
      await saveDocumentTypes(defaultData);
      return defaultData;
    }
    throw error;
  }
}

/**
 * 保存文档类型数据
 */
async function saveDocumentTypes(documentTypes) {
  await ensureDataDir();
  await fs.writeFile(DOCUMENT_TYPES_FILE, JSON.stringify(documentTypes, null, 2), 'utf8');
}

/**
 * 获取默认文档类型数据
 */
function getDefaultDocumentTypes() {
  return [
    {
      id: 'doc_type_001',
      name: '质量保证协议',
      description: '企业与供应商之间的质量保证文件',
      category: 'common',
      isRequired: true,
      isSystemDefault: true,
      sortOrder: 1,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      usageCount: 0
    },
    {
      id: 'doc_type_002',
      name: 'MSDS安全数据表',
      description: '化学品安全技术说明书',
      category: 'common',
      isRequired: true,
      isSystemDefault: true,
      sortOrder: 2,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      usageCount: 0
    },
    {
      id: 'doc_type_003',
      name: '营业执照',
      description: '企业营业执照副本',
      category: 'common',
      isRequired: false,
      isSystemDefault: true,
      sortOrder: 3,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      usageCount: 0
    },
    {
      id: 'doc_type_004',
      name: 'ISO认证证书',
      description: '国际标准化组织认证证书',
      category: 'common',
      isRequired: false,
      isSystemDefault: true,
      sortOrder: 4,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      usageCount: 0
    },
    {
      id: 'doc_type_005',
      name: 'CSR报告',
      description: '企业社会责任报告',
      category: 'common',
      isRequired: false,
      isSystemDefault: true,
      sortOrder: 5,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      usageCount: 0
    },
    {
      id: 'doc_type_101',
      name: 'ROHS证书',
      description: '有害物质限制指令证书',
      category: 'material',
      isRequired: true,
      isSystemDefault: true,
      sortOrder: 101,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      usageCount: 0
    },
    {
      id: 'doc_type_102',
      name: 'REACH证书',
      description: '化学品注册、评估、许可和限制证书',
      category: 'material',
      isRequired: true,
      isSystemDefault: true,
      sortOrder: 102,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      usageCount: 0
    },
    {
      id: 'doc_type_103',
      name: 'HF证书',
      description: '无卤素认证证书',
      category: 'material',
      isRequired: false,
      isSystemDefault: true,
      sortOrder: 103,
      isActive: true,
      createdBy: 'system',
      createdAt: new Date().toISOString(),
      usageCount: 0
    }
  ];
}

/**
 * 生成唯一ID
 */
function generateId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `doc_type_${timestamp}_${random}`;
}

/**
 * 验证文档类型数据
 */
function validateDocumentTypeData(data, isUpdate = false) {
  const errors = [];

  // 名称验证
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('类型名称不能为空');
  }

  if (data.name && data.name.length > 50) {
    errors.push('类型名称不能超过50个字符');
  }

  // 说明验证
  if (data.description && data.description.length > 200) {
    errors.push('类型说明不能超过200个字符');
  }

  // 分类验证
  if (!isUpdate && (!data.category || !['common', 'material'].includes(data.category))) {
    errors.push('分类必须是 common 或 material');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ==================== API路由定义 ====================

/**
 * GET /api/document-types
 * 获取文档类型列表
 */
router.get('/', async (req, res) => {
  try {
    console.log('📋 获取文档类型列表...');

    const { category, isActive } = req.query;
    let documentTypes = await loadDocumentTypes();

    // 应用过滤条件
    if (category) {
      documentTypes = documentTypes.filter(dt => dt.category === category);
    }

    if (isActive !== undefined) {
      const activeFilter = isActive === 'true';
      documentTypes = documentTypes.filter(dt => dt.isActive === activeFilter);
    }

    // 按排序序号排序
    documentTypes.sort((a, b) => a.sortOrder - b.sortOrder);

    res.json({
      success: true,
      data: documentTypes,
      total: documentTypes.length
    });

    console.log(`✅ 返回 ${documentTypes.length} 个文档类型`);

  } catch (error) {
    console.error('❌ 获取文档类型列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取文档类型列表失败'
    });
  }
});

/**
 * GET /api/document-types/:id
 * 获取单个文档类型详情
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 获取文档类型详情: ${id}`);

    const documentTypes = await loadDocumentTypes();
    const documentType = documentTypes.find(dt => dt.id === id);

    if (!documentType) {
      return res.status(404).json({
        success: false,
        error: '文档类型不存在'
      });
    }

    res.json({
      success: true,
      data: documentType
    });

    console.log('✅ 文档类型详情获取成功');

  } catch (error) {
    console.error('❌ 获取文档类型详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取文档类型详情失败'
    });
  }
});

/**
 * POST /api/document-types
 * 创建新的文档类型
 */
router.post('/', async (req, res) => {
  try {
    console.log('➕ 创建新的文档类型...');

    const { name, description = '', category, isRequired = false } = req.body;

    // 验证数据
    const validation = validateDocumentTypeData(req.body);
    if (!validation.isValid) {
      console.log('❌ 验证失败:', validation.errors);
      return res.status(400).json({
        success: false,
        error: validation.errors.join(', ')
      });
    }

    // 加载现有数据
    const documentTypes = await loadDocumentTypes();

    // 检查名称是否重复
    const existingType = documentTypes.find(dt =>
      dt.name === name.trim() && dt.category === category
    );

    if (existingType) {
      let errorMsg = `该分类下已存在相同名称的文档类型"${name.trim()}"`;
      if (existingType.isSystemDefault) {
        errorMsg += '（系统默认类型，不能重复创建）';
      }
      console.log('⚠️ 名称重复检查失败:', errorMsg);
      return res.status(400).json({
        success: false,
        error: errorMsg
      });
    }

    // 创建新的文档类型
    const newDocumentType = {
      id: generateId(),
      name: name.trim(),
      description: description.trim(),
      category,
      isRequired: Boolean(isRequired),
      isSystemDefault: false,
      sortOrder: Math.max(...documentTypes.filter(dt => dt.category === category).map(dt => dt.sortOrder), 0) + 1,
      isActive: true,
      createdBy: 'user', // 实际应用中应该从认证信息获取
      createdAt: new Date().toISOString(),
      usageCount: 0
    };

    // 保存数据
    documentTypes.push(newDocumentType);
    await saveDocumentTypes(documentTypes);

    res.status(201).json({
      success: true,
      data: newDocumentType
    });

    console.log('✅ 文档类型创建成功:', newDocumentType.name);

  } catch (error) {
    console.error('❌ 创建文档类型失败:', error);
    res.status(500).json({
      success: false,
      error: '创建文档类型失败'
    });
  }
});

/**
 * PUT /api/document-types/:id
 * 更新文档类型
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📝 更新文档类型: ${id}`);

    const documentTypes = await loadDocumentTypes();
    const documentTypeIndex = documentTypes.findIndex(dt => dt.id === id);

    if (documentTypeIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '文档类型不存在'
      });
    }

    const documentType = documentTypes[documentTypeIndex];

    // 系统默认类型不能修改某些字段
    if (documentType.isSystemDefault) {
      // 只允许修改 isActive 状态
      const { isActive } = req.body;
      if (isActive !== undefined) {
        documentType.isActive = Boolean(isActive);
        await saveDocumentTypes(documentTypes);

        return res.json({
          success: true,
          data: documentType
        });
      } else {
        return res.status(400).json({
          success: false,
          error: '系统默认类型只能修改启用状态'
        });
      }
    }

    // 验证数据
    const validation = validateDocumentTypeData(req.body, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.errors.join(', ')
      });
    }

    // 更新字段
    const { name, description, isRequired, isActive } = req.body;

    if (name !== undefined) documentType.name = name.trim();
    if (description !== undefined) documentType.description = description.trim();
    if (isRequired !== undefined) documentType.isRequired = Boolean(isRequired);
    if (isActive !== undefined) documentType.isActive = Boolean(isActive);

    await saveDocumentTypes(documentTypes);

    res.json({
      success: true,
      data: documentType
    });

    console.log('✅ 文档类型更新成功');

  } catch (error) {
    console.error('❌ 更新文档类型失败:', error);
    res.status(500).json({
      success: false,
      error: '更新文档类型失败'
    });
  }
});

/**
 * DELETE /api/document-types/:id
 * 删除文档类型
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ 删除文档类型: ${id}`);

    const documentTypes = await loadDocumentTypes();
    const documentTypeIndex = documentTypes.findIndex(dt => dt.id === id);

    if (documentTypeIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '文档类型不存在'
      });
    }

    const documentType = documentTypes[documentTypeIndex];

    // 检查是否可以删除
    if (documentType.isSystemDefault) {
      return res.status(400).json({
        success: false,
        error: '系统默认类型不能删除'
      });
    }

    if (documentType.usageCount > 0) {
      return res.status(400).json({
        success: false,
        error: `该类型正在被 ${documentType.usageCount} 个文档使用，不能删除`
      });
    }

    // 删除文档类型
    documentTypes.splice(documentTypeIndex, 1);
    await saveDocumentTypes(documentTypes);

    res.json({
      success: true,
      message: '文档类型删除成功'
    });

    console.log('✅ 文档类型删除成功');

  } catch (error) {
    console.error('❌ 删除文档类型失败:', error);
    res.status(500).json({
      success: false,
      error: '删除文档类型失败'
    });
  }
});

module.exports = router;