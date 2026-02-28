/**
 * 供应商资料管理模块 v3.2
 * 表格预览 + 展开详情视图
 *
 * 核心功能:
 * 1. 表格预览 - 显示供应商资料汇总
 * 2. 展开详情 - 显示通用资料和物料资料
 * 3. 构成信息作为资料备注
 * 4. 上传界面集成资料类型设置功能
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
    this.statusFilter = ''; // 🎯 [修复] 初始化为空字符串，与逻辑保持一致

    this.init();
  }

  /**
   * 初始化模块
   */
  async init() {
    console.log('🚀 初始化供应商资料管理模块 v3.1...');

    try {
      // 设置全局实例 - 必须在render()之前！
      window.supplierManager = this;
      console.log('✅ 全局实例已设置:', window.supplierManager);

      // 加载供应商汇总数据
      await this.loadSummary();

      // 绑定事件
      this.bindEvents();

      // 渲染界面
      this.render();

      // 监听配置中心更新事件
      window.addEventListener('vendor-config-updated', () => {
        console.log('📢 收到配置中心更新通知，刷新供应商列表...');
        this.refresh(false);
      });

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
        // 中文拼音排序：先按来源排序（手动添加在前，IQC导入在后），然后按供应商名称拼音A-Z排序
        this.suppliers.sort((a, b) => {
            // 第一级排序：按来源
            const sourceOrder = { 'MANUAL': 0, 'IQC': 1 };
            const sourceA = sourceOrder[a.source] ?? 2;
            const sourceB = sourceOrder[b.source] ?? 2;
            
            if (sourceA !== sourceB) {
                return sourceA - sourceB;
            }
            
            // 第二级排序：按供应商名称拼音排序
            return a.supplierName.localeCompare(b.supplierName, 'zh-CN');
        });
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
              // 使用动态路径配置，避免硬编码
              doc.filePath = window.pathConfig.getCommonDocumentsPath('晶蓝');
            }
          });
        }

        // 给物料资料也添加filePath
        if (data.data && data.data.materials) {
          data.data.materials.forEach(material => {
            if (material.documents) {
              material.documents.forEach(doc => {
                if (!doc.filePath) {
                  // 使用动态路径配置，避免硬编码
                  doc.filePath = window.pathConfig.getTestReportsPath('晶蓝');
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
        this.syncFromVendorConfig();
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

        // 资料类型设置按钮
        const settingsBtn = e.target.closest('.supplier-btn--document-type-settings');
        if (settingsBtn) {
          console.log('⚙️ 点击资料类型设置按钮', settingsBtn.dataset);
          e.preventDefault();
          const type = settingsBtn.dataset.type || 'common';
          console.log('⚙️ 调用资料类型设置模态框:', type);

          // 确保UI组件已加载
          if (window.documentTypeSimpleUI) {
            // 简化：直接调用，不传递复杂回调
            window.documentTypeSimpleUI.showSettingsModal(type);
          } else {
            console.error('❌ documentTypeSimpleUI 未加载，请检查脚本引用');
            window.supplierUIUtils.showError('资料类型设置功能未加载，请刷新页面重试');
          }
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
          await this.deleteDocument(documentId);
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
          await this.deleteMaterial(supplierId, materialId, materialName);
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

      // 统一模态框关闭按钮监听 - 支持所有类型的关闭按钮
      const closeBtn = e.target.closest('.supplier-modal__close') ||
                      e.target.closest('.supplier-modal__close--edit') ||
                      e.target.closest('.supplier-modal__close--component') ||
                      e.target.closest('.supplier-modal__close--add-material') ||
                      e.target.closest('#componentManagementModal .supplier-modal__btn--secondary'); // 仅构成管理模态框的底部关闭按钮

      if (closeBtn) {
        console.log('🎯 检测到关闭按钮点击:', closeBtn.className);

        // 判断是哪个模态框
        const editModal = document.getElementById('editModal');
        const componentModal = document.getElementById('componentManagementModal');
        const addMaterialModal = document.getElementById('addMaterialModal');
        const emailModal = document.getElementById('emailPreviewModal');

        // 检查模态框的实际显示状态（包括通过modalManager显示的情况）
        const editModalVisible = editModal && (
          editModal.style.display !== 'none' ||
          editModal.style.display === '' &&
          getComputedStyle(editModal).display !== 'none'
        );
        const componentModalVisible = componentModal && (
          componentModal.style.display !== 'none' ||
          componentModal.style.display === '' &&
          getComputedStyle(componentModal).display !== 'none'
        );
        const addMaterialModalVisible = addMaterialModal && (
          addMaterialModal.style.display !== 'none' ||
          addMaterialModal.style.display === '' &&
          getComputedStyle(addMaterialModal).display !== 'none'
        );
        const emailModalVisible = emailModal && (
          emailModal.style.display !== 'none' ||
          emailModal.style.display === '' &&
          getComputedStyle(emailModal).display !== 'none'
        );

        console.log('📊 编辑模态框显示状态:', editModalVisible);
        console.log('📊 构成管理模态框显示状态:', componentModalVisible);
        console.log('📊 新增物料模态框显示状态:', addMaterialModalVisible);
        console.log('📊 邮件模态框显示状态:', emailModalVisible);

        if (editModalVisible) {
          console.log('✅ 关闭编辑模态框');
          this.hideEditModal();
        } else if (componentModalVisible) {
          console.log('✅ 关闭构成管理模态框');
          window.supplierUIUtils.hideComponentManagementModal();
        } else if (addMaterialModalVisible) {
          console.log('✅ 关闭新增物料模态框');
          window.supplierUIUtils.hideAddMaterialModal();
        } else if (emailModalVisible) {
          console.log('✅ 关闭邮件模态框');
          window.supplierUIUtils.hideEmailModal();
        } else {
          console.log('❌ 无法确定要关闭的模态框');
          // 如果无法确定，尝试关闭所有模态框
          if (editModal) this.hideEditModal();
          if (componentModal) window.supplierUIUtils.hideComponentManagementModal();
          if (addMaterialModal) window.supplierUIUtils.hideAddMaterialModal();
          if (emailModal) window.supplierUIUtils.hideEmailModal();
        }
        return;
      }

      // 编辑模态框取消按钮
      if (e.target.closest('.supplier-modal__cancel--edit')) {
        this.hideEditModal();
        return;
      }

      // 编辑模态框提交按钮
      if (e.target.closest('.supplier-modal__submit--edit')) {
        await this.submitEdit();
        return;
      }

      // 新增物料模态框关闭按钮
      if (e.target.closest('.supplier-modal__close--add-material')) {
        window.supplierUIUtils.hideAddMaterialModal();
        return;
      }

      // 新增物料模态框取消按钮
      if (e.target.closest('.supplier-modal__cancel--add-material')) {
        window.supplierUIUtils.hideAddMaterialModal();
        return;
      }

      // 新增物料模态框提交按钮
      if (e.target.closest('.supplier-modal__submit--add-material')) {
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
    const filteredSuppliers = this.filterSuppliers();

    // 获取状态汇总
    const statusSummary = this.getSupplierStatusSummary();

    // 渲染搜索和筛选控件 - 统计栏单独一行
    let html = `
      <div class="supplier-controls-container">
        <!-- 统计概览卡片 -->
        <div class="supplier-stats-wrapper">
          <div class="supplier-stats-header">
            <h4 class="supplier-stats-title"><i class="ph ph-newspaper-clipping"></i> 数据概览</h4>
          </div>
          <div class="supplier-stats-grid">
            <div class="supplier-stats-card supplier-stats-card--total">
              <div class="supplier-stats-icon"><i class="ph ph-chart-bar"></i></div>
              <div class="supplier-stats-content">
                <div class="supplier-stats-value">${this.suppliers.length}</div>
                <div class="supplier-stats-label">总供应商</div>
              </div>
            </div>
            <div class="supplier-stats-card supplier-stats-card--normal">
              <div class="supplier-stats-icon">🟢</div>
              <div class="supplier-stats-content">
                <div class="supplier-stats-value">${statusSummary.normal}</div>
                <div class="supplier-stats-label">正常状态</div>
                <div class="supplier-stats-progress">
                  <div class="supplier-stats-progress-bar" style="width: ${this.suppliers.length > 0 ? (statusSummary.normal / this.suppliers.length * 100).toFixed(0) : 0}%"></div>
                </div>
              </div>
            </div>
            <div class="supplier-stats-card supplier-stats-card--warning">
              <div class="supplier-stats-icon">🟡</div>
              <div class="supplier-stats-content">
                <div class="supplier-stats-value">${statusSummary.warning}</div>
                <div class="supplier-stats-label">即将到期</div>
                <div class="supplier-stats-progress">
                  <div class="supplier-stats-progress-bar" style="width: ${this.suppliers.length > 0 ? (statusSummary.warning / this.suppliers.length * 100).toFixed(0) : 0}%"></div>
                </div>
              </div>
            </div>
            <div class="supplier-stats-card supplier-stats-card--urgent">
              <div class="supplier-stats-icon">🟠</div>
              <div class="supplier-stats-content">
                <div class="supplier-stats-value">${statusSummary.urgent}</div>
                <div class="supplier-stats-label">紧急状态</div>
                <div class="supplier-stats-progress">
                  <div class="supplier-stats-progress-bar" style="width: ${this.suppliers.length > 0 ? (statusSummary.urgent / this.suppliers.length * 100).toFixed(0) : 0}%"></div>
                </div>
              </div>
            </div>
            <div class="supplier-stats-card supplier-stats-card--expired">
              <div class="supplier-stats-icon">🔴</div>
              <div class="supplier-stats-content">
                <div class="supplier-stats-value">${statusSummary.expired}</div>
                <div class="supplier-stats-label">已过期</div>
                <div class="supplier-stats-progress">
                  <div class="supplier-stats-progress-bar" style="width: ${this.suppliers.length > 0 ? (statusSummary.expired / this.suppliers.length * 100).toFixed(0) : 0}%"></div>
                </div>
              </div>
            </div>
          </div>
          ${(this.searchKeyword || this.statusFilter) ?
            `<div class="supplier-stats-filter-info">
              当前筛选显示: <span class="highlight">${filteredSuppliers.length}</span> 个供应商
              <button onclick="supplierManager.clearAllFilters()" class="btn btn-secondary btn-sm">
                重置筛选
              </button>
            </div>` : ''}
        </div>

        <!-- 第二部分：搜索和筛选 -->
        <div class="supplier-search-filter-wrapper">
          <div class="supplier-search-filter-header">
            <h4 class="supplier-search-filter-title"><i class="ph-fill ph-magnifying-glass"></i> 搜索和筛选</h4>
          </div>
          <div class="supplier-controls-row">
            <!-- 搜索区域 -->
            <div class="search-section">
              <div class="search-section__header">
                <svg class="search-section__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <h3 class="search-section__title">搜索供应商</h3>
              </div>
              <div class="search-input-wrapper">
                <svg class="search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                <input type="text"
                       id="supplierManagerSearchInput"
                       placeholder="输入供应商名称..."
                       value="${this.searchKeyword}"
                       class="search-input"
                       autocomplete="off">
                <div class="search-actions">
                  <button onclick="supplierManager.performSearch()" class="search-submit-btn" title="搜索">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <path d="m21 21-4.35-4.35"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="search-status ${this.searchKeyword ? 'search-status--active' : ''}">
                ${this.searchKeyword ?
                  `正在搜索: ${this.searchKeyword}` :
                  '输入供应商名称进行搜索'}
              </div>
            </div>

            <!-- 筛选区域 -->
            <div class="filter-section">
              <div class="filter-section__header">
                <svg class="filter-section__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                <h3 class="filter-section__title">状态筛选</h3>
              </div>
              <select id="statusFilter"
                      onchange="window.supplierManager?.filterByStatus()"
                      class="filter-select">
                <option value="" ${this.statusFilter === '' ? 'selected' : ''}>全部供应商</option>
                <option value="normal" ${this.statusFilter === 'normal' ? 'selected' : ''}>正常状态</option>
                <option value="warning" ${this.statusFilter === 'warning' ? 'selected' : ''}>即将到期</option>
                <option value="urgent" ${this.statusFilter === 'urgent' ? 'selected' : ''}>紧急状态</option>
                <option value="expired" ${this.statusFilter === 'expired' ? 'selected' : ''}>已过期</option>
              </select>
              <div class="filter-info ${this.statusFilter ? 'filter-info--active' : ''}">
                ${this.statusFilter ?
                  `当前筛选: ${this.getStatusFilterText(this.statusFilter)}` :
                  '显示所有供应商'}
              </div>
            </div>
          </div>
        </div>

        <!-- 筛选信息提示 -->
        ${(this.searchKeyword || this.statusFilter) ?
          `<div class="supplier-search-filter-info">
            <div class="filter-info-content">
              <span class="filter-info-icon"><i class="ph ph-magnifying-glass"></i></span>
              <span class="filter-info-text">
                ${this.searchKeyword ? `搜索: "${this.searchKeyword}"` : ''}
                ${this.searchKeyword && this.statusFilter ? ' | ' : ''}
                ${this.statusFilter ? `筛选: ${this.getStatusFilterText(this.statusFilter)}` : ''}
              </span>
              <span class="filter-info-count">找到 ${filteredSuppliers.length} 个供应商</span>
            </div>
            <button onclick="supplierManager.clearAllFilters()" class="btn btn-secondary btn-sm">
              <span class="btn-icon">✕</span>
              清除筛选
            </button>
          </div>` : ''}
      </div>  <!-- 关闭 supplier-search-filter-wrapper -->

        <!-- 第三部分：资料列表 -->
        <div class="supplier-list-wrapper">
          <!-- 资料列表标题 -->
          <div class="supplier-list-header">
            <h3 class="supplier-list-title"><i class="ph ph-list-dashes"></i> 资料列表</h3>
            <div class="supplier-list-info">
              显示 <span class="highlight">${filteredSuppliers.length}</span> 个供应商
              ${this.searchKeyword ? `（搜索："${this.searchKeyword}"）` : ''}
              ${this.statusFilter ? `（状态：${this.getStatusFilterText(this.statusFilter)}）` : ''}
            </div>
          </div>

          <!-- 表格 -->
          <div class="supplier-table-container">
        <table class="supplier-table">
          <thead>
            <tr>
              <th>供应商（A-Z排序）</th>
              <th colspan="5">资料状态</th>
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
      </div>  <!-- 关闭 supplier-list-wrapper -->
      </div>  <!-- 关闭 supplier-controls-container -->
    `;

    container.innerHTML = html;

    // 延迟绑定搜索事件，确保DOM完全渲染
    setTimeout(() => {
      this.bindSearchEvents();
      this.bindFilterEvents(); // 🎯 添加筛选事件绑定
    }, 10);
  }

  /**
   * 筛选供应商数据
   */
  filterSuppliers() {
    const filtered = this.suppliers.filter((supplier) => {
      // 搜索关键词筛选
      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase();
        const matchesSearch = supplier.supplierName.toLowerCase().includes(keyword);
        if (!matchesSearch) {
          return false;
        }
      }

      // 状态筛选 - 借鉴搜索逻辑：空字符串也跳过筛选
      if (this.statusFilter) {
        const hasStatus = window.supplierServices.checkSupplierStatus(supplier, this.statusFilter);
        if (!hasStatus) {
          return false;
        }
      }

      return true;
    });

    return filtered;
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
    console.log('🔗 开始绑定搜索事件');
    const searchInput = document.getElementById('supplierManagerSearchInput');
    console.log('🔗 搜索输入框查找结果:', searchInput);

    if (searchInput) {
      console.log('✅ 搜索输入框找到，开始绑定事件');

      // 回车搜索
      searchInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault(); // 防止表单提交
          console.log('⌨️ 回车键触发搜索');
          this.performSearch();
        }
      };

      // 简化输入事件处理
      searchInput.oninput = (e) => {
        // 实时搜索（可选）
        if (e.target.value.trim().length >= 2 || e.target.value.trim() === '') {
          // 可以在这里添加实时搜索逻辑
        }
      };

      console.log('✅ 搜索输入框事件绑定完成');
    } else {
      console.error('❌ 搜索输入框未找到，无法绑定事件');
    }

    // 清除搜索按钮已移除 - 使用统计栏的重置按钮

    console.log('🔗 搜索事件绑定完成');
  }

  /**
   * 绑定筛选事件 - 🎯 新增方法确保事件正确绑定
   */
  bindFilterEvents() {
    const statusFilter = document.getElementById('statusFilter');

    if (statusFilter) {
      // 移除可能存在的旧事件监听器
      statusFilter.onchange = null;

      // 绑定新的事件监听器
      statusFilter.onchange = () => {
        this.filterByStatus();
      };
    }
  }

  /**
   * 按状态筛选 - 借鉴搜索逻辑，使用空字符串代替null
   */
  filterByStatus() {
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
      // 🎯 [借鉴搜索逻辑] 使用空字符串，与搜索保持一致
      this.statusFilter = statusFilter.value;
    }
    this.render();
  }

  /**
   * 执行搜索
   */
  performSearch() {
    const searchInput = document.getElementById('supplierManagerSearchInput');

    if (searchInput) {
      this.searchKeyword = searchInput.value.trim();
      this.render();
    } else {
      // 尝试重新绑定事件
      setTimeout(() => {
        this.bindSearchEvents();
      }, 100);
    }
  }

  /**
   * 清除搜索
   */
  clearSearch() {
    this.searchKeyword = '';
    const searchInput = document.getElementById('supplierManagerSearchInput');
    if (searchInput) {
      searchInput.value = '';
    }
    this.render();
  }

  /**
   * 清除所有筛选 - 借鉴搜索逻辑，统一使用空字符串
   */
  clearAllFilters() {
    this.searchKeyword = '';
    this.statusFilter = ''; // 🎯 [借鉴搜索逻辑] 使用空字符串，与搜索保持一致

    // 清除搜索框
    const searchInput = document.getElementById('supplierManagerSearchInput');
    if (searchInput) {
      searchInput.value = '';
    }

    // 清除筛选下拉框
    const statusFilterSelect = document.getElementById('statusFilter');
    if (statusFilterSelect) {
      statusFilterSelect.value = '';
    }

    this.render();
  }

  /**
   * 获取状态筛选文本
   */
  getStatusFilterText(status) {
    const statusMap = {
      'normal': '🟢 正常状态',
      'warning': '🟡 即将到期',
      'urgent': '🟠 紧急状态',
      'expired': '🔴 已过期'
    };
    return statusMap[status] || status;
  }

  /**
   * 统计指定状态的供应商数量（基于最差状态）
   * @param {string} status - 状态类型（normal/warning/urgent/expired）
   * @return {number} 该状态的供应商数量
   */
  countSuppliersByStatus(status) {
    return this.suppliers.filter(supplier => {
      const worstStatus = this.getSupplierWorstStatus(supplier);
      
      // 如果没有文档数据，不计入任何状态
      if (worstStatus === 'unknown') {
        return false;
      }
      
      return worstStatus === status;
    }).length;
  }

  /**
   * 获取供应商的最差状态
   * @param {Object} supplier - 供应商数据
   * @return {string} 最差状态
   */
  getSupplierWorstStatus(supplier) {
    // 兼容多种数据结构：progressBar.statusStats（新）、statusStats（旧）和 statusDetails（新）
    const docStats = supplier.documentStats?.progressBar?.statusStats || supplier.documentStats?.statusStats || supplier.documentStats?.statusDetails;

    if (!docStats) {
      return 'unknown';
    }

    // 状态优先级：expired > urgent > warning > normal
    if (docStats.expired > 0) return 'expired';
    if (docStats.urgent > 0) return 'urgent';
    if (docStats.warning > 0) return 'warning';
    if (docStats.normal > 0) return 'normal';

    return 'unknown';
  }

  /**
   * 获取所有供应商的状态汇总（用于数据概览）
   * @return {Object} 各状态的供应商数量
   */
  getSupplierStatusSummary() {
    return {
      normal: this.countSuppliersByStatus('normal'),
      warning: this.countSuppliersByStatus('warning'),
      urgent: this.countSuppliersByStatus('urgent'),
      expired: this.countSuppliersByStatus('expired'),
      unknown: this.suppliers.filter(s => this.getSupplierWorstStatus(s) === 'unknown').length
    };
  }


  /**
   * 🎯 [UI-EVENT] 渲染供应商行 - 双行显示 + 进度条设计
   */
  renderSupplierRow(supplier) {
    const isExpanded = this.expandedSuppliers.has(supplier.supplierId);

    // 🎨 [UI-EVENT] 获取进度条数据（新的动态统计数据）
    const progressBarData = supplier.documentStats?.progressBar || {
      totalDocuments: 0,
      completionRate: 0,
      statusStats: { normal: 0, warning: 0, urgent: 0, expired: 0 },
      statusText: '暂无文档'
    };
    
    // 兼容两种数据结构
    const statusStats = supplier.documentStats?.statusStats || supplier.documentStats?.statusDetails || { normal: 0, warning: 0, urgent: 0, expired: 0 };

    
    // 🎨 [UI-EVENT] 渲染进度条组件
    const progressHtml = this.renderProgressBar(progressBarData);

    return `
      <tr class="supplier-row ${isExpanded ? 'expanded' : ''}">
        <td class="supplier-name" style="text-align: center !important;">
          <i class="ph ph-building-office" style="color: var(--primary-600); margin-right: 8px; font-size: 1.6em;"></i>
          <span style="font-size: 1.1em; font-weight: 600;">${supplier.supplierName}</span>
        </td>
        <td colspan="5" class="progress-cell">
          ${progressHtml}
        </td>
        <td class="material-count" style="vertical-align: middle !important;">
          ${supplier.materialCount}个
        </td>
        <td class="toggle-cell" style="text-align: center !important;">
          <button class="toggle-details-btn" data-supplier-id="${supplier.supplierId}">
            ${isExpanded ? '📁 收起' : '📂 展开'}
          </button>
        </td>
      </tr>
    `;
  }

  /**
   * 🎨 [UI-EVENT] 渲染堆叠柱状图组件 - 横向堆叠显示
   */
  renderProgressBar(progressData) {
    const { totalDocuments, statusStats } = progressData;

    
    if (totalDocuments === 0) {
      return `
        <div class="supplier-progress supplier-progress--empty">
          <div class="supplier-progress__bar-section">
            <div class="supplier-progress__bar-container">
              <div class="supplier-progress__bar-empty">暂无文档</div>
            </div>
            <div class="supplier-progress__bar-text">0%</div>
          </div>
          <div class="supplier-progress__status-section">
            <div class="supplier-progress__status-item" style="opacity: 0.6">暂无状态数据</div>
          </div>
        </div>
      `;
    }

    // 计算各状态百分比
    const totalCount = Object.values(statusStats).reduce((sum, count) => sum + count, 0);

    const statusConfig = [
      { key: 'normal', color: '#22c55e', label: '正常' },
      { key: 'warning', color: '#f59e0b', label: '警告' },
      { key: 'urgent', color: '#f97316', label: '紧急' },
      { key: 'expired', color: '#ef4444', label: '过期' }
    ];

    // 生成堆叠段
    let currentPosition = 0;
    const stackSegments = statusConfig
      .filter(({ key }) => statusStats[key] > 0)
      .map(({ key, color, label }) => {
        const percentage = (statusStats[key] / totalCount * 100).toFixed(1);
        const leftPosition = currentPosition;
        currentPosition += parseFloat(percentage);

        
        return `
          <div class="supplier-progress__stack-segment"
               style="left: ${leftPosition}%; width: ${percentage}%; background-color: ${color};"
               title="${label}: ${statusStats[key]} (${percentage}%)">
          </div>
        `;
      }).join('');

    
    // 生成小图标状态显示
    const miniStatusItems = statusConfig
      .filter(({ key }) => statusStats[key] > 0 && ['normal', 'warning', 'urgent', 'expired'].includes(key))
      .slice(0, 4) // 最多显示4个状态
      .map(({ key }) => {
        const icon = key === 'normal' ? '🟢' :
                    key === 'warning' ? '🟡' :
                    key === 'urgent' ? '🟠' :
                    key === 'expired' ? '🔴' : '⚪';
        return `<span class="supplier-progress__mini-status" style="font-size: 1.2em; font-weight: 500;">${icon}${statusStats[key]}</span>`;
      }).join('');

    const finalHtml = `
      <div class="supplier-progress">
        <!-- 第一行：柱状图 -->
        <div class="supplier-progress__bar-row">
          <div class="supplier-progress__bar-container">
            ${stackSegments}
          </div>
        </div>
        <!-- 第二行：详细信息 -->
        <div class="supplier-progress__info-row">
          <div class="supplier-progress__bar-text" style="font-size: 1.1em; font-weight: 500;">
            ${statusStats.normal || 0}/${totalCount} (${((statusStats.normal || 0) / totalCount * 100).toFixed(1)}%)
          </div>
          <div class="supplier-progress__status-section">
            ${miniStatusItems || '<div class="supplier-progress__status-item" style="opacity: 0.6">暂无状态数据</div>'}
          </div>
        </div>
      </div>
    `;

            return finalHtml;
  }

  /**
   * 🎨 [UI-EVENT] 渲染状态统计 - 纯状态分布显示（无进度条）
   */
  renderStatusStats(statusStats) {
    const statusConfig = [
      { key: 'normal', icon: '🟢', label: '正常' },
      { key: 'warning', icon: '🟡', label: '警告' },
      { key: 'urgent', icon: '🟠', label: '紧急' },
      { key: 'expired', icon: '🔴', label: '过期' }
    ];

    const statusItems = statusConfig
      .filter(({ key }) => statusStats[key] > 0)
      .map(({ key, icon, label }) => `
        <div class="supplier-progress__status-item supplier-progress__status-item--${key}">
          <span class="supplier-progress__status-icon">${icon}</span>
          <span class="supplier-progress__status-count">${statusStats[key]}</span>
        </div>
      `).join('');

    return `
      <div class="supplier-progress-status-only">
        <div class="supplier-progress__status-section supplier-progress__status-section--full">
          ${statusItems || '<div class="supplier-progress__status-item" style="opacity: 0.6">暂无状态数据</div>'}
        </div>
      </div>
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
   * 渲染文档操作按钮（统一方法，消除代码重复）
   */
  renderDocumentActions(doc, supplierId) {
    // 统一处理文档ID的差异
    const documentId = doc.id || doc.documentId;

    return `
      <div class="doc-actions">
        <button class="action-btn email-btn single-email-btn" data-document-id="${documentId}" data-supplier-id="${supplierId}" title="发送邮件">
          📧
        </button>
        <button class="action-btn edit-btn" data-document-id="${documentId}" title="编辑">✏️</button>
        <button class="action-btn delete-btn" data-document-id="${documentId}" title="删除">🗑️</button>
        ${doc.filePath ? `
          <button class="action-btn folder-btn" data-file-path="${doc.filePath}" title="打开文件夹">
            📁
          </button>
        ` : ''}
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
          <div style="display: flex; align-items: center; gap: 4px;">
              <h4 style="margin: 0;">📋 通用资料</h4>
              <span class="section-tooltip" data-tooltip="📋 通用资料

适用于所有物料的供应商整体资质文件：

🔸 质量保证协议
🔸 MSDS安全数据表
🔸 ISO认证、企业资质证书
🔸 营业执照等

特点：不针对特定物料，属于供应商整体资质证明">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
            </span>
            </div>
          <div class="section-actions">
            <button class="email-btn batch-email-btn" data-type="common" data-supplier-id="${supplierId}" title="批量邮件通知">
              📧 批量邮件
            </button>
            <button class="upload-btn" data-type="common" data-supplier-id="${supplierId}" title="上传通用资料">
              📤 上传
            </button>
            <button class="settings-btn supplier-btn--document-type-settings" data-type="common" title="资料类型设置">
              ⚙️ 资料类型设置
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
            <span class="doc-type">${window.supplierServices.getCertificateTypeTextSync(doc.documentType)}</span>
            <span class="doc-name">${doc.documentName}</span>
            <span class="doc-expiry">
              ${doc.isPermanent ? '永久有效' : `到期: ${window.supplierServices.formatDate(doc.expiryDate)}`}
            </span>
            ${doc.daysUntilExpiry !== null && !doc.isPermanent ? `
              <span class="doc-days">(${doc.daysUntilExpiry}天)</span>
            ` : ''}
            ${this.renderDocumentActions(doc, supplierId)}
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

    // 🏭 检测报告 - 统一容器，与通用资料同级
    if (details.materials && details.materials.length > 0) {
      html += `
        <div class="details-section">
          <div class="section-header">
            <div style="display: flex; align-items: center; gap: 4px;">
              <h4 style="margin: 0;">🏭 检测报告</h4>
              <span class="section-tooltip" data-tooltip="🏭 检测报告

针对特定物料的检测和认证文件：

🔸 本体检测：材料成分、性能等检测报告
🔸 构成检测：零部件构成明细表
🔸 ROHS/REACH环保认证
🔸 HF有害物质检测
🔸 物料规格书等

特点：与具体物料一一对应，确保符合技术要求">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
            </span>
            </div>
            <div class="section-actions">
              <button class="add-material-btn" data-supplier-id="${supplierId}" title="新增物料">
                ➕ 新增物料
              </button>
            </div>
          </div>
          <div class="materials-container">
      `;

      details.materials.forEach(material => {
        html += `
          <div class="material-section">
            <div class="material-header">
              <h5>📦 物料：${material.materialName}</h5>
              <div class="material-actions">
                <button class="email-btn batch-email-btn" data-type="material" data-supplier-id="${supplierId}" data-material-id="${material.materialId}" data-material-name="${material.materialName}" title="批量邮件通知">
                  📧 批量邮件
                </button>
                <button class="upload-btn" data-type="material" data-supplier-id="${supplierId}" data-material-id="${material.materialId}" title="上传物料资料">
                  📤 上传资料
                </button>
                <button class="delete-material-btn" data-supplier-id="${supplierId}" data-material-id="${material.materialId}" data-material-name="${material.materialName}" title="删除物料">
                  🗑️ 删除物料
                </button>
              </div>
            </div>
            <ul class="document-list">
        `;

        // 🎯 本体检测文档
        if (material.directDocuments && material.directDocuments.length > 0) {
          html += `
            <div class="detection-section">
              <h6 class="detection-title">🎯 本体检测</h6>
              <ul class="document-list">
          `;

          material.directDocuments.forEach(doc => {
              // 确保本体检测文档也有filePath属性
              if (!doc.filePath) {
                doc.filePath = window.pathConfig.getTestReportsPath('晶蓝');
              }
            html += `
              <li class="document-item ${doc.status}">
                <span class="doc-icon">${window.supplierServices.getStatusIcon(doc.status)}</span>
                <span class="doc-type">${window.supplierServices.getCertificateTypeTextSync(doc.documentType)}</span>
                <span class="doc-name">${doc.documentName}</span>
                <span class="doc-expiry">
                  ${doc.isPermanent ? '永久有效' : `到期: ${window.supplierServices.formatDate(doc.expiryDate)}`}
                </span>
                ${doc.daysUntilExpiry !== null && !doc.isPermanent ? `
                  <span class="doc-days">(${doc.daysUntilExpiry}天)</span>
                ` : ''}
                ${this.renderDocumentActions(doc, supplierId)}
              </li>
            `;
          });

          html += `
              </ul>
            </div>
          `;
        }

        // 🔗 引用检测构成
        if (material.referencedComponents && Object.keys(material.referencedComponents).length > 0) {
          html += `
            <div class="detection-section">
              <h6 class="detection-title">🔗 引用检测</h6>
          `;

          Object.entries(material.referencedComponents).forEach(([componentName, component]) => {
            html += `
              <div class="component-section">
                <h7 class="component-title">🧪 构成：${componentName}</h7>
                <ul class="document-list">
            `;

            component.documents.forEach(doc => {
              // 确保检测报告文档也有filePath属性
              if (!doc.filePath) {
                doc.filePath = window.pathConfig.getTestReportsPath('晶蓝');
              }
              html += `
                <li class="document-item ${doc.status}">
                  <span class="doc-icon">${window.supplierServices.getStatusIcon(doc.status)}</span>
                  <span class="doc-type">${window.supplierServices.getCertificateTypeTextSync(doc.documentType)}</span>
                  <span class="doc-name">${doc.documentName}</span>
                  <span class="doc-expiry">
                    ${doc.isPermanent ? '永久有效' : `到期: ${window.supplierServices.formatDate(doc.expiryDate)}`}
                  </span>
                  ${doc.daysUntilExpiry !== null && !doc.isPermanent ? `
                    <span class="doc-days">(${doc.daysUntilExpiry}天)</span>
                  ` : ''}
                  ${this.renderDocumentActions(doc, supplierId)}
                </li>
              `;
            });

            html += `
                </ul>
              </div>
            `;
          });

          html += `
            </div>
          `;
        }

        // 如果既没有本体检测也没有引用检测，显示暂无文档
        if ((!material.directDocuments || material.directDocuments.length === 0) &&
            (!material.referencedComponents || Object.keys(material.referencedComponents).length === 0)) {
          html += '<li class="no-documents">暂无资料</li>';
        }

        html += `
            </ul>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

    // 如果没有物料，显示空的检测报告区域
    if (!details.materials || details.materials.length === 0) {
      html += `
        <div class="details-section">
          <div class="section-header">
            <div style="display: flex; align-items: center; gap: 4px;">
              <h4 style="margin: 0;">🏭 检测报告</h4>
              <span class="section-tooltip" data-tooltip="🏭 检测报告

针对特定物料的检测和认证文件：

🔸 本体检测：材料成分、性能等检测报告
🔸 构成检测：零部件构成明细表
🔸 ROHS/REACH环保认证
🔸 HF有害物质检测
🔸 物料规格书等

特点：与具体物料一一对应，确保符合技术要求">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 16v-4"></path>
                <path d="M12 8h.01"></path>
              </svg>
            </span>
            </div>
            <div class="section-actions">
              <button class="add-material-btn" data-supplier-id="${supplierId}" title="新增物料">
                ➕ 新增物料
              </button>
            </div>
          </div>
          <div class="materials-container">
            <div class="no-materials-hint">
              <span class="hint-icon">📭</span>
              <span class="hint-text">暂无检测报告，点击上方"新增物料"按钮添加</span>
            </div>
          </div>
        </div>
      `;
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
          // 查找直接物料文档
          if (material.documents) {
            targetDoc = material.documents.find(doc => doc.documentId === documentId);
            if (targetDoc) {
              // 添加物料信息到文档对象
              targetDoc.materialName = material.materialName;
              break;
            }
          }

          // 查找本体检测文档
          if (!targetDoc && material.directDocuments) {
            targetDoc = material.directDocuments.find(doc => doc.documentId === documentId);
            if (targetDoc) {
              targetDoc.materialName = material.materialName;
              targetDoc.detectionType = 'direct';
              break;
            }
          }

          // 查找引用检测文档
          if (!targetDoc && material.referencedComponents) {
            for (const [componentName, component] of Object.entries(material.referencedComponents)) {
              if (component.documents) {
                targetDoc = component.documents.find(doc => doc.documentId === documentId);
                if (targetDoc) {
                  targetDoc.materialName = material.materialName;
                  targetDoc.componentName = componentName;
                  targetDoc.detectionType = 'referenced';
                  break;
                }
              }
            }
            if (targetDoc) break;
          }
        }
      }

      if (!targetDoc) {
        console.error('❌ 未找到目标文档:', { documentId, supplierId });
        console.error('📊 可用的文档数据:', {
          commonDocuments: details.commonDocuments?.map(doc => ({ id: doc.id, name: doc.documentName })),
          materials: details.materials?.map(material => ({
            materialName: material.materialName,
            directDocuments: material.directDocuments?.map(doc => ({ documentId: doc.documentId, name: doc.documentName })),
            referencedComponents: Object.entries(material.referencedComponents || {}).map(([name, comp]) => ({
              componentName: name,
              documents: comp.documents?.map(doc => ({ documentId: doc.documentId, name: doc.documentName }))
            }))
          }))
        });
        window.supplierUIUtils.showError('文档信息不存在');
        return;
      }

      console.log('✅ 找到目标文档:', {
        documentId,
        documentName: targetDoc.documentName,
        materialName: targetDoc.materialName,
        componentName: targetDoc.componentName,
        detectionType: targetDoc.detectionType
      });

      // 获取证书类型文本（异步）
      const certificateTypeText = window.supplierServices.getCertificateTypeTextSync(targetDoc.documentType);

      // 准备邮件变量
      const variables = {
        供应商名称: supplier.supplierName,
        物料名称: targetDoc.materialName || '',
        具体构成名称: targetDoc.componentName || '',
        证书类型: certificateTypeText,
        到期日期: targetDoc.isPermanent ? '永久有效' : window.supplierServices.formatDate(targetDoc.expiryDate),
        剩余天数: targetDoc.isPermanent ? '永久有效' : `${targetDoc.daysUntilExpiry}天`,
        SQE工程师联系方式: 'SQE团队' // 可以从配置中获取
      };

      // 生成邮件内容
      const template = window.supplierServices.getEmailTemplate();
      const emailContent = window.supplierServices.replaceEmailVariables(template, variables);

      // 生成邮件主题
      const urgency = targetDoc.daysUntilExpiry < 0 ? '【已过期】' : targetDoc.daysUntilExpiry <= 7 ? '【紧急】' : '【提醒】';
      const subject = `${urgency}${certificateTypeText}到期提醒 - ${supplier.supplierName}`;

      // 显示邮件预览模态框
      window.supplierUIUtils.showEmailModal(subject, emailContent);

    } catch (error) {
      console.error('生成单个邮件失败:', error);
      window.supplierUIUtils.showError('生成邮件失败');
    }
  }

  /**
   * 生成批量邮件（支持通用资料和检测报告）
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

      // 获取供应商详情（批量邮件时强制重新加载以确保数据最新）
      delete this.detailsCache[supplierId]; // 清除缓存
      const details = await this.loadDetails(supplierId);
      if (!details) {
        window.supplierUIUtils.showError('无法获取供应商详情');
        return;
      }

      // 添加总体调试日志
      console.log(`📧 供应商${supplierId}详情结构:`, {
        commonDocumentsCount: details.commonDocuments?.length || 0,
        materialsCount: details.materials?.length || 0,
        materials: details.materials?.map(m => ({
          materialId: m.materialId,
          materialName: m.materialName,
          documentsCount: m.documents?.length || 0
        }))
      });

      let documentsToNotify = [];

      if (type === 'common') {
        // 通用资料批量邮件
        if (details.commonDocuments) {
          documentsToNotify = details.commonDocuments.filter(doc =>
            !doc.isPermanent && (doc.daysUntilExpiry <= 30 || doc.daysUntilExpiry < 0)
          );
        }
        // 添加调试日志
        console.log(`📧 通用资料批量邮件:`, {
          commonDocuments: details.commonDocuments?.length || 0,
          documentsToNotify: documentsToNotify.length
        });
      } else if (type === 'material' && materialId) {
        // 检测报告批量邮件
        const material = details.materials.find(m => m.materialId === materialId);

        if (material) {
          // 处理新的数据结构（documents数组）
          if (material.documents) {
            documentsToNotify.push(...material.documents.filter(doc =>
              !doc.isPermanent && (doc.daysUntilExpiry <= 30 || doc.daysUntilExpiry < 0)
            ));
          }

          // 兼容旧的数据结构（directDocuments + referencedComponents）
          if (material.directDocuments) {
            documentsToNotify.push(...material.directDocuments.filter(doc =>
              !doc.isPermanent && (doc.daysUntilExpiry <= 30 || doc.daysUntilExpiry < 0)
            ));
          }

          // 处理引用检测的构成
          if (material.referencedComponents) {
            Object.values(material.referencedComponents).forEach(component => {
              if (component.documents) {
                documentsToNotify.push(...component.documents.filter(doc =>
                  !doc.isPermanent && (doc.daysUntilExpiry <= 30 || doc.daysUntilExpiry < 0)
                ));
              }
            });
          }
        }

        // 添加调试日志
        console.log(`📧 物料${materialId}(${materialName})的检测报告:`, {
          material,
          documentsToNotify: documentsToNotify.length,
          hasDocuments: !!material?.documents,
          hasDirectDocuments: !!material?.directDocuments,
          hasReferencedComponents: !!material?.referencedComponents
        });
      }

      if (documentsToNotify.length === 0) {
        window.supplierUIUtils.showSuccess('没有需要发送邮件的资料');
        return;
      }

      // 按证书类型分组（异步处理）
      const groupedDocs = {};
      for (const doc of documentsToNotify) {
        const certType = window.supplierServices.getCertificateTypeTextSync(doc.documentType);
        if (!groupedDocs[certType]) {
          groupedDocs[certType] = [];
        }
        groupedDocs[certType].push(doc);
      }

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
          // 状态标识符号：使用系统一致的 getStatusIcon 逻辑
          let urgency;
          if (doc.daysUntilExpiry < 0) {
            urgency = '🔴';  // 已过期 - 与系统 getStatusIcon('expired') 一致
          } else if (doc.daysUntilExpiry <= 15) {
            urgency = '🟠';  // 15天内紧急 - 对应 urgent
          } else if (doc.daysUntilExpiry <= 30) {
            urgency = '🟡';  // 30天内警告 - 对应 warning
          } else {
            urgency = '🟢';  // 正常 - 对应 normal（不应该出现在邮件中）
          }
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
      filePreview.classList.add('show');
      console.log('✅ 文件预览已显示');
    }
  }

  /**
   * 移除选中的文件
   */
  removeSelectedFile() {
    // 清空UI工具层的selectedFile
    window.supplierUIUtils.selectedFile = null;
    const filePreview = document.getElementById('filePreview');
    filePreview.classList.remove('show');
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

    // 3. 物料资料需要检测类型
    if (uploadContext.type === 'material') {
      const detectionType = document.querySelector('input[name="detectionType"]:checked');
      if (!detectionType) {
        validationErrors.push('请选择检测类型');
      } else if (detectionType.value === 'referenced') {
        // 引用检测需要选择构成
        const componentId = document.getElementById('componentSelect').value;
        if (!componentId) {
          validationErrors.push('引用检测必须选择构成');
        }
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

    // 添加资料层级 (通用资料是supplier，物料资料是material)
    const level = uploadContext.type === 'common' ? 'supplier' : 'material';
    formData.append('level', level);

    // 添加资料名称（使用文件名作为默认名称）
    const documentName = selectedFile.name;
    formData.append('documentName', documentName);

    // 添加物料相关字段
    if (uploadContext.type === 'material') {
      formData.append('materialId', uploadContext.materialId);

      // 添加检测类型
      const detectionType = document.querySelector('input[name="detectionType"]:checked').value;
      formData.append('detectionType', detectionType);

      // 如果是引用检测，添加构成ID
      if (detectionType === 'referenced') {
        const componentId = document.getElementById('componentSelect').value;
        formData.append('componentId', componentId);
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
      const response = await fetch('/api/vendors/sync-from-iqc', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: 'incremental' // 增量同步模式
        })
      });

      const data = await response.json();

      if (data.success) {
        const { stats } = data;

        console.log('📊 同步结果:', stats);
        console.log('📁 IQC数据源:', { fileName: iqcFileName, id: iqcFileId });

        // 根据统计结果显示不同的消息
        if (stats.created > 0) {
          window.supplierUIUtils.showSuccess(
            `同步完成！新增 ${stats.created} 个供应商` +
            (stats.updated > 0 ? `，更新 ${stats.updated} 个` : '') +
            (stats.skipped > 0 ? `，跳过 ${stats.skipped} 个已存在` : '')
          );
        } else if (stats.updated > 0) {
          window.supplierUIUtils.showSuccess(`同步完成！更新 ${stats.updated} 个供应商`);
        } else if (stats.skipped > 0) {
          window.supplierUIUtils.showSuccess(`同步完成！所有供应商已是最新（跳过 ${stats.skipped} 个）`);
        } else {
          window.supplierUIUtils.showSuccess('同步完成！未发现新的供应商数据');
        }

        // 刷新供应商列表
        await this.refresh(false);

      } else {
        throw new Error(data.error || '同步失败');
      }
    } catch (error) {
      console.error('同步供应商失败:', error);
      window.supplierUIUtils.showError(error.message || '同步供应商失败，请重试');
    } finally {
      window.supplierUIUtils.hideLoading();
    }
  }

  /**
   * 从配置中心同步供应商到资料管理表
   */
  async syncFromVendorConfig() {
    try {
      window.supplierUIUtils.showLoading(true, '正在同步供应商...');

      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/suppliers/sync-from-vendor-config', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        const { stats } = data;

        console.log('📊 同步结果:', stats);

        // 根据统计结果显示不同的消息
        if (stats.added > 0) {
          window.supplierUIUtils.showSuccess(
            `同步完成！新增 ${stats.added} 个供应商` +
            (stats.updated > 0 ? `，更新 ${stats.updated} 个` : '') +
            (stats.deactivated > 0 ? `，停用 ${stats.deactivated} 个` : '')
          );
        } else if (stats.updated > 0) {
          window.supplierUIUtils.showSuccess(`同步完成！更新 ${stats.updated} 个供应商`);
        } else if (stats.deactivated > 0) {
          window.supplierUIUtils.showSuccess(`同步完成！停用 ${stats.deactivated} 个供应商`);
        } else {
          window.supplierUIUtils.showSuccess('同步完成！供应商列表已是最新');
        }

        // 刷新供应商列表
        await this.refresh(false);

      } else {
        throw new Error(data.error || '同步失败');
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

    // 🔍 调试信息 - 检查全局对象状态
    console.log('🔍 调试信息:');
    console.log('- window.supplierUIUtils 存在:', !!window.supplierUIUtils);
    console.log('- window.supplierUIUtils.modalManager 存在:', !!(window.supplierUIUtils?.modalManager));
    console.log('- window.App.SupplierUIUtils.ModalManager 存在:', !!(window.App?.SupplierUIUtils?.ModalManager));
    console.log('- editModal 元素存在:', !!document.getElementById('editModal'));

    try {
      // 🎯 修复: 尝试多个可能的modalManager来源
      const modalManager = window.supplierUIUtils?.modalManager ||
                          window.App?.SupplierUIUtils?.ModalManager ||
                          window.supplierModalManager;

      console.log('🎯 找到的modalManager:', modalManager);

      if (!modalManager) {
        console.error('❌ 弹窗管理器未初始化');
        window.supplierUIUtils?.showError('编辑模态框加载失败');
        return;
      }

      // 检查edit模态框是否存在
      if (!modalManager.hasModal('edit')) {
        console.error('❌ 找不到编辑模态框');
        window.supplierUIUtils?.showError('编辑模态框加载失败');
        return;
      }

      // 显示模态框
      const success = modalManager.show('edit', {
        title: '编辑资料',
        data: { documentId }
      });

      if (!success) {
        console.error('❌ 显示编辑模态框失败');
        window.supplierUIUtils.showError('编辑模态框显示失败');
        return;
      }

      
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

      // 🎯 [BUG-FIX] 获取并存储供应商ID用于后续刷新
      this.currentSupplierId = doc.supplierId;
      console.log('📋 设置当前供应商ID:', this.currentSupplierId);

      // 🎯 [新增] 动态添加"有效期"标题（解决HTML缓存问题）
      const expiryField = document.getElementById('editIsPermanent')?.closest('.supplier-modal__form-group');
      if (expiryField) {
        const existingLabel = expiryField.querySelector('.supplier-modal__label');
        if (!existingLabel) {
          const titleLabel = document.createElement('label');
          titleLabel.className = 'supplier-modal__label';
          titleLabel.textContent = '有效期';
          expiryField.insertBefore(titleLabel, expiryField.firstChild);
        }
      }

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

      // 存储编辑上下文 - 包含供应商ID用于刷新
      this.editContext = {
        documentId,
        supplierId: this.currentSupplierId
      };

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
    console.log('🎯 开始隐藏编辑模态框...');

    const modal = document.getElementById('editModal');
    if (!modal) {
      console.error('❌ 找不到编辑模态框元素');
      return;
    }

    // 优先使用统一弹窗管理器隐藏模态框
    if (window.supplierUIUtils?.modalManager) {
      console.log('🎭 使用Modal Manager隐藏模态框');
      const result = window.supplierUIUtils.modalManager.hide('edit');
      console.log('🎭 Modal Manager隐藏结果:', result);
    } else {
      console.log('🚨 Modal Manager不可用，使用降级方案');
    }

    // 🔧 强制降级方案 - 确保模态框真正隐藏
    console.log('🔧 执行强制隐藏操作...');
    console.log('- 隐藏前display:', modal.style.display);
    console.log('- 隐藏前classList:', modal.className);

    // 移除所有可能的激活类
    modal.classList.remove('supplier-modal--active', 'modal-active', 'supplier-modal--visible');

    // 🔧 修复: 先清除所有可能的inline样式，防止残留
    modal.style.removeProperty('display');
    modal.style.removeProperty('visibility');
    modal.style.removeProperty('opacity');
    modal.style.removeProperty('z-index');
    modal.style.removeProperty('position');
    modal.style.removeProperty('top');
    modal.style.removeProperty('left');
    modal.style.removeProperty('width');
    modal.style.removeProperty('height');
    modal.style.removeProperty('background');
    modal.style.removeProperty('backdrop-filter');
    modal.style.removeProperty('align-items');
    modal.style.removeProperty('justify-content');

    // 最后确保隐藏
    modal.style.setProperty('display', 'none', 'important');

    console.log('- 隐藏后display:', modal.style.display);
    console.log('- 隐藏后classList:', modal.className);

    // 清理上下文
    this.editContext = null;

    console.log('✅ 编辑模态框隐藏完成');
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

      const requestData = {
        documentName,
        expiryDate: isPermanent ? null : expiryDate,
        isPermanent,
        remark: document.getElementById('editDocumentRemark').value
      };

      
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/documents/${this.editContext.documentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (data.success) {
        window.supplierUIUtils.showSuccess('资料信息已更新');
        this.hideEditModal();

        // 🎯 [BUG-FIX] 修复永久有效显示问题
        // 使用editContext中存储的supplierId，确保正确刷新供应商详情
        const supplierId = this.editContext?.supplierId;
        if (supplierId) {
          console.log('🔄 编辑完成，刷新供应商详情:', supplierId);
          await this.refresh(false, supplierId); // 只刷新当前编辑的供应商
        } else {
          console.warn('⚠️ 无法获取供应商ID，执行全量刷新');
          await this.refresh(false); // 降级到全量刷新
        }
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
    // 使用供应商专用确认弹窗
    const confirmed = await window.supplierUIUtils.confirmAction('确定要删除这份资料吗？此操作不可撤销。', {
      type: 'danger',
      confirmText: '删除',
      cancelText: '取消'
    });

    if (!confirmed) {
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
    // 使用供应商专用确认弹窗
    const confirmed = await window.supplierUIUtils.confirmAction(`确定要删除物料"${materialName}"吗？删除后将同时删除该物料下的所有资料，此操作不可撤销。`, {
      type: 'danger',
      confirmText: '删除',
      cancelText: '取消'
    });

    if (!confirmed) {
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


// 初始化模块
if (typeof window !== 'undefined') {
  window.SupplierDocumentManager = SupplierDocumentManager;

  // 自动初始化 (检查documentsContainer是否存在)
  const initializeModule = () => {
    // 总是初始化供应商资料管理模块,确保事件监听器被添加
    console.log('🚀 初始化供应商资料管理模块...');
    if (!window.supplierManager) {
      window.supplierManager = new SupplierDocumentManager();
      console.log('✅ 供应商资料管理模块初始化完成');
    }
  };

  // 立即初始化,不等待DOM加载
  initializeModule();
}

