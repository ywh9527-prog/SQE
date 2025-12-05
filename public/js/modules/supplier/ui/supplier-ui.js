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

  /**
   * 渲染供应商详情
   * @param {string} supplierId - 供应商ID
   * @param {Object} detailsCache - 详情数据缓存
   * @param {Object} supplierManager - 供应商管理器实例
   * @return {string} HTML字符串
   */
  renderSupplierDetails(supplierId, detailsCache, supplierManager) {
    const details = detailsCache[supplierId];
    if (!details) {
      return `
        <tr class="details-row">
          <td colspan="8">
            <div class="details-loading">加载中...</div>
          </td>
        </tr>
      `;
    }

    let html = `
      <tr class="details-row">
        <td colspan="8">
          <div class="details-container">
    `;

    // 通用资料
    html += this.renderCommonSection(supplierId, details);

    // 物料资料
    if (details.materials && details.materials.length > 0) {
      details.materials.forEach(material => {
        html += this.renderMaterialSection(supplierId, material);
      });
    }

    // 新增物料按钮
    html += `
      <div class="details-section">
        <button class="add-material-btn" data-supplier-id="${supplierId}" title="新增物料">
          ➕ 新增物料
        </button>
      </div>
    `;

    html += `
          </div>
        </td>
      </tr>
    `;

    return html;
  }

  /**
   * 渲染通用资料部分
   * @param {string} supplierId - 供应商ID
   * @param {Object} details - 详情数据
   * @return {string} HTML字符串
   */
  renderCommonSection(supplierId, details) {
    let html = `
      <div class="details-section">
        <div class="section-header">
          <h4>📋 通用资料</h4>
          <div class="section-actions">
            <button class="email-btn batch-email-btn" data-type="common" data-supplier-id="${supplierId}" title="批量邮件通知">
              📧 批量邮件
            </button>
            <button class="upload-btn" data-type="common" data-supplier-id="${supplierId}" title="上传通用资料">
              📤 上传
            </button>
          </div>
        </div>
    `;

    if (details.commonDocuments && details.commonDocuments.length > 0) {
      html += '<ul class="document-list">';

      details.commonDocuments.forEach(doc => {
        html += this.renderDocumentItem(doc, supplierId, false);
      });

      html += '</ul>';
    } else {
      html += `
        <div class="no-documents-hint">
          <span class="hint-icon">📭</span>
          <span class="hint-text">暂无通用资料，点击上方"上传"按钮添加</span>
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  /**
   * 渲染物料资料部分
   * @param {string} supplierId - 供应商ID
   * @param {Object} material - 物料数据
   * @return {string} HTML字符串
   */
  renderMaterialSection(supplierId, material) {
    let html = `
      <div class="details-section">
        <div class="section-header">
          <h4>🏭 物料: ${material.materialName}</h4>
          <div class="section-actions">
            <button class="email-btn batch-email-btn" data-type="material" data-supplier-id="${supplierId}" data-material-id="${material.materialId}" data-material-name="${material.materialName}" title="批量邮件通知">
              📧 批量邮件
            </button>
            <button class="upload-btn" data-type="material" data-supplier-id="${supplierId}" data-material-id="${material.materialId}" title="上传物料资料">
              📤 上传资料
            </button>
            <button class="action-btn delete-material-btn" data-supplier-id="${supplierId}" data-material-id="${material.materialId}" data-material-name="${material.materialName}" title="删除物料">
              🗑️ 删除物料
            </button>
          </div>
        </div>
        <ul class="document-list">
    `;

    if (material.documents && material.documents.length > 0) {
      material.documents.forEach(doc => {
        html += this.renderDocumentItem(doc, supplierId, true, material.materialId);
      });
    } else {
      html += '<li class="no-documents">暂无资料</li>';
    }

    html += `
        </ul>
      </div>
    `;

    return html;
  }

  /**
   * 渲染文档项
   * @param {Object} doc - 文档数据
   * @param {string} supplierId - 供应商ID
   * @param {boolean} isMaterial - 是否为物料文档
   * @param {string} materialId - 物料ID (可选)
   * @return {string} HTML字符串
   */
  renderDocumentItem(doc, supplierId, isMaterial = false, materialId = null) {
    const docId = isMaterial ? doc.documentId : doc.id;
    const docTypeText = window.supplierServices.getDocumentTypeText(doc.documentType);
    const typeText = isMaterial ? `${docTypeText} (${doc.componentName})` : docTypeText;

    return `
      <li class="document-item ${doc.status}">
        <span class="doc-icon">${window.supplierServices.getStatusIcon(doc.status)}</span>
        <span class="doc-type">${typeText}</span>
        <span class="doc-name">${doc.documentName}</span>
        <span class="doc-expiry">
          ${doc.isPermanent ? '永久有效' : `到期: ${window.supplierServices.formatDate(doc.expiryDate)}`}
        </span>
        ${doc.daysUntilExpiry !== null && !doc.isPermanent ? `
          <span class="doc-days">(${doc.daysUntilExpiry}天)</span>
        ` : ''}
        <div class="doc-actions">
          <button class="action-btn email-btn single-email-btn" data-document-id="${docId}" data-supplier-id="${supplierId}" title="发送邮件">
            📧
          </button>
          <button class="action-btn edit-btn" data-document-id="${docId}" title="编辑">✏️</button>
          <button class="action-btn delete-btn" data-document-id="${docId}" title="删除">🗑️</button>
          ${doc.filePath ? `
            <button class="action-btn folder-btn" data-file-path="${doc.filePath}" title="打开文件夹">
              📁
            </button>
          ` : '<!-- 无文件路径 -->'}
        </div>
      </li>
    `;
  }

}

// 创建全局UI实例
window.supplierUI = new SupplierUI();

console.log('✅ SupplierUI UI层已加载 (Phase 2.2 - renderSupplierRow, renderMaterialDocStat, renderSupplierDetails)');