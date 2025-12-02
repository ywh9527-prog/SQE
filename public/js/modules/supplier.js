/**
 * 供应商资料管理模块 v3.1
 * 表格预览 + 展开详情视图
 * 
 * 核心功能:
 * 1. 表格预览 - 显示供应商资料汇总
 * 2. 展开详情 - 显示通用资料和物料资料
 * 3. 构成信息作为资料备注
 */

class SupplierDocumentManager {
  constructor() {
    // 数据存储
    this.suppliers = [];  // 供应商汇总数据
    this.expandedSuppliers = new Set();  // 展开的供应商ID
    this.detailsCache = {};  // 详情数据缓存

    // 筛选状态
    this.currentSupplier = null;
    this.searchKeyword = '';

    this.init();
  }

  /**
   * 初始化模块
   */
  async init() {
    console.log('🚀 初始化供应商资料管理模块 v3.1...');

    try {
      // 加载供应商汇总数据
      await this.loadSummary();

      // 绑定事件
      this.bindEvents();

      // 渲染界面
      this.render();

      // 设置全局实例
      window.supplierManager = this;

      console.log('✅ 供应商资料管理模块初始化完成');
    } catch (error) {
      console.error('❌ 初始化失败:', error);
      this.showError('模块初始化失败，请刷新页面重试');
    }
  }

  /**
   * 加载供应商汇总数据
   */
  async loadSummary() {
    try {
      console.log('📊 开始加载供应商汇总数据...');

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/suppliers/summary', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        this.suppliers = data.data || [];
        console.log(`✅ 加载了 ${this.suppliers.length} 个供应商的汇总数据`);
      } else {
        throw new Error(data.error || '加载失败');
      }
    } catch (error) {
      console.error('❌ 加载汇总数据失败:', error);
      this.showError('加载数据失败，请刷新页面重试');
      this.suppliers = [];
    }
  }

  /**
   * 加载单个供应商的详细资料
   */
  async loadDetails(supplierId) {
    // 检查缓存
    if (this.detailsCache[supplierId]) {
      return this.detailsCache[supplierId];
    }

    try {
      console.log(`📋 加载供应商 ${supplierId} 的详细资料...`);

      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/suppliers/${supplierId}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (data.success) {
        this.detailsCache[supplierId] = data.data;
        return data.data;
      } else {
        throw new Error(data.error || '加载失败');
      }
    } catch (error) {
      console.error(`❌ 加载供应商 ${supplierId} 详细资料失败:`, error);
      return null;
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    console.log('🔗 绑定事件监听器...');

    // 刷新按钮
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refresh();
      });
    }

    // 事件委托: 处理表格内的点击事件
    const container = document.getElementById('documentsContainer');
    if (container) {
      container.addEventListener('click', async (e) => {
        // 展开/收起按钮
        const toggleBtn = e.target.closest('.toggle-details-btn');
        if (toggleBtn) {
          const supplierId = parseInt(toggleBtn.dataset.supplierId);
          await this.toggleDetails(supplierId);
          return;
        }
      });
    }
  }

  /**
   * 展开/收起供应商详情
   */
  async toggleDetails(supplierId) {
    if (this.expandedSuppliers.has(supplierId)) {
      // 收起
      this.expandedSuppliers.delete(supplierId);
      this.render();
    } else {
      // 展开
      const details = await this.loadDetails(supplierId);
      if (details) {
        this.expandedSuppliers.add(supplierId);
        this.render();
      }
    }
  }

  /**
   * 刷新数据
   */
  async refresh() {
    console.log('🔄 刷新数据...');
    this.detailsCache = {};  // 清空缓存
    await this.loadSummary();
    this.render();
    this.showSuccess('数据已刷新');
  }

  /**
   * 渲染界面
   */
  render() {
    const container = document.getElementById('documentsContainer');
    if (!container) {
      console.error('❌ 找不到容器元素 #documentsContainer');
      return;
    }

    // 筛选数据
    const filteredSuppliers = this.suppliers.filter(supplier => {
      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase();
        return supplier.supplierName.toLowerCase().includes(keyword);
      }
      return true;
    });

    // 渲染表格
    let html = `
      <div class="supplier-table-container">
        <table class="supplier-table">
          <thead>
            <tr>
              <th>供应商</th>
              <th>MSDS</th>
              <th>质量协议</th>
              <th>ROHS</th>
              <th>REACH</th>
              <th>HF</th>
              <th>物料</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredSuppliers.forEach(supplier => {
      html += this.renderSupplierRow(supplier);

      // 如果展开，渲染详情
      if (this.expandedSuppliers.has(supplier.supplierId)) {
        html += this.renderSupplierDetails(supplier.supplierId);
      }
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  }

  /**
   * 渲染供应商行
   */
  renderSupplierRow(supplier) {
    const isExpanded = this.expandedSuppliers.has(supplier.supplierId);

    // MSDS
    const msds = supplier.commonDocuments['environmental_msds'];
    const msdsHtml = msds ? `
      <div class="doc-cell">
        <div class="doc-date">${msds.expiryDate || '永久'}</div>
        <div class="doc-status ${msds.status}">${this.getStatusIcon(msds.status)} ${msds.daysUntilExpiry !== null ? msds.daysUntilExpiry + '天' : ''}</div>
      </div>
    ` : '<div class="doc-cell missing">❌ 缺失</div>';

    // 质量协议
    const qa = supplier.commonDocuments['quality_agreement'];
    const qaHtml = qa ? `
      <div class="doc-cell">
        <div class="doc-date">${qa.expiryDate || '永久'}</div>
        <div class="doc-status ${qa.status}">${this.getStatusIcon(qa.status)} ${qa.daysUntilExpiry !== null ? qa.daysUntilExpiry + '天' : ''}</div>
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
   * 渲染物料资料统计
   */
  renderMaterialDocStat(stat) {
    if (stat.count === 0) {
      return '<div class="doc-cell missing">❌ 0份</div>';
    }

    return `
      <div class="doc-cell ${stat.worstStatus}">
        ${this.getStatusIcon(stat.worstStatus)} ${stat.count}份
      </div>
    `;
  }

  /**
   * 渲染供应商详情
   */
  renderSupplierDetails(supplierId) {
    const details = this.detailsCache[supplierId];
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
    if (details.commonDocuments && details.commonDocuments.length > 0) {
      html += `
        <div class="details-section">
          <h4>📋 通用资料</h4>
          <ul class="document-list">
      `;

      details.commonDocuments.forEach(doc => {
        html += `
          <li class="document-item ${doc.status}">
            <span class="doc-icon">${this.getStatusIcon(doc.status)}</span>
            <span class="doc-type">${this.getDocumentTypeText(doc.documentType)}</span>
            <span class="doc-name">${doc.documentName}</span>
            <span class="doc-expiry">
              ${doc.isPermanent ? '永久有效' : `到期: ${doc.expiryDate}`}
            </span>
            ${doc.daysUntilExpiry !== null && !doc.isPermanent ? `
              <span class="doc-days">(${doc.daysUntilExpiry}天)</span>
            ` : ''}
          </li>
        `;
      });

      html += `
          </ul>
        </div>
      `;
    }

    // 物料资料
    if (details.materials && details.materials.length > 0) {
      details.materials.forEach(material => {
        html += `
          <div class="details-section">
            <h4>🏭 物料: ${material.materialName}</h4>
            <ul class="document-list">
        `;

        if (material.documents && material.documents.length > 0) {
          material.documents.forEach(doc => {
            html += `
              <li class="document-item ${doc.status}">
                <span class="doc-icon">${this.getStatusIcon(doc.status)}</span>
                <span class="doc-type">${this.getDocumentTypeText(doc.documentType)} (${doc.componentName})</span>
                <span class="doc-name">${doc.documentName}</span>
                <span class="doc-expiry">
                  ${doc.isPermanent ? '永久有效' : `到期: ${doc.expiryDate}`}
                </span>
                ${doc.daysUntilExpiry !== null && !doc.isPermanent ? `
                  <span class="doc-days">(${doc.daysUntilExpiry}天)</span>
                ` : ''}
              </li>
            `;
          });
        } else {
          html += '<li class="no-documents">暂无资料</li>';
        }

        html += `
            </ul>
          </div>
        `;
      });
    }

    html += `
          </div>
        </td>
      </tr>
    `;

    return html;
  }

  /**
   * 工具函数: 获取状态图标
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
   * 工具函数: 获取资料类型文本
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
   * 显示成功消息
   */
  showSuccess(message) {
    console.log('✅', message);
    // TODO: 实现Toast提示
  }

  /**
   * 显示错误消息
   */
  showError(message) {
    console.error('❌', message);
    // TODO: 实现Toast提示
    alert(message);
  }
}

// 初始化模块
if (typeof window !== 'undefined') {
  window.SupplierDocumentManager = SupplierDocumentManager;

  // 自动初始化 (如果在documents模块页面)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById('module-documents')) {
        new SupplierDocumentManager();
      }
    });
  } else {
    if (document.getElementById('module-documents')) {
      new SupplierDocumentManager();
    }
  }
}