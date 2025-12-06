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
  /**
   * 格式化日期显示（只显示年-月-日）
   */
  
  /**
   * 初始化模块
   */
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
      window.supplierUIUtils.showError('模块初始化失败，请刷新页面重试');
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
      window.supplierUIUtils.showError('加载数据失败，请刷新页面重试');
      this.suppliers = [];
    }
  }

  /**
   * 加载单个供应商的详细资料
   */
  async loadDetails(supplierId) {
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
        // 强制给文档添加filePath
        if (data.data && data.data.commonDocuments) {
          data.data.commonDocuments.forEach(doc => {
            if (!doc.filePath) {
              doc.filePath = 'D:/AI/IFLOW-SQE-Data-Analysis-Assistant-refactored/资料档案/晶蓝/通用资料';
            }
          });
        }
        
        // 给物料资料也添加filePath
        if (data.data && data.data.materials) {
          data.data.materials.forEach(material => {
            if (material.documents) {
              material.documents.forEach(doc => {
                if (!doc.filePath) {
                  doc.filePath = 'D:/AI/IFLOW-SQE-Data-Analysis-Assistant-refactored/资料档案/晶蓝/物料资料';
                }
              });
            }
          });
        }
        
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

    // 同步供应商按钮
    const importBtn = document.getElementById('importBtn');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        this.syncSuppliersFromIQC();
      });
    }

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
          window.supplierUIUtils.showUploadModal(type, supplierId, materialId);
          return;
        }

        // 新增物料按钮
        const addMaterialBtn = e.target.closest('.add-material-btn');
        if (addMaterialBtn) {
          console.log('➕ 点击新增物料按钮', addMaterialBtn.dataset);
          e.preventDefault();
          const supplierId = parseInt(addMaterialBtn.dataset.supplierId);
          console.log('➕ 调用新增物料模态框:', supplierId);
          window.supplierUIUtils.showAddMaterialModal(supplierId);
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

        // 打开文件夹按钮
        const folderBtn = e.target.closest('.folder-btn');
        if (folderBtn) {
          console.log('📁 点击打开文件夹按钮', folderBtn.dataset);
          e.preventDefault();
          const filePath = folderBtn.dataset.filePath;
          await this.openLocalFolder(filePath);
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

        // 批量邮件按钮
        const batchEmailBtn = e.target.closest('.batch-email-btn');
        if (batchEmailBtn) {
          console.log('📧 点击批量邮件按钮', batchEmailBtn.dataset);
          e.preventDefault();
          const type = batchEmailBtn.dataset.type || 'common';
          const supplierId = parseInt(batchEmailBtn.dataset.supplierId);
          const materialId = batchEmailBtn.dataset.materialId ? parseInt(batchEmailBtn.dataset.materialId) : null;
          const materialName = batchEmailBtn.dataset.materialName || null;
          console.log('📧 调用批量邮件功能:', { type, supplierId, materialId, materialName });
          this.generateBatchEmail(type, supplierId, materialId, materialName);
          return;
        }

        // 单个邮件按钮
        const singleEmailBtn = e.target.closest('.single-email-btn');
        if (singleEmailBtn) {
          console.log('📧 点击单个邮件按钮', singleEmailBtn.dataset);
          e.preventDefault();
          const documentId = parseInt(singleEmailBtn.dataset.documentId);
          const supplierId = parseInt(singleEmailBtn.dataset.supplierId);
          console.log('📧 调用单个邮件功能:', { documentId, supplierId });
          this.generateSingleEmail(documentId, supplierId);
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
        window.supplierUIUtils.hideUploadModal();
        return;
      }

      // 上传模态框取消按钮
      if (e.target.closest('.upload-cancel-btn')) {
        window.supplierUIUtils.hideUploadModal();
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
        window.supplierUIUtils.hideAddMaterialModal();
        return;
      }

      // 新增物料模态框取消按钮
      if (e.target.closest('.add-material-cancel-btn')) {
        window.supplierUIUtils.hideAddMaterialModal();
        return;
      }

      // 新增物料模态框提交按钮
      if (e.target.closest('.add-material-submit-btn')) {
        await this.submitAddMaterial();
        return;
      }

      // 邮件预览模态框关闭按钮
      if (e.target.closest('.email-modal-close')) {
        window.supplierUIUtils.hideEmailModal();
        return;
      }

      // 邮件预览模态框取消按钮
      if (e.target.closest('.email-modal-cancel-btn')) {
        window.supplierUIUtils.hideEmailModal();
        return;
      }

      // 邮件复制按钮
      if (e.target.closest('.email-copy-btn')) {
        await this.copyEmailContent();
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
    
    // 重新加载供应商详情
    if (supplierId) {
      // 如果指定了supplierId，确保重新加载该供应商的详情
      console.log('🔄 重新加载指定供应商详情:', supplierId);
      await this.loadDetails(supplierId);
    } else if (expandedSuppliers.size > 0) {
      // 否则重新加载所有展开的供应商详情
      console.log('🔄 重新加载展开的供应商详情:', Array.from(expandedSuppliers));
      for (const sid of expandedSuppliers) {
        await this.loadDetails(sid);
      }
    }
    
    this.render();
    
    if (showMessage) {
      window.supplierUIUtils.showSuccess('数据已刷新');
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
        ${this.statusFilter ? `（状态：${window.supplierServices.getStatusFilterText(this.statusFilter)}）` : ''}
        ${this.documentFilter ? `（资料：${window.supplierServices.getDocumentFilterText(this.documentFilter)}）` : ''}
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
        const hasStatus = window.supplierServices.checkSupplierStatus(supplier, this.statusFilter);
        if (!hasStatus) {
          return false;
        }
      }

      // 资料筛选
      if (this.documentFilter) {
        const hasDocumentIssue = window.supplierServices.checkDocumentIssue(supplier, this.documentFilter);
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
  
  /**
   * 检查资料问题
   */
  
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
  
  /**
   * 获取资料筛选文本
   */
  
  /**
   * 渲染供应商行
   */
  renderSupplierRow(supplier) {
    const isExpanded = this.expandedSuppliers.has(supplier.supplierId);

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
   * 渲染物料资料统计
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
      html += `
        <ul class="document-list">
      `;

      details.commonDocuments.forEach(doc => {
        html += `
          <li class="document-item ${doc.status}">
            <span class="doc-icon">${window.supplierServices.getStatusIcon(doc.status)}</span>
            <span class="doc-type">${window.supplierServices.getDocumentTypeText(doc.documentType)}</span>
            <span class="doc-name">${doc.documentName}</span>
            <span class="doc-expiry">
              ${doc.isPermanent ? '永久有效' : `到期: ${window.supplierServices.formatDate(doc.expiryDate)}`}
            </span>
            ${doc.daysUntilExpiry !== null && !doc.isPermanent ? `
              <span class="doc-days">(${doc.daysUntilExpiry}天)</span>
            ` : ''}
            <div class="doc-actions">
              <button class="action-btn email-btn single-email-btn" data-document-id="${doc.id}" data-supplier-id="${supplierId}" title="发送邮件">
                📧
              </button>
              <button class="action-btn edit-btn" data-document-id="${doc.id}" title="编辑">✏️</button>
              <button class="action-btn delete-btn" data-document-id="${doc.id}" title="删除">🗑️</button>
              ${doc.filePath ? `
                <button class="action-btn folder-btn" data-file-path="${doc.filePath}" title="打开文件夹">
                  📁
                </button>
              ` : ''}
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
            html += `
              <li class="document-item ${doc.status}">
                <span class="doc-icon">${window.supplierServices.getStatusIcon(doc.status)}</span>
                <span class="doc-type">${window.supplierServices.getDocumentTypeText(doc.documentType)} (${doc.componentName})</span>
                <span class="doc-name">${doc.documentName}</span>
                <span class="doc-expiry">
                  ${doc.isPermanent ? '永久有效' : `到期: ${window.supplierServices.formatDate(doc.expiryDate)}`}
                </span>
                ${doc.daysUntilExpiry !== null && !doc.isPermanent ? `
                  <span class="doc-days">(${doc.daysUntilExpiry}天)</span>
                ` : ''}
                <div class="doc-actions">
                  <button class="action-btn email-btn single-email-btn" data-document-id="${doc.documentId}" data-supplier-id="${supplierId}" title="发送邮件">
                    📧
                  </button>
                  <button class="action-btn edit-btn" data-document-id="${doc.documentId}" title="编辑">✏️</button>
                  <button class="action-btn delete-btn" data-document-id="${doc.documentId}" title="删除">🗑️</button>
                  ${doc.filePath ? `
                    <button class="action-btn folder-btn" data-file-path="${doc.filePath}" title="打开文件夹">
                      📁
                    </button>
                  ` : '<!-- 无文件路径 -->'}
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
  
  /**
   * 工具函数: 获取资料类型文本
   */
  
  /**
   * 显示成功消息
   */
  
    /**
   * 生成单个邮件
   */
  async generateSingleEmail(documentId, supplierId) {
    try {
      console.log('📧 生成单个邮件:', { documentId, supplierId });
      
      // 获取供应商信息
      const supplier = this.suppliers.find(s => s.supplierId === supplierId);
      if (!supplier) {
        window.supplierUIUtils.showError('供应商信息不存在');
        return;
      }
      
      // 获取供应商详情
      const details = await this.loadDetails(supplierId);
      if (!details) {
        window.supplierUIUtils.showError('无法获取供应商详情');
        return;
      }
      
      // 查找目标文档
      let targetDoc = null;
      
      // 在通用资料中查找
      if (details.commonDocuments) {
        targetDoc = details.commonDocuments.find(doc => doc.id === documentId);
      }
      
      // 在物料资料中查找
      if (!targetDoc && details.materials) {
        for (const material of details.materials) {
          if (material.documents) {
            targetDoc = material.documents.find(doc => doc.documentId === documentId);
            if (targetDoc) {
              // 添加物料信息到文档对象
              targetDoc.materialName = material.materialName;
              break;
            }
          }
        }
      }
      
      if (!targetDoc) {
        window.supplierUIUtils.showError('文档信息不存在');
        return;
      }
      
      // 准备邮件变量
      const variables = {
        供应商名称: supplier.supplierName,
        物料名称: targetDoc.materialName || '',
        具体构成名称: targetDoc.componentName || '',
        证书类型: window.supplierServices.getCertificateTypeText(targetDoc.documentType),
        到期日期: targetDoc.isPermanent ? '永久有效' : window.supplierServices.formatDate(targetDoc.expiryDate),
        剩余天数: targetDoc.isPermanent ? '永久有效' : `${targetDoc.daysUntilExpiry}天`,
        SQE工程师联系方式: 'SQE团队' // 可以从配置中获取
      };
      
      // 生成邮件内容
      const template = window.supplierServices.getEmailTemplate();
      const emailContent = window.supplierServices.replaceEmailVariables(template, variables);
      
      // 生成邮件主题
      const urgency = targetDoc.daysUntilExpiry < 0 ? '【已过期】' : targetDoc.daysUntilExpiry <= 7 ? '【紧急】' : '【提醒】';
      const subject = `${urgency}${window.supplierServices.getCertificateTypeText(targetDoc.documentType)}到期提醒 - ${supplier.supplierName}`;
      
      // 显示邮件预览模态框
      window.supplierUIUtils.showEmailModal(subject, emailContent);
      
    } catch (error) {
      console.error('生成单个邮件失败:', error);
      window.supplierUIUtils.showError('生成邮件失败');
    }
  }

  /**
   * 生成批量邮件
   */
  async generateBatchEmail(type, supplierId, materialId = null, materialName = null) {
    try {
      console.log('📧 生成批量邮件:', { type, supplierId, materialId, materialName });
      
      // 获取供应商信息
      const supplier = this.suppliers.find(s => s.supplierId === supplierId);
      if (!supplier) {
        window.supplierUIUtils.showError('供应商信息不存在');
        return;
      }
      
      // 获取供应商详情
      const details = await this.loadDetails(supplierId);
      if (!details) {
        window.supplierUIUtils.showError('无法获取供应商详情');
        return;
      }
      
      let documentsToNotify = [];
      
      if (type === 'common') {
        // 通用资料批量邮件
        if (details.commonDocuments) {
          documentsToNotify = details.commonDocuments.filter(doc => 
            !doc.isPermanent && (doc.daysUntilExpiry <= 30 || doc.daysUntilExpiry < 0)
          );
        }
      } else if (type === 'material' && materialId) {
        // 物料资料批量邮件
        const material = details.materials.find(m => m.materialId === materialId);
        if (material && material.documents) {
          documentsToNotify = material.documents.filter(doc => 
            !doc.isPermanent && (doc.daysUntilExpiry <= 30 || doc.daysUntilExpiry < 0)
          );
        }
      }
      
      if (documentsToNotify.length === 0) {
        window.supplierUIUtils.showSuccess('没有需要发送邮件的资料');
        return;
      }
      
      // 按证书类型分组
      const groupedDocs = {};
      documentsToNotify.forEach(doc => {
        const certType = window.supplierServices.getCertificateTypeText(doc.documentType);
        if (!groupedDocs[certType]) {
          groupedDocs[certType] = [];
        }
        groupedDocs[certType].push(doc);
      });
      
      // 生成汇总邮件内容
      let emailContent = `尊敬的${supplier.supplierName}您好，

感谢贵司一直以来对我司供应链工作的大力支持！

我们通过供应商资料管理系统监测到，贵司有以下证书即将到期或已过期，需要及时更新处理：

【证书到期监测清单】
`;
      
      // 添加各种证书信息
      for (const [certType, docs] of Object.entries(groupedDocs)) {
        emailContent += `
${certType}：
`;
        docs.forEach(doc => {
          const materialInfo = doc.materialName ? `（物料：${doc.materialName}${doc.componentName ? ` - ${doc.componentName}` : ''}）` : '';
          const status = doc.daysUntilExpiry < 0 ? `已过期${Math.abs(doc.daysUntilExpiry)}天` : `剩余${doc.daysUntilExpiry}天`;
          const urgency = doc.daysUntilExpiry < 0 ? '🔴' : doc.daysUntilExpiry <= 7 ? '🟡' : '🟢';
          emailContent += `${urgency} ${doc.documentName}${materialInfo}
   到期日期：${window.supplierServices.formatDate(doc.expiryDate)}
   状态：${status}
`;
        });
      }
      
      emailContent += `
【更新建议】
• 请在证书到期前完成更新并提交最新版本至我司质量部门
• 如需延期请提前提供书面说明和预计完成时间

感谢贵司的积极配合，让我们共同维护供应链的质量稳定！

如有任何问题或需要协助，请随时联系我们。

此致
敬礼

{SQE工程师联系方式}
质量部 | 供应商质量管理

---
此邮件由供应商资料管理系统自动发送，请勿直接回复。如已处理，请忽略本提醒。`;
      
      // 生成邮件主题
      const hasExpired = documentsToNotify.some(doc => doc.daysUntilExpiry < 0);
      const hasUrgent = documentsToNotify.some(doc => doc.daysUntilExpiry <= 7 && doc.daysUntilExpiry >= 0);
      const urgency = hasExpired ? '【已过期】' : hasUrgent ? '【紧急】' : '【提醒】';
      const subject = `${urgency}证书到期汇总提醒 - ${supplier.supplierName}（共${documentsToNotify.length}个证书）`;
      
      // 显示邮件预览模态框
      window.supplierUIUtils.showEmailModal(subject, emailContent);
      
    } catch (error) {
      console.error('生成批量邮件失败:', error);
      window.supplierUIUtils.showError('生成批量邮件失败');
    }
  }

  /**
   * 复制邮件内容到剪贴板
   */
  async copyEmailContent() {
    const contentTextarea = document.getElementById('emailContent');
    if (contentTextarea) {
      try {
        await this.copyToClipboard(contentTextarea.value);
        window.supplierUIUtils.showSuccess('邮件内容已复制到剪贴板');
        window.supplierUIUtils.hideEmailModal();
      } catch (error) {
        console.error('复制邮件内容失败:', error);
        window.supplierUIUtils.showError('复制失败');
      }
    }
  }

  /**
   * 复制内容到剪贴板
   */
  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // 兼容旧版浏览器
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
    } catch (error) {
      console.error('复制到剪贴板失败:', error);
      throw new Error('复制失败');
    }
  }

  /**
   * 绑定文件上传事件
   */
  bindFileUploadEvents() {
    const dropZone = document.getElementById('uploadDropZone');
    const fileInput = document.getElementById('fileInput');

    // 先移除可能存在的旧事件监听器
    dropZone.onclick = null;
    dropZone.ondragover = null;
    dropZone.ondragleave = null;
    dropZone.ondrop = null;
    fileInput.onchange = null;

    // 点击上传区域
    dropZone.onclick = () => {
      console.log('📁 点击上传区域，触发文件选择');
      fileInput.click();
    };

    // 文件选择
    fileInput.onchange = (e) => {
      console.log('📁 文件选择事件触发，文件数量:', e.target.files.length);
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

    console.log('✅ 文件上传事件绑定完成');
  }

  /**
   * 处理文件上传
   */
  handleFileUpload(files) {
    console.log('📁 处理文件上传，文件数量:', files.length);
    
    if (files.length === 0) {
      console.log('❌ 没有文件');
      return;
    }

    const file = files[0];
    console.log('📁 选择的文件:', file.name, '大小:', file.size);
    
    const allowedTypes = ['.pdf', '.xlsx', '.xls', '.doc', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(fileExtension)) {
      window.supplierUIUtils.showError('不支持的文件格式，请上传PDF、Excel或Word文档');
      return;
    }

    // 检查文件大小（10MB限制）
    if (file.size > 10 * 1024 * 1024) {
      window.supplierUIUtils.showError('文件大小不能超过10MB');
      return;
    }

    // 存储文件到UI工具层
    window.supplierUIUtils.selectedFile = file;
    console.log('✅ 文件已保存到 UI工具层 selectedFile:', file.name);
    
    // 显示文件预览
    const filePreview = document.getElementById('filePreview');
    const fileName = filePreview.querySelector('.file-name');
    if (fileName) {
      fileName.textContent = file.name;
      filePreview.style.display = 'flex';
      console.log('✅ 文件预览已显示');
    }
  }

  /**
   * 移除选中的文件
   */
  removeSelectedFile() {
    // 清空UI工具层的selectedFile
    window.supplierUIUtils.selectedFile = null;
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
   * 提交上传（列表直接上传版本）
   */
  async submitUpload() {
    // 从UI工具层获取uploadContext
    const uploadContext = window.supplierUIUtils.uploadContext;
    console.log('📤 开始提交上传，uploadContext:', uploadContext);

    // 基础验证
    if (!uploadContext || !uploadContext.supplierId) {
      window.supplierUIUtils.showError('上传上下文缺失，请重新选择上传位置');
      return;
    }

    // 从UI工具层获取selectedFile
    const selectedFile = window.supplierUIUtils.selectedFile;
    if (!selectedFile) {
      window.supplierUIUtils.showError('请选择要上传的文件');
      return;
    }

    // 获取表单数据
    const documentType = document.getElementById('documentType').value;
    const isPermanent = document.getElementById('isPermanent').checked;
    const expiryDate = document.getElementById('expiryDate').value;
    const remark = document.getElementById('documentRemark').value;
    const supplierName = document.getElementById('uploadSupplierName').value;

    // 验证必填字段（适配列表上传场景）
    const validationErrors = [];

    // 1. 资料类型是必填的
    if (!documentType) {
      validationErrors.push('请选择资料类型');
    }

    // 2. 到期日期验证（如果不是永久有效）
    if (!isPermanent && !expiryDate) {
      validationErrors.push('请设置到期日期或选择永久有效');
    }

    // 3. 物料资料需要构成名称
    if (uploadContext.type === 'material') {
      const componentName = document.getElementById('componentName').value;
      if (!componentName || componentName.trim() === '') {
        validationErrors.push('物料资料上传必须填写构成名称');
      }
    }

    // 4. 供应商名称验证（预设字段，但还是要检查）
    if (!supplierName || supplierName.trim() === '') {
      validationErrors.push('供应商信息缺失');
    }

    // 如果有验证错误，显示并退出
    if (validationErrors.length > 0) {
      window.supplierUIUtils.showError(validationErrors[0]); // 只显示第一个错误
      return;
    }

    // 构建表单数据
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('supplierId', uploadContext.supplierId);
    formData.append('documentType', documentType);
    formData.append('isPermanent', isPermanent);
    formData.append('remarks', remark);

    // 添加资料层级 (通用资料是supplier，物料资料是component)
    const level = uploadContext.type === 'common' ? 'supplier' : 'component';
    formData.append('level', level);

    // 添加资料名称（使用文件名作为默认名称）
    const documentName = selectedFile.name;
    formData.append('documentName', documentName);

    // 添加物料相关字段
    if (uploadContext.type === 'material') {
      formData.append('materialId', uploadContext.materialId);
      
      // 构成信息现在作为备注处理
      const componentName = document.getElementById('componentName').value.trim();
      if (componentName) {
        // 将构成信息添加到备注中
        const enhancedRemark = remark ? `${remark} (构成: ${componentName})` : `构成: ${componentName}`;
        formData.set('remarks', enhancedRemark);
        
        // 也可以选择将构成信息添加到文档名称中
        // const enhancedDocumentName = `${documentName} (${componentName})`;
        // formData.set('documentName', enhancedDocumentName);
      }
    }

    // 添加到期日期（如果不是永久有效）
    if (!isPermanent) {
      formData.append('expiryDate', expiryDate);
    }

    try {
      window.supplierUIUtils.showLoading(true, '上传中...');

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
        window.supplierUIUtils.showSuccess('文件上传成功');
        window.supplierUIUtils.hideUploadModal();
        await this.refresh(false, uploadContext?.supplierId); // 只刷新相关供应商
      } else {
        // 优先显示详细的message字段，如果没有则显示error字段
        const errorMessage = data.message || data.error || '上传失败';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('上传失败:', error);
      window.supplierUIUtils.showError(error.message || '上传失败，请重试');
    } finally {
      window.supplierUIUtils.hideLoading();
    }
  }

  /**
   * 从IQC同步供应商数据
   */
  async syncSuppliersFromIQC() {
    try {
      window.supplierUIUtils.showLoading(true, '正在同步供应商数据...');
      
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/suppliers/import-from-iqc', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        const { newSuppliers, updatedSuppliers, totalSuppliers, folderSyncResults } = data.data;
        
        console.log('📊 同步返回数据:', data.data);
        console.log('📁 文件夹同步结果:', folderSyncResults);
        
        if (newSuppliers && newSuppliers.length > 0) {
          window.supplierUIUtils.showSuccess(`同步完成！发现 ${newSuppliers.length} 个新供应商：${newSuppliers.slice(0, 5).join(', ')}${newSuppliers.length > 5 ? '...' : ''}，已为所有供应商创建文件夹结构`);
        } else {
          window.supplierUIUtils.showSuccess(`同步完成！已为 ${totalSuppliers} 个供应商创建文件夹结构`);
        }
        
        // 刷新供应商列表
        await this.refresh(false);
        
      } else {
        throw new Error(data.message || '同步失败');
      }
    } catch (error) {
      console.error('同步供应商失败:', error);
      window.supplierUIUtils.showError(error.message || '同步供应商失败，请重试');
    } finally {
      window.supplierUIUtils.hideLoading();
    }
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
        window.supplierUIUtils.showError('编辑模态框加载失败');
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
      window.supplierUIUtils.showError(error.message || '获取文档信息失败');
      
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
      window.supplierUIUtils.showError('请输入资料名称');
      return;
    }

    const isPermanent = document.getElementById('editIsPermanent').checked;
    const expiryDate = document.getElementById('editExpiryDate').value;

    if (!isPermanent && !expiryDate) {
      window.supplierUIUtils.showError('请设置到期日期或选择永久有效');
      return;
    }

    try {
      window.supplierUIUtils.showLoading(true, '保存中...');

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
        window.supplierUIUtils.showSuccess('资料信息已更新');
        this.hideEditModal();
        await this.refresh(false, this.editContext?.documentId ? null : null); // 编辑操作需要重新加载详情
      } else {
        throw new Error(data.error || '更新失败');
      }
    } catch (error) {
      console.error('更新失败:', error);
      window.supplierUIUtils.showError(error.message || '更新失败，请重试');
    } finally {
      window.supplierUIUtils.hideLoading();
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
      window.supplierUIUtils.showLoading(true, '删除中...');

      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        window.supplierUIUtils.showSuccess('资料已删除');
        // 删除文档后，清空所有缓存确保数据一致性
        await this.refresh(false);
      } else {
        throw new Error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      window.supplierUIUtils.showError(error.message || '删除失败，请重试');
    } finally {
      window.supplierUIUtils.hideLoading();
    }
  }

  /**
   * 打开本地文件夹
   */
  async openLocalFolder(filePath) {
    try {
      if (!filePath) {
        window.supplierUIUtils.showError('文件路径不存在');
        return;
      }
      
      console.log('📂 打开本地文件夹:', filePath);
      
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/system/open-folder', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filePath })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('✅ 文件夹已打开');
      } else {
        window.supplierUIUtils.showError(`打开文件夹失败: ${data.error}`);
      }
    } catch (error) {
      console.error('打开文件夹失败:', error);
      window.supplierUIUtils.showError('打开文件夹失败，请检查文件是否存在');
    }
  }

  /**
   * 提交新增物料
   */
  async submitAddMaterial() {
    const materialName = document.getElementById('newMaterialName').value.trim();
    if (!materialName) {
      window.supplierUIUtils.showError('请输入物料名称');
      return;
    }

    // 从模态框dataset中获取supplierId
    const modal = document.getElementById('addMaterialModal');
    const supplierId = modal?.dataset?.supplierId;
    if (!supplierId) {
      console.error('❌ 无法获取供应商ID');
      window.supplierUIUtils.showError('供应商信息丢失，请重新操作');
      return;
    }

    try {
      window.supplierUIUtils.showLoading(true, '添加中...');

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          supplierId: parseInt(supplierId),
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
        window.supplierUIUtils.showSuccess('物料添加成功');
        window.supplierUIUtils.hideAddMaterialModal();
        await this.refresh(false, parseInt(supplierId)); // 只刷新相关供应商
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
      
      window.supplierUIUtils.showError(errorMessage);
    } finally {
      window.supplierUIUtils.hideLoading();
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
      window.supplierUIUtils.showLoading(true, '删除中...');

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
        window.supplierUIUtils.showSuccess('物料已删除');
        await this.refresh(false, supplierId); // 只刷新相关供应商
      } else {
        throw new Error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除物料失败:', error);
      window.supplierUIUtils.showError(error.message || '删除失败，请重试');
    } finally {
      window.supplierUIUtils.hideLoading();
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

