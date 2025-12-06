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
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
        z-index: 10000;
        font-size: 14px;
        display: none;
        animation: slideIn 0.3s ease-out;
      `;
      document.body.appendChild(successAlert);
    }

    successAlert.textContent = message;
    successAlert.style.display = 'block';

    // 3秒后自动隐藏
    setTimeout(() => {
      successAlert.style.display = 'none';
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
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
        z-index: 10000;
        font-size: 14px;
        display: none;
        animation: slideIn 0.3s ease-out;
      `;
      document.body.appendChild(errorAlert);
    }

    errorAlert.textContent = message;
    errorAlert.style.display = 'block';

    // 5秒后自动隐藏
    setTimeout(() => {
      errorAlert.style.display = 'none';
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

      // 添加旋转动画
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
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
    document.getElementById('documentType').value = '';
    document.getElementById('componentName').value = '';
    document.getElementById('expiryDate').value = '';
    document.getElementById('isPermanent').checked = false;
    document.getElementById('documentRemark').value = '';
    document.getElementById('expiryDate').disabled = false;
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('fileInput').value = '';
    this.selectedFile = null;
    // 注意：不清空 uploadSupplierName 和 uploadMaterialName（预设字段）
  }

  /**
   * 重置上传表单（完全重置）
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
    // 清空所有字段，包括预设字段
    document.getElementById('uploadSupplierName').value = '';
    document.getElementById('uploadMaterialName').value = '';
  }

}

// 创建全局UI工具实例
window.supplierUIUtils = new SupplierUIUtils();

console.log('✅ SupplierUIUtils UI工具层已加载 (Phase 2.3 - 模态框和工具方法)');