/**
 * 供应商资料管理模块
 * 负责供应商资料的前端交互和管理
 */
class SupplierDocumentManager {
  constructor() {
    this.currentSupplier = null;
    this.currentDocumentType = 'all';
    this.documents = [];
    this.suppliers = [];
    this.currentView = 'grid'; // 'grid' 或 'list'
    this.currentSort = 'expiry-asc'; // 默认排序
    this.selectedDocuments = new Set(); // 选中的文档ID
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

    // 资料类型切换
    document.addEventListener('click', (e) => {
      if (e.target.matches('.document-type-tab') || e.target.closest('.document-type-tab')) {
        const tab = e.target.matches('.document-type-tab') ? e.target : e.target.closest('.document-type-tab');
        const type = tab.dataset.type;
        if (type) {
          this.switchDocumentType(type);
        }
      }
    });

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

  /**
   * 切换资料类型
   */
  switchDocumentType(type) {
    // 防止重复切换相同类型
    if (this.currentDocumentType === type) {
      return;
    }
    
    this.currentDocumentType = type;
    
    // 更新标签样式
    document.querySelectorAll('.document-type-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`[data-type="${type}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }
    
    // 延迟加载以提升响应速度
    requestAnimationFrame(() => {
      this.loadDocuments();
    });
  }

  /**
   * 切换视图模式
   */
  switchView(view) {
    if (this.currentView === view) {
      return;
    }
    
    this.currentView = view;
    
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
   * 加载资料列表（表格视图）
   * 
   * ⚠️ 关键方法: 供应商资料管理页面的数据加载入口
   * 🔗 调用API: GET /api/suppliers/documents-summary
   * 📊 返回数据: 供应商资料汇总表格数据
   * 
   * 调试经验:
   * 1. 如果没有看到"开始加载供应商资料汇总数据"，说明路由没有触发
   * 2. 如果看到404错误，检查后端路由顺序（documents-summary必须在/:id之前）
   * 3. 如果看到认证错误，检查localStorage中的authToken
   * 4. 服务器没有请求日志说明路由匹配失败
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
      
      console.log('🔑 使用认证token:', token.substring(0, 20) + '...');
      
      const response = await fetch('/api/suppliers/documents-summary', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🌐 API响应状态:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📥 收到供应商资料汇总响应:', result);
      
      if (result.success) {
        console.log(`✅ 成功获取 ${result.data.length} 个供应商的资料汇总`);
        this.documentsSummary = result.data;
        this.renderDocumentsTable();
      } else {
        console.error('❌ API返回失败:', result.error);
        this.showError(result.error || '加载资料列表失败');
      }
    } catch (error) {
      console.error('❌ 加载资料列表失败:', error);
      console.error('错误详情:', error.message, error.stack);
      this.showError(`加载资料列表失败: ${error.message}`);
    } finally {
      // 确保隐藏加载状态
      this.hideLoading();
    }
  }

  /**
   * 渲染资料表格
   * 创建时间: 2025-12-01
   * 功能: 渲染按供应商分组的资料表格，直观显示所有供应商的资料状态
   * 来由: 用户要求更直观的资料展示方式，能够看到所有供应商的资料状态
   */
  renderDocumentsTable() {
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

    console.log(`🏗️ 渲染 ${this.documentsSummary.length} 个供应商的资料表格`);

    // 创建表格HTML
    const tableHtml = `
      <div class="documents-table-container">
        <div class="table-header">
          <h3>供应商资料汇总表</h3>
          <div class="table-stats">
            总供应商: ${this.documentsSummary.length} 家
          </div>
        </div>
        <div class="table-wrapper">
          <table class="documents-table">
            <thead>
              <tr>
                <th>供应商</th>
                <th>质保协议</th>
                <th>ROHS</th>
                <th>REACH</th>
                <th>MSDS</th>
                <th>HF</th>
                <th>CSR</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              ${this.documentsSummary.map(supplier => this.createSupplierTableRow(supplier)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = tableHtml;
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

    // 创建资料状态单元格
    const documentCells = documentTypes.map(type => {
      const doc = supplier.documents[type.key];
      if (!doc || !doc.hasDocument) {
        return '<td class="status-missing">-</td>';
      }

      const statusClass = this.getDocumentStatusClass(doc.expiryDate, doc.status);
      const expiryText = doc.expiryDate ? this.formatExpiryDate(doc.expiryDate) : '永久有效';
      
      return `<td class="${statusClass}" title="${type.name}: ${expiryText}">${expiryText}</td>`;
    }).join('');

    // 计算整体状态
    const overallStatus = this.calculateOverallStatus(supplier.documents);
    const statusClass = this.getOverallStatusClass(overallStatus);

    return `
      <tr>
        <td class="supplier-name">${supplier.supplierName}</td>
        ${documentCells}
        <td class="${statusClass}">${overallStatus}</td>
      </tr>
    `;
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
   */
  calculateDaysUntilExpiry(expiryDate) {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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