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

}

// 创建全局服务实例
window.supplierServices = new SupplierServices();

console.log('✅ SupplierServices 服务层已加载 (Phase 2.1 - formatDate, getStatusIcon, getDocumentTypeText, getStatusFilterText)');