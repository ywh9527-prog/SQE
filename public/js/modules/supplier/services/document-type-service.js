/**
 * 供应商资料类型设置功能 - 服务层
 *
 * 负责：
 * 1. API调用封装
 * 2. 数据缓存管理
 * 3. 业务逻辑处理
 *
 * 创建时间: 2025-12-12
 * 设计: 浮浮酱 (猫娘工程师)
 */

/**
 * 文档类型服务类
 */
class DocumentTypeService {
  constructor() {
    // 缓存配置
    this.cache = {
      documentTypes: null,
      lastLoadTime: null,
      cacheExpiry: 10 * 60 * 1000 // 10分钟缓存
    };

    // API基础路径
    this.apiBase = '/api/document-types';
  }

  // ==================== API调用方法 ====================

  /**
   * 获取所有文档类型
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} 文档类型列表
   */
  async getAllDocumentTypes(filters = {}) {
    try {
      // 检查缓存
      if (this.isCacheValid() && Object.keys(filters).length === 0) {
        console.log('📋 使用缓存的文档类型数据');
        return this.cache.documentTypes;
      }

      console.log('📋 从服务器获取文档类型数据...');

      // 构建查询参数
      const queryParams = new URLSearchParams();
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.isActive !== undefined) queryParams.append('isActive', filters.isActive);

      const url = `${this.apiBase}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const token = localStorage.getItem('authToken');

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '获取文档类型失败');
      }

      // 更新缓存
      if (Object.keys(filters).length === 0) {
        this.cache.documentTypes = result.data;
        this.cache.lastLoadTime = Date.now();
      }

      console.log(`✅ 成功获取 ${result.data.length} 个文档类型`);
      return result.data;

    } catch (error) {
      console.error('❌ 获取文档类型失败:', error);

      // 如果有缓存数据，降级使用缓存
      if (this.cache.documentTypes) {
        console.warn('⚠️ 使用缓存数据作为降级方案');
        return this.cache.documentTypes;
      }

      throw error;
    }
  }

  /**
   * 创建新的文档类型
   * @param {Object} documentTypeData - 文档类型数据
   * @returns {Promise<Object>} 创建的文档类型
   */
  async createDocumentType(documentTypeData) {
    try {
      console.log('➕ 创建新的文档类型...', documentTypeData);

      const token = localStorage.getItem('authToken');

      const response = await fetch(this.apiBase, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(documentTypeData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '创建文档类型失败');
      }

      // 清除缓存，强制重新加载
      this.clearCache();

      console.log('✅ 文档类型创建成功:', result.data);
      return result.data;

    } catch (error) {
      console.error('❌ 创建文档类型失败:', error);
      throw error;
    }
  }

  /**
   * 更新文档类型
   * @param {string} id - 文档类型ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新后的文档类型
   */
  async updateDocumentType(id, updateData) {
    try {
      console.log(`📝 更新文档类型 ${id}...`, updateData);

      const token = localStorage.getItem('authToken');

      const response = await fetch(`${this.apiBase}/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '更新文档类型失败');
      }

      // 更新缓存中的对应项
      if (this.cache.documentTypes) {
        const index = this.cache.documentTypes.findIndex(item => item.id === id);
        if (index !== -1) {
          this.cache.documentTypes[index] = result.data;
        }
      }

      console.log('✅ 文档类型更新成功:', result.data);
      return result.data;

    } catch (error) {
      console.error('❌ 更新文档类型失败:', error);
      throw error;
    }
  }

  /**
   * 删除文档类型
   * @param {string} id - 文档类型ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteDocumentType(id) {
    try {
      console.log(`🗑️ 删除文档类型 ${id}...`);

      const token = localStorage.getItem('authToken');

      const response = await fetch(`${this.apiBase}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '删除文档类型失败');
      }

      // 从缓存中移除
      if (this.cache.documentTypes) {
        this.cache.documentTypes = this.cache.documentTypes.filter(item => item.id !== id);
      }

      console.log('✅ 文档类型删除成功');
      return true;

    } catch (error) {
      console.error('❌ 删除文档类型失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个文档类型详情
   * @param {string} id - 文档类型ID
   * @returns {Promise<Object>} 文档类型详情
   */
  async getDocumentTypeById(id) {
    try {
      console.log(`🔍 获取文档类型详情 ${id}...`);

      const token = localStorage.getItem('authToken');

      const response = await fetch(`${this.apiBase}/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '获取文档类型详情失败');
      }

      console.log('✅ 文档类型详情获取成功:', result.data);
      return result.data;

    } catch (error) {
      console.error('❌ 获取文档类型详情失败:', error);
      throw error;
    }
  }

  // ==================== 业务逻辑方法 ====================

  /**
   * 获取通用资料类型列表
   * @returns {Promise<Array>} 通用资料类型列表
   */
  async getCommonDocumentTypes() {
    const documentTypes = await this.getAllDocumentTypes({ category: 'common' });
    return this.sortByOrder(documentTypes);
  }

  /**
   * 获取物料资料类型列表
   * @returns {Promise<Array>} 物料资料类型列表
   */
  async getMaterialDocumentTypes() {
    const documentTypes = await this.getAllDocumentTypes({ category: 'material' });
    return this.sortByOrder(documentTypes);
  }

  /**
   * 检查文档类型是否可以删除
   * @param {Object} documentType - 文档类型对象
   * @returns {Object} 检查结果
   */
  canDelete(documentType) {
    // 系统默认类型不能删除
    if (documentType.isSystemDefault) {
      return {
        canDelete: false,
        reason: '系统默认类型，不能删除'
      };
    }

    // 正在使用的类型不能删除
    if (documentType.usageCount > 0) {
      return {
        canDelete: false,
        reason: `该类型正在被 ${documentType.usageCount} 个文档使用，不能删除`
      };
    }

    return {
      canDelete: true,
      reason: '可以删除'
    };
  }

  /**
   * 验证文档类型数据
   * @param {Object} data - 待验证的数据
   * @returns {Object} 验证结果
   */
  validateDocumentTypeData(data) {
    const errors = [];

    // 名称验证
    if (!data.name || data.name.trim().length === 0) {
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
    if (!data.category || !['common', 'material'].includes(data.category)) {
      errors.push('分类必须是 通用资料 或 检测报告');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ==================== 缓存管理方法 ====================

  /**
   * 检查缓存是否有效
   * @returns {boolean} 缓存是否有效
   */
  isCacheValid() {
    return this.cache.documentTypes &&
           this.cache.lastLoadTime &&
           (Date.now() - this.cache.lastLoadTime < this.cache.cacheExpiry);
  }

  /**
   * 清除缓存
   */
  clearCache() {
    console.log('🧹 清除文档类型缓存');
    this.cache.documentTypes = null;
    this.cache.lastLoadTime = null;
  }

  /**
   * 强制刷新数据
   * @returns {Promise<Array>} 最新的文档类型列表
   */
  async refreshData() {
    this.clearCache();
    return this.getAllDocumentTypes();
  }

  // ==================== 工具方法 ====================

  /**
   * 按排序序号排序
   * @param {Array} documentTypes - 文档类型列表
   * @returns {Array} 排序后的列表
   */
  sortByOrder(documentTypes) {
    return [...documentTypes].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * 按分类分组
   * @param {Array} documentTypes - 文档类型列表
   * @returns {Object} 分组后的对象
   */
  groupByCategory(documentTypes) {
    return documentTypes.reduce((groups, docType) => {
      const category = docType.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(docType);
      return groups;
    }, {});
  }

  /**
   * 获取统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStatistics() {
    try {
      const documentTypes = await this.getAllDocumentTypes();

      const stats = {
        total: documentTypes.length,
        active: documentTypes.filter(dt => dt.isActive).length,
        inactive: documentTypes.filter(dt => !dt.isActive).length,
        systemDefault: documentTypes.filter(dt => dt.isSystemDefault).length,
        custom: documentTypes.filter(dt => !dt.isSystemDefault).length,
        byCategory: this.groupByCategory(documentTypes),
        totalUsage: documentTypes.reduce((sum, dt) => sum + dt.usageCount, 0)
      };

      console.log('📊 文档类型统计信息:', stats);
      return stats;

    } catch (error) {
      console.error('❌ 获取统计信息失败:', error);
      throw error;
    }
  }
}

// ==================== 全局实例 ====================

// 创建全局服务实例
if (typeof window !== 'undefined') {
  window.documentTypeService = new DocumentTypeService();
  console.log('✅ 文档类型服务已初始化: window.documentTypeService');
}

// Node.js 环境导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocumentTypeService;
}