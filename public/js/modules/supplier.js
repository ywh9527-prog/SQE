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
    this.statusFilter = null;
    this.documentFilter = null;

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
      console.log('✅ 全局实例已设置:', window.supplierManager);

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
      
      console.log('📊 API响应状态:', response.status);
      const data = await response.json();
      console.log('📊 API响应数据:', data);

      if (data.success) {
        this.suppliers = data.data || [];
        console.log(`✅ 加载了 ${this.suppliers.length} 个供应商的汇总数据`);
        console.log('📊 供应商数据详情:', this.suppliers);
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
        console.log('🖱️ 点击事件触发:', e.target);
        
        // 展开/收起按钮
        const toggleBtn = e.target.closest('.toggle-details-btn');
        if (toggleBtn) {
          console.log('📂 点击展开/收起按钮');
          const supplierId = parseInt(toggleBtn.dataset.supplierId);
          await this.toggleDetails(supplierId);
          return;
        }

        // 上传按钮
        const uploadBtn = e.target.closest('.upload-btn');
        if (uploadBtn) {
          console.log('📤 点击上传按钮', uploadBtn.dataset);
          e.preventDefault();
          const type = uploadBtn.dataset.type || 'common';
          const supplierId = parseInt(uploadBtn.dataset.supplierId);
          const materialId = uploadBtn.dataset.materialId ? parseInt(uploadBtn.dataset.materialId) : null;
          console.log('📤 调用上传模态框:', { type, supplierId, materialId });
          this.showUploadModal(type, supplierId, materialId);
          return;
        }

        // 新增物料按钮
        const addMaterialBtn = e.target.closest('.add-material-btn');
        if (addMaterialBtn) {
          console.log('➕ 点击新增物料按钮', addMaterialBtn.dataset);
          e.preventDefault();
          const supplierId = parseInt(addMaterialBtn.dataset.supplierId);
          console.log('➕ 调用新增物料模态框:', supplierId);
          this.showAddMaterialModal(supplierId);
          return;
        }

        // 编辑按钮
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
          console.log('✏️ 点击编辑按钮', editBtn.dataset);
          e.preventDefault();
          const documentId = parseInt(editBtn.dataset.documentId);
          console.log('✏️ 调用编辑模态框:', documentId);
          this.showEditModal(documentId);
          return;
        }

        // 删除按钮
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
          console.log('🗑️ 点击删除按钮', deleteBtn.dataset);
          e.preventDefault();
          const documentId = parseInt(deleteBtn.dataset.documentId);
          console.log('🗑️ 调用删除功能:', documentId);
          this.deleteDocument(documentId);
          return;
        }

        // 删除物料按钮
        const deleteMaterialBtn = e.target.closest('.delete-material-btn');
        if (deleteMaterialBtn) {
          console.log('🗑️ 点击删除物料按钮', deleteMaterialBtn.dataset);
          e.preventDefault();
          const supplierId = parseInt(deleteMaterialBtn.dataset.supplierId);
          const materialId = parseInt(deleteMaterialBtn.dataset.materialId);
          const materialName = deleteMaterialBtn.dataset.materialName || '未知物料';
          console.log('🗑️ 调用删除物料功能:', { supplierId, materialId, materialName });
          this.deleteMaterial(supplierId, materialId, materialName);
          return;
        }
      });
    } else {
      console.error('❌ 找不到容器元素 #documentsContainer');
    }

    // 模态框按钮事件
    document.addEventListener('click', async (e) => {
      // 上传模态框关闭按钮
      if (e.target.closest('.upload-modal-close')) {
        this.hideUploadModal();
        return;
      }

      // 上传模态框取消按钮
      if (e.target.closest('.upload-cancel-btn')) {
        this.hideUploadModal();
        return;
      }

      // 上传模态框提交按钮
      if (e.target.closest('.upload-submit-btn')) {
        await this.submitUpload();
        return;
      }

      // 编辑模态框关闭按钮
      if (e.target.closest('.edit-modal-close')) {
        this.hideEditModal();
        return;
      }

      // 编辑模态框取消按钮
      if (e.target.closest('.edit-cancel-btn')) {
        this.hideEditModal();
        return;
      }

      // 编辑模态框提交按钮
      if (e.target.closest('.edit-submit-btn')) {
        await this.submitEdit();
        return;
      }

      // 新增物料模态框关闭按钮
      if (e.target.closest('.add-material-modal-close')) {
        this.hideAddMaterialModal();
        return;
      }

      // 新增物料模态框取消按钮
      if (e.target.closest('.add-material-cancel-btn')) {
        this.hideAddMaterialModal();
        return;
      }

      // 新增物料模态框提交按钮
      if (e.target.closest('.add-material-submit-btn')) {
        await this.submitAddMaterial();
        return;
      }
    });
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
  async refresh(showMessage = true, supplierId = null) {
    console.log('🔄 刷新数据...', { supplierId });
    
    // 记录当前展开的供应商
    const expandedSuppliers = new Set(this.expandedSuppliers);
    
    // 如果指定了supplierId，只刷新该供应商的详情
    if (supplierId) {
      delete this.detailsCache[supplierId];
      console.log('🔄 清空供应商详情缓存:', supplierId);
    } else {
      // 否则清空所有缓存
      this.detailsCache = {};
      console.log('🔄 清空所有详情缓存');
    }
    
    await this.loadSummary();
    
    // 如果有展开的供应商，重新加载它们的详情
    if (expandedSuppliers.size > 0) {
      console.log('🔄 重新加载展开的供应商详情:', Array.from(expandedSuppliers));
      for (const sid of expandedSuppliers) {
        await this.loadDetails(sid);
      }
    }
    
    this.render();
    
    if (showMessage) {
      this.showSuccess('数据已刷新');
    }
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
    console.log('🎨 开始渲染，当前供应商数量:', this.suppliers.length);
    const filteredSuppliers = this.filterSuppliers();
    console.log('🎨 筛选后供应商数量:', filteredSuppliers.length);

    // 渲染搜索和筛选控件
    let html = `
      <div class="supplier-controls">
        <div class="search-section">
          <input type="text" id="supplierSearch" placeholder="搜索供应商名称..." 
                 value="${this.searchKeyword}" class="search-input">
          <button onclick="supplierManager.clearSearch()" class="clear-search-btn" 
                  ${this.searchKeyword ? '' : 'style="display:none;"'}>✕</button>
        </div>
        <div class="filter-section">
          <select id="statusFilter" onchange="supplierManager.filterByStatus()" class="filter-select">
            <option value="">全部状态</option>
            <option value="normal">🟢 正常</option>
            <option value="warning">🟡 即将到期</option>
            <option value="urgent">🔴 紧急</option>
            <option value="expired">❌ 已过期</option>
          </select>
          <select id="documentFilter" onchange="supplierManager.filterByDocument()" class="filter-select">
            <option value="">全部资料</option>
            <option value="missing_msds">缺失MSDS</option>
            <option value="missing_qa">缺失质量协议</option>
            <option value="missing_rohs">缺失ROHS</option>
            <option value="missing_reach">缺失REACH</option>
            <option value="missing_hf">缺失HF</option>
          </select>
        </div>
      </div>
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

    if (filteredSuppliers.length === 0) {
      html += `
        <tr>
          <td colspan="8" class="no-data">
            <div class="no-data-content">
              <div class="no-data-icon">📭</div>
              <p>没有找到匹配的供应商</p>
              <button onclick="supplierManager.clearAllFilters()" class="btn btn-secondary">清除所有筛选</button>
            </div>
          </td>
        </tr>
      `;
    } else {
      filteredSuppliers.forEach(supplier => {
        html += this.renderSupplierRow(supplier);

        // 如果展开，渲染详情
        if (this.expandedSuppliers.has(supplier.supplierId)) {
          html += this.renderSupplierDetails(supplier.supplierId);
        }
      });
    }

    html += `
          </tbody>
        </table>
      </div>
      <div class="supplier-summary">
        共找到 <span class="highlight">${filteredSuppliers.length}</span> 个供应商 
        ${this.searchKeyword ? `（搜索："${this.searchKeyword}"）` : ''}
        ${this.statusFilter ? `（状态：${this.getStatusFilterText(this.statusFilter)}）` : ''}
        ${this.documentFilter ? `（资料：${this.getDocumentFilterText(this.documentFilter)}）` : ''}
      </div>
    `;

    container.innerHTML = html;

    // 绑定搜索事件
    this.bindSearchEvents();
  }

  /**
   * 筛选供应商数据
   */
  filterSuppliers() {
    return this.suppliers.filter(supplier => {
      // 搜索关键词筛选
      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase();
        if (!supplier.supplierName.toLowerCase().includes(keyword)) {
          return false;
        }
      }

      // 状态筛选
      if (this.statusFilter) {
        const hasStatus = this.checkSupplierStatus(supplier, this.statusFilter);
        if (!hasStatus) {
          return false;
        }
      }

      // 资料筛选
      if (this.documentFilter) {
        const hasDocumentIssue = this.checkDocumentIssue(supplier, this.documentFilter);
        if (!hasDocumentIssue) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 检查供应商状态
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
   * 检查资料问题
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
   * 绑定搜索事件
   */
  bindSearchEvents() {
    const searchInput = document.getElementById('supplierSearch');
    if (searchInput) {
      // 防抖搜索
      let searchTimeout;
      searchInput.oninput = (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.searchKeyword = e.target.value.trim();
          this.render();
          
          // 显示/隐藏清除按钮
          const clearBtn = document.querySelector('.clear-search-btn');
          if (clearBtn) {
            clearBtn.style.display = this.searchKeyword ? 'block' : 'none';
          }
        }, 300);
      };

      // 回车搜索
      searchInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          clearTimeout(searchTimeout);
          this.searchKeyword = e.target.value.trim();
          this.render();
        }
      };
    }

    // 清除搜索按钮
    const clearBtn = document.querySelector('.clear-search-btn');
    if (clearBtn) {
      clearBtn.onclick = () => {
        this.clearSearch();
      };
    }

    // 状态筛选
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.value = this.statusFilter || '';
    }

    // 资料筛选
    const documentFilter = document.getElementById('documentFilter');
    if (documentFilter) {
      documentFilter.value = this.documentFilter || '';
    }
  }

  /**
   * 清除搜索
   */
  clearSearch() {
    this.searchKeyword = '';
    this.render();
  }

  /**
   * 按状态筛选
   */
  filterByStatus() {
    const select = document.getElementById('statusFilter');
    this.statusFilter = select.value || null;
    this.render();
  }

  /**
   * 按资料筛选
   */
  filterByDocument() {
    const select = document.getElementById('documentFilter');
    this.documentFilter = select.value || null;
    this.render();
  }

  /**
   * 清除所有筛选
   */
  clearAllFilters() {
    this.searchKeyword = '';
    this.statusFilter = null;
    this.documentFilter = null;
    this.render();
  }

  /**
   * 获取状态筛选文本
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

  /**
   * 获取资料筛选文本
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
    html += `
      <div class="details-section">
        <div class="section-header">
          <h4>📋 通用资料</h4>
          <button class="upload-btn" data-type="common" data-supplier-id="${supplierId}" title="上传通用资料">
            📤 上传
          </button>
        </div>
    `;

    if (details.commonDocuments && details.commonDocuments.length > 0) {
      html += `
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
            <div class="doc-actions">
              <button class="action-btn edit-btn" data-document-id="${doc.id}" title="编辑">✏️</button>
              <button class="action-btn delete-btn" data-document-id="${doc.id}" title="删除">🗑️</button>
            </div>
          </li>
        `;
      });

      html += `
        </ul>
      `;
    } else {
      // 没有通用资料时显示提示
      html += `
        <div class="no-documents-hint">
          <span class="hint-icon">📭</span>
          <span class="hint-text">暂无通用资料，点击上方"上传"按钮添加</span>
        </div>
      `;
    }

    html += `
      </div>
    `;

    // 物料资料
    if (details.materials && details.materials.length > 0) {
      details.materials.forEach(material => {
        html += `
          <div class="details-section">
            <div class="section-header">
              <h4>🏭 物料: ${material.materialName}</h4>
              <div class="section-actions">
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
                <div class="doc-actions">
                  <button class="action-btn edit-btn" data-document-id="${doc.id}" title="编辑">✏️</button>
                  <button class="action-btn delete-btn" data-document-id="${doc.id}" title="删除">🗑️</button>
                </div>
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
    
    // 创建或更新成功提示
    let toast = document.getElementById('successToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'successToast';
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
      `;
      document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
    
    // 3秒后自动隐藏
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
    }, 3000);
  }

  /**
   * 显示错误消息
   */
  showError(message) {
    console.error('❌', message);
    
    // 创建或更新错误提示
    let toast = document.getElementById('errorToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'errorToast';
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: #ef4444;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        font-size: 14px;
        max-width: 300px;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
      `;
      document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
    
    // 5秒后自动隐藏
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
    }, 5000);
  }

  /**
   * 显示上传模态框
   */
  showUploadModal(type, supplierId, materialId = null) {
    console.log('📤 显示上传模态框:', { type, supplierId, materialId });
    
    const modal = document.getElementById('uploadModal');
    if (!modal) {
      console.error('❌ 找不到uploadModal元素');
      this.showError('模态框加载失败');
      return;
    }
    
    const title = document.getElementById('uploadModalTitle');
    const materialGroup = document.getElementById('materialGroup');
    const componentGroup = document.getElementById('componentGroup');
    
    // 获取供应商信息
    const supplier = this.suppliers.find(s => s.supplierId === supplierId);
    if (!supplier) {
      this.showError('供应商信息不存在');
      return;
    }

    // 设置基本信息
    const supplierNameInput = document.getElementById('uploadSupplierName');
    if (supplierNameInput) {
      supplierNameInput.value = supplier.supplierName;
    }
    
    if (type === 'common') {
      if (title) title.textContent = '上传通用资料';
      if (materialGroup) materialGroup.style.display = 'none';
      if (componentGroup) componentGroup.style.display = 'none';
    } else if (type === 'material') {
      if (title) title.textContent = '上传物料资料';
      if (materialGroup) materialGroup.style.display = 'block';
      if (componentGroup) componentGroup.style.display = 'block';
      
      // 获取物料信息
      const details = this.detailsCache[supplierId];
      if (details && details.materials) {
        const material = details.materials.find(m => m.materialId === materialId);
        if (material) {
          const materialNameInput = document.getElementById('uploadMaterialName');
          if (materialNameInput) {
            materialNameInput.value = material.materialName;
          }
        }
      }
    }

    // 存储上传上下文
    this.uploadContext = { type, supplierId, materialId };
    
    // 重置表单
    this.resetUploadForm();
    
    // 显示模态框 - 使用!important覆盖内联样式
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '9999', 'important');
    modal.style.setProperty('position', 'fixed', 'important');
    modal.style.setProperty('top', '0', 'important');
    modal.style.setProperty('left', '0', 'important');
    modal.style.setProperty('width', '100%', 'important');
    modal.style.setProperty('height', '100%', 'important');
    modal.style.setProperty('background-color', 'rgba(0, 0, 0, 0.5)', 'important');
    modal.style.setProperty('align-items', 'center', 'important');
    modal.style.setProperty('justify-content', 'center', 'important');
    console.log('✅ 上传模态框已显示（使用!important）');
    console.log('🔍 模态框样式检查:', {
      display: modal.style.display,
      zIndex: modal.style.zIndex,
      position: modal.style.position,
      visible: modal.offsetParent !== null,
      width: modal.offsetWidth,
      height: modal.offsetHeight
    });
    
    // 绑定文件上传事件
    this.bindFileUploadEvents();
    
    // 检查页面是否有其他遮挡元素
    console.log('🔍 检查页面遮挡元素:');
    const allModals = document.querySelectorAll('.modal');
    console.log('- 所有模态框:', allModals.length, allModals);
    
    const highZElements = [];
    document.querySelectorAll('*').forEach(el => {
      const zIndex = window.getComputedStyle(el).zIndex;
      if (zIndex && zIndex !== 'auto' && parseInt(zIndex) > 1000) {
        highZElements.push({
          element: el.tagName + (el.className ? '.' + el.className : ''),
          zIndex: zIndex,
          display: window.getComputedStyle(el).display
        });
      }
    });
    console.log('- 高层级元素:', highZElements);
  }

  /**
   * 隐藏上传模态框
   */
  hideUploadModal() {
    const modal = document.getElementById('uploadModal');
    modal.style.setProperty('display', 'none', 'important');
    this.uploadContext = null;
    this.selectedFile = null;
  }

  /**
   * 重置上传表单
   */
  resetUploadForm() {
    document.getElementById('documentType').value = '';
    document.getElementById('componentName').value = '';
    document.getElementById('expiryDate').value = '';
    document.getElementById('isPermanent').checked = false;
    document.getElementById('documentRemark').value = '';
    document.getElementById('expiryDate').disabled = false;
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('fileInput').value = '';
    this.selectedFile = null;
  }

  /**
   * 绑定文件上传事件
   */
  bindFileUploadEvents() {
    const dropZone = document.getElementById('uploadDropZone');
    const fileInput = document.getElementById('fileInput');

    // 点击上传区域
    dropZone.onclick = () => {
      fileInput.click();
    };

    // 文件选择
    fileInput.onchange = (e) => {
      if (e.target.files.length > 0) {
        this.handleFileUpload(e.target.files);
      }
    };

    // 拖拽事件
    dropZone.ondragover = (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    };

    dropZone.ondragleave = (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
    };

    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      
      if (e.dataTransfer.files.length > 0) {
        this.handleFileUpload(e.dataTransfer.files);
      }
    };
  }

  /**
   * 处理文件上传
   */
  handleFileUpload(files) {
    if (files.length === 0) return;

    const file = files[0];
    const allowedTypes = ['.pdf', '.xlsx', '.xls', '.doc', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
      this.showError('不支持的文件格式，请上传PDF、Excel或Word文档');
      return;
    }

    // 检查文件大小（10MB限制）
    if (file.size > 10 * 1024 * 1024) {
      this.showError('文件大小不能超过10MB');
      return;
    }

    this.selectedFile = file;
    
    // 显示文件预览
    const filePreview = document.getElementById('filePreview');
    const fileName = filePreview.querySelector('.file-name');
    fileName.textContent = file.name;
    filePreview.style.display = 'flex';
  }

  /**
   * 移除选中的文件
   */
  removeSelectedFile() {
    this.selectedFile = null;
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('fileInput').value = '';
  }

  /**
   * 切换永久有效状态
   */
  togglePermanentDate() {
    const isPermanent = document.getElementById('isPermanent').checked;
    const expiryDate = document.getElementById('expiryDate');
    
    if (isPermanent) {
      expiryDate.disabled = true;
      expiryDate.value = '';
    } else {
      expiryDate.disabled = false;
    }
  }

  /**
   * 提交上传
   */
  async submitUpload() {
    if (!this.selectedFile) {
      this.showError('请选择要上传的文件');
      return;
    }

    const documentType = document.getElementById('documentType').value;
    if (!documentType) {
      this.showError('请选择资料类型');
      return;
    }

    const isPermanent = document.getElementById('isPermanent').checked;
    const expiryDate = document.getElementById('expiryDate').value;

    if (!isPermanent && !expiryDate) {
      this.showError('请设置到期日期或选择永久有效');
      return;
    }

    // 构建表单数据
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('supplierId', this.uploadContext.supplierId);
    formData.append('documentType', documentType);
    formData.append('isPermanent', isPermanent);
    formData.append('remark', document.getElementById('documentRemark').value);

    if (this.uploadContext.type === 'material') {
      formData.append('materialId', this.uploadContext.materialId);
      formData.append('componentName', document.getElementById('componentName').value);
    }

    if (!isPermanent) {
      formData.append('expiryDate', expiryDate);
    }

    try {
      this.showLoading('上传中...');

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess('文件上传成功');
        this.hideUploadModal();
        await this.refresh(false, this.uploadContext?.supplierId); // 只刷新相关供应商
      } else {
        throw new Error(data.error || '上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
      this.showError(error.message || '上传失败，请重试');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * 显示加载状态
   */
  showLoading(message = '加载中...') {
    // TODO: 实现加载提示
    console.log('🔄', message);
  }

  /**
   * 隐藏加载状态
   */
  hideLoading() {
    // TODO: 隐藏加载提示
    console.log('✅ 加载完成');
  }

  /**
   * 显示编辑模态框
   */
  async showEditModal(documentId) {
    console.log('✏️ 显示编辑模态框:', documentId);
    
    try {
      // 先显示模态框
      const modal = document.getElementById('editModal');
      if (!modal) {
        console.error('❌ 找不到editModal元素');
        this.showError('编辑模态框加载失败');
        return;
      }
      
// 显示模态框
      const editModal = document.getElementById('editModal');
      editModal.style.setProperty('display', 'flex', 'important');
      editModal.style.setProperty('background-color', 'rgba(0, 0, 0, 0.5)', 'important');
      editModal.style.setProperty('position', 'fixed', 'important');
      editModal.style.setProperty('top', '0', 'important');
      editModal.style.setProperty('left', '0', 'important');
      editModal.style.setProperty('width', '100%', 'important');
      editModal.style.setProperty('height', '100%', 'important');
      editModal.style.setProperty('z-index', '9999', 'important');
      editModal.style.setProperty('align-items', 'center', 'important');
      editModal.style.setProperty('justify-content', 'center', 'important');
      console.log('✅ 编辑模态框已显示');

      // 获取文档详情
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      console.log('📄 获取文档详情:', data);
      
      if (!data.success) {
        throw new Error(data.error || '获取文档信息失败');
      }

      const doc = data.data;
      
      // 填充表单
      const editName = document.getElementById('editDocumentName');
      const editPermanent = document.getElementById('editIsPermanent');
      const editExpiry = document.getElementById('editExpiryDate');
      const editRemark = document.getElementById('editDocumentRemark');
      
      if (editName) editName.value = doc.documentName || '';
      if (editPermanent) editPermanent.checked = doc.isPermanent || false;
      if (editExpiry) editExpiry.value = doc.expiryDate || '';
      if (editRemark) editRemark.value = doc.remark || '';

      // 设置到期日期状态
      this.toggleEditPermanentDate();

      // 存储编辑上下文
      this.editContext = { documentId };
      
      console.log('✅ 编辑表单填充完成');
    } catch (error) {
      console.error('❌ 获取文档信息失败:', error);
      this.showError(error.message || '获取文档信息失败');
      
      // 隐藏模态框
      const modal = document.getElementById('editModal');
      if (modal) {
        modal.style.display = 'none';
      }
    }
  }

  /**
   * 隐藏编辑模态框
   */
  hideEditModal() {
    document.getElementById('editModal').style.setProperty('display', 'none', 'important');
    this.editContext = null;
  }

  /**
   * 切换编辑模态框的永久有效状态
   */
  toggleEditPermanentDate() {
    const isPermanent = document.getElementById('editIsPermanent').checked;
    const expiryDate = document.getElementById('editExpiryDate');
    
    if (isPermanent) {
      expiryDate.disabled = true;
      expiryDate.value = '';
    } else {
      expiryDate.disabled = false;
    }
  }

  /**
   * 提交编辑
   */
  async submitEdit() {
    const documentName = document.getElementById('editDocumentName').value.trim();
    if (!documentName) {
      this.showError('请输入资料名称');
      return;
    }

    const isPermanent = document.getElementById('editIsPermanent').checked;
    const expiryDate = document.getElementById('editExpiryDate').value;

    if (!isPermanent && !expiryDate) {
      this.showError('请设置到期日期或选择永久有效');
      return;
    }

    try {
      this.showLoading('保存中...');

      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/documents/${this.editContext.documentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentName,
          expiryDate: isPermanent ? null : expiryDate,
          isPermanent,
          remark: document.getElementById('editDocumentRemark').value
        })
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess('资料信息已更新');
        this.hideEditModal();
        await this.refresh(false, this.editContext?.documentId ? null : null); // 编辑操作需要重新加载详情
      } else {
        throw new Error(data.error || '更新失败');
      }
    } catch (error) {
      console.error('更新失败:', error);
      this.showError(error.message || '更新失败，请重试');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * 删除文档
   */
  async deleteDocument(documentId) {
    if (!confirm('确定要删除这份资料吗？此操作不可撤销。')) {
      return;
    }

    try {
      this.showLoading('删除中...');

      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        this.showSuccess('资料已删除');
        // 删除文档后，清空所有缓存确保数据一致性
        await this.refresh(false);
      } else {
        throw new Error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      this.showError(error.message || '删除失败，请重试');
    } finally {
      this.hideLoading();
    }
  }

  /**
   * 显示新增物料模态框
   */
  showAddMaterialModal(supplierId) {
    console.log('➕ 显示新增物料模态框:', supplierId);
    
    const modal = document.getElementById('addMaterialModal');
    if (!modal) {
      console.error('❌ 找不到addMaterialModal元素');
      this.showError('新增物料模态框加载失败');
      return;
    }
    
    this.addMaterialContext = { supplierId };
    
    // 重置表单
    const nameInput = document.getElementById('newMaterialName');
    const codeInput = document.getElementById('newMaterialCode');
    const remarkInput = document.getElementById('newMaterialRemark');
    
    if (nameInput) nameInput.value = '';
    if (codeInput) codeInput.value = '';
    if (remarkInput) remarkInput.value = '';
    
    // 显示模态框
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('background-color', 'rgba(0, 0, 0, 0.5)', 'important');
    modal.style.setProperty('position', 'fixed', 'important');
    modal.style.setProperty('top', '0', 'important');
    modal.style.setProperty('left', '0', 'important');
    modal.style.setProperty('width', '100%', 'important');
    modal.style.setProperty('height', '100%', 'important');
    modal.style.setProperty('z-index', '9999', 'important');
    modal.style.setProperty('align-items', 'center', 'important');
    modal.style.setProperty('justify-content', 'center', 'important');
    console.log('✅ 新增物料模态框已显示');
  }

  /**
   * 隐藏新增物料模态框
   */
  hideAddMaterialModal() {
    document.getElementById('addMaterialModal').style.setProperty('display', 'none', 'important');
    this.addMaterialContext = null;
  }

  /**
   * 提交新增物料
   */
  async submitAddMaterial() {
    const materialName = document.getElementById('newMaterialName').value.trim();
    if (!materialName) {
      this.showError('请输入物料名称');
      return;
    }

    try {
      this.showLoading('添加中...');

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          supplierId: this.addMaterialContext.supplierId,
          materialName,
          materialCode: document.getElementById('newMaterialCode').value.trim(),
          description: document.getElementById('newMaterialRemark').value.trim()
        })
      });

      const data = await response.json();
      console.log('📄 新增物料响应详情:', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok,
        data: data 
      });

      // 检查HTTP状态码和响应数据
      if (response.ok && data.success) {
        console.log('✅ 前端判断：创建成功');
        this.showSuccess('物料添加成功');
        this.hideAddMaterialModal();
        await this.refresh(false, this.addMaterialContext?.supplierId); // 只刷新相关供应商
      } else {
        console.log('❌ 前端判断：创建失败', { 
          responseOk: response.ok, 
          dataSuccess: data.success,
          error: data.error 
        });
        throw new Error(data.error || `添加失败 (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('添加物料失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // 尝试获取更多错误信息
      let errorMessage = error.message || '添加失败，请重试';
      if (error.message.includes('Unexpected token')) {
        errorMessage = '服务器响应格式错误，请检查服务器日志';
      }
      
      this.showError(errorMessage);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * 删除物料
   */
  async deleteMaterial(supplierId, materialId, materialName) {
    if (!confirm(`确定要删除物料"${materialName}"吗？删除后将同时删除该物料下的所有资料，此操作不可撤销。`)) {
      return;
    }

    try {
      this.showLoading('删除中...');

      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ supplierId })
      });

      const data = await response.json();
      console.log('📄 删除物料响应:', data);

      if (data.success) {
        this.showSuccess('物料已删除');
        await this.refresh(false, supplierId); // 只刷新相关供应商
      } else {
        throw new Error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除物料失败:', error);
      this.showError(error.message || '删除失败，请重试');
    } finally {
      this.hideLoading();
    }
  }
}

// 测试函数
window.testSupplierManager = () => {
  console.log('🧪 测试供应商管理模块:');
  console.log('- supplierManager存在:', !!window.supplierManager);
  console.log('- documentsContainer存在:', !!document.getElementById('documentsContainer'));
  console.log('- uploadModal存在:', !!document.getElementById('uploadModal'));
  console.log('- editModal存在:', !!document.getElementById('editModal'));
  console.log('- addMaterialModal存在:', !!document.getElementById('addMaterialModal'));
  
  if (window.supplierManager) {
    console.log('- supplierManager方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.supplierManager)));
  }
};

// 测试API函数
window.testDocumentAPI = async (documentId) => {
  console.log('🧪 测试文档API:', documentId);
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/documents/${documentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📄 API响应状态:', response.status);
    const data = await response.json();
    console.log('📄 API响应数据:', data);
  } catch (error) {
    console.error('❌ API测试失败:', error);
  }
};

// 测试模态框显示
window.testModals = () => {
  console.log('🧪 测试模态框显示:');
  
  const uploadModal = document.getElementById('uploadModal');
  const editModal = document.getElementById('editModal');
  const addMaterialModal = document.getElementById('addMaterialModal');
  
  console.log('- uploadModal:', uploadModal);
  console.log('- editModal:', editModal);
  console.log('- addMaterialModal:', addMaterialModal);
  
  // 测试显示上传模态框
  if (uploadModal) {
    // 强制设置样式
    uploadModal.style.cssText = `
      display: flex !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background-color: rgba(255, 0, 0, 0.8) !important;
      z-index: 99999 !important;
      align-items: center !important;
      justify-content: center !important;
    `;
    
    console.log('✅ 上传模态框强制显示（红色背景）');
    console.log('🔍 模态框最终样式:', uploadModal.style.cssText);
    console.log('🔍 模态框计算样式:', window.getComputedStyle(uploadModal));
    
    // 3秒后自动隐藏
    setTimeout(() => {
      uploadModal.style.display = 'none';
      console.log('❌ 上传模态框已隐藏');
    }, 3000);
  }
};

// 强制显示上传模态框
window.forceShowUploadModal = () => {
  const modal = document.getElementById('uploadModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.style.zIndex = '99999';
    modal.style.backgroundColor = 'rgba(0, 255, 0, 0.8)';
    console.log('🟢 强制显示上传模态框（绿色背景）');
    return true;
  }
  return false;
};

// 检查模态框是否存在并可访问
window.checkModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (!modal) {
    console.log(`❌ 模态框 ${modalId} 不存在`);
    return false;
  }
  
  console.log(`✅ 模态框 ${modalId} 存在:`, {
    tagName: modal.tagName,
    className: modal.className,
    id: modal.id,
    display: window.getComputedStyle(modal).display,
    visibility: window.getComputedStyle(modal).visibility,
    opacity: window.getComputedStyle(modal).opacity,
    zIndex: window.getComputedStyle(modal).zIndex,
    position: window.getComputedStyle(modal).position,
    offsetParent: modal.offsetParent,
    offsetWidth: modal.offsetWidth,
    offsetHeight: modal.offsetHeight
  });
  
  return true;
};

// 测试数据库连接
window.testDatabaseConnection = async () => {
  console.log('🧪 测试数据库连接...');
  
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/materials/test-db', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    console.log('🧪 数据库测试结果:', { status: response.status, data });
    
    if (data.success) {
      console.log('✅ 数据库连接正常');
      console.log(`📊 当前物料数量: ${data.data.materialCount}`);
      console.log(`📊 materials表字段数: ${data.data.tableColumns}`);
    } else {
      console.log('❌ 数据库连接失败:', data.error);
    }
    
  } catch (error) {
    console.error('🧪 数据库测试失败:', error);
  }
};

// 测试物料创建和删除
window.testMaterialOperations = async (supplierId) => {
  console.log('🧪 测试物料操作...');
  
  const testMaterialName = `测试物料_${Date.now()}`;
  
  try {
    // 1. 测试创建
    console.log('📝 测试创建物料:', testMaterialName);
    const token = localStorage.getItem('authToken');
    const createResponse = await fetch('/api/materials', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        supplierId: supplierId,
        materialName: testMaterialName,
        materialCode: 'TEST-001',
        description: '测试物料描述'
      })
    });
    
    const createData = await createResponse.json();
    console.log('📝 创建响应:', { status: createResponse.status, data: createData });
    
    if (createData.success) {
      const materialId = createData.data.materialId;
      console.log('✅ 创建成功，物料ID:', materialId);
      
      // 2. 测试删除
      console.log('🗑️ 测试删除物料:', materialId);
      const deleteResponse = await fetch(`/api/materials/${materialId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ supplierId })
      });
      
      const deleteData = await deleteResponse.json();
      console.log('🗑️ 删除响应:', { status: deleteResponse.status, data: deleteData });
      
      // 3. 测试重复创建（应该成功）
      console.log('📝 测试重复创建已删除的物料:', testMaterialName);
      const recreateResponse = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          supplierId: supplierId,
          materialName: testMaterialName,
          materialCode: 'TEST-002',
          description: '重新创建的测试物料'
        })
      });
      
      const recreateData = await recreateResponse.json();
      console.log('📝 重新创建响应:', { status: recreateResponse.status, data: recreateData });
      
    } else {
      console.log('❌ 创建失败:', createData);
    }
    
  } catch (error) {
    console.error('🧪 测试失败:', error);
  }
};

// 初始化模块
if (typeof window !== 'undefined') {
  window.SupplierDocumentManager = SupplierDocumentManager;

  // 自动初始化 (检查documentsContainer是否存在)
  const initializeModule = () => {
    if (document.getElementById('documentsContainer')) {
      console.log('🚀 找到documentsContainer，初始化供应商资料管理模块...');
      if (!window.supplierManager) {
        window.supplierManager = new SupplierDocumentManager();
        console.log('✅ 供应商资料管理模块初始化完成');
        
        // 延迟测试，确保所有元素都已加载
        setTimeout(() => {
          console.log('🧪 运行自动测试...');
          window.testSupplierManager();
        }, 2000);
      }
    } else {
      console.log('⏳ documentsContainer不存在，延迟初始化...');
      setTimeout(initializeModule, 1000);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModule);
  } else {
    initializeModule();
  }
}