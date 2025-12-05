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
      urgent: '🔴',
      critical: '🔴',
      expired: '❌'
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
      urgent: '🔴 紧急',
      critical: '🔴 严重',
      expired: '❌ 已过期'
    };
    return map[status] || status;
  }

  // ==================== 邮件相关方法 ====================

  /**
   * 获取邮件模板
   * @return {string} 邮件模板内容
   */
  getEmailTemplate() {
    return `尊敬的{供应商名称}您好，

感谢贵司一直以来对我司供应链工作的大力支持！

我们通过供应商资料管理系统监测到，贵司提供的{物料名称}{具体构成名称}的{证书类型}将于{到期日期}到期（剩余{剩余天数}）。

【更新建议】
• 请在证书到期前完成更新并提交最新版本至我司质量部门
• 如需延期请提前提供书面说明和预计完成时间

再次感谢贵司的理解与配合，期待我们继续携手共进！

此致
敬礼

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

}

// 创建全局服务实例
window.supplierServices = new SupplierServices();

console.log('✅ SupplierServices 服务层已加载 (Phase 2.1 - formatDate, getStatusIcon, getDocumentTypeText, getStatusFilterText)');