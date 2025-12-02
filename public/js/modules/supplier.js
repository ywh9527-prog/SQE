/**
 * 供应商资料管理模块 v3.0
 * 重构版 - 支持三级层级结构
 * 
 * 核心功能:
 * 1. 树形卡片视图 - 清晰展示 供应商 → 物料 → 构成 → 资料
 * 2. 状态分组 - 按紧急程度分组 (urgent/warning/normal)
 * 3. 三级联动上传 - 直观的资料上传流程
 * 4. 状态可视化 - 🟢🟡🔴 颜色标识
 */

class SupplierDocumentManager {
  constructor() {
    // 数据存储
    this.treeData = [];  // 树形数据 (从 /api/suppliers/tree 获取)
    this.suppliers = []; // 供应商列表 (用于下拉选择)

    // UI状态
    this.displayMode = 'grouped';  // 显示模式: grouped(状态分组) | simple(简单列表)
    this.expandedSuppliers = new Set();  // 展开的供应商ID
    this.expandedMaterials = new Set();  // 展开的物料ID
    this.expandedComponents = new Set(); // 展开的构成ID

    // 筛选状态
    this.currentSupplier = null;  // 当前筛选的供应商
    this.currentStatus = null;    // 当前筛选的状态
    this.searchKeyword = '';      // 搜索关键词

    this.init();
  }

  /**
   * 初始化模块
   */
  async init() {
    console.log('🚀 初始化供应商资料管理模块 v3.0...');

    try {
      // 加载供应商列表 (用于下拉选择)
      await this.loadSuppliers();

      // 加载树形数据
      await this.loadTreeData();

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
   * 加载供应商列表 (用于下拉选择)
   */
  async loadSuppliers() {
    try {
      const response = await fetch('/api/suppliers');
      const data = await response.json();

      if (data.success) {
        this.suppliers = data.data || [];
        this.renderSupplierSelect();
        console.log(`✅ 加载了 ${this.suppliers.length} 个供应商`);
      }
    } catch (error) {
      console.error('❌ 加载供应商列表失败:', error);
    }
  }

  /**
   * 加载树形数据
   */
  async loadTreeData() {
    try {
      console.log('📊 开始加载树形数据...');

      // 构建查询参数
      const params = new URLSearchParams();
      if (this.currentSupplier) {
        params.append('supplierId', this.currentSupplier);
      }

      const url = `/api/suppliers/tree?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        this.treeData = data.data || [];
        console.log(`✅ 加载了 ${this.treeData.length} 个供应商的树形数据`);

        // 打印第一个供应商的结构 (调试用)
        if (this.treeData.length > 0) {
          console.log('📋 第一个供应商数据结构:', this.treeData[0]);
        }
      } else {
        throw new Error(data.error || '加载失败');
      }
    } catch (error) {
      console.error('❌ 加载树形数据失败:', error);
      this.showError('加载数据失败，请刷新页面重试');
      this.treeData = [];
    }
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    console.log('🔗 绑定事件监听器...');

    // 供应商筛选
    const supplierSelect = document.getElementById('supplierSelect');
    if (supplierSelect) {
      supplierSelect.addEventListener('change', (e) => {
        this.currentSupplier = e.target.value || null;
        this.loadTreeData().then(() => this.render());
      });
    }

    // 状态筛选
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.currentStatus = e.target.value || null;
        this.render();
      });
    }

    // 搜索
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchKeyword = e.target.value.trim();
        this.debounceRender();
      });
    }

    // 显示模式切换
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.view-mode-btn');
      if (btn) {
        const mode = btn.dataset.mode;
        if (mode) {
          this.switchDisplayMode(mode);
        }
      }
    });

    // 刷新按钮
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refresh();
      });
    }

    // 上传按钮
    const uploadBtn = document.getElementById('uploadBtn');
    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        this.showUploadModal();
      });
    }

    // 事件委托: 处理卡片内的点击事件
    const container = document.getElementById('documentsContainer');
    if (container) {
      container.addEventListener('click', (e) => {
        this.handleCardClick(e);
      });
    }
  }

  /**
   * 处理卡片内的点击事件 (事件委托)
   */
  handleCardClick(e) {
    const target = e.target;

    // 展开/收起供应商
    if (target.closest('.supplier-toggle')) {
      const supplierId = parseInt(target.closest('.supplier-card').dataset.supplierId);
      this.toggleSupplier(supplierId);
      return;
    }

    // 展开/收起物料
    if (target.closest('.material-toggle')) {
      const materialId = parseInt(target.closest('.material-item').dataset.materialId);
      this.toggleMaterial(materialId);
      return;
    }

    // 展开/收起构成
    if (target.closest('.component-toggle')) {
      const componentId = parseInt(target.closest('.component-item').dataset.componentId);
      this.toggleComponent(componentId);
      return;
    }

    // 快速上传按钮
    if (target.closest('.quick-upload-btn')) {
      const btn = target.closest('.quick-upload-btn');
      const supplierId = btn.dataset.supplierId;
      const materialId = btn.dataset.materialId;
      const componentId = btn.dataset.componentId;
      const level = btn.dataset.level;
      this.showUploadModal({ supplierId, materialId, componentId, level });
      return;
    }
  }

  /**
   * 切换显示模式
   */
  switchDisplayMode(mode) {
    this.displayMode = mode;

    // 更新按钮状态
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    this.render();
  }

  /**
   * 刷新数据
   */
  async refresh() {
    console.log('🔄 刷新数据...');
    await this.loadTreeData();
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

    // 根据显示模式渲染
    if (this.displayMode === 'grouped') {
      this.renderGroupedView(container);
    } else {
      this.renderSimpleView(container);
    }
  }

  /**
   * 渲染分组视图 (按状态分组)
   */
  renderGroupedView(container) {
    console.log('📊 渲染分组视图...');

    // 按状态分组
    const groups = {
      urgent: { title: '🚨 需要立即处理', suppliers: [], expanded: true },
      warning: { title: '⚠️ 即将到期', suppliers: [], expanded: false },
      normal: { title: '✅ 状态正常', suppliers: [], expanded: false }
    };

    // 筛选和分组
    this.treeData.forEach(supplier => {
      // 应用筛选
      if (this.currentStatus && supplier.status !== this.currentStatus) {
        return;
      }

      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase();
        const matchSupplier = supplier.supplierName.toLowerCase().includes(keyword);
        const matchMaterial = supplier.materials.some(m =>
          m.materialName.toLowerCase().includes(keyword)
        );
        if (!matchSupplier && !matchMaterial) {
          return;
        }
      }

      // 分组
      const status = supplier.status || 'normal';
      if (groups[status]) {
        groups[status].suppliers.push(supplier);
      }
    });

    // 渲染HTML
    let html = '<div class="supplier-tree">';

    Object.entries(groups).forEach(([status, group]) => {
      const count = group.suppliers.length;
      if (count === 0) return;  // 跳过空分组

      const expandedClass = group.expanded ? 'expanded' : 'collapsed';

      html += `
        <div class="supplier-tree__group supplier-tree__group--${status} ${expandedClass}">
          <div class="supplier-tree__group-header" data-status="${status}">
            <span class="group-title">${group.title} (${count}家供应商)</span>
            <button class="group-toggle-btn">
              <i class="ph ${group.expanded ? 'ph-caret-down' : 'ph-caret-right'}"></i>
            </button>
          </div>
          <div class="supplier-tree__group-body">
            ${group.suppliers.map(supplier => this.renderSupplierCard(supplier)).join('')}
          </div>
        </div>
      `;
    });

    html += '</div>';

    container.innerHTML = html;

    // 绑定分组展开/收起事件
    container.querySelectorAll('.supplier-tree__group-header').forEach(header => {
      header.addEventListener('click', () => {
        const group = header.closest('.supplier-tree__group');
        group.classList.toggle('expanded');
        group.classList.toggle('collapsed');

        const icon = header.querySelector('.ph');
        icon.classList.toggle('ph-caret-down');
        icon.classList.toggle('ph-caret-right');
      });
    });
  }

  /**
   * 渲染简单视图 (列表)
   */
  renderSimpleView(container) {
    console.log('📋 渲染简单视图...');

    // 筛选数据
    const filteredData = this.treeData.filter(supplier => {
      if (this.currentStatus && supplier.status !== this.currentStatus) {
        return false;
      }

      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase();
        return supplier.supplierName.toLowerCase().includes(keyword);
      }

      return true;
    });

    // 渲染HTML
    let html = '<div class="supplier-tree supplier-tree--simple">';
    html += filteredData.map(supplier => this.renderSupplierCard(supplier)).join('');
    html += '</div>';

    container.innerHTML = html;
  }

  /**
   * 渲染供应商卡片
   */
  renderSupplierCard(supplier) {
    const isExpanded = this.expandedSuppliers.has(supplier.supplierId);
    const statusClass = `supplier-tree__card--${supplier.status}`;

    return `
      <div class="supplier-tree__card ${statusClass}" data-supplier-id="${supplier.supplierId}">
        <div class="supplier-tree__header">
          <div class="supplier-info">
            <button class="supplier-toggle">
              <i class="ph ${isExpanded ? 'ph-caret-down' : 'ph-caret-right'}"></i>
            </button>
            <span class="supplier-icon">🏢</span>
            <span class="supplier-name">${supplier.supplierName}</span>
            <span class="supplier-contact">📞 ${supplier.contactPerson || '-'}</span>
            <span class="supplier-email">📧 ${supplier.contactEmail || '-'}</span>
          </div>
          <div class="supplier-status">
            <span class="status-badge status-badge--${supplier.status}">
              ${this.getStatusText(supplier.status)}
            </span>
          </div>
        </div>
        
        ${isExpanded ? `
          <div class="supplier-tree__body">
            ${this.renderSupplierDocuments(supplier)}
            ${this.renderMaterials(supplier)}
          </div>
          
          <div class="supplier-tree__footer">
            <button class="btn btn--sm quick-upload-btn" 
                    data-supplier-id="${supplier.supplierId}" 
                    data-level="supplier">
              📤 快速上传
            </button>
            <button class="btn btn--sm btn--secondary">📧 邮件通知</button>
            <button class="btn btn--sm btn--secondary">📊 生成报告</button>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 渲染供应商级资料
   */
  renderSupplierDocuments(supplier) {
    const docs = supplier.supplierDocuments || [];
    if (docs.length === 0) {
      return `
        <div class="supplier-documents">
          <div class="section-header">
            <span class="section-icon">📄</span>
            <span class="section-title">供应商级资料 (0/0)</span>
            <span class="status-badge status-badge--warning">缺失</span>
          </div>
        </div>
      `;
    }

    return `
      <div class="supplier-documents">
        <div class="section-header">
          <span class="section-icon">📄</span>
          <span class="section-title">供应商级资料 (${docs.length}/${docs.length})</span>
          <span class="status-badge status-badge--normal">✅</span>
        </div>
        <div class="document-list">
          ${docs.map(doc => this.renderDocument(doc)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 渲染物料列表
   */
  renderMaterials(supplier) {
    const materials = supplier.materials || [];
    if (materials.length === 0) {
      return '<div class="no-materials">暂无物料</div>';
    }

    return `
      <div class="materials-list">
        ${materials.map(material => this.renderMaterial(material, supplier.supplierId)).join('')}
      </div>
    `;
  }

  /**
   * 渲染物料项
   */
  renderMaterial(material, supplierId) {
    const isExpanded = this.expandedMaterials.has(material.materialId);
    const statusClass = `material-item--${material.status}`;

    return `
      <div class="material-item ${statusClass}" data-material-id="${material.materialId}">
        <div class="material-item__header">
          <button class="material-toggle">
            <i class="ph ${isExpanded ? 'ph-caret-down' : 'ph-caret-right'}"></i>
          </button>
          <span class="material-icon">🏭</span>
          <span class="material-name">${material.materialName}</span>
          ${material.materialCode ? `<span class="material-code">(${material.materialCode})</span>` : ''}
          <span class="status-badge status-badge--${material.status}">
            ${this.getStatusText(material.status)}
          </span>
        </div>
        
        ${isExpanded ? `
          <div class="material-item__body">
            ${this.renderComponents(material.components, supplierId, material.materialId)}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 渲染构成列表
   */
  renderComponents(components, supplierId, materialId) {
    if (!components || components.length === 0) {
      return '<div class="no-components">暂无构成</div>';
    }

    return `
      <div class="components-list">
        ${components.map(component => this.renderComponent(component, supplierId, materialId)).join('')}
      </div>
    `;
  }

  /**
   * 渲染构成项
   */
  renderComponent(component, supplierId, materialId) {
    const isExpanded = this.expandedComponents.has(component.componentId);
    const statusClass = `component-item--${component.status}`;
    const docs = component.documents || [];
    const docCount = docs.length;
    const expectedCount = 3;  // ROHS, REACH, HF

    return `
      <div class="component-item ${statusClass}" data-component-id="${component.componentId}">
        <div class="component-item__header">
          <button class="component-toggle">
            <i class="ph ${isExpanded ? 'ph-caret-down' : 'ph-caret-right'}"></i>
          </button>
          <span class="component-icon">🧪</span>
          <span class="component-name">${component.componentName}</span>
          ${component.componentCode ? `<span class="component-code">(${component.componentCode})</span>` : ''}
          <span class="doc-count">(${docCount}/${expectedCount}份资料)</span>
          <span class="status-badge status-badge--${component.status}">
            ${docCount === expectedCount ? '✅' : '🔴 缺失'}
          </span>
        </div>
        
        ${isExpanded ? `
          <div class="component-item__body">
            <div class="document-list">
              ${docs.map(doc => this.renderDocument(doc)).join('')}
              ${this.renderMissingDocuments(docs, supplierId, materialId, component.componentId)}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * 渲染资料项
   */
  renderDocument(doc) {
    const warningClass = `document-item--${doc.warningLevel}`;
    const icon = this.getWarningIcon(doc.warningLevel);

    return `
      <div class="document-item ${warningClass}">
        <span class="doc-icon">${icon}</span>
        <span class="doc-type">${this.getDocumentTypeText(doc.documentType)}</span>
        <span class="doc-name">${doc.documentName}</span>
        <span class="doc-expiry">
          ${doc.isPermanent ? '永久有效' : `到期: ${doc.expiryDate}`}
        </span>
        ${doc.daysUntilExpiry !== undefined && !doc.isPermanent ? `
          <span class="doc-days">(${doc.daysUntilExpiry}天)</span>
        ` : ''}
      </div>
    `;
  }

  /**
   * 渲染缺失的资料
   */
  renderMissingDocuments(existingDocs, supplierId, materialId, componentId) {
    const requiredTypes = ['environmental_rohs', 'environmental_reach', 'environmental_hf'];
    const existingTypes = existingDocs.map(d => d.documentType);
    const missingTypes = requiredTypes.filter(type => !existingTypes.includes(type));

    if (missingTypes.length === 0) {
      return '';
    }

    return missingTypes.map(type => `
      <div class="document-item document-item--missing">
        <span class="doc-icon">❌</span>
        <span class="doc-type">${this.getDocumentTypeText(type)}</span>
        <span class="doc-status">缺失</span>
        <button class="btn btn--sm btn--primary quick-upload-btn" 
                data-supplier-id="${supplierId}"
                data-material-id="${materialId}"
                data-component-id="${componentId}"
                data-level="component"
                data-doc-type="${type}">
          快速上传
        </button>
      </div>
    `).join('');
  }

  /**
   * 展开/收起供应商
   */
  toggleSupplier(supplierId) {
    if (this.expandedSuppliers.has(supplierId)) {
      this.expandedSuppliers.delete(supplierId);
    } else {
      this.expandedSuppliers.add(supplierId);
    }
    this.render();
  }

  /**
   * 展开/收起物料
   */
  toggleMaterial(materialId) {
    if (this.expandedMaterials.has(materialId)) {
      this.expandedMaterials.delete(materialId);
    } else {
      this.expandedMaterials.add(materialId);
    }
    this.render();
  }

  /**
   * 展开/收起构成
   */
  toggleComponent(componentId) {
    if (this.expandedComponents.has(componentId)) {
      this.expandedComponents.delete(componentId);
    } else {
      this.expandedComponents.add(componentId);
    }
    this.render();
  }

  /**
   * 显示上传模态框
   */
  showUploadModal(presetData = {}) {
    console.log('📤 显示上传模态框:', presetData);
    // TODO: 实现上传模态框
    alert('上传功能开发中...');
  }

  /**
   * 渲染供应商下拉选择
   */
  renderSupplierSelect() {
    const select = document.getElementById('supplierSelect');
    if (!select) return;

    const options = [
      '<option value="">全部供应商</option>',
      ...this.suppliers.map(s => `<option value="${s.id}">${s.name}</option>`)
    ];

    select.innerHTML = options.join('');
  }

  /**
   * 防抖渲染
   */
  debounceRender() {
    clearTimeout(this.renderTimer);
    this.renderTimer = setTimeout(() => this.render(), 300);
  }

  /**
   * 工具函数: 获取状态文本
   */
  getStatusText(status) {
    const map = {
      urgent: '紧急',
      warning: '警告',
      normal: '正常',
      expired: '已过期'
    };
    return map[status] || status;
  }

  /**
   * 工具函数: 获取警告图标
   */
  getWarningIcon(level) {
    const map = {
      normal: '🟢',
      warning: '🟡',
      urgent: '🔴',
      critical: '🔴',
      expired: '❌'
    };
    return map[level] || '⚪';
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