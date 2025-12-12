/**
 * 供应商资料类型设置功能 - UI组件
 *
 * 负责：
 * 1. 资料类型设置模态框的渲染和交互
 * 2. 文档类型的增删改查界面
 * 3. 表单验证和用户反馈
 *
 * 创建时间: 2025-12-12
 * 设计: 浮浮酱 (猫娘工程师)
 */

/**
 * 资料类型设置UI类
 */
class DocumentTypeSettingsUI {
  constructor() {
    // 依赖检查
    if (!window.documentTypeService) {
      throw new Error('DocumentTypeSettingsUI 依赖 DocumentTypeService，请确保加载顺序正确');
    }
  }

  // ==================== 模态框管理 ====================

  /**
   * 显示资料类型设置模态框
   * @param {string} category - 资料分类 (common/material)
   * @param {Function} onClose - 关闭回调
   */
  async showSettingsModal(category = 'common', onClose = null) {
    console.log(`⚙️ 显示资料类型设置模态框 - 分类: ${category}`);

    try {
      // 加载数据
      const documentTypes = await window.documentTypeService.getAllDocumentTypes({ category });
      const stats = await this.calculateStats(documentTypes);

      // 创建模态框HTML
      const modalHtml = this.renderModal(category, documentTypes, stats);

      // 添加到页面
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHtml;
      document.body.appendChild(modalContainer);

      // 绑定事件
      this.bindModalEvents(modalContainer, category, onClose);

      // 显示动画
      requestAnimationFrame(() => {
        modalContainer.querySelector('.modal-overlay').classList.add('show');
      });

      console.log('✅ 资料类型设置模态框已显示');

    } catch (error) {
      console.error('❌ 显示资料类型设置模态框失败:', error);
      this.showError('打开设置面板失败，请重试');
    }
  }

  /**
   * 关闭模态框
   * @param {HTMLElement} modalContainer - 模态框容器
   * @param {Function} onClose - 关闭回调
   */
  closeModal(modalContainer, onClose = null) {
    console.log('🔒 关闭资料类型设置模态框');

    const overlay = modalContainer.querySelector('.modal-overlay');
    overlay.classList.remove('show');

    setTimeout(() => {
      document.body.removeChild(modalContainer);
      if (onClose) onClose();
    }, 300);
  }

  // ==================== 渲染方法 ====================

  /**
   * 渲染模态框HTML
   * @param {string} category - 分类
   * @param {Array} documentTypes - 文档类型列表
   * @param {Object} stats - 统计信息
   * @returns {string} HTML字符串
   */
  renderModal(category, documentTypes, stats) {
    const categoryText = category === 'common' ? '通用资料' : '物料资料';

    return `
      <div class="modal-overlay document-type-settings-modal">
        <div class="modal-content large">
          <!-- 模态框头部 -->
          <div class="modal-header">
            <h3>⚙️ ${categoryText}类型设置</h3>
            <button class="modal-close-btn" onclick="this.closest('.document-type-settings-modal').remove()">✕</button>
          </div>

          <!-- 模态框主体 -->
          <div class="modal-body">
            <!-- 统计信息 -->
            <div class="stats-section">
              <div class="stat-item">
                <span class="stat-label">📊 总数量:</span>
                <span class="stat-value">${stats.total}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">✅ 启用中:</span>
                <span class="stat-value">${stats.active}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">⚙️ 系统默认:</span>
                <span class="stat-value">${stats.systemDefault}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">📝 自定义:</span>
                <span class="stat-value">${stats.custom}</span>
              </div>
            </div>

            <!-- 操作按钮区 -->
            <div class="actions-section">
              <button class="btn btn-primary" onclick="documentTypeSettingsUI.showAddTypeForm('${category}')">
                ➕ 添加新类型
              </button>
              <button class="btn btn-secondary" onclick="documentTypeSettingsUI.refreshTypeList()">
                🔄 刷新列表
              </button>
            </div>

            <!-- 文档类型列表 -->
            <div class="document-types-list">
              <div class="list-header">
                <span>类型名称</span>
                <span>分类</span>
                <span>使用次数</span>
                <span>状态</span>
                <span>操作</span>
              </div>
              <div class="list-body">
                ${documentTypes.map(docType => this.renderDocumentTypeRow(docType)).join('')}
              </div>
            </div>

            <!-- 添加类型表单 (初始隐藏) -->
            <div class="add-type-form" style="display: none;">
              <div class="form-header">
                <h4>➕ 添加新的文档类型</h4>
              </div>
              <form id="addTypeForm" onsubmit="documentTypeSettingsUI.handleAddTypeSubmit(event, '${category}')">
                <div class="form-row">
                  <div class="form-group">
                    <label for="typeName">类型名称 *</label>
                    <input type="text" id="typeName" name="name" required maxlength="50" placeholder="例如: 环境管理体系认证">
                  </div>
                  <div class="form-group">
                    <label for="typeDescription">类型说明</label>
                    <input type="text" id="typeDescription" name="description" maxlength="200" placeholder="简短描述该类型的作用">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="typeRequired">是否必需</label>
                    <select id="typeRequired" name="isRequired">
                      <option value="false">否</option>
                      <option value="true">是</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>&nbsp;</label>
                    <div class="form-actions">
                      <button type="submit" class="btn btn-primary">确认添加</button>
                      <button type="button" class="btn btn-secondary" onclick="documentTypeSettingsUI.hideAddTypeForm()">取消</button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <!-- 模态框底部 -->
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="documentTypeSettingsUI.closeModal(this.closest('.document-type-settings-modal'))">
              关闭
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染文档类型行
   * @param {Object} docType - 文档类型对象
   * @returns {string} HTML字符串
   */
  renderDocumentTypeRow(docType) {
    const canDelete = window.documentTypeService.canDelete(docType);
    const statusClass = docType.isActive ? 'active' : 'inactive';
    const statusText = docType.isActive ? '✅ 启用' : '❌ 禁用';
    const categoryText = docType.category === 'common' ? '通用资料' : '物料资料';

    return `
      <div class="document-type-row" data-id="${docType.id}">
        <div class="type-info">
          <span class="type-name ${docType.isSystemDefault ? 'system-default' : ''}">
            ${docType.name}
            ${docType.isSystemDefault ? '<span class="system-badge">系统</span>' : ''}
          </span>
          ${docType.description ? `<span class="type-description">${docType.description}</span>` : ''}
        </div>
        <div class="type-category">${categoryText}</div>
        <div class="type-usage">
          <span class="usage-count">${docType.usageCount}</span>
          <span class="usage-label">次使用</span>
        </div>
        <div class="type-status">
          <span class="status-badge ${statusClass}">${statusText}</span>
        </div>
        <div class="type-actions">
          ${docType.isSystemDefault ? '' : `
            <button class="action-btn edit-btn" onclick="documentTypeSettingsUI.editDocumentType('${docType.id}')" title="编辑">
              ✏️
            </button>
          `}
          <button class="action-btn toggle-btn" onclick="documentTypeSettingsUI.toggleDocumentType('${docType.id}')" title="${docType.isActive ? '禁用' : '启用'}">
            ${docType.isActive ? '🔒' : '🔓'}
          </button>
          ${canDelete.canDelete ? `
            <button class="action-btn delete-btn" onclick="documentTypeSettingsUI.deleteDocumentType('${docType.id}')" title="删除">
              🗑️
            </button>
          ` : `
            <button class="action-btn delete-btn disabled" title="${canDelete.reason}" disabled>
              🗑️
            </button>
          `}
        </div>
      </div>
    `;
  }

  // ==================== 事件处理方法 ====================

  /**
   * 绑定模态框事件
   * @param {HTMLElement} modalContainer - 模态框容器
   * @param {string} category - 分类
   * @param {Function} onClose - 关闭回调
   */
  bindModalEvents(modalContainer, category, onClose) {
    // 点击遮罩关闭
    modalContainer.querySelector('.modal-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        this.closeModal(modalContainer, onClose);
      }
    });

    // ESC键关闭
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        this.closeModal(modalContainer, onClose);
        document.removeEventListener('keydown', handleEscKey);
      }
    };
    document.addEventListener('keydown', handleEscKey);
  }

  /**
   * 显示添加类型表单
   * @param {string} category - 分类
   */
  showAddTypeForm(category) {
    console.log('📝 显示添加类型表单');

    const formContainer = document.querySelector('.add-type-form');
    const listContainer = document.querySelector('.document-types-list');
    const actionsSection = document.querySelector('.actions-section');

    // 隐藏列表，显示表单
    listContainer.style.display = 'none';
    actionsSection.style.display = 'none';
    formContainer.style.display = 'block';

    // 清空表单
    document.getElementById('addTypeForm').reset();

    // 聚焦到名称输入框
    document.getElementById('typeName').focus();
  }

  /**
   * 隐藏添加类型表单
   */
  hideAddTypeForm() {
    console.log('🔒 隐藏添加类型表单');

    const formContainer = document.querySelector('.add-type-form');
    const listContainer = document.querySelector('.document-types-list');
    const actionsSection = document.querySelector('.actions-section');

    // 显示列表，隐藏表单
    listContainer.style.display = 'block';
    actionsSection.style.display = 'flex';
    formContainer.style.display = 'none';
  }

  /**
   * 处理添加类型表单提交
   * @param {Event} event - 表单提交事件
   * @param {string} category - 分类
   */
  async handleAddTypeSubmit(event, category) {
    event.preventDefault();
    console.log('➕ 处理添加类型表单提交');

    try {
      const formData = new FormData(event.target);
      const typeData = {
        name: formData.get('name').trim(),
        description: formData.get('description').trim(),
        category: category,
        isRequired: formData.get('isRequired') === 'true'
      };

      // 验证数据
      const validation = window.documentTypeService.validateDocumentTypeData(typeData);
      if (!validation.isValid) {
        this.showError(validation.errors.join(', '));
        return;
      }

      // 显示加载状态
      const submitBtn = event.target.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = '⏳ 添加中...';
      submitBtn.disabled = true;

      // 调用API创建
      await window.documentTypeService.createDocumentType(typeData);

      // 刷新列表
      await this.refreshTypeList();

      // 隐藏表单
      this.hideAddTypeForm();

      // 显示成功消息
      this.showSuccess('文档类型添加成功！');

    } catch (error) {
      console.error('❌ 添加文档类型失败:', error);
      this.showError('添加失败: ' + error.message);
    } finally {
      // 恢复按钮状态
      const submitBtn = event.target.querySelector('button[type="submit"]');
      submitBtn.textContent = '确认添加';
      submitBtn.disabled = false;
    }
  }

  /**
   * 切换文档类型状态
   * @param {string} id - 文档类型ID
   */
  async toggleDocumentType(id) {
    try {
      console.log(`🔄 切换文档类型状态: ${id}`);

      const docType = await window.documentTypeService.getDocumentTypeById(id);
      const newStatus = !docType.isActive;

      await window.documentTypeService.updateDocumentType(id, {
        isActive: newStatus
      });

      await this.refreshTypeList();
      this.showSuccess(`文档类型已${newStatus ? '启用' : '禁用'}`);

    } catch (error) {
      console.error('❌ 切换状态失败:', error);
      this.showError('操作失败: ' + error.message);
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

      // 确认删除
      if (!confirm(`确定要删除文档类型"${docType.name}"吗？此操作不可恢复。`)) {
        return;
      }

      await window.documentTypeService.deleteDocumentType(id);
      await this.refreshTypeList();
      this.showSuccess('文档类型删除成功');

    } catch (error) {
      console.error('❌ 删除文档类型失败:', error);
      this.showError('删除失败: ' + error.message);
    }
  }

  /**
   * 编辑文档类型 (预留接口)
   * @param {string} id - 文档类型ID
   */
  editDocumentType(id) {
    console.log(`✏️ 编辑文档类型: ${id}`);
    this.showInfo('编辑功能开发中，敬请期待！');
  }

  /**
   * 刷新类型列表
   */
  async refreshTypeList() {
    try {
      console.log('🔄 刷新文档类型列表');

      // 重新加载数据
      const documentTypes = await window.documentTypeService.getAllDocumentTypes();
      const stats = await this.calculateStats(documentTypes);

      // 更新列表显示
      const listBody = document.querySelector('.list-body');
      if (listBody) {
        listBody.innerHTML = documentTypes.map(docType => this.renderDocumentTypeRow(docType)).join('');
      }

      // 更新统计信息
      this.updateStatsDisplay(stats);

      console.log('✅ 文档类型列表已刷新');

    } catch (error) {
      console.error('❌ 刷新列表失败:', error);
      this.showError('刷新失败: ' + error.message);
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 计算统计信息
   * @param {Array} documentTypes - 文档类型列表
   * @returns {Object} 统计信息
   */
  calculateStats(documentTypes) {
    return {
      total: documentTypes.length,
      active: documentTypes.filter(dt => dt.isActive).length,
      inactive: documentTypes.filter(dt => !dt.isActive).length,
      systemDefault: documentTypes.filter(dt => dt.isSystemDefault).length,
      custom: documentTypes.filter(dt => !dt.isSystemDefault).length
    };
  }

  /**
   * 更新统计信息显示
   * @param {Object} stats - 统计信息
   */
  updateStatsDisplay(stats) {
    const statValues = document.querySelectorAll('.stat-value');
    if (statValues.length >= 4) {
      statValues[0].textContent = stats.total;
      statValues[1].textContent = stats.active;
      statValues[2].textContent = stats.systemDefault;
      statValues[3].textContent = stats.custom;
    }
  }

  /**
   * 显示成功消息
   * @param {string} message - 消息内容
   */
  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  /**
   * 显示错误消息
   * @param {string} message - 消息内容
   */
  showError(message) {
    this.showMessage(message, 'error');
  }

  /**
   * 显示信息消息
   * @param {string} message - 消息内容
   */
  showInfo(message) {
    this.showMessage(message, 'info');
  }

  /**
   * 显示消息
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型 (success/error/info)
   */
  showMessage(message, type = 'info') {
    // 创建消息元素
    const messageEl = document.createElement('div');
    messageEl.className = `toast-message ${type}`;
    messageEl.textContent = message;

    // 添加到页面
    document.body.appendChild(messageEl);

    // 显示动画
    requestAnimationFrame(() => {
      messageEl.classList.add('show');
    });

    // 自动隐藏
    setTimeout(() => {
      messageEl.classList.remove('show');
      setTimeout(() => {
        if (messageEl.parentNode) {
          document.body.removeChild(messageEl);
        }
      }, 300);
    }, 3000);
  }
}

// ==================== 全局实例 ====================

// 创建全局UI实例
if (typeof window !== 'undefined') {
  window.documentTypeSettingsUI = new DocumentTypeSettingsUI();
  console.log('✅ 文档类型设置UI已初始化: window.documentTypeSettingsUI');
}

// Node.js 环境导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DocumentTypeSettingsUI;
}