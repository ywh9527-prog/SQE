/**
 * 供应商资料管理 - 服务层 (业务逻辑)
 * Phase 2.1 - 逐步提取纯数据处理方法
 *
 * 只包含无依赖的纯函数，确保安全重构
 */

/**
 * 供应商服务类
 */
class SupplierServices {

  /**
   * 格式化日期显示（只显示年-月-日）
   * @param {string} dateString - 日期字符串
   * @return {string} 格式化后的日期字符串
   */
  formatDate(dateString) {
    if (!dateString || dateString === '永久' || dateString === '永久有效') {
      return dateString;
    }

    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.warn('日期格式化失败:', dateString, error);
      return dateString;
    }
  }

  /**
   * 获取状态图标
   * @param {string} status - 状态字符串
   * @return {string} 对应的状态图标
   */
  getStatusIcon(status) {
    const map = {
      normal: '🟢',
      warning: '🟡',
      urgent: '🟠',
      expired: '🔴'
    };
    return map[status] || '⚪';
  }

  /**
   * 获取资料类型文本
   * @param {string} type - 资料类型代码
   * @return {string} 资料类型的中文描述
   */
  getDocumentTypeText(type) {
    const map = {
      quality_agreement: '质量保证协议',
      environmental_msds: 'MSDS',
      iso_certification: 'ISO认证',
      environmental_rohs: 'ROHS',
      environmental_reach: 'REACH',
      environmental_hf: 'HF',
      csr: 'CSR',
      other: '其他'
    };
    return map[type] || type;
  }

  /**
   * 获取状态筛选文本
   * @param {string} status - 状态代码
   * @return {string} 状态的显示文本
   */
  getStatusFilterText(status) {
    const map = {
      normal: '🟢 正常',
      warning: '🟡 即将到期',
      urgent: '🟠 紧急',
      expired: '🔴 已过期'
    };
    return map[status] || status;
  }

  /**
   * 获取文档筛选文本
   * @param {string} filter - 文档筛选代码
   * @return {string} 文档筛选的显示文本
   */
  getDocumentFilterText(filter) {
    const map = {
      missing_msds: '缺失MSDS',
      missing_qa: '缺失质量协议',
      missing_rohs: '缺失ROHS',
      missing_reach: '缺失REACH',
      missing_hf: '缺失HF'
    };
    return map[filter] || filter;
  }

  // ==================== 邮件相关方法 ====================

  /**
   * 获取邮件模板
   * @return {string} 邮件模板内容
   */
  getEmailTemplate() {
    return `尊敬的{供应商名称}您好，

感谢贵司一直以来对我司供应链工作的大力支持！

我们通过供应商资料管理系统监测到贵司提供{物料名称}{具体构成名称}{证书类型}将于{到期日期}到期（剩余{剩余天数}）

【更新建议】
• 请在证书到期前完成更新并提交最新版本至我司质量部门。
• 如需延期请提前提供书面说明和预计完成时间。

再次感谢贵司的理解与配合，期待我们继续携手共进！

{SQE工程师联系方式}
质量部 | 供应商质量管理

---
此邮件由供应商资料管理系统自动发送，请勿直接回复。如已处理，请忽略本提醒。`;
  }

  /**
   * 替换邮件模板变量
   * @param {string} template - 邮件模板
   * @param {Object} variables - 变量对象
   * @return {string} 替换后的邮件内容
   */
  replaceEmailVariables(template, variables) {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value || '');
    }

    return result;
  }

  // ==================== 数据验证方法 ====================

  /**
   * 检查供应商状态
   * @param {Object} supplier - 供应商数据
   * @param {string} status - 状态筛选
   * @return {boolean} 是否符合状态
   */
  checkSupplierStatus(supplier, status) {
    // 检查通用资料状态
    const commonDocs = supplier.commonDocuments;
    for (const docType in commonDocs) {
      const doc = commonDocs[docType];
      if (doc && doc.status === status) {
        return true;
      }
    }

    // 检查物料资料状态
    const materialDocs = supplier.materialDocuments;
    for (const docType in materialDocs) {
      const stat = materialDocs[docType];
      if (stat.count > 0 && stat.worstStatus === status) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查文档问题
   * @param {Object} supplier - 供应商数据
   * @param {string} issue - 问题筛选
   * @return {boolean} 是否符合问题条件
   */
  checkDocumentIssue(supplier, issue) {
    switch (issue) {
      case 'missing_msds':
        return !supplier.commonDocuments['environmental_msds'];
      case 'missing_qa':
        return !supplier.commonDocuments['quality_agreement'];
      case 'missing_rohs':
        return supplier.materialDocuments.rohs.count === 0;
      case 'missing_reach':
        return supplier.materialDocuments.reach.count === 0;
      case 'missing_hf':
        return supplier.materialDocuments.hf.count === 0;
      default:
        return false;
    }
  }

  /**
   * 获取证书类型文本
   * @param {string} documentType - 证书类型代码或ID
   * @return {string} 证书类型的中文描述
   */
  async getCertificateTypeText(documentType) {
    // 首先尝试从动态资料类型配置中获取
    if (window.documentTypeService) {
      try {
        const documentTypes = await window.documentTypeService.getAllDocumentTypes();
        const docType = documentTypes.find(dt => dt.id === documentType);
        if (docType) {
          console.log(`✅ 从动态配置获取证书类型: ${documentType} -> ${docType.name}`);
          return docType.name;
        }
      } catch (error) {
        console.error('❌ 获取动态资料类型失败:', error);
      }
    }

    // 如果动态配置不可用或未找到，使用硬编码映射作为后备
    const map = {
      quality_agreement: '质量保证协议',
      environmental_msds: 'MSDS',
      iso_certification: 'ISO认证',
      environmental_rohs: 'ROHS',
      environmental_reach: 'REACH',
      environmental_hf: 'HF',
      csr: 'CSR',
      other: '其他证书'
    };
    const fallbackResult = map[documentType] || documentType;
    console.log(`⚠️ 使用硬编码映射: ${documentType} -> ${fallbackResult}`);
    return fallbackResult;
  }

  /**
   * 获取证书类型文本（同步版本，用于界面显示）
   * @param {string} documentType - 证书类型代码或ID
   * @return {string} 证书类型的中文描述
   */
  getCertificateTypeTextSync(documentType) {
    console.log(`🔍 getCertificateTypeTextSync 被调用: ${documentType}`);

    // 检查是否是中文（包含中文字符），如果是直接返回
    if (/[\u4e00-\u9fa5]/.test(documentType)) {
      console.log(`✅ 检测到中文，直接返回: ${documentType}`);
      return documentType;
    }

    // 首先检查缓存
    if (this._documentTypeCache && this._documentTypeCache[documentType]) {
      console.log(`✅ 从本地缓存返回: ${documentType} -> ${this._documentTypeCache[documentType]}`);
      return this._documentTypeCache[documentType];
    }

    // 🎯 [CORE-LOGIC] 强制同步加载方案 - 确保数据完整性
    // 如果缓存中没有，立即同步获取数据（改进方案）
    if (!this._isLoadingDocumentTypes && !this._documentTypesLoaded) {
      this._isLoadingDocumentTypes = true;
      this._loadDocumentTypesSync();
    }

    // 再次检查缓存（同步加载后应该有了）
    if (this._documentTypeCache && this._documentTypeCache[documentType]) {
      console.log(`✅ 同步加载后从缓存返回: ${documentType} -> ${this._documentTypeCache[documentType]}`);
      return this._documentTypeCache[documentType];
    }

    // 检查documentTypeService缓存
    if (window.documentTypeService && window.documentTypeService.cache && window.documentTypeService.cache.documentTypes) {
      const cachedTypes = window.documentTypeService.cache.documentTypes;
      const docType = cachedTypes.find(dt => dt.id === documentType);
      if (docType) {
        // 缓存结果
        if (!this._documentTypeCache) {
          this._documentTypeCache = {};
        }
        this._documentTypeCache[documentType] = docType.name;
        console.log(`✅ 从documentTypeService缓存获取: ${documentType} -> ${docType.name}`);
        return docType.name;
      }
    }

    // 使用硬编码映射作为后备（只处理系统预设的硬编码类型）
    const map = {
      quality_agreement: '质量保证协议',
      environmental_msds: 'MSDS',
      iso_certification: 'ISO认证',
      environmental_rohs: 'ROHS',
      environmental_reach: 'REACH',
      environmental_hf: 'HF',
      csr: 'CSR',
      other: '其他证书'
    };
    const fallbackResult = map[documentType] || documentType;

    // 缓存结果
    if (!this._documentTypeCache) {
      this._documentTypeCache = {};
    }
    this._documentTypeCache[documentType] = fallbackResult;

    console.log(`⚠️ 使用硬编码映射返回: ${documentType} -> ${fallbackResult}`);
    return fallbackResult;
  }

  /**
   * 🎯 [DATA-FLOW] 同步加载文档类型数据 - 强制同步方案
   * 使用XMLHttpRequest实现同步请求，确保数据立即可用
   */
  _loadDocumentTypesSync() {
    try {
      console.log('📋 同步加载文档类型数据...');

      // 使用XMLHttpRequest实现同步请求
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/document-types', false); // false = 同步请求
      xhr.send();

      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);

        if (data.success && data.data) {
          // 初始化本地缓存
          if (!this._documentTypeCache) {
            this._documentTypeCache = {};
          }

          // 将所有文档类型映射到缓存
          data.data.forEach(docType => {
            this._documentTypeCache[docType.id] = docType.name;
          });

          // 更新documentTypeService的缓存
          if (window.documentTypeService && window.documentTypeService.cache) {
            window.documentTypeService.cache.documentTypes = data.data;
          }

          this._documentTypesLoaded = true;
          console.log('✅ 文档类型数据同步加载完成，缓存了', data.data.length, '个类型');
        }
      } else {
        console.warn('⚠️ 同步加载文档类型失败，状态码:', xhr.status);
      }
    } catch (error) {
      console.error('❌ 同步加载文档类型数据失败:', error);
    } finally {
      this._isLoadingDocumentTypes = false;
    }
  }

  /**
   * 异步加载文档类型数据（保留用于后台更新）
   */
  async _loadDocumentTypesAsync() {
    try {
      console.log('📋 异步加载文档类型数据...');
      const response = await fetch('/api/document-types');
      const data = await response.json();

      if (data.success && data.data) {
        // 更新documentTypeService的缓存
        if (window.documentTypeService) {
          window.documentTypeService.cache.documentTypes = data.data;
        }
        // 清除本地缓存，强制下次使用新数据
        this.clearDocumentTypeCache();
        console.log('✅ 文档类型数据加载完成');
      }
    } catch (error) {
      console.error('❌ 加载文档类型数据失败:', error);
    } finally {
      this._isLoadingDocumentTypes = false;
    }
  }

  /**
   * 清除资料类型缓存
   */
  clearDocumentTypeCache() {
    this._documentTypeCache = {};
    this._documentTypesLoaded = false; // 重置加载状态
  }

  /**
   * 🎯 [CONFIG] 初始化预加载文档类型 - 页面加载时主动调用
   * 建议在页面初始化时调用此方法，确保数据已准备好
   */
  initializeDocumentTypes() {
    if (!this._documentTypesLoaded) {
      console.log('🚀 初始化文档类型数据...');
      this._loadDocumentTypesSync();
    }
  }

}

// 创建全局服务实例
window.supplierServices = new SupplierServices();

// 🎯 [CONFIG] 页面加载时立即初始化文档类型数据
// 确保在界面渲染前数据已准备好
window.supplierServices.initializeDocumentTypes();

console.log('✅ SupplierServices 服务层已加载 (Phase 2.5 - formatDate, getStatusIcon, getDocumentTypeText, getCertificateTypeText, getStatusFilterText, getDocumentFilterText)');