/**
 * 供应商资料类型设置功能 - 数据模型设计
 *
 * 功能概述：
 * 1. 允许用户自定义供应商通用资料的文档类型
 * 2. 支持增删改查操作
 * 3. 与现有系统无缝集成
 *
 * 创建时间: 2025-12-12
 * 设计: 浮浮酱 (猫娘工程师)
 */

// ==================== 数据模型定义 ====================

/**
 * 文档类型配置模型
 */
class DocumentTypeConfig {
  constructor({
    id,                    // 唯一标识符 (生成: doc_type_xxx)
    name,                  // 类型名称 (如: "质量保证协议")
    description,           // 类型说明 (如: "企业与供应商之间的质量保证文件")
    category,             // 分类 (common: 通用资料, material: 物料资料)
    isRequired,           // 是否必需 (true/false)
    isSystemDefault,      // 是否系统默认 (不可删除)
    sortOrder,            // 排序序号
    isActive,             // 是否启用
    createdBy,            // 创建人
    createdAt,            // 创建时间
    usageCount = 0        // 使用次数统计
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.category = category;
    this.isRequired = isRequired || false;
    this.isSystemDefault = isSystemDefault || false;
    this.sortOrder = sortOrder || 0;
    this.isActive = isActive !== false; // 默认启用
    this.createdBy = createdBy;
    this.createdAt = createdAt || new Date().toISOString();
    this.usageCount = usageCount;
  }

  /**
   * 验证配置是否有效
   */
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push('类型名称不能为空');
    }

    if (this.name.length > 50) {
      errors.push('类型名称不能超过50个字符');
    }

    if (this.description && this.description.length > 200) {
      errors.push('类型说明不能超过200个字符');
    }

    if (!['common', 'material'].includes(this.category)) {
      errors.push('分类必须是 common 或 material');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取显示用的安全数据
   */
  toSafeObject() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      isRequired: this.isRequired,
      isSystemDefault: this.isSystemDefault,
      sortOrder: this.sortOrder,
      isActive: this.isActive,
      usageCount: this.usageCount,
      createdAt: this.createdAt
    };
  }
}

// ==================== API接口设计 ====================

/**
 * 资料类型设置 API 路由定义
 */
const DocumentTypeAPIRoutes = {
  // 基础路径: /api/document-types

  /**
   * 获取所有文档类型配置
   * GET /api/document-types
   * 查询参数:
   *   - category: common/material (可选)
   *   - isActive: true/false (可选)
   */
  GET_ALL: {
    method: 'GET',
    path: '/api/document-types',
    description: '获取文档类型列表',
    params: {
      category: { type: 'string', enum: ['common', 'material'], required: false },
      isActive: { type: 'boolean', required: false }
    },
    response: {
      success: true,
      data: [DocumentTypeConfig],
      total: number
    }
  },

  /**
   * 创建新的文档类型
   * POST /api/document-types
   */
  CREATE: {
    method: 'POST',
    path: '/api/document-types',
    description: '创建文档类型',
    body: {
      name: { type: 'string', required: true, maxLength: 50 },
      description: { type: 'string', required: false, maxLength: 200 },
      category: { type: 'string', required: true, enum: ['common', 'material'] },
      isRequired: { type: 'boolean', required: false, default: false }
    },
    response: {
      success: true,
      data: DocumentTypeConfig
    }
  },

  /**
   * 更新文档类型
   * PUT /api/document-types/:id
   */
  UPDATE: {
    method: 'PUT',
    path: '/api/document-types/:id',
    description: '更新文档类型',
    params: {
      id: { type: 'string', required: true }
    },
    body: {
      name: { type: 'string', required: false, maxLength: 50 },
      description: { type: 'string', required: false, maxLength: 200 },
      isRequired: { type: 'boolean', required: false },
      isActive: { type: 'boolean', required: false }
    },
    response: {
      success: true,
      data: DocumentTypeConfig
    }
  },

  /**
   * 删除文档类型
   * DELETE /api/document-types/:id
   */
  DELETE: {
    method: 'DELETE',
    path: '/api/document-types/:id',
    description: '删除文档类型',
    params: {
      id: { type: 'string', required: true }
    },
    response: {
      success: true,
      message: string
    }
  },

  /**
   * 获取单个文档类型详情
   * GET /api/document-types/:id
   */
  GET_BY_ID: {
    method: 'GET',
    path: '/api/document-types/:id',
    description: '获取文档类型详情',
    params: {
      id: { type: 'string', required: true }
    },
    response: {
      success: true,
      data: DocumentTypeConfig
    }
  }
};

// ==================== 系统默认配置 ====================

/**
 * 系统默认文档类型配置
 */
const SystemDefaultDocumentTypes = [
  new DocumentTypeConfig({
    id: 'doc_type_001',
    name: '质量保证协议',
    description: '企业与供应商之间的质量保证文件',
    category: 'common',
    isRequired: true,
    isSystemDefault: true,
    sortOrder: 1,
    isActive: true,
    createdBy: 'system'
  }),

  new DocumentTypeConfig({
    id: 'doc_type_002',
    name: 'MSDS安全数据表',
    description: '化学品安全技术说明书',
    category: 'common',
    isRequired: true,
    isSystemDefault: true,
    sortOrder: 2,
    isActive: true,
    createdBy: 'system'
  }),

  new DocumentTypeConfig({
    id: 'doc_type_003',
    name: '营业执照',
    description: '企业营业执照副本',
    category: 'common',
    isRequired: false,
    isSystemDefault: true,
    sortOrder: 3,
    isActive: true,
    createdBy: 'system'
  }),

  new DocumentTypeConfig({
    id: 'doc_type_004',
    name: 'ISO认证证书',
    description: '国际标准化组织认证证书',
    category: 'common',
    isRequired: false,
    isSystemDefault: true,
    sortOrder: 4,
    isActive: true,
    createdBy: 'system'
  }),

  new DocumentTypeConfig({
    id: 'doc_type_005',
    name: 'CSR报告',
    description: '企业社会责任报告',
    category: 'common',
    isRequired: false,
    isSystemDefault: true,
    sortOrder: 5,
    isActive: true,
    createdBy: 'system'
  }),

  // 物料资料类型
  new DocumentTypeConfig({
    id: 'doc_type_101',
    name: 'ROHS证书',
    description: '有害物质限制指令证书',
    category: 'material',
    isRequired: true,
    isSystemDefault: true,
    sortOrder: 101,
    isActive: true,
    createdBy: 'system'
  }),

  new DocumentTypeConfig({
    id: 'doc_type_102',
    name: 'REACH证书',
    description: '化学品注册、评估、许可和限制证书',
    category: 'material',
    isRequired: true,
    isSystemDefault: true,
    sortOrder: 102,
    isActive: true,
    createdBy: 'system'
  }),

  new DocumentTypeConfig({
    id: 'doc_type_103',
    name: 'HF证书',
    description: '无卤素认证证书',
    category: 'material',
    isRequired: false,
    isSystemDefault: true,
    sortOrder: 103,
    isActive: true,
    createdBy: 'system'
  })
];

// ==================== 工具函数 ====================

/**
 * 生成唯一ID
 */
function generateDocumentTypeId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `doc_type_${timestamp}_${random}`;
}

/**
 * 按分类过滤文档类型
 */
function filterByCategory(documentTypes, category) {
  return documentTypes.filter(docType => docType.category === category);
}

/**
 * 按使用状态过滤文档类型
 */
function filterByActiveStatus(documentTypes, isActive = true) {
  return documentTypes.filter(docType => docType.isActive === isActive);
}

/**
 * 按排序序号排序
 */
function sortByOrder(documentTypes) {
  return [...documentTypes].sort((a, b) => a.sortOrder - b.sortOrder);
}

// ==================== 导出 ====================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DocumentTypeConfig,
    DocumentTypeAPIRoutes,
    SystemDefaultDocumentTypes,
    generateDocumentTypeId,
    filterByCategory,
    filterByActiveStatus,
    sortByOrder
  };
}

// 浏览器环境下的全局导出
if (typeof window !== 'undefined') {
  window.DocumentTypeConfig = DocumentTypeConfig;
  window.DocumentTypeAPIRoutes = DocumentTypeAPIRoutes;
  window.SystemDefaultDocumentTypes = SystemDefaultDocumentTypes;
}