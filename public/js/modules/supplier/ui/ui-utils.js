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

    // 创建或更新邮件模态框
    let modal = document.getElementById('supplier-email-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'supplier-email-modal';
      modal.className = 'supplier-modal';
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        max-width: 600px;
        width: 90vw;
        max-height: 80vh;
        overflow-y: auto;
        display: none;
      `;

      modal.innerHTML = `
        <div class="modal-header">
          <h3>📧 邮件预览</h3>
          <button class="modal-close-btn" onclick="window.supplierUIUtils.hideEmailModal()">×</button>
        </div>
        <div class="modal-body">
          <div class="email-subject">
            <strong>主题:</strong> ${subject}
          </div>
          <div class="email-content">
            <strong>内容:</strong>
            <pre style="
              background: #f8f9fa;
              padding: 15px;
              border-radius: 6px;
              overflow-x: auto;
              white-space: pre-wrap;
              font-family: inherit;
              margin-top: 10px;
            ">${content}</pre>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="window.supplierUIUtils.hideEmailModal()">关闭</button>
        </div>
      `;

      document.body.appendChild(modal);
    } else {
      // 更新现有模态框内容
      modal.querySelector('.email-subject').innerHTML = `<strong>主题:</strong> ${subject}`;
      modal.querySelector('.email-content pre').textContent = content;
    }

    modal.style.display = 'block';
  }

  /**
   * 隐藏邮件模态框
   */
  hideEmailModal() {
    const modal = document.getElementById('supplier-email-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * 显示上传模态框
   * @param {string} type - 上传类型
   * @param {string} supplierId - 供应商ID
   * @param {string} materialId - 物料ID (可选)
   */
  showUploadModal(type, supplierId, materialId = null) {
    console.log('📤 显示上传模态框:', { type, supplierId, materialId });

    // 创建或更新上传模态框
    let modal = document.getElementById('supplier-upload-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'supplier-upload-modal';
      modal.className = 'supplier-modal';
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        max-width: 500px;
        width: 90vw;
        display: none;
      `;

      modal.innerHTML = `
        <div class="modal-header">
          <h3>📤 上传资料</h3>
          <button class="modal-close-btn" onclick="window.supplierUIUtils.hideUploadModal()">×</button>
        </div>
        <div class="modal-body">
          <div class="upload-form">
            <p>正在上传${type === 'common' ? '通用' : '物料'}资料...</p>
            <div class="upload-progress">
              <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="window.supplierUIUtils.hideUploadModal()">取消</button>
        </div>
      `;

      document.body.appendChild(modal);
    }

    modal.style.display = 'block';

    // 模拟上传进度
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(progressInterval);
        setTimeout(() => {
          this.hideUploadModal();
          this.showSuccess('资料上传成功');
        }, 500);
      }
      modal.querySelector('.progress-fill').style.width = `${progress}%`;
    }, 200);
  }

  /**
   * 隐藏上传模态框
   */
  hideUploadModal() {
    const modal = document.getElementById('supplier-upload-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * 显示新增物料模态框
   * @param {string} supplierId - 供应商ID
   */
  showAddMaterialModal(supplierId) {
    console.log('➕ 显示新增物料模态框:', { supplierId });

    // 创建或更新新增物料模态框
    let modal = document.getElementById('supplier-add-material-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'supplier-add-material-modal';
      modal.className = 'supplier-modal';
      modal.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        max-width: 500px;
        width: 90vw;
        display: none;
      `;

      modal.innerHTML = `
        <div class="modal-header">
          <h3>➕ 新增物料</h3>
          <button class="modal-close-btn" onclick="window.supplierUIUtils.hideAddMaterialModal()">×</button>
        </div>
        <div class="modal-body">
          <form class="add-material-form">
            <div class="form-group">
              <label>物料名称:</label>
              <input type="text" name="materialName" placeholder="请输入物料名称" required>
            </div>
            <div class="form-group">
              <label>物料编码:</label>
              <input type="text" name="materialCode" placeholder="请输入物料编码">
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" onclick="window.supplierUIUtils.hideAddMaterialModal()">取消</button>
          <button class="btn-confirm" onclick="window.supplierUIUtils.confirmAddMaterial('${supplierId}')">确认添加</button>
        </div>
      `;

      document.body.appendChild(modal);
    }

    modal.style.display = 'block';
  }

  /**
   * 隐藏新增物料模态框
   */
  hideAddMaterialModal() {
    const modal = document.getElementById('supplier-add-material-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  /**
   * 确认新增物料
   * @param {string} supplierId - 供应商ID
   */
  confirmAddMaterial(supplierId) {
    const form = document.querySelector('#supplier-add-material-modal .add-material-form');
    const formData = new FormData(form);
    const materialName = formData.get('materialName');
    const materialCode = formData.get('materialCode');

    if (!materialName) {
      this.showError('请输入物料名称');
      return;
    }

    console.log('📝 确认新增物料:', { supplierId, materialName, materialCode });

    // 这里应该调用实际的API
    // 模拟API调用
    setTimeout(() => {
      this.hideAddMaterialModal();
      this.showSuccess(`物料 "${materialName}" 添加成功`);
      form.reset();
    }, 1000);
  }

}

// 创建全局UI工具实例
window.supplierUIUtils = new SupplierUIUtils();

console.log('✅ SupplierUIUtils UI工具层已加载 (Phase 2.3 - 模态框和工具方法)');