/**
 * 供应商资料管理 - UI工具层
 * Phase 2.3 - UI工具方法提取
 *
 * 专门处理模态框、提示消息等简单UI交互
 */

/**
 * UI工具类
 */
class SupplierUIUtils {

  constructor() {
    // 确保服务层已加载
    if (!window.supplierServices) {
      throw new Error('SupplierUIUtils 依赖 SupplierServices，请确保加载顺序正确');
    }

    // 数据缓存（从控制层同步）
    this.suppliers = [];
    this.detailsCache = {};
    this.uploadContext = null;
    this.selectedFile = null;
    this.editingComponentId = null;
    this.isSaving = false; // 防重复提交标志

    // 🎯 引用统一弹窗管理器 - 确保编辑功能正常工作
    this.modalManager = window.supplierUIUtils?.modalManager || null;
    if (!this.modalManager) {
      console.warn('⚠️ Modal Manager 未找到，编辑功能可能无法正常工作');
    }

    // 初始化事件绑定
    this.initEventBindings();
  }

  /**
   * 从控制层同步数据
   */
  syncDataFromControl() {
    if (window.supplierManager) {
      this.suppliers = window.supplierManager.suppliers || [];
      this.detailsCache = window.supplierManager.detailsCache || {};
      console.log('✅ UI工具层数据同步完成');
    }
  }

  /**
   * 初始化事件绑定
   */
  initEventBindings() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.bindComponentManagementEvents();
      });
    } else {
      this.bindComponentManagementEvents();
    }
  }

  /**
   * 显示成功消息
   * @param {string} message - 消息内容
   */
  showSuccess(message) {
    console.log('✅', message);

    // 创建或更新成功提示
    let successAlert = document.getElementById('supplier-success-alert');
    if (!successAlert) {
      successAlert = document.createElement('div');
      successAlert.id = 'supplier-success-alert';
      successAlert.className = 'supplier-success-alert';
      successAlert.style.cssText = `
        position: fixed;
        top: 40px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 20px 28px;
        border-radius: 16px;
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
        z-index: 10000;
        font-size: 16px;
        font-weight: 500;
        min-width: 380px;
        max-width: 600px;
        text-align: left;
        display: none;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        backdrop-filter: blur(8px);
        border-left: 4px solid #047857;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        overflow: hidden;
      `;
      document.body.appendChild(successAlert);
    }

    successAlert.textContent = message;
    successAlert.style.display = 'block';

    // 触发入场动画
    requestAnimationFrame(() => {
      successAlert.style.transform = 'translateX(-50%) translateY(0)';
      successAlert.style.opacity = '1';
    });

    // 3秒后自动隐藏
    setTimeout(() => {
      successAlert.style.transform = 'translateX(-50%) translateY(-20px)';
      successAlert.style.opacity = '0';
      setTimeout(() => {
        successAlert.style.display = 'none';
      }, 400);
    }, 3000);
  }

  /**
   * 显示错误消息
   * @param {string} message - 错误消息
   */
  showError(message) {
    console.error('❌', message);

    // 创建或更新错误提示
    let errorAlert = document.getElementById('supplier-error-alert');
    if (!errorAlert) {
      errorAlert = document.createElement('div');
      errorAlert.id = 'supplier-error-alert';
      errorAlert.className = 'supplier-error-alert';
      errorAlert.style.cssText = `
        position: fixed;
        top: 40px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        padding: 20px 28px;
        border-radius: 16px;
        box-shadow: 0 8px 24px rgba(239, 68, 68, 0.3);
        z-index: 10000;
        font-size: 16px;
        font-weight: 500;
        min-width: 380px;
        max-width: 600px;
        text-align: left;
        display: none;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        backdrop-filter: blur(8px);
        border-left: 4px solid #b91c1c;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        overflow: hidden;
      `;
      document.body.appendChild(errorAlert);
    }

    errorAlert.textContent = message;
    errorAlert.style.display = 'block';

    // 触发入场动画
    requestAnimationFrame(() => {
      errorAlert.style.transform = 'translateX(-50%) translateY(0)';
      errorAlert.style.opacity = '1';
    });

    // 5秒后自动隐藏
    setTimeout(() => {
      errorAlert.style.transform = 'translateX(-50%) translateY(-20px)';
      errorAlert.style.opacity = '0';
      setTimeout(() => {
        errorAlert.style.display = 'none';
      }, 400);
    }, 5000);
  }

  /**
   * 显示加载状态
   * @param {boolean} show - 是否显示加载
   * @param {string} message - 加载消息
   */
  showLoading(show = true, message = '加载中...') {
    let loadingOverlay = document.getElementById('supplier-loading-overlay');

    if (!loadingOverlay) {
      loadingOverlay = document.createElement('div');
      loadingOverlay.id = 'supplier-loading-overlay';
      loadingOverlay.className = 'supplier-loading-overlay';
      loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s ease;
      `;

      loadingOverlay.innerHTML = `
        <div class="loading-content" style="
          background: white;
          padding: 30px 40px;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          text-align: center;
        ">
          <div style="
            width: 40px;
            height: 40px;
            border: 4px solid #f3f4f6;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
          "></div>
          <div class="loading-message">${message}</div>
        </div>
      `;

      document.body.appendChild(loadingOverlay);

      // 添加动画
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes toast-progress-3s {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes toast-progress-5s {
          from { width: 100%; }
          to { width: 0%; }
        }
        .supplier-success-alert::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.3);
          animation: toast-progress-3s 3s linear forwards;
          border-radius: 0 0 16px 16px;
        }
        .supplier-error-alert::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.3);
          animation: toast-progress-5s 5s linear forwards;
          border-radius: 0 0 16px 16px;
        }
        .supplier-success-alert:hover::before,
        .supplier-error-alert:hover::before {
          animation-play-state: paused;
        }
        .supplier-success-alert:hover,
        .supplier-error-alert:hover {
          transform: translateX(-50%) translateY(-2px) scale(1.01);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15), 0 20px 60px rgba(0, 0, 0, 0.12);
        }
      `;
      document.head.appendChild(style);
    }

    if (show) {
      loadingOverlay.style.opacity = '1';
    } else {
      loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        if (loadingOverlay.style.opacity === '0') {
          loadingOverlay.style.display = 'none';
        }
      }, 300);
    }
  }

  /**
   * 隐藏加载状态
   */
  hideLoading() {
    this.showLoading(false);
  }

  /**
   * 显示邮件模态框
   * @param {string} subject - 邮件主题
   * @param {string} content - 邮件内容
   */
  showEmailModal(subject, content) {
    console.log('📧 显示邮件模态框:', { subject });

    // 使用HTML中已存在的邮件预览模态框
    const modal = document.getElementById('emailPreviewModal');
    const subjectInput = document.getElementById('emailSubject');
    const contentTextarea = document.getElementById('emailContent');

    if (modal && subjectInput && contentTextarea) {
      subjectInput.value = subject;
      contentTextarea.value = content;

      // 显示模态框
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

      console.log('✅ 邮件预览模态框已显示');
    } else {
      console.error('❌ 找不到邮件预览模态框元素');
      this.showError('邮件预览模态框加载失败');
    }
  }

  /**
   * 隐藏邮件模态框
   */
  hideEmailModal() {
    const modal = document.getElementById('emailPreviewModal');
    if (modal) {
      modal.style.display = 'none';
      console.log('✅ 邮件预览模态框已隐藏');
    }
  }

  /**
   * 显示上传模态框
   * @param {string} type - 上传类型
   * @param {string} supplierId - 供应商ID
   * @param {string} materialId - 物料ID (可选)
   */
  showUploadModal(type, supplierId, materialId = null) {
    console.log('📤 UI工具层显示上传模态框:', { type, supplierId, materialId });

    // 同步最新数据
    this.syncDataFromControl();

    const modal = document.getElementById('uploadModal');
    if (!modal) {
      console.error('❌ 找不到uploadModal元素');
      this.showError('模态框加载失败');
      return;
    }

    // 重置表单到干净状态（但不清空预设字段）
    this.resetUploadFormWithoutPresets();

    // 动态加载资料类型列表
    this.loadDocumentTypeOptions(type);

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
      // 隐藏检测类型选择
      const detectionTypeGroup = document.getElementById('detectionTypeGroup');
      if (detectionTypeGroup) detectionTypeGroup.style.display = 'none';
    } else if (type === 'material') {
      if (title) title.textContent = `上传物料资料 - ${materialId ? '物料ID: ' + materialId : ''}`;
      if (materialGroup) materialGroup.style.display = 'block';
      // 显示检测类型选择
      const detectionTypeGroup = document.getElementById('detectionTypeGroup');
      if (detectionTypeGroup) detectionTypeGroup.style.display = 'block';
      // 先隐藏构成选择，根据检测类型选择显示
      if (componentGroup) componentGroup.style.display = 'none';

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

      // 初始化检测类型选择
      this.initDetectionTypeSelection();
    }

    // 存储上传上下文
    this.uploadContext = { type, supplierId, materialId };

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
  }

  // 初始化检测类型选择功能
  initDetectionTypeSelection() {
    const detectionTypeRadios = document.querySelectorAll('input[name="detectionType"]');
    const componentGroup = document.getElementById('componentGroup');

    if (!detectionTypeRadios.length || !componentGroup) return;

    // 添加变化监听器
    detectionTypeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'referenced') {
          // 显示构成选择
          componentGroup.style.display = 'block';
          this.loadComponents();
        } else {
          // 隐藏构成选择
          componentGroup.style.display = 'none';
        }
      });
    });

    // 默认选中本体检测
    const directRadio = document.querySelector('input[name="detectionType"][value="direct"]');
    if (directRadio) {
      directRadio.checked = true;
    }

    // 重新绑定"添加新构成"按钮事件（确保每次打开上传模态框时都能正常工作）
    this.bindComponentManagementEvents();
  }

  // 加载构成列表
  async loadComponents() {
    const componentSelect = document.getElementById('componentSelect');
    if (!componentSelect) return;

    const materialId = this.uploadContext.materialId;
    if (!materialId) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/materials/${materialId}/components`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 构成API返回数据:', result);

        // 清空现有选项
        componentSelect.innerHTML = '<option value="">请选择构成</option>';

        // 添加构成选项（API返回格式是 {success: true, data: [...]} )
        const components = result.data || [];
        console.log('🔍 解析的构成列表:', components);
        console.log('🔍 构成选择框元素:', componentSelect);

        components.forEach((component, index) => {
          console.log(`🔍 添加构成选项 ${index + 1}:`, component);
          const option = document.createElement('option');
          option.value = component.componentId;
          option.textContent = component.componentName;
          componentSelect.appendChild(option);
        });

        console.log(`✅ 已加载 ${components.length} 个构成选项`);
        console.log('🔍 更新后的选择框HTML:', componentSelect.innerHTML);
      }
    } catch (error) {
      console.error('加载构成列表失败:', error);
      this.showError('加载构成列表失败，请重试');
    }
  console.log('✅ 上传模态框已显示（UI工具层）');
  }

  /**
   * 隐藏上传模态框
   */
  hideUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.uploadContext = null;
    this.selectedFile = null;

    // 重置表单（完全重置）
    this.resetUploadForm();

    // 隐藏文件预览
    const filePreview = document.getElementById('filePreview');
    if (filePreview) {
      filePreview.style.display = 'none';
    }

    // 同步数据回控制层（保持一致性）
    if (window.supplierManager) {
      window.supplierManager.uploadContext = this.uploadContext;
      window.supplierManager.selectedFile = this.selectedFile;
    }
  }

  /**
   * 显示新增物料模态框
   * @param {string} supplierId - 供应商ID
   */
  showAddMaterialModal(supplierId) {
    console.log('➕ 显示新增物料模态框:', { supplierId });

    // 使用HTML中已存在的新增物料模态框
    const modal = document.getElementById('addMaterialModal');
    if (!modal) {
      console.error('❌ 找不到addMaterialModal元素');
      this.showError('新增物料模态框加载失败');
      return;
    }

    // 存储supplierId到模态框的dataset中，供后续使用
    modal.dataset.supplierId = supplierId;

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
    const modal = document.getElementById('addMaterialModal');
    if (modal) {
      modal.style.setProperty('display', 'none', 'important');
      console.log('✅ 新增物料模态框已隐藏');
    }
  }

  
  /**
   * 重置上传表单（不清空预设字段）
   */
  resetUploadFormWithoutPresets() {
    const documentType = document.getElementById('documentType');
    if (documentType) documentType.value = '';

    const componentName = document.getElementById('componentName');
    if (componentName) componentName.value = '';

    const expiryDate = document.getElementById('expiryDate');
    if (expiryDate) expiryDate.value = '';

    const isPermanent = document.getElementById('isPermanent');
    if (isPermanent) isPermanent.checked = false;

    const documentRemark = document.getElementById('documentRemark');
    if (documentRemark) documentRemark.value = '';

    if (expiryDate) expiryDate.disabled = false;

    const filePreview = document.getElementById('filePreview');
    if (filePreview) filePreview.style.display = 'none';

    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';

    this.selectedFile = null;
    // 注意：不清空 uploadSupplierName 和 uploadMaterialName（预设字段）
  }

  /**
   * 重置上传表单（完全重置）
   */
  resetUploadForm() {
    const documentType = document.getElementById('documentType');
    if (documentType) documentType.value = '';

    const componentName = document.getElementById('componentName');
    if (componentName) componentName.value = '';

    const expiryDate = document.getElementById('expiryDate');
    if (expiryDate) expiryDate.value = '';

    const isPermanent = document.getElementById('isPermanent');
    if (isPermanent) isPermanent.checked = false;

    const documentRemark = document.getElementById('documentRemark');
    if (documentRemark) documentRemark.value = '';

    if (expiryDate) expiryDate.disabled = false;

    const filePreview = document.getElementById('filePreview');
    if (filePreview) filePreview.style.display = 'none';

    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';

    this.selectedFile = null;
    // 清空所有字段，包括预设字段
    const uploadSupplierName = document.getElementById('uploadSupplierName');
    if (uploadSupplierName) uploadSupplierName.value = '';

    const uploadMaterialName = document.getElementById('uploadMaterialName');
    if (uploadMaterialName) uploadMaterialName.value = '';
  }

  /**
   * 动态加载资料类型选项
   * @param {string} type - 资料类型分类 (common/material)
   */
  async loadDocumentTypeOptions(type) {
    try {
      console.log(`🔄 加载${type === 'common' ? '通用' : '物料'}资料类型选项...`);

      // 确保documentTypeService已加载
      if (!window.documentTypeService) {
        console.error('❌ documentTypeService 未加载，使用默认选项');
        return;
      }

      // 获取指定分类的资料类型
      const documentTypes = await window.documentTypeService.getAllDocumentTypes({ category: type });

      const documentTypeSelect = document.getElementById('documentType');
      if (!documentTypeSelect) {
        console.error('❌ 找不到资料类型下拉列表元素');
        return;
      }

      // 清空现有选项
      documentTypeSelect.innerHTML = '<option value="">请选择</option>';

      // 添加资料类型选项
      documentTypes.forEach(docType => {
        const option = document.createElement('option');
        option.value = docType.id;
        option.textContent = docType.name;
        documentTypeSelect.appendChild(option);
      });

      console.log(`✅ 已加载 ${documentTypes.length} 个${type === 'common' ? '通用' : '物料'}资料类型选项`);

    } catch (error) {
      console.error('❌ 加载资料类型选项失败:', error);
      this.showError('加载资料类型选项失败，请刷新页面重试');
    }
  }

  // 🧪 构成管理相关方法

  /**
   * 显示构成管理模态框
   */
  showComponentManagementModal() {
    const modal = document.getElementById('componentManagementModal');
    if (!modal) return;

    const materialId = this.uploadContext.materialId;
    const supplierId = this.uploadContext.supplierId;

    if (!materialId || !supplierId) {
      this.showError('缺少必要的信息，无法打开构成管理');
      return;
    }

    // 设置供应商信息
    const supplierInput = document.getElementById('componentSupplierInput');
    if (supplierInput) {
      const details = this.detailsCache[supplierId];
      if (details) {
        supplierInput.value = details.supplierName;
      }
    }

    // 重置表单
    this.resetComponentForm();

    // 加载构成列表
    this.loadComponentList();

    // 显示模态框
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '9999', 'important');
  }

  /**
   * 隐藏构成管理模态框
   */
  hideComponentManagementModal() {
    const modal = document.getElementById('componentManagementModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * 重置构成表单
   */
  resetComponentForm() {
    const nameInput = document.getElementById('componentNameInput');
    const codeInput = document.getElementById('componentCodeInput');
    const descriptionInput = document.getElementById('componentDescriptionInput');

    if (nameInput) {
      nameInput.value = '';
      nameInput.classList.remove('error');
    }
    if (codeInput) {
      codeInput.value = '';
    }
    if (descriptionInput) {
      descriptionInput.value = '';
    }

    // 显示添加按钮，隐藏保存按钮
    const addBtn = document.getElementById('addComponentBtn');
    const saveBtn = document.getElementById('saveComponentBtn');
    if (addBtn) addBtn.style.display = 'inline-block';
    if (saveBtn) saveBtn.style.display = 'none';

    // 清除编辑状态
    this.editingComponentId = null;
  }

  /**
   * 加载构成列表
   */
  async loadComponentList() {
    const materialId = this.uploadContext.materialId;
    if (!materialId) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/materials/${materialId}/components`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        this.renderComponentList(result.data || []);
      } else {
        console.error('❌ 加载构成列表失败:', response.statusText);
        this.showError('加载构成列表失败');
      }
    } catch (error) {
      console.error('❌ 加载构成列表异常:', error);
      this.showError('加载构成列表异常');
    }
  }

  /**
   * 渲染构成列表
   */
  renderComponentList(components) {
    const listContainer = document.getElementById('componentList');
    if (!listContainer) return;

    if (components.length === 0) {
      listContainer.innerHTML = '<div class="no-components">暂无构成，请添加新构成</div>';
      return;
    }

    const html = components.map(component => `
      <div class="component-item" data-component-id="${component.componentId}">
        <span class="component-name">${component.componentName}</span>
        <span class="component-code">${component.componentCode || '-'}</span>
        <span class="component-time">${this.formatDate(component.createdAt)}</span>
        <div class="component-actions">
          <button class="edit-component-btn" data-component-id="${component.componentId}" data-component-name="${component.componentName}" data-component-code="${component.componentCode || ''}" data-description="${component.description || ''}">编辑</button>
          <button class="delete-component-btn" data-component-id="${component.componentId}" data-component-name="${component.componentName}">删除</button>
        </div>
      </div>
    `).join('');

    listContainer.innerHTML = html;

    // 绑定事件
    this.bindComponentListEvents();
  }

  /**
   * 绑定构成列表事件
   */
  bindComponentListEvents() {
    // 编辑按钮事件
    const editButtons = document.querySelectorAll('.edit-component-btn');
    editButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const componentId = btn.dataset.componentId;
        const componentName = btn.dataset.componentName;
        const componentCode = btn.dataset.componentCode;
        const description = btn.dataset.description;

        this.editComponent(componentId, componentName, componentCode, description);
      });
    });

    // 删除按钮事件
    const deleteButtons = document.querySelectorAll('.delete-component-btn');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const componentId = btn.dataset.componentId;
        const componentName = btn.dataset.componentName;

        await this.confirmDeleteComponent(componentId, componentName);
      });
    });
  }

  /**
   * 编辑构成
   */
  editComponent(componentId, componentName, componentCode, description) {
    const nameInput = document.getElementById('componentNameInput');
    const codeInput = document.getElementById('componentCodeInput');
    const descriptionInput = document.getElementById('componentDescriptionInput');
    const addBtn = document.getElementById('addComponentBtn');
    const saveBtn = document.getElementById('saveComponentBtn');

    // 填充表单
    if (nameInput) nameInput.value = componentName;
    if (codeInput) codeInput.value = componentCode;
    if (descriptionInput) descriptionInput.value = description;

    // 切换按钮
    if (addBtn) addBtn.style.display = 'none';
    if (saveBtn) saveBtn.style.display = 'inline-block';

    // 设置编辑状态
    this.editingComponentId = componentId;

    // 高亮当前编辑的构成
    const componentItems = document.querySelectorAll('.component-item');
    componentItems.forEach(item => {
      item.classList.remove('editing');
      if (item.dataset.componentId === componentId) {
        item.classList.add('editing');
      }
    });

    // 滚动到表单位置
    const formSection = document.querySelector('.component-input-section');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * 确认删除构成
   */
  async confirmDeleteComponent(componentId, componentName) {
    // 使用供应商专用确认弹窗
    const confirmed = await this.confirmAction(`确定要删除构成"${componentName}"吗？\n\n注意：如果该构成下有文档，将无法删除。`, {
      type: 'danger',
      confirmText: '删除',
      cancelText: '取消'
    });

    if (confirmed) {
      this.deleteComponent(componentId);
    }
  }

  /**
   * 删除构成
   */
  async deleteComponent(componentId) {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/materials/components/${componentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        this.showSuccess('构成删除成功');
        this.loadComponentList(); // 重新加载列表
        this.loadComponents(); // 更新上传模态框的构成选择
      } else {
        const result = await response.json();
        this.showError(result.error || '删除构成失败');
      }
    } catch (error) {
      console.error('❌ 删除构成异常:', error);
      this.showError('删除构成异常');
    }
  }

  /**
   * 添加或更新构成
   */
  async saveComponent() {
    console.log('🎯 开始保存构成...');

    // 防止重复提交
    if (this.isSaving) {
      console.log('⚠️ 正在保存中，请勿重复点击...');
      return;
    }

    this.isSaving = true;

    const nameInput = document.getElementById('componentNameInput');
    const codeInput = document.getElementById('componentCodeInput');
    const descriptionInput = document.getElementById('componentDescriptionInput');

    console.log('🔍 获取输入框:', { nameInput, codeInput, descriptionInput });
    console.log('🔍 当前编辑状态:', this.editingComponentId);
    console.log('🔍 上传上下文:', this.uploadContext);

    // 验证必填字段
    if (!nameInput || !nameInput.value.trim()) {
      console.warn('❌ 构成名称为空');
      nameInput.classList.add('error');
      this.showError('构成名称不能为空');
      return;
    }

    nameInput.classList.remove('error');

    const componentData = {
      componentName: nameInput.value.trim(),
      componentCode: codeInput ? codeInput.value.trim() : null,
      description: descriptionInput ? descriptionInput.value.trim() : null
    };

    console.log('📋 构成数据:', componentData);

    try {
      const token = localStorage.getItem('authToken');
      console.log('🔑 认证令牌:', token ? '已获取' : '未获取');

      let url, method;

      if (this.editingComponentId) {
        // 更新构成
        url = `/api/materials/components/${this.editingComponentId}`;
        method = 'PUT';
        console.log('📝 更新构成模式:', url);
      } else {
        // 添加新构成
        const materialId = this.uploadContext.materialId;
        if (!materialId || materialId <= 0) {
          console.error('❌ 物料ID无效:', materialId);
          this.showError('物料信息无效，请刷新页面重试');
          return;
        }

        console.log('🔍 验证materialId:', materialId);

        url = `/api/materials/components`;
        method = 'POST';
        componentData.materialId = materialId;

        // 生成构成编码（如果未填写）
        if (!componentData.componentCode) {
          componentData.componentCode = `COMP_${Date.now()}`;
        }

        console.log('➕ 添加新构成模式:', url);
        console.log('📦 最终构成数据:', componentData);
      }

      console.log('🚀 发送请求:', { url, method, componentData });

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(componentData)
      });

      console.log('📡 服务器响应状态:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ 保存成功:', result);
        this.showSuccess(this.editingComponentId ? '构成更新成功' : '构成添加成功');

        // 重置表单
        this.resetComponentForm();

        // 重新加载列表
        console.log('🔄 重新加载构成列表...');
        await this.loadComponentList();

        // 更新上传模态框的构成选择
        console.log('🔄 更新上传模态框的构成选择...');
        await this.loadComponents();

        console.log('✅ 所有界面更新完成');
      } else {
        const result = await response.json();
        console.error('❌ 保存失败:', result);
        this.showError(result.error || '保存构成失败');
      }
    } catch (error) {
      console.error('❌ 保存构成异常:', error);
      this.showError('保存构成异常');
    } finally {
      // 重置保存状态
      this.isSaving = false;
    }
  }

  /**
   * 绑定构成管理模态框事件
   */
  bindComponentManagementEvents() {
    // 上传模态框中的"添加新构成"按钮
    const openComponentManagementBtn = document.getElementById('openComponentManagementBtn');
    console.log('🔍 查找"添加新构成"按钮:', openComponentManagementBtn);

    if (openComponentManagementBtn) {
      // 移除可能存在的旧事件监听器
      if (this.handleOpenComponentManagement) {
        openComponentManagementBtn.removeEventListener('click', this.handleOpenComponentManagement);
      }

      // 添加新的事件监听器
      this.handleOpenComponentManagement = (e) => {
        console.log('🎯 点击了"添加新构成"按钮');
        e.preventDefault();
        this.showComponentManagementModal();
      };

      openComponentManagementBtn.addEventListener('click', this.handleOpenComponentManagement);
      console.log('✅ "添加新构成"按钮事件绑定成功');
    } else {
      console.warn('❌ 未找到"添加新构成"按钮');
    }

    // 构成管理模态框中的添加按钮
    const addBtn = document.getElementById('addComponentBtn');
    if (addBtn) {
      console.log('🔍 找到构成管理中的添加按钮');
      addBtn.addEventListener('click', () => {
        console.log('🎯 点击了构成管理中的添加按钮');
        this.editingComponentId = null;
        this.saveComponent(); // 调用保存方法，而不是只重置表单
      });
    } else {
      console.warn('❌ 未找到构成管理中的添加按钮');
    }

    // 保存按钮（编辑模式时显示）
    const saveBtn = document.getElementById('saveComponentBtn');
    if (saveBtn) {
      console.log('🔍 找到构成管理中的保存按钮');
      saveBtn.addEventListener('click', () => {
        console.log('🎯 点击了构成管理中的保存按钮');
        this.saveComponent();
      });
    } else {
      console.warn('❌ 未找到构成管理中的保存按钮');
    }

    // 关闭按钮
    const closeButtons = document.querySelectorAll('.component-modal-close-btn');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.hideComponentManagementModal();
      });
    });

    // 点击模态框外部关闭
    const modal = document.getElementById('componentManagementModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideComponentManagementModal();
        }
      });
    }
  }

  /**
   * 格式化日期
   * @param {string} dateString - 日期字符串
   * @returns {string} 格式化后的日期
   */
  formatDate(dateString) {
    if (!dateString) return '-';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.warn('日期格式化失败:', dateString, error);
      return dateString;
    }
  }
// 现代化确认弹窗
  async confirmAction(message, options = {}) {
    const {
      title = '确认操作',
      confirmText = '确认',
      cancelText = '取消',
      type = 'warning' // warning, danger, info
    } = options;

    return new Promise((resolve) => {
      // 移除现有对话框
      const existingDialog = document.querySelector('.supplier-confirm-dialog');
      if (existingDialog) {
        existingDialog.remove();
      }

      // 创建对话框
      const dialog = document.createElement('div');
      dialog.className = 'supplier-confirm-dialog';
      dialog.innerHTML = `
        <div class="supplier-confirm-dialog-backdrop"></div>
        <div class="supplier-confirm-dialog-content">
          <div class="supplier-confirm-dialog-header">
            <h3 class="supplier-confirm-dialog-title">${title}</h3>
            <button class="supplier-confirm-dialog-close">&times;</button>
          </div>
          <div class="supplier-confirm-dialog-body">
            <div class="supplier-confirm-dialog-icon">
              ${type === 'warning' ? '⚠️' : type === 'danger' ? '🗑️' : 'ℹ️'}
            </div>
            <p class="supplier-confirm-dialog-message">${message}</p>
          </div>
          <div class="supplier-confirm-dialog-footer">
            <button class="supplier-confirm-dialog-btn supplier-confirm-dialog-cancel">${cancelText}</button>
            <button class="supplier-confirm-dialog-btn supplier-confirm-dialog-confirm">${confirmText}</button>
          </div>
        </div>
      `;

      // 添加样式（如果还没有）
      if (!document.querySelector('#supplier-confirm-dialog-styles')) {
        const style = document.createElement('style');
        style.id = 'supplier-confirm-dialog-styles';
        style.textContent = `
          .supplier-confirm-dialog {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .supplier-confirm-dialog-backdrop {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
          }

          .supplier-confirm-dialog-content {
            position: relative;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 450px;
            width: 90%;
            padding: 0;
            transform: scale(0.9) translateY(20px);
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .supplier-confirm-dialog.show .supplier-confirm-dialog-content {
            transform: scale(1) translateY(0);
            opacity: 1;
          }

          .supplier-confirm-dialog-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 24px 24px 16px;
            border-bottom: 1px solid #f3f4f6;
          }

          .supplier-confirm-dialog-title {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #374151;
          }

          .supplier-confirm-dialog-close {
            background: none;
            border: none;
            font-size: 24px;
            color: #9ca3af;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.2s ease;
          }

          .supplier-confirm-dialog-close:hover {
            background: #f3f4f6;
            color: #374151;
          }

          .supplier-confirm-dialog-body {
            padding: 24px;
            display: flex;
            align-items: center;
            gap: 16px;
          }

          .supplier-confirm-dialog-icon {
            font-size: 48px;
            flex-shrink: 0;
          }

          .supplier-confirm-dialog-message {
            margin: 0;
            font-size: 16px;
            line-height: 1.5;
            color: #4b5563;
          }

          .supplier-confirm-dialog-footer {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            padding: 16px 24px 24px;
          }

          .supplier-confirm-dialog-btn {
            padding: 12px 24px;
            border: none;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .supplier-confirm-dialog-cancel {
            background: #f9fafb;
            color: #6b7280;
            border: 2px solid #e5e7eb;
          }

          .supplier-confirm-dialog-cancel:hover {
            background: #f3f4f6;
            color: #4b5563;
            transform: translateY(-1px);
          }

          .supplier-confirm-dialog-confirm {
            background: var(--confirm-bg, linear-gradient(135deg, #f59e0b 0%, #d97706 100%));
            color: white;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          }

          .supplier-confirm-dialog-confirm:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
          }
        `;
        document.head.appendChild(style);
      }

      // 设置确认按钮颜色
      const confirmBtn = dialog.querySelector('.supplier-confirm-dialog-confirm');
      const colors = {
        warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        danger: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        info: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
      };
      dialog.style.setProperty('--confirm-bg', colors[type] || colors.warning);

      // 添加到页面
      document.body.appendChild(dialog);

      // 绑定事件
      const closeBtn = dialog.querySelector('.supplier-confirm-dialog-close');
      const cancelBtn = dialog.querySelector('.supplier-confirm-dialog-cancel');
      const backdrop = dialog.querySelector('.supplier-confirm-dialog-backdrop');

      const closeDialog = (result = false) => {
        dialog.classList.remove('show');
        setTimeout(() => {
          dialog.remove();
          resolve(result);
        }, 300);
      };

      closeBtn.addEventListener('click', () => closeDialog(false));
      cancelBtn.addEventListener('click', () => closeDialog(false));
      backdrop.addEventListener('click', () => closeDialog(false));

      confirmBtn.addEventListener('click', () => closeDialog(true));

      // 显示动画
      requestAnimationFrame(() => {
        dialog.classList.add('show');
      });
    });
  }
}

// 创建全局UI工具实例
window.supplierUIUtils = new SupplierUIUtils();

console.log('✅ SupplierUIUtils UI工具层已加载 (Phase 2.3 - 模态框和工具方法)');