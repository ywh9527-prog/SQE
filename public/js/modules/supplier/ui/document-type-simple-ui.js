/**
 * 供应商资料类型设置功能 - 简洁版UI组件
 *
 * 设计理念：
 * 1. 简洁明了的卡片式布局
 * 2. 符合主人要求的界面风格
 * 3. 轻量级实现，易于集成
 *
 * 创建时间: 2025-12-12
 * 设计: 浮浮酱 (猫娘工程师)
 */

/**
 * 简洁版资料类型设置UI类
 */
class DocumentTypeSimpleUI {
  constructor() {
    // 依赖检查
    if (!window.documentTypeService) {
      throw new Error('DocumentTypeSimpleUI 依赖 DocumentTypeService，请确保加载顺序正确');
    }
  }

  // ==================== 主要接口方法 ====================

  /**
   * 显示资料类型设置模态框
   * @param {string} category - 资料分类 (common/material)
   */
  async showSettingsModal(category = 'common') {
    console.log(`⚙️ 显示简洁版资料类型设置 - 分类: ${category}`);

    try {
      // 加载数据
      const documentTypes = await window.documentTypeService.getAllDocumentTypes({ category });

      // 保存当前分类，用于操作后的刷新
      this.currentCategory = category;

      // 创建模态框HTML
      const modalHtml = this.renderSimpleModal(category, documentTypes);

      // 添加到页面
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHtml;
      document.body.appendChild(modalContainer);

      // 绑定事件 - 简化，不传递复杂回调
      this.bindSimpleModalEvents(modalContainer, category);

      // 显示动画
      const overlay = modalContainer.querySelector('.modal-overlay');
      requestAnimationFrame(() => {
        overlay.classList.add('show');
      });

      console.log('✅ 简洁版资料类型设置模态框已显示');

    } catch (error) {
      console.error('❌ 显示设置模态框失败:', error);
      this.showError('打开设置面板失败，请重试');
    }
  }

  // ==================== 渲染方法 ====================

  /**
   * 渲染简洁版模态框HTML
   * @param {string} category - 分类
   * @param {Array} documentTypes - 文档类型列表
   * @returns {string} HTML字符串
   */
  renderSimpleModal(category, documentTypes) {
    const categoryText = category === 'common' ? '通用资料' : '物料资料';

    return `
      <div class="modal-overlay document-type-settings-modal">
        <div class="modal-content">
          <!-- 模态框头部 -->
          <div class="modal-header">
            <h3>⚙️ ${categoryText}类型设置</h3>
            <button class="modal-close-btn" onclick="documentTypeSimpleUI.closeModal(this)">✕</button>
          </div>

          <!-- 模态框主体 -->
          <div class="modal-body">
            <!-- 当前资料类型列表 -->
            <div class="document-type-list-container">
              <div class="document-type-list-header">📋 当前资料类型列表</div>
              <div class="document-type-list">
                ${documentTypes.map(docType => this.renderDocumentTypeItem(docType)).join('')}
              </div>
            </div>

            <!-- 添加新的资料类型 -->
            <div class="add-type-container">
              <div class="add-type-header">➕ 添加新的资料类型</div>
              <form class="add-type-form" onsubmit="documentTypeSimpleUI.handleAddType(event, '${category}')">
                <div class="form-group">
                  <input
                    type="text"
                    name="typeName"
                    class="add-type-input"
                    placeholder="📝 类型名称（如：环境管理体系认证）"
                    required
                    maxlength="50"
                  >
                </div>
                <div class="add-type-hint">
                  📋 使用提示: 此类型将用于供应商${categoryText}管理
                  <br>💡 注意: 系统默认类型（质量保证协议、MSDS、营业执照等）不能重复创建
                </div>
                <div class="add-type-actions">
                  <button type="submit" class="btn btn-primary">
                    ➕ 添加类型
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- 模态框底部 -->
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="documentTypeSimpleUI.closeModal(this)">
              关闭
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染文档类型项目
   * @param {Object} docType - 文档类型对象
   * @returns {string} HTML字符串
   */
  renderDocumentTypeItem(docType) {
    const createdDate = new Date(docType.createdAt).toLocaleDateString('zh-CN');
    const canDelete = window.documentTypeService.canDelete(docType);

    return `
      <div class="document-type-item" data-id="${docType.id}">
        <div class="document-type-info">
          <span class="document-type-icon">🏷️</span>
          <div class="document-type-details">
            <div class="document-type-name-row">
              <span class="document-type-name">${docType.name}</span>
              <span class="document-type-date">${createdDate}</span>
            </div>
          </div>
        </div>
        <div class="document-type-actions">
          <button
            class="document-type-delete-btn"
            onclick="documentTypeSimpleUI.deleteDocumentType('${docType.id}')"
            ${!canDelete.canDelete ? 'disabled' : ''}
            title="${!canDelete.canDelete ? canDelete.reason : '删除此类型'}"
          >
            🗑️ 删除
          </button>
        </div>
      </div>
    `;
  }

  // ==================== 事件处理方法 ====================

  /**
   * 绑定简洁版模态框事件
   * @param {HTMLElement} modalContainer - 模态框容器
   * @param {string} category - 分类
   */
  bindSimpleModalEvents(modalContainer, category) {
    // modalContainer 本身就是 overlay
    modalContainer.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        // 点击遮罩层关闭 - 简化，不传递回调
        this.closeModal(e.target.querySelector('.modal-close-btn'));
      }
    });

    // ESC键关闭 - 简化，不传递回调
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        this.closeModal(modalContainer.querySelector('.modal-close-btn'));
        document.removeEventListener('keydown', handleEscKey);
      }
    };
    document.addEventListener('keydown', handleEscKey);

    // 简化事件绑定，不传递复杂回调
    const closeBtn = modalContainer.querySelector('.modal-close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => this.closeModal(closeBtn);
    }

    const footerCloseBtn = modalContainer.querySelector('.modal-footer .btn-secondary');
    if (footerCloseBtn) {
      footerCloseBtn.onclick = () => this.closeModal(footerCloseBtn);
    }
  }

  /**
   * 关闭模态框
   * @param {HTMLElement} closeBtn - 关闭按钮元素
   */
  closeModal(closeBtn) {
    console.log('🔒 关闭简洁版资料类型设置模态框');

    const modalContainer = closeBtn.closest('.document-type-settings-modal');
    if (!modalContainer) {
      console.error('❌ 找不到模态框容器');
      return;
    }

    // modalContainer 本身就是 overlay
    modalContainer.classList.remove('show');
    modalContainer.classList.add('closing');

    setTimeout(() => {
      if (modalContainer && modalContainer.parentNode === document.body) {
        document.body.removeChild(modalContainer);
      } else if (modalContainer && modalContainer.parentNode) {
        // 如果不是body的直接子元素，从其父元素中移除
        modalContainer.parentNode.removeChild(modalContainer);
      }

      // 清理保存的分类
      this.currentCategory = null;
    }, 300);
  }

  /**
   * 处理添加类型表单提交
   * @param {Event} event - 表单提交事件
   * @param {string} category - 分类
   */
  async handleAddType(event, category) {
    event.preventDefault();
    console.log('➕ 处理添加类型提交');

    try {
      const formData = new FormData(event.target);
      const typeName = formData.get('typeName').trim();

      if (!typeName) {
        this.showError('请输入类型名称');
        return;
      }

      // 检查是否已经在处理中
      const submitBtn = event.target.querySelector('button[type="submit"]');
      if (submitBtn.disabled) {
        console.log('⚠️ 表单正在处理中，忽略重复提交');
        return;
      }

      // 显示加载状态
      const originalContent = submitBtn.innerHTML;
      submitBtn.innerHTML = '<span class="loading"></span> 添加中...';
      submitBtn.disabled = true;

      // 调用API创建
      await window.documentTypeService.createDocumentType({
        name: typeName,
        category: category,
        description: '',
        isRequired: false
      });

      // 刷新列表
      await this.refreshTypeList(category);

      // 清空表单并重置状态
      event.target.reset();
      const inputField = event.target.querySelector('.add-type-input');
      if (inputField) {
        inputField.value = '';
        inputField.focus();
      }

      // 显示成功消息
      this.showSuccess('文档类型添加成功！');

      // 简单刷新：直接调用相关刷新方法
      this.performPostOperationRefresh();

    } catch (error) {
      console.error('❌ 添加文档类型失败:', error);

      // 更友好的错误提示
      let errorMessage = error.message;

      // 处理各种错误情况
      if (errorMessage.includes('已存在相同名称')) {
        errorMessage = errorMessage.replace('该分类下已存在相同名称的文档类型', '该类型名称已存在');
      } else if (errorMessage.includes('HTTP 400')) {
        errorMessage = '请检查输入信息是否正确';
      } else if (errorMessage.includes('HTTP')) {
        errorMessage = '网络请求失败，请重试';
      }

      this.showError('添加失败: ' + errorMessage);
    } finally {
      // 恢复按钮状态
      const submitBtn = event.target.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerHTML = '➕ 添加类型';
        submitBtn.disabled = false;
      }
    }
  }

  /**
   * 删除文档类型
   * @param {string} id - 文档类型ID
   */
  async deleteDocumentType(id) {
    try {
      console.log(`🗑️ 删除文档类型: ${id}`);

      // 获取文档类型信息
      const docType = await window.documentTypeService.getDocumentTypeById(id);
      const canDelete = window.documentTypeService.canDelete(docType);

      if (!canDelete.canDelete) {
        this.showError(canDelete.reason);
        return;
      }

      // 使用供应商专用确认弹窗
      const confirmed = await window.supplierUIUtils.confirmAction(`确定要删除文档类型"${docType.name}"吗？此操作不可恢复。`, {
        type: 'danger',
        confirmText: '删除',
        cancelText: '取消'
      });

      if (!confirmed) {
        return;
      }

      await window.documentTypeService.deleteDocumentType(id);
      await this.refreshTypeList();
      this.showSuccess('文档类型删除成功');

      // 简单刷新：直接调用相关刷新方法
      this.performPostOperationRefresh();

    } catch (error) {
      console.error('❌ 删除文档类型失败:', error);
      this.showError('删除失败: ' + error.message);
    }
  }

  /**
   * 刷新类型列表 - 使用保存的分类
   */
  async refreshTypeList() {
    try {
      console.log('🔄 刷新文档类型列表');

      if (!this.currentCategory) {
        console.warn('⚠️ 未保存当前分类，无法刷新');
        return;
      }

      // 重新加载数据 - 使用保存的分类
      const documentTypes = await window.documentTypeService.getAllDocumentTypes({
        category: this.currentCategory
      });

      // 更新列表显示
      const listContainer = document.querySelector('.document-type-list');
      if (listContainer) {
        listContainer.innerHTML = documentTypes.map(docType => this.renderDocumentTypeItem(docType)).join('');
      }

      console.log(`✅ 文档类型列表已刷新 (${this.currentCategory})`);

    } catch (error) {
      console.error('❌ 刷新列表失败:', error);
      this.showError('刷新失败: ' + error.message);
    }
  }

  /**
   * 操作后的刷新方法 - 简单方案
   */
  performPostOperationRefresh() {
    console.log('🔄 执行操作后刷新 - 简单方案');

    // 延迟刷新，确保操作完成
    setTimeout(() => {
      try {
        // 刷新上传界面的资料类型选项（如果存在）
        if (window.supplierUIUtils && window.supplierUIUtils.loadDocumentTypeOptions) {
          console.log('🔄 刷新上传界面资料类型选项');
          if (this.currentCategory === 'common') {
            window.supplierUIUtils.loadDocumentTypeOptions('common');
          } else {
            window.supplierUIUtils.loadDocumentTypeOptions('material');
          }
        }

        // 刷新主页面的供应商详情（如果存在）
        if (window.supplierManager && window.supplierManager.renderSupplierDetails && window.supplierManager.currentSupplierId) {
          console.log('🔄 刷新主页面供应商详情');
          window.supplierManager.renderSupplierDetails(window.supplierManager.currentSupplierId);
        }
      } catch (error) {
        console.warn('⚠️ 刷新过程中出现错误（不影响主要功能）:', error);
      }
    }, 500); // 延迟500ms确保操作完成
  }

  // ==================== 消息提示方法 ====================

  /**
   * 显示成功消息
   * @param {string} message - 消息内容
   */
  showSuccess(message) {
    // 使用统一的UI工具层
    if (window.supplierUIUtils) {
      window.supplierUIUtils.showSuccess(message);
    } else {
      // 降级方案
      this.showToast(message, 'success');
    }
  }

  /**
   * 显示错误消息
   * @param {string} message - 消息内容
   */
  showError(message) {
    // 使用统一的UI工具层
    if (window.supplierUIUtils) {
      window.supplierUIUtils.showError(message);
    } else {
      // 降级方案
      this.showToast(message, 'error');
    }
  }

  /**
   * 显示Toast消息
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型
   */
  showToast(message, type = 'info') {
    // 移除现有的toast
    const existingToast = document.querySelector('.document-type-toast');
    if (existingToast) {
      document.body.removeChild(existingToast);
    }

    // 创建新的toast
    const toast = document.createElement('div');
    toast.className = `document-type-toast ${type}`;
    toast.textContent = message;

    // 添加到页面
    document.body.appendChild(toast);

    // 显示动画
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // 自动隐藏
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// ==================== 全局实例 ====================

// 创建全局UI实例
if (typeof window !== 'undefined') {
  window.documentTypeSimpleUI = new DocumentTypeSimpleUI();
  console.log('✅ 简洁版文档类型设置UI已初始化: window.documentTypeSimpleUI');
}

// Node.js 环境导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocumentTypeSimpleUI;
}