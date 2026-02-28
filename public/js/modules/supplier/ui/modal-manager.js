/**
 * 供应商资料管理 - 统一弹窗管理器 v4.0
 * 参考 IQC 模块设计理念，提供简洁统一的弹窗交互
 */

(function() {
    'use strict';

    /**
     * 统一弹窗管理器
     */
    class ModalManager {
        constructor() {
            this.modals = {};
            this.currentModal = null;
            this.isInitialized = false;
            this.init();
        }

        /**
         * 初始化弹窗管理器
         */
        init() {
            if (this.isInitialized) return;

            // 🎯 修复: 确保DOM加载完成后再缓存弹窗元素
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.cacheModals();
                    this.bindEvents();
                    this.isInitialized = true;
                    console.log('🎭 Modal Manager: 初始化完成 (DOM加载后)');
                });
            } else {
                // DOM已经加载完成，立即缓存
                this.cacheModals();
                this.bindEvents();
                this.isInitialized = true;
                console.log('🎭 Modal Manager: 初始化完成 (立即)');
            }
        }

        /**
         * 缓存弹窗元素
         */
        cacheModals() {
            console.log('🎭 Modal Manager: 开始缓存弹窗元素...');

            this.modals = {
                upload: document.getElementById('uploadModal'),
                edit: document.getElementById('editModal'),
                addMaterial: document.getElementById('addMaterialModal'),
                email: document.getElementById('emailPreviewModal')
            };

            console.log('🎭 Modal Manager: 缓存结果:', {
                upload: !!this.modals.upload,
                edit: !!this.modals.edit,
                addMaterial: !!this.modals.addMaterial,
                email: !!this.modals.email
            });

            console.log('🎭 Modal Manager: DOM中存在的元素:', {
                uploadModal: !!document.getElementById('uploadModal'),
                editModal: !!document.getElementById('editModal'),
                addMaterialModal: !!document.getElementById('addMaterialModal'),
                emailPreviewModal: !!document.getElementById('emailPreviewModal')
            });
        }

        /**
         * 绑定事件监听器
         */
        bindEvents() {
            // ESC键关闭弹窗
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.currentModal) {
                    // 对于email模态框，调用ui-utils的方法以保持一致性
                    if (this.currentModal === 'email' && window.supplierUIUtils) {
                        window.supplierUIUtils.hideEmailModal();
                    } else {
                        this.hide(this.currentModal);
                    }
                }
            });

            // 点击背景关闭弹窗
            Object.values(this.modals).forEach(modal => {
                if (modal) {
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) {
                            const modalName = this.getModalName(modal);
                            // 对于email模态框，调用ui-utils的方法以保持一致性
                            if (modalName === 'email' && window.supplierUIUtils) {
                                window.supplierUIUtils.hideEmailModal();
                            } else {
                                this.hide(modalName);
                            }
                        }
                    });
                }
            });
        }

        /**
         * 根据元素获取弹窗名称
         */
        getModalName(modalElement) {
            for (const [name, modal] of Object.entries(this.modals)) {
                if (modal === modalElement) return name;
            }
            return null;
        }

        /**
         * 显示弹窗 - 统一入口
         * @param {string} modalName - 弹窗名称
         * @param {Object} options - 配置选项
         */
        show(modalName, options = {}) {
            const modal = this.modals[modalName];
            if (!modal) {
                console.error(`❌ Modal Manager: 找不到弹窗 "${modalName}"`);
                return false;
            }

            console.log(`🎭 Modal Manager: 显示弹窗 "${modalName}"`);
            console.log(`📊 显示前状态:`, {
                display: modal.style.display,
                classList: [...modal.classList.values()],
                computedDisplay: getComputedStyle(modal).display,
                computedVisibility: getComputedStyle(modal).visibility,
                computedOpacity: getComputedStyle(modal).opacity,
                computedZIndex: getComputedStyle(modal).zIndex
            });

            // 如果已有弹窗打开，先关闭
            if (this.currentModal && this.currentModal !== modalName) {
                this.hide(this.currentModal);
            }

            // 设置当前弹窗
            this.currentModal = modalName;

            // 应用自定义配置
            this.applyModalConfig(modal, options);

            // 先设置 display（顺序很重要：inline 样式优先级高于 CSS 类）
            modal.style.display = 'flex';
            console.log(`📊 设置display:flex后:`, {
                display: modal.style.display,
                computedDisplay: getComputedStyle(modal).display
            });

            // 强制重置动画：先移除类，触发重排，再添加类
            modal.classList.remove('supplier-modal--active');
            console.log(`📊 移除--active类后:`, {
                classList: [...modal.classList.values()],
                computedDisplay: getComputedStyle(modal).display,
                computedOpacity: getComputedStyle(modal).opacity
            });

            void modal.offsetWidth; // 强制重排

            modal.classList.add('supplier-modal--active');
            console.log(`📊 添加--active类后:`, {
                classList: [...modal.classList.values()],
                computedDisplay: getComputedStyle(modal).display,
                computedVisibility: getComputedStyle(modal).visibility,
                computedOpacity: getComputedStyle(modal).opacity,
                computedZIndex: getComputedStyle(modal).zIndex
            });

            // [修复-2025-12-27] 特殊处理编辑模态框的尺寸问题
            if (modalName === 'edit') {
                console.log('🔧 特殊处理编辑模态框尺寸...');
                const content = modal.querySelector('.supplier-modal__content');
                if (content) {
                    // 确保编辑模态框内容容器有正确的尺寸
                    content.style.setProperty('max-width', '600px', 'important');
                    content.style.setProperty('width', 'min(90%, 600px)', 'important');
                    content.style.setProperty('max-height', '80vh', 'important'); /* [修复-2025-12-27] 修复高度问题，恢复原始80vh */
                    content.style.setProperty('min-height', 'auto', 'important');
                    console.log('✅ 编辑模态框内容容器尺寸已修复');
                }
            }

            // 焦点管理
            this.manageFocus(modal);

            // 触发显示事件
            this.dispatchEvent(modal, 'modal:show', { modalName, options });

            console.log(`🎭 Modal Manager: 显示弹窗 "${modalName}" 完毕`);
            return true;
        }

        /**
         * 隐藏弹窗 - 统一入口
         * @param {string} modalName - 弹窗名称
         */
        hide(modalName) {
            const modal = this.modals[modalName];
            if (!modal) {
                console.error(`❌ Modal Manager: 找不到弹窗 "${modalName}"`);
                return false;
            }

            console.log(`🎭 Modal Manager: 隐藏弹窗 "${modalName}"`);
            console.log(`📊 隐藏前状态:`, {
                display: modal.style.display,
                classList: [...modal.classList.values()],
                computedDisplay: getComputedStyle(modal).display,
                computedVisibility: getComputedStyle(modal).visibility,
                computedOpacity: getComputedStyle(modal).opacity
            });

            // 隐藏弹窗 - 移除激活类，恢复display:none
            modal.classList.remove('supplier-modal--active');
            modal.style.display = 'none';

            console.log(`📊 隐藏后状态:`, {
                display: modal.style.display,
                classList: [...modal.classList.values()],
                computedDisplay: getComputedStyle(modal).display,
                computedVisibility: getComputedStyle(modal).visibility,
                computedOpacity: getComputedStyle(modal).opacity
            });

            // 清除当前弹窗
            if (this.currentModal === modalName) {
                this.currentModal = null;
            }

            // 触发隐藏事件
            this.dispatchEvent(modal, 'modal:hide', { modalName });

            console.log(`🎭 Modal Manager: 隐藏弹窗 "${modalName}" 完成`);
            return true;
        }

        /**
         * 应用弹窗配置
         */
        applyModalConfig(modal, options) {
            // 设置标题
            if (options.title) {
                const titleElement = modal.querySelector('h3');
                if (titleElement) titleElement.textContent = options.title;
            }

            // 设置数据属性
            if (options.data) {
                Object.entries(options.data).forEach(([key, value]) => {
                    modal.dataset[key] = value;
                });
            }

            // 重置表单
            if (options.resetForm !== false) {
                this.resetForm(modal);
            }
        }

        /**
         * 重置表单
         */
        resetForm(modal) {
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
                // 清除验证状态
                form.querySelectorAll('.form-group').forEach(group => {
                    group.classList.remove('error', 'success');
                });
                // 清除错误消息
                form.querySelectorAll('.error-message, .success-message').forEach(msg => {
                    msg.remove();
                });
            }
        }

        /**
         * 焦点管理
         */
        manageFocus(modal) {
            // 将焦点设置到第一个输入框
            const firstInput = modal.querySelector('input:not([type="hidden"]), textarea, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }

            // 限制Tab键在弹窗内循环
            const focusableElements = modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            if (focusableElements.length > 0) {
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                modal.addEventListener('keydown', (e) => {
                    if (e.key === 'Tab') {
                        if (e.shiftKey) {
                            if (document.activeElement === firstElement) {
                                lastElement.focus();
                                e.preventDefault();
                            }
                        } else {
                            if (document.activeElement === lastElement) {
                                firstElement.focus();
                                e.preventDefault();
                            }
                        }
                    }
                });
            }
        }

        /**
         * 显示加载状态
         */
        showLoading(modalName, message = '处理中...') {
            const modal = this.modals[modalName];
            if (!modal) return false;

            // 创建加载遮罩
            let loadingOverlay = modal.querySelector('.modal-loading');
            if (!loadingOverlay) {
                loadingOverlay = document.createElement('div');
                loadingOverlay.className = 'modal-loading';
                loadingOverlay.innerHTML = `
                    <div class="modal-loading-content">
                        <div class="modal-loading-spinner"></div>
                        <div class="loading-text">${message}</div>
                    </div>
                `;
                modal.appendChild(loadingOverlay);
            }

            loadingOverlay.style.display = 'flex';
            return true;
        }

        /**
         * 隐藏加载状态
         */
        hideLoading(modalName) {
            const modal = this.modals[modalName];
            if (!modal) return false;

            const loadingOverlay = modal.querySelector('.modal-loading');
            if (loadingOverlay) {
                loadingOverlay.style.display = 'none';
            }
            return true;
        }

        /**
         * 显示表单验证错误
         */
        showFieldError(modalName, fieldName, message) {
            const modal = this.modals[modalName];
            if (!modal) return false;

            const field = modal.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (!field) return false;

            const formGroup = field.closest('.form-group');
            if (formGroup) {
                formGroup.classList.add('error');
                formGroup.classList.remove('success');

                // 移除旧的错误消息
                const oldError = formGroup.querySelector('.error-message');
                if (oldError) oldError.remove();

                // 添加新的错误消息
                const errorElement = document.createElement('div');
                errorElement.className = 'error-message';
                errorElement.innerHTML = `❌ ${message}`;
                formGroup.appendChild(errorElement);
            }

            return true;
        }

        /**
         * 显示表单验证成功
         */
        showFieldSuccess(modalName, fieldName) {
            const modal = this.modals[modalName];
            if (!modal) return false;

            const field = modal.querySelector(`[name="${fieldName}"], #${fieldName}`);
            if (!field) return false;

            const formGroup = field.closest('.form-group');
            if (formGroup) {
                formGroup.classList.add('success');
                formGroup.classList.remove('error');

                // 移除错误消息
                const errorMessage = formGroup.querySelector('.error-message');
                if (errorMessage) errorMessage.remove();
            }

            return true;
        }

        /**
         * 清除所有验证状态
         */
        clearValidation(modalName) {
            const modal = this.modals[modalName];
            if (!modal) return false;

            modal.querySelectorAll('.form-group').forEach(group => {
                group.classList.remove('error', 'success');
            });

            modal.querySelectorAll('.error-message, .success-message').forEach(msg => {
                msg.remove();
            });

            return true;
        }

        /**
         * 触发自定义事件
         */
        dispatchEvent(modal, eventType, detail = {}) {
            const event = new CustomEvent(eventType, { detail });
            modal.dispatchEvent(event);
        }

        /**
         * 检查弹窗是否存在
         */
        hasModal(modalName) {
            // 🎯 修复: 如果弹窗不存在，尝试重新缓存
            if (!this.modals[modalName]) {
                console.log(`🎭 Modal Manager: ${modalName} 不存在，尝试重新缓存...`);
                this.cacheModals();
            }
            return !!this.modals[modalName];
        }

        /**
         * 强制重新缓存所有弹窗元素
         */
        refreshCache() {
            console.log('🎭 Modal Manager: 强制重新缓存弹窗元素...');
            this.cacheModals();
        }

        /**
         * 获取当前活动的弹窗
         */
        getCurrentModal() {
            return this.currentModal;
        }

        /**
         * 关闭所有弹窗
         */
        hideAll() {
            Object.keys(this.modals).forEach(modalName => {
                this.hide(modalName);
            });
        }
    }

    // 创建全局实例 - 符合CLAUDE.md命名规范
    const modalManager = new ModalManager();

    // 挂载到全局对象 - 使用正确的命名空间
    window.App = window.App || {};
    window.App.SupplierUIUtils = window.App.SupplierUIUtils || {};
    window.App.SupplierUIUtils.ModalManager = modalManager;

    // 🎯 确保supplierUIUtils对象存在并挂载modalManager - 修复编辑功能
    window.supplierUIUtils = window.supplierUIUtils || {};
    window.supplierUIUtils.modalManager = modalManager;

    // 便捷的全局方法
    window.showSupplierModal = (modalName, options) => modalManager.show(modalName, options);
    window.hideSupplierModal = (modalName) => modalManager.hide(modalName);

    console.log('🎭 Modal Manager: 已加载到全局 (符合CLAUDE.md命名规范)');

})();