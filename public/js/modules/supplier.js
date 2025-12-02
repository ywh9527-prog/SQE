/**
 * 供应商资料管理模块
 * 负责供应商资料的前端交互和管理
 */
class SupplierDocumentManager {
  constructor() {
    this.currentSupplier = null;
    this.documents = [];
    this.suppliers = [];
    this.documentsSummary = []; // 供应商资料汇总数据
    this.viewMode = 'table'; // 'table' 或 'cards' - 默认表格视图
    this.currentView = 'grid'; // 'grid' 或 'list'
    this.currentSort = 'expiry-asc'; // 默认排序
    this.selectedDocuments = new Set(); // 选中的文档ID
    
    // 新增：状态分组相关属性
    this.displayMode = 'grouped'; // 'grouped' 或 'simple' - 显示模式
    this.currentSupplierId = null; // 当前查看的供应商ID
    this.statusGroups = {
      urgent: { title: '🚨 需要立即处理', expanded: true, suppliers: [] },
      warning: { title: '⚠️ 即将到期', expanded: false, suppliers: [] },
      normal: { title: '✅ 状态正常', expanded: false, suppliers: [] }
    };
    
    this.init();
  }

  async init() {
    console.log('初始化供应商资料管理模块...');
    await this.loadSuppliers();
    this.bindEvents();
    this.setupFileUpload();
    
    // 确保全局实例可用
    window.supplierManager = this;
    console.log('supplierManager已设置到window对象');
    
    // 只在documents模块激活时加载数据
    if (window.location.hash === '#documents' || (!window.location.hash && document.getElementById('module-documents') && !document.getElementById('module-documents').classList.contains('hidden'))) {
      this.loadDocuments();
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 防止重复绑定事件
    if (this.eventsBound) {
      console.log('事件已绑定，跳过重复绑定');
      return;
    }
    
    console.log('开始绑定事件...');
    
    // 供应商选择
    document.getElementById('supplierSelect')?.addEventListener('change', (e) => {
      this.currentSupplier = e.target.value;
      this.loadDocuments();
    });

    // 资料类型切换已移除 - 改用状态分组展示

    // 搜索功能
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
      this.debounceSearch(e.target.value);
    });

    // 状态筛选
    document.getElementById('statusFilter')?.addEventListener('change', () => {
      this.loadDocuments();
    });

    // 排序选择
    document.getElementById('sortSelect')?.addEventListener('change', () => {
      this.loadDocuments();
    });

    // 视图切换按钮
    document.addEventListener('click', (e) => {
      if (e.target.matches('.view-btn') || e.target.closest('.view-btn')) {
        const btn = e.target.matches('.view-btn') ? e.target : e.target.closest('.view-btn');
        const view = btn.dataset.view;
        if (view) {
          this.switchView(view);
        }
      }
    });

    // 显示模式切换按钮
    document.addEventListener('click', (e) => {
      if (e.target.matches('.view-mode-btn') || e.target.closest('.view-mode-btn')) {
        const btn = e.target.matches('.view-mode-btn') ? e.target : e.target.closest('.view-mode-btn');
        const mode = btn.dataset.mode;
        if (mode) {
          this.switchDisplayMode(mode);
        }
      }
    });

    // 上传按钮
    document.getElementById('uploadBtn')?.addEventListener('click', () => {
      console.log('uploadBtn被点击');
      this.showUploadModal();
    });

    // 提交上传按钮
    document.getElementById('submitUploadBtn')?.addEventListener('click', () => {
      this.submitUpload();
    });

    // 刷新按钮 - 导入供应商和刷新资料列表
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
      this.refreshData();
    });

    // 提交编辑按钮
    document.getElementById('submitEditBtn')?.addEventListener('click', () => {
      this.submitEdit();
    });

    // 关闭模态框按钮
    document.getElementById('closeUploadModal')?.addEventListener('click', () => {
      this.hideUploadModal();
    });

    document.getElementById('closeEditModal')?.addEventListener('click', () => {
      this.hideEditModal();
    });
    
    this.eventsBound = true;
    console.log('事件绑定完成');
  }

  /**
   * 设置文件上传组件
   */
  setupFileUpload() {
    // 文件上传事件绑定已移至index.html中统一处理
    // 避免重复绑定导致点击响应两次
    console.log('setupFileUpload: 事件绑定已移至index.html统一处理');
  }

  /**
   * 加载供应商列表
   */
  async loadSuppliers() {
    try {
      // 临时解决方案：使用硬编码的供应商列表，直到服务器重启
      const tempSuppliers = [
        { id: 1, name: '供应商A' },
        { id: 2, name: '供应商B' },
        { id: 3, name: '供应商C' },
        { id: 4, name: '供应商D' }
      ];

      // 尝试从API获取，如果失败则使用临时数据
      try {
        const response = await fetch('/api/suppliers', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });
        const result = await response.json();
        
        if (result.success) {
          this.suppliers = result.data;
        } else {
          this.suppliers = tempSuppliers;
        }
      } catch (apiError) {
        console.log('API暂时不可用，使用临时供应商列表');
        this.suppliers = tempSuppliers;
      }
      
      this.populateSupplierSelect();
    } catch (error) {
      console.error('加载供应商列表失败:', error);
      this.showError('加载供应商列表失败');
    }
  }

  /**
   * 填充供应商选择框
   */
  populateSupplierSelect() {
    // 填充主筛选器
    const mainSelect = document.getElementById('supplierSelect');
    if (mainSelect) {
      mainSelect.innerHTML = '<option value="">全部供应商</option>';
      
      this.suppliers.forEach(supplier => {
        const option = document.createElement('option');
        option.value = supplier.id;
        option.textContent = supplier.name;
        mainSelect.appendChild(option);
      });
    }

    // 填充上传表单中的供应商选择
    const uploadSelect = document.getElementById('uploadSupplierId');
    if (uploadSelect) {
      uploadSelect.innerHTML = '<option value="">请选择供应商</option>';
      
      this.suppliers.forEach(supplier => {
        const option = document.createElement('option');
        option.value = supplier.id;
        option.textContent = supplier.name;
        uploadSelect.appendChild(option);
      });
    }
  }

  // switchDocumentType方法已移除 - 改用状态分组展示

  /**
   * 切换视图模式
   */
  switchView(view) {
    if (this.currentView === view) {
      return;
    }
    
    this.currentView = view;
    
    // 映射grid->table, list->cards
    this.viewMode = view === 'grid' ? 'table' : 'cards';
    
    // 更新按钮样式
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    const activeBtn = document.querySelector(`[data-view="${view}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
    
    // 更新容器样式
    const container = document.getElementById('documentsContainer');
    if (container) {
      container.classList.remove('view-grid', 'view-list');
      container.classList.add(`view-${view}`);
    }
    
    // 重新渲染资料列表
    this.renderDocuments();
  }

  /**
   * 切换显示模式
   */
  switchDisplayMode(mode) {
    if (this.displayMode === mode) {
      return;
    }
    
    this.displayMode = mode;
    
    // 更新按钮样式
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.style.background = 'transparent';
      btn.style.color = 'var(--text-secondary)';
    });
    
    const activeBtn = document.querySelector(`[data-mode="${mode}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.style.background = 'var(--primary-500)';
      activeBtn.style.color = 'white';
    }
    
    // 重新渲染资料列表
    this.renderDocuments();
  }

  /**
   * 排序资料列表
   */
  sortDocuments() {
    if (!this.documents || this.documents.length === 0) return;
    
    const [field, order] = this.currentSort.split('-');
    const isAsc = order === 'asc';
    
    this.documents.sort((a, b) => {
      let valueA, valueB;
      
      switch (field) {
        case 'expiry':
          // 到期时间排序，没有到期时间的放在最后
          if (!a.expiryDate) return isAsc ? 1 : -1;
          if (!b.expiryDate) return isAsc ? -1 : 1;
          valueA = new Date(a.expiryDate);
          valueB = new Date(b.expiryDate);
          break;
          
        case 'name':
          // 资料名称排序
          valueA = a.documentName || '';
          valueB = b.documentName || '';
          return isAsc ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
          
        case 'supplier':
          // 供应商排序
          valueA = this.getSupplierName(a.supplierId);
          valueB = this.getSupplierName(b.supplierId);
          return isAsc ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
          
        case 'type':
          // 资料类型排序
          valueA = this.getDocumentTypeText(a.documentType);
          valueB = this.getDocumentTypeText(b.documentType);
          return isAsc ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
          
        case 'upload':
          // 上传时间排序
          valueA = new Date(a.createdAt || 0);
          valueB = new Date(b.createdAt || 0);
          break;
          
        default:
          return 0;
      }
      
      if (field === 'expiry' || field === 'upload') {
        return isAsc ? valueA - valueB : valueB - valueA;
      }
      
      return 0;
    });
  }

  /**
   * 加载资料列表
   * 
   * ⚠️ 关键方法: 供应商资料管理页面的数据加载入口
   * 🔗 调用API: GET /api/suppliers/documents-summary
   * 📊 返回数据: 供应商资料汇总数据
   * 🎨 显示模式: 支持表格和卡片两种显示方式
   */
  async loadDocuments() {
    try {
      this.showLoading();
      console.log('📊 开始加载供应商资料汇总数据...');
      
      // 检查认证token
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.error('❌ 没有找到认证token');
        this.showError('请先登录');
        return;
      }
      
      const response = await fetch('/api/suppliers/documents-summary', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.documentsSummary = result.data;
        
        // 根据当前显示模式渲染
        if (this.viewMode === 'table') {
          this.renderDocumentsTable();
        } else {
          this.renderDocumentsCards();
        }
      } else {
        this.showError(result.error || '加载资料列表失败');
      }
    } catch (error) {
      console.error('❌ 加载资料列表失败:', error);
      this.showError(`加载资料列表失败: ${error.message}`);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * 渲染资料列表
   */
  renderDocuments() {
    const container = document.getElementById('documentsContainer');
    if (!container) return;

    if (!this.documentsSummary || this.documentsSummary.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <div class="empty-text">暂无供应商资料数据</div>
          <div class="empty-hint">请先上传资料或点击刷新按钮导入供应商</div>
        </div>
      `;
      return;
    }

    // 根据当前显示模式渲染
    if (this.displayMode === 'detail') {
      // 详情模式已经通过showSupplierDetail单独处理
      return;
    } else if (this.displayMode === 'grouped') {
      this.renderStatusGroupedTable();
    } else {
      this.renderDocumentsTable();
    }
  }

  /**
   * 计算供应商整体状态
   */
  calculateSupplierStatus(supplier) {
    const documents = supplier.documents || {};
    const documentTypes = Object.keys(documents);
    
    let hasExpired = false;
    let hasCritical = false;
    let hasWarning = false;
    
    documentTypes.forEach(type => {
      const doc = documents[type];
      if (!doc || !doc.hasDocument) return;
      
      if (doc.status === 'expired') {
        hasExpired = true;
      } else if (doc.expiryDate) {
        const daysUntilExpiry = this.calculateDaysUntilExpiry(doc.expiryDate);
        if (daysUntilExpiry < 0) {
          hasExpired = true;
        } else if (daysUntilExpiry <= 7) {
          hasCritical = true;
        } else if (daysUntilExpiry <= 30) {
          hasWarning = true;
        }
      }
    });
    
    if (hasExpired) return 'urgent';
    if (hasCritical) return 'urgent';
    if (hasWarning) return 'warning';
    return 'normal';
  }

  /**
   * 按状态分组供应商
   */
  groupSuppliersByStatus(suppliers) {
    // 重置分组
    this.statusGroups.urgent.suppliers = [];
    this.statusGroups.warning.suppliers = [];
    this.statusGroups.normal.suppliers = [];
    
    suppliers.forEach(supplier => {
      const status = this.calculateSupplierStatus(supplier);
      this.statusGroups[status].suppliers.push(supplier);
    });
    
    return this.statusGroups;
  }

  /**
   * 渲染状态分组表格
   */
  renderStatusGroupedTable() {
    const container = document.getElementById('documentsContainer');
    if (!container) return;

    console.log(`🏗️ 开始渲染状态分组表格，供应商数量: ${this.documentsSummary.length}`);

    // 分组数据
    const groupedData = this.groupSuppliersByStatus(this.documentsSummary);
    
    // 清空容器
    container.innerHTML = '';
    
    // 创建分组容器
    const groupedContainer = document.createElement('div');
    groupedContainer.className = 'status-grouped-container';
    groupedContainer.style.cssText = `
      width: 100%;
      background: var(--background-primary);
      border-radius: 12px;
      padding: 20px;
    `;

    // 渲染每个状态分组
    Object.values(groupedData).forEach(group => {
      if (group.suppliers.length === 0) return;
      
      const groupElement = this.createStatusGroupElement(group);
      groupedContainer.appendChild(groupElement);
    });

    container.appendChild(groupedContainer);
  }

  /**
   * 创建状态分组元素
   */
  createStatusGroupElement(group) {
    const groupDiv = document.createElement('div');
    groupDiv.className = `status-group status-${group.name}`;
    groupDiv.style.cssText = `
      margin-bottom: 20px;
      border: 1px solid var(--border-primary);
      border-radius: 8px;
      overflow: hidden;
    `;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'group-header';
    headerDiv.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: ${group.name === 'urgent' ? 'var(--error-100)' : group.name === 'warning' ? 'var(--warning-100)' : 'var(--success-100)'};
      cursor: pointer;
      user-select: none;
    `;
    
    headerDiv.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <h3 style="margin: 0; color: var(--text-primary); font-size: 16px; font-weight: 600;">
          ${group.title}
        </h3>
        <span style="background: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; color: var(--text-secondary);">
          ${group.suppliers.length}家
        </span>
      </div>
      <button class="toggle-group-btn" style="
        background: transparent;
        border: none;
        font-size: 16px;
        cursor: pointer;
        padding: 4px 8px;
        border-radius: 4px;
        transition: transform 0.2s ease;
        transform: ${group.expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
      ">
        ▼
      </button>
    `;

    // 点击展开/收起
    headerDiv.addEventListener('click', () => {
      group.expanded = !group.expanded;
      this.renderStatusGroupedTable(); // 重新渲染
    });

    groupDiv.appendChild(headerDiv);

    // 如果展开，显示供应商表格
    if (group.expanded) {
      const tableContainer = this.createGroupTableContainer(group.suppliers);
      groupDiv.appendChild(tableContainer);
    }

    return groupDiv;
  }

  /**
   * 创建分组表格容器
   */
  createGroupTableContainer(suppliers) {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'group-table-container';
    tableContainer.style.cssText = `
      padding: 0 20px 20px 20px;
    `;

    const table = document.createElement('table');
    table.className = 'supplier-group-table';
    table.style.cssText = `
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    `;

    // 表头
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr style="background: var(--background-secondary);">
        <th style="padding: 12px 16px; text-align: left; border-bottom: 2px solid var(--border-primary); font-weight: 600;">
          <input type="checkbox" id="selectAll-${Date.now()}" style="margin-right: 8px;">
          供应商名称
        </th>
        <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--border-primary); font-weight: 600;">联系人</th>
        <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--border-primary); font-weight: 600;">质保协议</th>
        <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--border-primary); font-weight: 600;">ROHS</th>
        <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--border-primary); font-weight: 600;">REACH</th>
        <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--border-primary); font-weight: 600;">MSDS</th>
        <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--border-primary); font-weight: 600;">HF</th>
        <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--border-primary); font-weight: 600;">CSR</th>
        <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--border-primary); font-weight: 600;">操作</th>
      </tr>
    `;

    // 表体
    const tbody = document.createElement('tbody');
    tbody.innerHTML = suppliers.map(supplier => this.createGroupedSupplierRow(supplier)).join('');

    table.appendChild(thead);
    table.appendChild(tbody);
    tableContainer.appendChild(table);

    return tableContainer;
  }

  /**
   * 创建分组中的供应商行 - 支持内嵌展开
   */
  createGroupedSupplierRow(supplier) {
    const status = this.calculateSupplierStatus(supplier);
    const stats = this.calculateSupplierStats(supplier);
    const statusClass = status === 'urgent' ? 'status-expired' : status === 'warning' ? 'status-warning' : 'status-normal';
    const statusText = status === 'urgent' ? '🔴 紧急' : status === 'warning' ? '🟡 警告' : '🟢 正常';
    const supplierId = supplier.supplierId;
    
    // 生成唯一ID
    const expandId = `supplier-expand-${supplierId}`;
    const toggleId = `supplier-toggle-${supplierId}`;

    let rowHtml = `
      <tr style="border-bottom: 1px solid var(--border-primary); transition: background-color 0.2s ease;">
        <!-- 第1列: 复选框 + 供应商名称 -->
        <td style="padding: 12px 16px; font-weight: 600; color: var(--text-primary);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <!-- 展开/收起图标 -->
            <span id="${toggleId}" style="
              font-size: 12px;
              transition: transform 0.2s ease;
              color: var(--text-secondary);
              cursor: pointer;
            " onclick="supplierManager.toggleSupplierExpand('${supplierId}')">▶</span>
            
            <!-- 复选框 -->
            <input type="checkbox" data-supplier-id="${supplierId}" onclick="event.stopPropagation()">
            
            <!-- 供应商名称 -->
            <span style="cursor: pointer;" onclick="supplierManager.toggleSupplierExpand('${supplierId}')">
              🏢 ${supplier.supplierName}
            </span>
          </div>
        </td>
        
        <!-- 第2列: 联系人 -->
        <td style="padding: 12px 16px; text-align: center; color: var(--text-secondary);">
          ${supplier.contactPerson || '-'}
        </td>
        
        <!-- 第3列: 质保协议 -->
        <td style="padding: 12px 16px; text-align: center;">
          ${this.renderDocumentStatusCell(supplier.documents, 'quality_agreement')}
        </td>
        
        <!-- 第4列: ROHS -->
        <td style="padding: 12px 16px; text-align: center;">
          ${this.renderDocumentStatusCell(supplier.documents, 'environmental_rohs')}
        </td>
        
        <!-- 第5列: REACH -->
        <td style="padding: 12px 16px; text-align: center;">
          ${this.renderDocumentStatusCell(supplier.documents, 'environmental_reach')}
        </td>
        
        <!-- 第6列: MSDS -->
        <td style="padding: 12px 16px; text-align: center;">
          ${this.renderDocumentStatusCell(supplier.documents, 'environmental_msds')}
        </td>
        
        <!-- 第7列: HF -->
        <td style="padding: 12px 16px; text-align: center;">
          ${this.renderDocumentStatusCell(supplier.documents, 'environmental_hf')}
        </td>
        
        <!-- 第8列: CSR -->
        <td style="padding: 12px 16px; text-align: center;">
          ${this.renderDocumentStatusCell(supplier.documents, 'csr')}
        </td>
        
        <!-- 第9列: 状态和操作 -->
        <td style="padding: 12px 16px; text-align: center;">
          <div style="display: flex; flex-direction: column; gap: 8px; align-items: center;">
            <!-- 状态标签 -->
            <span class="status-badge ${statusClass}" style="
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
            ">${statusText}</span>
            
            <!-- 快速操作 -->
            <div class="quick-actions" style="display: flex; gap: 4px;">
              <button class="btn btn-sm btn-primary" onclick="supplierManager.quickUpload('${supplierId}')" title="快速上传" style="padding: 4px 6px; font-size: 12px;">
                📤
              </button>
              <button class="btn btn-sm btn-secondary" onclick="supplierManager.quickEmail('${supplierId}')" title="邮件通知" style="padding: 4px 6px; font-size: 12px;">
                📧
              </button>
              <button class="btn btn-sm btn-secondary" onclick="supplierManager.quickExport('${supplierId}')" title="导出报告" style="padding: 4px 6px; font-size: 12px;">
                📊
              </button>
            </div>
          </div>
        </td>
      </tr>
      
      <!-- 展开的详细内容行 -->
      <tr id="${expandId}-row" style="display: none;">
        <td colspan="9" style="padding: 0; background: var(--background-secondary);">
          <div id="${expandId}" class="supplier-detail-content" style="
            padding: 20px;
            border-top: 1px solid var(--border-primary);
          ">
            ${this.renderEmbeddedSupplierDetail(supplier)}
          </div>
        </td>
      </tr>
    `;

    return rowHtml;
  }

  /**
   * 渲染文档状态单元格
   */
  renderDocumentStatusCell(documents, docType) {
    const doc = documents[docType];
    if (!doc || !doc.hasDocument) {
      return `<span style="color: var(--text-secondary); font-style: italic;">-</span>`;
    }
    
    const statusClass = this.getDocumentStatusClass(doc.expiryDate, doc.status);
    const expiryText = doc.expiryDate ? this.formatExpiryDate(doc.expiryDate) : '永久有效';
    
    return `<span class="status-indicator ${statusClass}" style="
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s ease;
    " title="${this.getDocumentTypeName(docType)}: ${expiryText}">${expiryText}</span>`;
  }

  /**
   * 获取文档类型名称
   */
  getDocumentTypeName(docType) {
    const typeNames = {
      'quality_agreement': '质量保证协议',
      'environmental_rohs': 'ROHS',
      'environmental_reach': 'REACH', 
      'environmental_msds': 'MSDS',
      'environmental_hf': 'HF',
      'csr': 'CSR'
    };
    return typeNames[docType] || docType;
  }

  /**
   * 切换供应商展开状态
   */
  toggleSupplierExpand(supplierId) {
    const expandId = `supplier-expand-${supplierId}`;
    const toggleId = `supplier-toggle-${supplierId}`;
    const expandRow = document.getElementById(`${expandId}-row`);
    const expandElement = document.getElementById(expandId);
    const toggleElement = document.getElementById(toggleId);
    
    if (expandRow.style.display === 'none' || !expandRow.style.display) {
      expandRow.style.display = 'table-row';
      toggleElement.style.transform = 'rotate(90deg)';
      toggleElement.textContent = '▼';
    } else {
      expandRow.style.display = 'none';
      toggleElement.style.transform = 'rotate(0deg)';
      toggleElement.textContent = '▶';
    }
  }

  /**
   * 渲染内嵌的供应商详情
   */
  renderEmbeddedSupplierDetail(supplier) {
    const documents = supplier.documents || {};
    
    return `
      <div style="padding: 20px;">
        <!-- 层级管理区域 -->
        <div class="hierarchical-management" style="display: grid; gap: 16px;">
          
          <!-- 供应商级资料 -->
          <div class="hierarchy-level">
            <div class="level-header" style="
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 12px 16px;
              background: white;
              border: 1px solid var(--border-primary);
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              color: var(--text-primary);
            " onclick="this.parentElement.classList.toggle('expanded')">
              📁 供应商级资料
              <span style="margin-left: auto; font-size: 12px; color: var(--text-secondary);">点击展开 ▶</span>
            </div>
            <div class="level-content" style="
              display: none;
              margin-top: 8px;
              padding: 16px;
              background: white;
              border: 1px solid var(--border-primary);
              border-radius: 8px;
            ">
              ${this.renderSupplierLevelTable(documents)}
            </div>
          </div>

          <!-- 物料管理 -->
          <div class="hierarchy-level">
            <div class="level-header" style="
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 12px 16px;
              background: white;
              border: 1px solid var(--border-primary);
              border-radius: 8px;
              cursor: pointer;
              font-weight: 600;
              color: var(--text-primary);
            " onclick="this.parentElement.classList.toggle('expanded')">
              🏭 物料管理
              <span style="margin-left: auto; font-size: 12px; color: var(--text-secondary);">点击展开 ▶</span>
            </div>
            <div class="level-content" style="
              display: none;
              margin-top: 8px;
              padding: 16px;
              background: white;
              border: 1px solid var(--border-primary);
              border-radius: 8px;
            ">
              ${this.renderMaterialLevelTable(documents)}
            </div>
          </div>
          
        </div>
      </div>
    `;
  }

  /**
   * 渲染供应商级文档表格
   */
  renderSupplierLevelTable(documents) {
    const supplierDocs = [
      { key: 'quality_agreement', name: '质量保证协议', icon: '📄' },
      { key: 'csr', name: 'CSR报告', icon: '🤝' }
    ];

    return `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: var(--background-secondary);">
            <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">文档类型</th>
            <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">文档名称</th>
            <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">到期日期</th>
            <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">状态</th>
            <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">操作</th>
          </tr>
        </thead>
        <tbody>
          ${supplierDocs.map(docType => this.renderDocumentRow(docType, documents[docType.key])).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * 渲染物料级文档表格
   */
  renderMaterialLevelTable(documents) {
    const materialDocs = [
      { key: 'environmental_rohs', name: 'ROHS', icon: '🌱' },
      { key: 'environmental_reach', name: 'REACH', icon: '🔬' },
      { key: 'environmental_msds', name: 'MSDS', icon: '⚠️' },
      { key: 'environmental_hf', name: 'HF', icon: '🧪' }
    ];

    return `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: var(--background-secondary);">
            <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">文档类型</th>
            <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">文档名称</th>
            <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">到期日期</th>
            <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">状态</th>
            <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">操作</th>
          </tr>
        </thead>
        <tbody>
          ${materialDocs.map(docType => this.renderDocumentRow(docType, documents[docType.key])).join('')}
        </tbody>
      </table>
      
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-primary); display: flex; gap: 8px;">
        <button class="btn btn-primary btn-sm" onclick="supplierManager.addMaterial()">
          + 添加物料
        </button>
        <button class="btn btn-secondary btn-sm" onclick="supplierManager.addComponent()">
          + 添加具体构成
        </button>
      </div>
    `;
  }

  /**
   * 快速操作方法
   */
  quickUpload(supplierId) {
    console.log('快速上传:', supplierId);
    this.showToast('快速上传功能开发中...', 'info');
  }

  quickEmail(supplierId) {
    console.log('快速邮件:', supplierId);
    this.showToast('邮件通知功能开发中...', 'info');
  }

  quickExport(supplierId) {
    console.log('快速导出:', supplierId);
    this.showToast('报告导出功能开发中...', 'info');
  }

  /**
   * 渲染资料表格
   * 功能: 渲染按供应商分组的资料表格，直观显示所有供应商的资料状态
   */
  renderDocumentsTable() {
    const container = document.getElementById('documentsContainer');
    if (!container) return;

    console.log(`🏗️ 开始渲染表格，供应商数量: ${this.documentsSummary.length}`);
    console.log(`🏗️ 当前视图模式: ${this.viewMode}`);
    console.log(`🏗️ 容器类名: ${container.className}`);
    console.log(`🏗️ 容器计算样式: ${window.getComputedStyle(container).display}`);

    // 完全清空容器
    container.innerHTML = '';
    
    // 创建新的表格容器
    const tableContainer = document.createElement('div');
    tableContainer.className = 'supplier-table-wrapper';
    tableContainer.style.cssText = `
      width: 100%;
      padding: 20px;
      background: var(--background-primary);
      border-radius: 12px;
      box-shadow: var(--shadow-sm);
      display: block !important;
      position: static !important;
      grid-column: 1 / -1 !important;
      grid-row: auto !important;
    `;

    // 创建表格头部
    const headerDiv = document.createElement('div');
    headerDiv.className = 'table-header';
    headerDiv.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: var(--text-primary); font-size: 18px; font-weight: 600;">
        供应商资料汇总表
      </h3>
      <div style="color: var(--text-secondary); font-size: 14px;">
        总供应商: ${this.documentsSummary.length} 家
      </div>
    `;

    // 创建表格包装器
    const tableWrapper = document.createElement('div');
    tableWrapper.style.cssText = `
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid var(--border-primary);
      background: white;
    `;

    // 创建表格
    const table = document.createElement('table');
    table.className = 'supplier-data-table';
    table.style.cssText = `
      width: 100%;
      min-width: 900px;
      border-collapse: collapse;
      font-size: 14px;
    `;

    // 创建表头
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr style="background: var(--background-secondary);">
        <th style="padding: 12px 16px; text-align: left; border-bottom: 2px solid var(--border-primary); font-weight: 600; color: var(--text-primary); white-space: nowrap;">供应商</th>
        <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--border-primary); font-weight: 600; color: var(--text-primary); white-space: nowrap; min-width: 120px;">质保协议</th>
        <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--border-primary); font-weight: 600; color: var(--text-primary); white-space: nowrap; min-width: 120px;">ROHS</th>
        <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--border-primary); font-weight: 600; color: var(--text-primary); white-space: nowrap; min-width: 120px;">REACH</th>
        <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--border-primary); font-weight: 600; color: var(--text-primary); white-space: nowrap; min-width: 120px;">MSDS</th>
        <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--border-primary); font-weight: 600; color: var(--text-primary); white-space: nowrap; min-width: 120px;">HF</th>
        <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--border-primary); font-weight: 600; color: var(--text-primary); white-space: nowrap; min-width: 120px;">CSR</th>
        <th style="padding: 12px 16px; text-align: center; border-bottom: 2px solid var(--border-primary); font-weight: 600; color: var(--text-primary); white-space: nowrap; min-width: 100px;">状态</th>
      </tr>
    `;

    // 创建表体
    const tbody = document.createElement('tbody');
    tbody.innerHTML = this.documentsSummary.map(supplier => this.createSupplierTableRow(supplier)).join('');

    // 组装表格
    table.appendChild(thead);
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    
    // 组装完整容器
    tableContainer.appendChild(headerDiv);
    tableContainer.appendChild(tableWrapper);
    container.appendChild(tableContainer);
    
    // 强制覆盖父容器的grid样式
    container.style.cssText = `
      display: block !important;
      position: static !important;
      width: 100% !important;
      height: auto !important;
      grid-template-columns: unset !important;
      grid-template-rows: unset !important;
      gap: unset !important;
    `;
    
    console.log(`🏗️ 表格容器添加完成，强制覆盖grid样式`);
    console.log(`🏗️ 最终容器样式: ${window.getComputedStyle(container).display}`);
  }

  /**
   * 渲染资料卡片
   * 功能: 以卡片形式展示供应商资料，更直观的视觉效果
   */
  renderDocumentsCards() {
    const container = document.getElementById('documentsContainer');
    if (!container) return;

    console.log(`🏗️ 渲染 ${this.documentsSummary.length} 个供应商的资料卡片`);

    // 创建卡片HTML
    const cardsHtml = `
      <div class="documents-cards-container">
        <div class="cards-header">
          <h3>供应商资料卡片</h3>
          <div class="cards-stats">
            总供应商: ${this.documentsSummary.length} 家
          </div>
        </div>
        <div class="cards-grid">
          ${this.documentsSummary.map(supplier => this.createSupplierCard(supplier)).join('')}
        </div>
      </div>
    `;

    container.innerHTML = cardsHtml;
  }

  /**
   * 创建供应商卡片
   */
  createSupplierCard(supplier) {
    const documentTypes = [
      { key: 'quality_agreement', name: '质保协议', icon: '📄' },
      { key: 'environmental_rohs', name: 'ROHS', icon: '🌿' },
      { key: 'environmental_reach', name: 'REACH', icon: '🔬' },
      { key: 'environmental_msds', name: 'MSDS', icon: '⚠️' },
      { key: 'environmental_hf', name: 'HF', icon: '🧪' },
      { key: 'csr', name: 'CSR', icon: '🤝' }
    ];

    // 创建资料状态项
    const documentItems = documentTypes.map(type => {
      const doc = supplier.documents[type.key];
      if (!doc || !doc.hasDocument) {
        return `
          <div class="doc-item missing">
            <span class="doc-icon">${type.icon}</span>
            <span class="doc-name">${type.name}</span>
            <span class="doc-status">缺失</span>
          </div>
        `;
      }

      const statusClass = this.getDocumentStatusClass(doc.expiryDate, doc.status);
      const expiryText = doc.expiryDate ? this.formatExpiryDate(doc.expiryDate) : '永久有效';

      return `
        <div class="doc-item ${statusClass}">
          <span class="doc-icon">${type.icon}</span>
          <span class="doc-name">${type.name}</span>
          <span class="doc-expiry">${expiryText}</span>
        </div>
      `;
    }).join('');

    // 计算整体状态
    const overallStatus = this.calculateOverallStatus(supplier.documents);
    const statusClass = this.getOverallStatusClass(overallStatus);

    return `
      <div class="supplier-card">
        <div class="card-header">
          <h4 class="supplier-name">${supplier.supplierName}</h4>
          <div class="overall-status ${statusClass}">${overallStatus}</div>
        </div>
        <div class="card-body">
          <div class="documents-list">
            ${documentItems}
          </div>
        </div>
      </div>
    `;
  }

  

  /**
   * 创建供应商表格行
   */
  createSupplierTableRow(supplier) {
    const documentTypes = [
      { key: 'quality_agreement', name: '质保协议' },
      { key: 'environmental_rohs', name: 'ROHS' },
      { key: 'environmental_reach', name: 'REACH' },
      { key: 'environmental_msds', name: 'MSDS' },
      { key: 'environmental_hf', name: 'HF' },
      { key: 'csr', name: 'CSR' }
    ];

    // 创建行
    const tr = document.createElement('tr');
    tr.style.cssText = 'border-bottom: 1px solid var(--border-primary); transition: background-color 0.2s ease;';
    
    // 供应商名称单元格
    const nameCell = document.createElement('td');
    nameCell.style.cssText = 'padding: 12px 16px; font-weight: 600; color: var(--text-primary); min-width: 150px;';
    nameCell.textContent = supplier.supplierName;
    tr.appendChild(nameCell);

    // 资料状态单元格
    documentTypes.forEach(type => {
      const doc = supplier.documents[type.key];
      const cell = document.createElement('td');
      
      if (!doc || !doc.hasDocument) {
        cell.style.cssText = 'padding: 12px 16px; text-align: center; color: var(--text-secondary); font-style: italic;';
        cell.textContent = '-';
        cell.className = 'status-missing';
      } else {
        const statusClass = this.getDocumentStatusClass(doc.expiryDate, doc.status);
        const expiryText = doc.expiryDate ? this.formatExpiryDate(doc.expiryDate) : '永久有效';
        
        cell.style.cssText = 'padding: 12px 16px; text-align: center; font-size: 14px;';
        cell.textContent = expiryText;
        cell.className = statusClass;
        cell.title = `${type.name}: ${expiryText}`;
      }
      
      tr.appendChild(cell);
    });

    // 整体状态单元格
    const statusCell = document.createElement('td');
    const overallStatus = this.calculateOverallStatus(supplier.documents);
    const statusClass = this.getOverallStatusClass(overallStatus);
    
    statusCell.style.cssText = 'padding: 12px 16px; text-align: center; font-weight: 600;';
    statusCell.textContent = overallStatus;
    statusCell.className = statusClass;
    tr.appendChild(statusCell);

    return tr.outerHTML;
  }

  /**
   * 获取资料状态样式类
   */
  getDocumentStatusClass(expiryDate, status) {
    if (status === 'expired') return 'status-expired';
    if (status === 'archived') return 'status-archived';
    
    if (!expiryDate) return 'status-permanent';
    
    const daysUntilExpiry = this.calculateDaysUntilExpiry(expiryDate);
    if (daysUntilExpiry < 0) return 'status-expired';
    if (daysUntilExpiry <= 7) return 'status-critical';
    if (daysUntilExpiry <= 30) return 'status-warning';
    return 'status-normal';
  }

  /**
   * 计算整体状态
   */
  calculateOverallStatus(documents) {
    const documentTypes = Object.keys(documents);
    const hasExpired = documentTypes.some(type => 
      documents[type].status === 'expired' || 
      (documents[type].expiryDate && this.calculateDaysUntilExpiry(documents[type].expiryDate) < 0)
    );
    
    const hasCritical = documentTypes.some(type => {
      const doc = documents[type];
      return doc.hasDocument && doc.expiryDate && 
             this.calculateDaysUntilExpiry(doc.expiryDate) <= 7 && 
             this.calculateDaysUntilExpiry(doc.expiryDate) >= 0;
    });
    
    const hasWarning = documentTypes.some(type => {
      const doc = documents[type];
      return doc.hasDocument && doc.expiryDate && 
             this.calculateDaysUntilExpiry(doc.expiryDate) <= 30 && 
             this.calculateDaysUntilExpiry(doc.expiryDate) > 7;
    });
    
    if (hasExpired) return '❌ 已过期';
    if (hasCritical) return '🔴 即将到期';
    if (hasWarning) return '🟡 需要关注';
    return '✅ 正常';
  }

  /**
   * 获取整体状态样式类
   */
  getOverallStatusClass(status) {
    if (status.includes('已过期')) return 'status-expired';
    if (status.includes('即将到期')) return 'status-critical';
    if (status.includes('需要关注')) return 'status-warning';
    return 'status-normal';
  }

  /**
   * 计算距离到期天数
   * 修复: 使用本地时间开始点计算，避免时区问题
   */
  calculateDaysUntilExpiry(expiryDate) {
    if (!expiryDate) return null;
    
    const now = new Date();
    const expiry = new Date(expiryDate);
    
    // 使用本地时间的开始和结束来计算天数，避免时区问题
    const nowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expiryStart = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
    
    const diffTime = expiryStart - nowStart;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * 显示供应商详情视图
   */
  showSupplierDetail(supplierId) {
    this.currentSupplierId = supplierId;
    this.displayMode = 'detail';
    
    const supplier = this.documentsSummary.find(s => s.supplierId === supplierId);
    if (!supplier) {
      this.showError('未找到供应商信息');
      return;
    }
    
    this.renderSupplierDetailView(supplier);
  }

  /**
   * 返回总览视图
   */
  backToOverview() {
    this.currentSupplierId = null;
    this.displayMode = 'grouped';
    this.loadDocuments();
  }

  /**
   * 渲染供应商详情视图
   */
  renderSupplierDetailView(supplier) {
    const container = document.getElementById('documentsContainer');
    if (!container) return;

    console.log(`🏗️ 渲染供应商详情: ${supplier.supplierName}`);

    // 计算统计信息
    const stats = this.calculateSupplierStats(supplier);
    const overallStatus = this.calculateSupplierStatus(supplier);
    const statusClass = overallStatus === 'urgent' ? 'status-expired' : overallStatus === 'warning' ? 'status-warning' : 'status-normal';
    const statusText = overallStatus === 'urgent' ? '🔴 需要关注' : overallStatus === 'warning' ? '🟡 需要关注' : '🟢 状态正常';

    const detailHtml = `
      <div class="supplier-detail-view">
        <!-- 返回按钮和标题 -->
        <div class="detail-header" style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 16px 20px;
          background: var(--background-secondary);
          border-radius: 8px;
        ">
          <button class="btn btn-secondary" onclick="supplierManager.backToOverview()" style="
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            ← 返回总览
          </button>
          <h2 style="margin: 0; color: var(--text-primary); font-size: 20px; font-weight: 600;">
            🏢 ${supplier.supplierName} - 详细资料管理
          </h2>
          <div style="width: 100px;"></div>
        </div>

        <!-- 供应商概览卡片 -->
        <div class="supplier-overview-card" style="
          background: white;
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 20px;
          box-shadow: var(--shadow-sm);
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
            <div>
              <h3 style="margin: 0 0 12px 0; color: var(--text-primary); font-size: 18px;">
                供应商概览
              </h3>
              <div style="display: flex; gap: 24px; flex-wrap: wrap;">
                <div style="color: var(--text-secondary); font-size: 14px;">
                  <span style="color: var(--text-primary); font-weight: 600;">联系人:</span> 
                  ${supplier.contactPerson || '未设置'}
                </div>
                <div style="color: var(--text-secondary); font-size: 14px;">
                  <span style="color: var(--text-primary); font-weight: 600;">邮箱:</span> 
                  ${supplier.contactEmail || '未设置'}
                </div>
                <div style="color: var(--text-secondary); font-size: 14px;">
                  <span style="color: var(--text-primary); font-weight: 600;">电话:</span> 
                  ${supplier.contactPhone || '未设置'}
                </div>
              </div>
            </div>
            <div class="status-badge ${statusClass}" style="
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 14px;
              font-weight: 600;
            ">
              📊 整体状态: ${statusText}
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
            <div style="text-align: center; padding: 16px; background: var(--background-secondary); border-radius: 8px;">
              <div style="font-size: 24px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">
                ${stats.totalDocs}
              </div>
              <div style="font-size: 14px; color: var(--text-secondary);">文档总数</div>
            </div>
            <div style="text-align: center; padding: 16px; background: var(--error-100); border-radius: 8px;">
              <div style="font-size: 24px; font-weight: 600; color: var(--error-700); margin-bottom: 4px;">
                ${stats.expiredDocs}
              </div>
              <div style="font-size: 14px; color: var(--text-secondary);">已过期</div>
            </div>
            <div style="text-align: center; padding: 16px; background: var(--warning-100); border-radius: 8px;">
              <div style="font-size: 24px; font-weight: 600; color: var(--warning-700); margin-bottom: 4px;">
                ${stats.expiringDocs}
              </div>
              <div style="font-size: 14px; color: var(--text-secondary);">即将到期</div>
            </div>
            <div style="text-align: center; padding: 16px; background: var(--success-100); border-radius: 8px;">
              <div style="font-size: 24px; font-weight: 600; color: var(--success-700); margin-bottom: 4px;">
                ${stats.normalDocs}
              </div>
              <div style="font-size: 14px; color: var(--text-secondary);">状态正常</div>
            </div>
          </div>

          <div style="display: flex; gap: 12px;">
            <button class="btn btn-primary" onclick="supplierManager.uploadDocument()">
              📤 上传文档
            </button>
            <button class="btn btn-secondary" onclick="supplierManager.sendEmailNotification()">
              📧 邮件通知
            </button>
            <button class="btn btn-secondary" onclick="supplierManager.exportReport()">
              📊 导出报告
            </button>
          </div>
        </div>

        <!-- 层级管理区域 -->
        <div class="hierarchical-management">
          ${this.renderHierarchicalDocuments(supplier)}
        </div>
      </div>
    `;

    container.innerHTML = detailHtml;
  }

  /**
   * 计算供应商统计信息
   */
  calculateSupplierStats(supplier) {
    const documents = supplier.documents || {};
    const documentTypes = Object.keys(documents);
    
    let totalDocs = 0;
    let expiredDocs = 0;
    let expiringDocs = 0;
    let normalDocs = 0;
    
    documentTypes.forEach(type => {
      const doc = documents[type];
      if (doc && doc.hasDocument) {
        totalDocs++;
        
        if (doc.status === 'expired') {
          expiredDocs++;
        } else if (doc.expiryDate) {
          const daysUntilExpiry = this.calculateDaysUntilExpiry(doc.expiryDate);
          if (daysUntilExpiry < 0) {
            expiredDocs++;
          } else if (daysUntilExpiry <= 30) {
            expiringDocs++;
          } else {
            normalDocs++;
          }
        } else {
          normalDocs++;
        }
      }
    });
    
    return { totalDocs, expiredDocs, expiringDocs, normalDocs };
  }

  /**
   * 渲染层级文档管理
   */
  renderHierarchicalDocuments(supplier) {
    const documents = supplier.documents || {};
    
    // 供应商级文档
    const supplierDocs = [
      { key: 'quality_agreement', name: '质量保证协议', icon: '📄' },
      { key: 'csr', name: 'CSR报告', icon: '🤝' }
    ];

    // 物料级文档 (模拟数据，后续从数据库获取)
    const materialDocs = [
      { key: 'environmental_rohs', name: 'ROHS', icon: '🌱' },
      { key: 'environmental_reach', name: 'REACH', icon: '🔬' },
      { key: 'environmental_msds', name: 'MSDS', icon: '⚠️' },
      { key: 'environmental_hf', name: 'HF', icon: '🧪' }
    ];

    let html = `
      <!-- 供应商级资料 -->
      <div class="hierarchy-level" style="margin-bottom: 20px;">
        <div class="level-header" style="
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--background-secondary);
          border-radius: 8px 8px 0 0;
          cursor: pointer;
          font-weight: 600;
          color: var(--text-primary);
        " onclick="this.parentElement.classList.toggle('expanded')">
          📁 供应商级资料
          <span style="margin-left: auto; font-size: 12px; color: var(--text-secondary);">点击展开</span>
        </div>
        <div class="level-content" style="
          display: none;
          border: 1px solid var(--border-primary);
          border-top: none;
          border-radius: 0 0 8px 8px;
          padding: 16px;
          background: white;
        ">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: var(--background-secondary);">
                <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">文档类型</th>
                <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">文档名称</th>
                <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">到期日期</th>
                <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">状态</th>
                <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">操作</th>
              </tr>
            </thead>
            <tbody>
              ${supplierDocs.map(docType => this.renderDocumentRow(docType, documents[docType.key])).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- 物料级管理 -->
      <div class="hierarchy-level">
        <div class="level-header" style="
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--background-secondary);
          border-radius: 8px 8px 0 0;
          cursor: pointer;
          font-weight: 600;
          color: var(--text-primary);
        " onclick="this.parentElement.classList.toggle('expanded')">
          🏭 物料管理
          <span style="margin-left: auto; font-size: 12px; color: var(--text-secondary);">点击展开</span>
        </div>
        <div class="level-content" style="
          display: none;
          border: 1px solid var(--border-primary);
          border-top: none;
          border-radius: 0 0 8px 8px;
          padding: 16px;
          background: white;
        ">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: var(--background-secondary);">
                <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">文档类型</th>
                <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">文档名称</th>
                <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">到期日期</th>
                <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">状态</th>
                <th style="padding: 8px 12px; text-align: left; font-weight: 600; font-size: 14px;">操作</th>
              </tr>
            </thead>
            <tbody>
              ${materialDocs.map(docType => this.renderDocumentRow(docType, documents[docType.key])).join('')}
            </tbody>
          </table>
          
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-primary);">
            <button class="btn btn-primary" onclick="supplierManager.addMaterial()">
              + 添加物料
            </button>
            <button class="btn btn-secondary" onclick="supplierManager.addComponent()">
              + 添加具体构成
            </button>
          </div>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * 渲染文档行
   */
  renderDocumentRow(docType, doc) {
    if (!doc || !doc.hasDocument) {
      return `
        <tr style="border-bottom: 1px solid var(--border-primary);">
          <td style="padding: 12px; color: var(--text-secondary);">
            ${docType.icon} ${docType.name}
          </td>
          <td style="padding: 12px; color: var(--text-secondary); font-style: italic;">
            暂无文档
          </td>
          <td style="padding: 12px; color: var(--text-secondary);">-</td>
          <td style="padding: 12px;">
            <span style="color: var(--text-secondary); font-style: italic;">缺失</span>
          </td>
          <td style="padding: 12px;">
            <button class="btn btn-sm btn-primary" onclick="supplierManager.uploadDocument('${docType.key}')">
              上传
            </button>
          </td>
        </tr>
      `;
    }

    const statusClass = this.getDocumentStatusClass(doc.expiryDate, doc.status);
    const expiryText = doc.expiryDate ? this.formatExpiryDate(doc.expiryDate) : '永久有效';
    const statusText = this.getStatusText(doc);

    return `
      <tr style="border-bottom: 1px solid var(--border-primary);">
        <td style="padding: 12px; color: var(--text-primary); font-weight: 500;">
          ${docType.icon} ${docType.name}
        </td>
        <td style="padding: 12px; color: var(--text-primary);">
          ${doc.documentName || '-'}
        </td>
        <td style="padding: 12px; color: var(--text-primary);">
          ${expiryText}
        </td>
        <td style="padding: 12px;">
          <span class="status-badge ${statusClass}" style="
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
          ">
            ${statusText}
          </span>
        </td>
        <td style="padding: 12px;">
          <button class="btn btn-sm btn-success" onclick="supplierManager.downloadDocument(${doc.id})" style="margin-right: 4px;">
            下载
          </button>
          <button class="btn btn-sm btn-warning" onclick="supplierManager.editDocument(${doc.id})" style="margin-right: 4px;">
            编辑
          </button>
          <button class="btn btn-sm btn-primary" onclick="supplierManager.uploadDocument('${docType.key}')">
            更新
          </button>
        </td>
      </tr>
    `;
  }

  /**
   * 占位方法 - 后续实现
   */
  uploadDocument(docType) {
    console.log('上传文档:', docType);
    this.showUploadModal();
  }

  sendEmailNotification() {
    console.log('发送邮件通知');
    this.showToast('邮件通知功能开发中...', 'info');
  }

  exportReport() {
    console.log('导出报告');
    this.showToast('报告导出功能开发中...', 'info');
  }

  addMaterial() {
    console.log('添加物料');
    this.showToast('物料管理功能开发中...', 'info');
  }

  addComponent() {
    console.log('添加具体构成');
    this.showToast('构成管理功能开发中...', 'info');
  }

  /**
   * 格式化到期日期
   */
  formatExpiryDate(expiryDate) {
    if (!expiryDate) return '永久有效';
    const date = new Date(expiryDate);
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  }

  /**
   * 创建资料卡片
   */
  createDocumentCard(doc) {
    const warningLevel = this.getWarningLevel(doc);
    const statusClass = this.getStatusClass(doc.status);
    const documentTypeText = this.getDocumentTypeText(doc.documentType);
    const warningIcon = this.getWarningIcon(warningLevel);
    
    // 为临期资料添加顶部预警条（仅在网格视图中显示）
    const alertBar = (warningLevel !== 'normal' && warningLevel !== 'expired' && this.currentView === 'grid') ? `
      <div class="alert-bar alert-${warningLevel}">
        <span class="alert-icon">${warningIcon}</span>
        <span class="alert-text">${this.getStatusText(doc)}</span>
      </div>
    ` : '';
    
    if (this.currentView === 'list') {
      return this.createListDocumentCard(doc, warningLevel, statusClass, documentTypeText, warningIcon);
    } else {
      return this.createGridDocumentCard(doc, warningLevel, statusClass, documentTypeText, warningIcon, alertBar);
    }
  }

  /**
   * 创建网格视图资料卡片
   */
  createGridDocumentCard(doc, warningLevel, statusClass, documentTypeText, warningIcon, alertBar) {
    const isSelected = this.selectedDocuments.has(doc.id);
    return `
      <div class="document-card ${statusClass} ${warningLevel !== 'normal' ? 'has-warning' : ''} ${isSelected ? 'selected' : ''}" 
           data-id="${doc.id}">
        
        <div class="card-selection">
          <label class="checkbox-label">
            <input type="checkbox" 
                   ${isSelected ? 'checked' : ''} 
                   onchange="supplierManager.toggleDocumentSelection(${doc.id})">
            <span class="checkmark"></span>
          </label>
        </div>
        
        ${alertBar}
        
        <div class="document-header">
          <div class="document-type">
            <span class="type-icon">${this.getTypeIcon(doc.documentType)}</span>
            <span class="type-text">${documentTypeText}</span>
          </div>
          <div class="document-status">
            <span class="status-badge ${warningLevel}">${this.getStatusText(doc)}</span>
          </div>
        </div>
        
        <div class="document-content">
          <h4 class="document-name" title="${doc.documentName || '无版本号'}">${doc.documentName || '无版本号'}</h4>
          ${doc.documentNumber ? `<div class="document-number">编号: ${doc.documentNumber}</div>` : ''}
          
          <div class="document-meta">
            <div class="meta-item">
              <span class="meta-label">供应商:</span>
              <span class="meta-value">${this.getSupplierName(doc.supplierId)}</span>
            </div>
            ${doc.expiryDate ? `
              <div class="meta-item">
                <span class="meta-label">到期日期:</span>
                <span class="meta-value">${this.formatDate(doc.expiryDate)}</span>
              </div>
            ` : ''}
            ${doc.responsiblePerson ? `
              <div class="meta-item">
                <span class="meta-label">责任人:</span>
                <span class="meta-value">${doc.responsiblePerson}</span>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="document-actions">
          <button class="btn btn-sm btn-primary" onclick="supplierManager.viewDocument(${doc.id})">
            查看
          </button>
          <button class="btn btn-sm btn-success" onclick="supplierManager.downloadDocument(${doc.id})">
            下载
          </button>
          <button class="btn btn-sm btn-warning" onclick="supplierManager.editDocument(${doc.id})">
            编辑
          </button>
          <button class="btn btn-sm btn-danger" onclick="supplierManager.deleteDocument(${doc.id})">
            删除
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 创建列表视图资料卡片
   */
  createListDocumentCard(doc, warningLevel, statusClass, documentTypeText, warningIcon) {
    const isSelected = this.selectedDocuments.has(doc.id);
    return `
      <div class="document-card list-card ${statusClass} ${warningLevel !== 'normal' ? 'has-warning' : ''} ${isSelected ? 'selected' : ''}" 
           data-id="${doc.id}">
        <div class="list-card-content">
          <div class="list-card-selection">
            <label class="checkbox-label">
              <input type="checkbox" 
                     ${isSelected ? 'checked' : ''} 
                     onchange="supplierManager.toggleDocumentSelection(${doc.id})">
              <span class="checkmark"></span>
            </label>
          </div>
          
          <div class="list-card-main">
            <div class="document-type-inline">
              <span class="type-icon">${this.getTypeIcon(doc.documentType)}</span>
              <span class="type-text">${documentTypeText}</span>
            </div>
            <div class="document-name-inline">
              <h4 class="document-name" title="${doc.documentName || '无版本号'}">${doc.documentName || '无版本号'}</h4>
              ${doc.documentNumber ? `<span class="document-number-inline">编号: ${doc.documentNumber}</span>` : ''}
            </div>
          </div>
          
          <div class="list-card-meta">
            <div class="meta-inline">
              <span class="meta-item">
                <span class="meta-label">供应商:</span>
                <span class="meta-value">${this.getSupplierName(doc.supplierId)}</span>
              </span>
              ${doc.expiryDate ? `
                <span class="meta-item">
                  <span class="meta-label">到期:</span>
                  <span class="meta-value">${this.formatDate(doc.expiryDate)}</span>
                </span>
              ` : ''}
              ${doc.responsiblePerson ? `
                <span class="meta-item">
                  <span class="meta-label">责任人:</span>
                  <span class="meta-value">${doc.responsiblePerson}</span>
                </span>
              ` : ''}
            </div>
          </div>
          
          <div class="list-card-status">
            <span class="status-badge ${warningLevel}">${this.getStatusText(doc)}</span>
          </div>
          
          <div class="list-card-actions">
            <button class="btn btn-sm btn-primary" onclick="supplierManager.viewDocument(${doc.id})" title="查看">
              查看
            </button>
            <button class="btn btn-sm btn-success" onclick="supplierManager.downloadDocument(${doc.id})" title="下载">
              下载
            </button>
            <button class="btn btn-sm btn-warning" onclick="supplierManager.editDocument(${doc.id})" title="编辑">
              编辑
            </button>
            <button class="btn btn-sm btn-danger" onclick="supplierManager.deleteDocument(${doc.id})" title="删除">
              删除
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 获取预警图标
   */
  getWarningIcon(warningLevel) {
    const iconMap = {
      'critical': '⚠️',
      'urgent': '⏰️',
      'warning': '📅',
      'expired': '❌',
      'normal': '✅'
    };
    return iconMap[warningLevel] || '✅';
  }

  /**
   * 获取预警级别
   */
  getWarningLevel(doc) {
    // 永久有效的资料显示为正常状态
    if (doc.isPermanent) return 'normal';
    if (!doc.expiryDate) return 'normal';
    
    const now = new Date();
    const expiry = new Date(doc.expiryDate);
    const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return 'expired';
    if (daysUntilExpiry <= 7) return 'critical';
    if (daysUntilExpiry <= 15) return 'urgent';
    if (daysUntilExpiry <= 30) return 'warning';
    return 'normal';
  }

  /**
   * 获取状态样式类
   */
  getStatusClass(status) {
    const statusMap = {
      'active': 'status-active',
      'expired': 'status-expired',
      'archived': 'status-archived'
    };
    return statusMap[status] || '';
  }

  /**
   * 获取状态文本
   */
  getStatusText(doc) {
    if (doc.status === 'archived') return '已归档';
    
    // 永久有效的资料显示特殊标识
    if (doc.isPermanent) return '🌟 永久有效';
    
    const warningLevel = this.getWarningLevel(doc);
    if (warningLevel === 'expired') return '❌ 已过期';
    if (warningLevel === 'critical') return '⚠️ 7天内到期';
    if (warningLevel === 'urgent') return '⏰️ 15天内到期';
    if (warningLevel === 'warning') return '📅 30天内到期';
    
    return '✅ 正常';
  }

  /**
   * 获取资料类型文本
   */
  getDocumentTypeText(type) {
    const typeMap = {
      'quality_agreement': '质量保证协议',
      'environmental_rohs': 'ROHS',
      'environmental_reach': 'REACH',
      'environmental_msds': 'MSDS',
      'environmental_hf': 'HF',
      'csr': 'CSR'
    };
    return typeMap[type] || type;
  }

  /**
   * 获取类型图标
   */
  getTypeIcon(type) {
    const iconMap = {
      'quality_agreement': '📋',
      'environmental_rohs': '🌱',
      'environmental_reach': '🌱',
      'environmental_msds': '🌱',
      'environmental_hf': '🌱',
      'csr': '🤝'
    };
    return iconMap[type] || '📄';
  }

  /**
   * 获取供应商名称
   */
  getSupplierName(supplierId) {
    const supplier = this.suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : '未知供应商';
  }

  /**
   * 格式化日期
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
  }

  /**
   * 防抖搜索
   */
  debounceSearch(query) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.searchDocuments(query);
    }, 300);
  }

  /**
   * 搜索资料
   */
  async searchDocuments(query) {
    // 这里可以实现搜索逻辑
    console.log('搜索:', query);
  }

  

  /**
   * 显示上传模态框
   */
  showUploadModal() {
    console.log('showUploadModal被调用');
    
    const modal = document.getElementById('uploadModal');
    if (modal) {
      // 检查是否已经显示
      if (modal.style.display === 'block') {
        console.log('模态框已经显示，跳过重复显示');
        return;
      }
      
      console.log('显示上传模态框');
      
      // 强制设置样式 - 使用半透明背景，可以看到背后的内容
      modal.style.cssText = `
        display: block !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0, 0, 0, 0.5) !important;
        backdrop-filter: blur(4px) !important;
        z-index: 99999 !important;
      `;
      
      // 确保模态框内容也在最上层
      const modalContent = modal.querySelector('.modal-content');
      if (modalContent) {
        modalContent.style.cssText = `
          background: var(--background-primary) !important;
          border-radius: 12px !important;
          width: 90% !important;
          max-width: 600px !important;
          max-height: 90vh !important;
          margin: 5vh auto !important;
          overflow: hidden !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
          position: relative !important;
          z-index: 100000 !important;
        `;
      }
      
      // 清空之前的文件选择
      const fileInput = document.getElementById('fileInput');
      if (fileInput) {
        fileInput.value = '';
        console.log('已清空文件输入');
      }
      
      // 重置文件显示
      this.resetFileDisplay();
      
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    } else {
      console.log('未找到uploadModal元素');
    }
  }

  /**
   * 处理文件上传
   */
  async handleFileUpload(files) {
    console.log('handleFileUpload被调用，文件数量:', files.length);
    
    if (files.length === 0) return;

    const file = files[0];
    console.log('选择的文件:', file.name, '大小:', file.size);
    
    // 更新UI显示已选择的文件
    this.updateFileDisplay(file);
  }

  /**
   * 更新文件显示
   */
  updateFileDisplay(file) {
    console.log('更新文件显示:', file.name);
    
    const uploadText = document.querySelector('.upload-text');
    const uploadIcon = document.querySelector('.upload-icon');
    
    if (uploadText && file) {
      const fileSize = (file.size / 1024).toFixed(2) + ' KB';
      uploadText.innerHTML = `
        <p style="color: var(--primary-600); font-weight: 600;">已选择文件</p>
        <p style="color: var(--text-primary);">${file.name}</p>
        <p style="color: var(--text-secondary); font-size: 12px;">大小: ${fileSize}</p>
      `;
      console.log('文件显示已更新');
    } else {
      console.log('未找到uploadText元素');
    }
    
    if (uploadIcon) {
      uploadIcon.textContent = '✅';
      uploadIcon.style.color = 'var(--success-500)';
      console.log('图标已更新');
    } else {
      console.log('未找到uploadIcon元素');
    }
  }

  /**
   * 查看资料
   */
  async viewDocument(id) {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      const result = await response.json();
      
      if (result.success) {
        this.showDocumentDetail(result.data);
      }
    } catch (error) {
      console.error('查看资料失败:', error);
      this.showError('查看资料失败');
    }
  }

  /**
   * 下载资料
   */
  async downloadDocument(id) {
    try {
      const response = await fetch(`/api/documents/${id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'document';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        this.showError('下载失败');
      }
    } catch (error) {
      console.error('下载失败:', error);
      this.showError('下载失败');
    }
  }

  /**
   * 编辑资料
   */
  editDocument(id) {
    const document = this.documents.find(d => d.id === id);
    if (!document) return;

    // 填充编辑表单
    document.getElementById('editDocumentId').value = id;
    document.getElementById('editDocumentName').value = document.documentName || '';
    document.getElementById('editDocumentNumber').value = document.documentNumber || '';
    document.getElementById('editExpiryDate').value = document.expiryDate ? document.expiryDate.split('T')[0] : '';
    document.getElementById('editResponsiblePerson').value = document.responsiblePerson || '';
    document.getElementById('editIssuingAuthority').value = document.issuingAuthority || '';
    document.getElementById('editRemarks').value = document.remarks || '';

    // 显示编辑模态框
    const modal = document.getElementById('editModal');
    if (modal) {
      modal.style.display = 'block';
    }
  }

  /**
   * 删除资料
   */
  async deleteDocument(id) {
    if (!confirm('确定要删除这个资料吗？')) return;

    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        this.showSuccess('资料删除成功');
        this.loadDocuments();
      } else {
        this.showError(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      this.showError('删除失败');
    }
  }

  /**
   * 显示资料详情
   */
  showDocumentDetail(document) {
    // 实现资料详情显示逻辑
    console.log('显示资料详情:', document);
  }

  

  /**
   * 切换文档选择状态
   */
  toggleDocumentSelection(docId) {
    if (this.selectedDocuments.has(docId)) {
      this.selectedDocuments.delete(docId);
    } else {
      this.selectedDocuments.add(docId);
    }
    this.updateSelectionUI();
  }

  /**
   * 全选/取消全选
   */
  toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    if (selectAll.checked) {
      // 全选
      this.documents.forEach(doc => this.selectedDocuments.add(doc.id));
    } else {
      // 取消全选
      this.selectedDocuments.clear();
    }
    this.updateSelectionUI();
  }

  /**
   * 清除选择
   */
  clearSelection() {
    this.selectedDocuments.clear();
    this.updateSelectionUI();
  }

  /**
   * 更新选择UI
   */
  updateSelectionUI() {
    // 更新全选框状态
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
      selectAll.checked = this.selectedDocuments.size === this.documents.length && this.documents.length > 0;
      selectAll.indeterminate = this.selectedDocuments.size > 0 && this.selectedDocuments.size < this.documents.length;
    }

    // 更新批量操作栏显示
    const batchActions = document.getElementById('batchActions');
    if (batchActions) {
      batchActions.style.display = this.selectedDocuments.size > 0 ? 'flex' : 'none';
    }

    // 更新选中计数
    const selectedCount = document.getElementById('selectedCount');
    if (selectedCount) {
      selectedCount.textContent = this.selectedDocuments.size;
    }

    // 更新卡片选择状态
    this.documents.forEach(doc => {
      const card = document.querySelector(`[data-id="${doc.id}"]`);
      if (card) {
        const checkbox = card.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked !== this.selectedDocuments.has(doc.id)) {
          checkbox.checked = this.selectedDocuments.has(doc.id);
        }
        
        if (this.selectedDocuments.has(doc.id)) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      }
    });
  }

  /**
   * 批量下载
   */
  async batchDownload() {
    if (this.selectedDocuments.size === 0) {
      this.showError('请先选择要下载的资料');
      return;
    }

    for (const docId of this.selectedDocuments) {
      try {
        await this.downloadDocument(docId);
        // 添加延迟避免浏览器阻止多个下载
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`下载文档 ${docId} 失败:`, error);
      }
    }
    
    this.showSuccess(`已开始下载 ${this.selectedDocuments.size} 个文件`);
  }

  /**
   * 批量编辑
   */
  batchEdit() {
    if (this.selectedDocuments.size === 0) {
      this.showError('请先选择要编辑的资料');
      return;
    }
    
    // 这里可以实现批量编辑模态框
    this.showInfo(`已选择 ${this.selectedDocuments.size} 个资料进行批量编辑`);
  }

  /**
   * 批量删除
   */
  async batchDelete() {
    if (this.selectedDocuments.size === 0) {
      this.showError('请先选择要删除的资料');
      return;
    }

    if (!confirm(`确定要删除选中的 ${this.selectedDocuments.size} 个资料吗？此操作不可撤销。`)) {
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const docId of this.selectedDocuments) {
      try {
        const response = await fetch(`/api/documents/${docId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`删除文档 ${docId} 失败:`, error);
        failCount++;
      }
    }

    if (successCount > 0) {
      this.showSuccess(`成功删除 ${successCount} 个资料`);
      this.clearSelection();
      this.loadDocuments();
    }
    
    if (failCount > 0) {
      this.showError(`${failCount} 个资料删除失败`);
    }
  }

  

  /**
   * 隐藏上传模态框
   */
  hideUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
      modal.style.display = 'none';
      // 恢复背景滚动
      document.body.style.overflow = '';
    }
  }

  /**
   * 渲染分页
   */
  renderPagination(pagination) {
    const container = document.getElementById('paginationContainer');
    if (!container || pagination.pages <= 1) return;

    let html = '<div class="pagination">';
    
    for (let i = 1; i <= pagination.pages; i++) {
      html += `
        <button class="page-btn ${i === pagination.page ? 'active' : ''}" 
                onclick="supplierManager.goToPage(${i})">
          ${i}
        </button>
      `;
    }
    
    html += '</div>';
    container.innerHTML = html;
  }

  /**
   * 跳转到指定页
   */
  goToPage(page) {
    // 实现分页跳转逻辑
    console.log('跳转到页:', page);
  }

  /**
   * 显示成功消息
   */
  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  /**
   * 显示错误消息
   */
  showError(message) {
    this.showMessage(message, 'error');
  }

  /**
   * 显示信息消息
   */
  showInfo(message) {
    console.log(`ℹ️ INFO: ${message}`);
    this.showMessage(message, 'info');
  }

  /**
   * 显示加载状态
   * 创建时间: 2025-12-01
   * 功能: 显示加载中的状态提示
   * 来由: 解决加载资料列表时缺少加载状态显示的问题
   */
  showLoading() {
    const container = document.getElementById('documentsContainer');
    if (!container) return;
    
    container.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <div class="loading-text">正在加载资料数据...</div>
      </div>
    `;
  }

  /**
   * 隐藏加载状态
   */
  hideLoading() {
    // 这个方法在渲染新内容时会被自动调用
    // 主要用于确保加载状态的清理
    console.log('🔄 隐藏加载状态');
  }

  /**
   * 切换永久有效日期
   */
  togglePermanentDate() {
    const permanentCheckbox = document.getElementById('uploadPermanent');
    const expiryDateInput = document.getElementById('uploadExpiryDate');
    const expiryLabel = expiryDateInput.previousElementSibling;
    
    if (permanentCheckbox.checked) {
      expiryDateInput.disabled = true;
      expiryDateInput.required = false;
      expiryDateInput.value = '';
      expiryLabel.textContent = '到期日期（永久有效）';
      expiryLabel.style.color = '#999';
    } else {
      expiryDateInput.disabled = false;
      expiryDateInput.required = true;
      expiryLabel.textContent = '到期日期 *';
      expiryLabel.style.color = '';
    }
  }

  /**
   * 显示消息
   */
  showMessage(message, type) {
    console.log(`🔔 尝试显示Toast: ${type} - ${message}`);
    
    // 使用系统Toast组件显示消息
    if (window.showToast) {
      console.log('✅ 使用 window.showToast');
      window.showToast(message, type);
    } else if (window.App && window.App.Toast) {
      console.log('✅ 使用 window.App.Toast');
      window.App.Toast.show(message, type);
    } else {
      // 降级方案：使用alert
      console.log('⚠️ Toast不可用，使用alert');
      console.log(`${type}: ${message}`);
      alert(message);
    }
  }

  /**
   * 提交上传
   */
  async submitUpload() {
    console.log('submitUpload被调用');
    
    const fileInput = document.getElementById('fileInput');
    console.log('文件输入元素:', fileInput);
    console.log('选择的文件数量:', fileInput ? fileInput.files.length : '无元素');
    
    if (!fileInput) {
      console.log('未找到fileInput元素');
      this.showError('系统错误：未找到文件输入元素');
      return;
    }
    
    if (!fileInput.files.length) {
      console.log('没有选择文件，显示错误');
      this.showError('请选择文件');
      return;
    }
    
    console.log('文件验证通过，开始上传');

    // 验证必填字段
    const supplierIdEl = document.getElementById('uploadSupplierId');
    const documentTypeEl = document.getElementById('uploadDocumentType');
    const documentNameEl = document.getElementById('uploadDocumentName');
    const expiryDateEl = document.getElementById('uploadExpiryDate');
    const permanentEl = document.getElementById('uploadPermanent');
    
    console.log('表单元素检查:');
    console.log('uploadSupplierId元素:', supplierIdEl);
    console.log('uploadDocumentType元素:', documentTypeEl);
    console.log('uploadDocumentName元素:', documentNameEl);
    console.log('uploadExpiryDate元素:', expiryDateEl);
    console.log('uploadPermanent元素:', permanentEl);
    
    const supplierId = supplierIdEl ? supplierIdEl.value : null;
    const documentType = documentTypeEl ? documentTypeEl.value : null;
    const documentName = documentNameEl ? documentNameEl.value : '';
    const expiryDate = expiryDateEl ? expiryDateEl.value : null;
    const isPermanent = permanentEl ? permanentEl.checked : false;
    
    console.log('表单值检查:');
    console.log('supplierId:', supplierId);
    console.log('documentType:', documentType);
    console.log('documentName:', documentName);
    console.log('expiryDate:', expiryDate);
    console.log('isPermanent:', isPermanent);

    // 逐个验证必填项，提供具体的错误提示
    if (!supplierId) {
      this.showError('请选择供应商');
      return;
    }
    
    if (!documentType) {
      this.showError('请选择资料类型');
      return;
    }
    
    if (!expiryDate && !isPermanent) {
      this.showError('请选择到期日期或勾选"永久有效"');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    
    // 获取表单其他字段
    formData.append('supplierId', supplierId);
    formData.append('documentType', documentType);
    formData.append('documentName', documentName);
    formData.append('documentNumber', document.getElementById('uploadDocumentNumber').value);
    formData.append('expiryDate', isPermanent ? null : document.getElementById('uploadExpiryDate').value);
    formData.append('isPermanent', isPermanent);
    formData.append('responsiblePerson', document.getElementById('uploadResponsiblePerson').value);
    formData.append('issuingAuthority', document.getElementById('uploadIssuingAuthority').value);
    formData.append('remarks', document.getElementById('uploadRemarks').value);

    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        this.showSuccess('资料上传成功');
        this.loadDocuments();
        this.hideUploadModal();
        // 清空表单
        document.getElementById('uploadForm').reset();
        fileInput.value = '';
        
        // 重置文件显示区域
        this.resetFileDisplay();
      } else {
        this.showError(result.error || '上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
      this.showError('上传失败');
    }
  }

  /**
   * 刷新功能 - 导入供应商和刷新资料列表
   * 创建时间: 2025-12-01
   * 功能: 点击刷新按钮时，先从IQC数据导入供应商，然后刷新资料列表
   * 来由: 提供完整的数据刷新功能，确保供应商和资料数据都是最新的
   */
  async refreshData() {
    try {
      console.log('🔄 开始刷新数据...');
      
      // 显示加载状态
      this.showInfo('正在刷新数据...');
      
      // 1. 从IQC数据导入供应商
      console.log('📤 发送供应商导入请求...');
      const supplierResponse = await fetch('/api/suppliers/import-from-iqc', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });

      const supplierResult = await supplierResponse.json();
      console.log('📥 供应商导入响应:', supplierResult);
      
      if (supplierResult.success) {
        console.log(`✅ 供应商导入成功，导入数量: ${supplierResult.importedCount}`);
        
        if (supplierResult.importedCount > 0) {
          console.log('🎉 显示供应商导入成功提示');
          this.showSuccess(`成功导入 ${supplierResult.importedCount} 个供应商`);
          
          // 等待一下再显示完成信息
          setTimeout(() => {
            console.log('📋 显示数据刷新完成提示');
            this.showInfo('数据刷新完成');
          }, 2000);
        } else {
          console.log('ℹ️ 没有新供应商导入，显示资料刷新提示');
          setTimeout(() => {
            this.showInfo('资料列表已刷新');
          }, 1000);
        }
        
        // 重新加载供应商列表
        console.log('🔄 重新加载供应商列表...');
        await this.loadSuppliers();
      } else {
        console.warn('❌ 导入供应商失败:', supplierResult.error);
        this.showError(supplierResult.error || '导入供应商失败');
      }
      
      // 2. 刷新资料列表（无论供应商导入是否成功都要执行）
      console.log('🔄 重新加载资料列表...');
      this.loadDocuments();
      
    } catch (error) {
      console.error('❌ 刷新数据失败:', error);
      this.showError('刷新数据失败，请稍后重试');
    }
  }

  /**
   * 重置文件显示
   */
  resetFileDisplay() {
    const uploadText = document.querySelector('.upload-text');
    const uploadIcon = document.querySelector('.upload-icon');
    
    if (uploadText) {
      uploadText.innerHTML = `
        <p>拖拽文件到此处或点击选择文件</p>
        <p class="upload-hint">支持 PDF, DOC, DOCX, XLS, XLSX, JPG, PNG 格式，最大100MB</p>
      `;
    }
    
    if (uploadIcon) {
      uploadIcon.textContent = '📤';
      uploadIcon.style.color = '';
    }
  }

  /**
   * 隐藏编辑模态框
   */
  hideEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
      modal.style.display = 'none';
      // 恢复背景滚动
      document.body.style.overflow = '';
    }
  }

  /**
   * 提交编辑
   */
  async submitEdit() {
    const documentId = document.getElementById('editDocumentId').value;
    const updateData = {
      documentName: document.getElementById('editDocumentName').value,
      documentNumber: document.getElementById('editDocumentNumber').value,
      expiryDate: document.getElementById('editExpiryDate').value,
      responsiblePerson: document.getElementById('editResponsiblePerson').value,
      issuingAuthority: document.getElementById('editIssuingAuthority').value,
      remarks: document.getElementById('editRemarks').value
    };

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      
      if (result.success) {
        this.showSuccess('资料更新成功');
        this.loadDocuments();
        this.hideEditModal();
      } else {
        this.showError(result.error || '更新失败');
      }
    } catch (error) {
      console.error('更新失败:', error);
      this.showError('更新失败');
    }
  }
}

// 全局实例 - 确保只创建一次
if (!window.supplierManager) {
  window.supplierManager = new SupplierDocumentManager();
  console.log('创建新的supplierManager实例');
} else {
  console.log('使用已存在的supplierManager实例');
}