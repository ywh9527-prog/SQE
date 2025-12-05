/**
 * 供应商资料管理 - UI层 (界面渲染)
 * Phase 2.2 - 逐步提取UI渲染方法
 *
 * 只包含DOM操作和界面渲染逻辑，依赖服务层提供数据
 */

/**
 * 供应商UI类
 */
class SupplierUI {

  constructor() {
    // 确保服务层已加载
    if (!window.supplierServices) {
      throw new Error('SupplierUI 依赖 SupplierServices，请确保加载顺序正确');
    }
  }

  /**
   * 渲染供应商行
   * @param {Object} supplier - 供应商数据
   * @param {boolean} isExpanded - 是否展开状态
   * @param {Object} supplierManager - 供应商管理器实例(用于回调)
   * @return {string} HTML字符串
   */
  renderSupplierRow(supplier, isExpanded, supplierManager) {
    // MSDS
    const msds = supplier.commonDocuments['environmental_msds'];
    const msdsHtml = msds ? `
      <div class="doc-cell">
        <div class="doc-date">${msds.isPermanent ? '永久有效' : window.supplierServices.formatDate(msds.expiryDate)}</div>
        <div class="doc-status ${msds.status}">${window.supplierServices.getStatusIcon(msds.status)} ${msds.isPermanent ? '' : msds.daysUntilExpiry !== null ? msds.daysUntilExpiry + '天' : ''}</div>
      </div>
    ` : '<div class="doc-cell missing">❌ 缺失</div>';

    // 质量协议
    const qa = supplier.commonDocuments['quality_agreement'];
    const qaHtml = qa ? `
      <div class="doc-cell">
        <div class="doc-date">${qa.isPermanent ? '永久有效' : window.supplierServices.formatDate(qa.expiryDate)}</div>
        <div class="doc-status ${qa.status}">${window.supplierServices.getStatusIcon(qa.status)} ${qa.isPermanent ? '' : qa.daysUntilExpiry !== null ? qa.daysUntilExpiry + '天' : ''}</div>
      </div>
    ` : '<div class="doc-cell missing">❌ 缺失</div>';

    // ROHS/REACH/HF
    const rohsHtml = this.renderMaterialDocStat(supplier.materialDocuments.rohs);
    const reachHtml = this.renderMaterialDocStat(supplier.materialDocuments.reach);
    const hfHtml = this.renderMaterialDocStat(supplier.materialDocuments.hf);

    return `
      <tr class="supplier-row ${isExpanded ? 'expanded' : ''}">
        <td class="supplier-name">${supplier.supplierName}</td>
        <td>${msdsHtml}</td>
        <td>${qaHtml}</td>
        <td>${rohsHtml}</td>
        <td>${reachHtml}</td>
        <td>${hfHtml}</td>
        <td class="material-count">${supplier.materialCount}个</td>
        <td>
          <button class="toggle-details-btn" data-supplier-id="${supplier.supplierId}">
            ${isExpanded ? '📁 收起' : '📂 展开'}
          </button>
        </td>
      </tr>
    `;
  }

  /**
   * 渲染文档单元格
   * @param {Object} stats - 文档统计
   * @return {string} HTML字符串
   */
  renderDocumentCell(stats) {
    if (stats.count === 0) {
      return '<div class="doc-cell missing">❌ 0份</div>';
    }

    return `
      <div class="doc-cell ${stats.worstStatus}">
        ${window.supplierServices.getStatusIcon(stats.worstStatus)} ${stats.count}份
      </div>
    `;
  }

  /**
   * 渲染物料文档统计
   * @param {Object} stat - 物料文档统计
   * @return {string} HTML字符串
   */
  renderMaterialDocStat(stat) {
    if (stat.count === 0) {
      return '<div class="doc-cell missing">❌ 0份</div>';
    }

    return `
      <div class="doc-cell ${stat.worstStatus}">
        ${window.supplierServices.getStatusIcon(stat.worstStatus)} ${stat.count}份
      </div>
    `;
  }

  /**
   * 计算文档统计
   * @param {Array} documents - 文档列表
   * @return {Object} 统计结果
   */
  calculateDocumentStats(documents) {
    if (!documents || documents.length === 0) {
      return { count: 0, worstStatus: 'missing' };
    }

    const commonDocs = documents.filter(doc => !doc.materialId);
    const count = commonDocs.length;

    if (count === 0) {
      return { count: 0, worstStatus: 'missing' };
    }

    const statusPriority = {
      'critical': 4, 'urgent': 3, 'warning': 2, 'normal': 1, 'expired': 5
    };

    let worstStatus = 'normal';
    let maxPriority = 0;

    commonDocs.forEach(doc => {
      const priority = statusPriority[doc.status] || 0;
      if (priority > maxPriority) {
        maxPriority = priority;
        worstStatus = doc.status;
      }
    });

    return { count, worstStatus };
  }

  /**
   * 计算物料文档统计
   * @param {Array} documents - 文档列表
   * @return {Object} 统计结果
   */
  calculateMaterialDocumentStats(documents) {
    if (!documents || documents.length === 0) {
      return { count: 0, worstStatus: 'missing' };
    }

    const materialDocs = documents.filter(doc => doc.materialId);
    const count = materialDocs.length;

    if (count === 0) {
      return { count: 0, worstStatus: 'missing' };
    }

    const statusPriority = {
      'critical': 4, 'urgent': 3, 'warning': 2, 'normal': 1, 'expired': 5
    };

    let worstStatus = 'normal';
    let maxPriority = 0;

    materialDocs.forEach(doc => {
      const priority = statusPriority[doc.status] || 0;
      if (priority > maxPriority) {
        maxPriority = priority;
        worstStatus = doc.status;
      }
    });

    return { count, worstStatus };
  }

  /**
   * 渲染物料文档统计
   * @param {Object} stat - 物料文档统计
   * @return {string} HTML字符串
   */
  renderMaterialDocStat(stat) {
    if (stat.count === 0) {
      return '<div class="doc-cell missing">❌ 0份</div>';
    }

    return `
      <div class="doc-cell ${stat.worstStatus}">
        ${window.supplierServices.getStatusIcon(stat.worstStatus)} ${stat.count}份
      </div>
    `;
  }

}

// 创建全局UI实例
window.supplierUI = new SupplierUI();

console.log('✅ SupplierUI UI层已加载 (Phase 2.2 - renderSupplierRow, renderMaterialDocStat)');