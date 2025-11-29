// Modal 组件框架
(function () {
    'use strict';

    class Modal {
        constructor() {
            this.activeModal = null;
            this.initOverlay();
        }

        initOverlay() {
            // 创建遮罩层
            if (!document.querySelector('.modal-overlay')) {
                this.overlay = document.createElement('div');
                this.overlay.className = 'modal-overlay';
                this.overlay.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 1000;
                    display: none;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    backdrop-filter: blur(2px);
                `;
                document.body.appendChild(this.overlay);

                // 点击遮罩层关闭
                this.overlay.addEventListener('click', (e) => {
                    if (e.target === this.overlay) {
                        this.close();
                    }
                });
            } else {
                this.overlay = document.querySelector('.modal-overlay');
            }
        }

        create(options = {}) {
            const {
                title = '提示',
                content = '',
                width = '500px',
                showClose = true,
                footer = null,
                onClose = null
            } = options;

            const modalEl = document.createElement('div');
            modalEl.className = 'modal';
            modalEl.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                background: white;
                width: ${width};
                max-width: 90%;
                max-height: 90vh;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                z-index: 1001;
                display: flex;
                flex-direction: column;
                opacity: 0;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                overflow: hidden;
            `;

            // Header
            const headerHtml = `
                <div class="modal-header" style="
                    padding: 20px 24px;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #111827;">${title}</h3>
                    ${showClose ? `<button class="modal-close-btn" style="
                        background: transparent;
                        border: none;
                        cursor: pointer;
                        font-size: 24px;
                        color: #9ca3af;
                        padding: 4px;
                        border-radius: 4px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: color 0.2s;
                    ">×</button>` : ''}
                </div>
            `;

            // Body
            const bodyHtml = `
                <div class="modal-body" style="
                    padding: 24px;
                    overflow-y: auto;
                    flex: 1;
                    color: #374151;
                    font-size: 15px;
                    line-height: 1.6;
                ">
                    ${content}
                </div>
            `;

            // Footer
            let footerHtml = '';
            if (footer) {
                footerHtml = `
                    <div class="modal-footer" style="
                        padding: 16px 24px;
                        background: #f9fafb;
                        border-top: 1px solid #e5e7eb;
                        display: flex;
                        justify-content: flex-end;
                        gap: 12px;
                    ">
                        ${footer}
                    </div>
                `;
            }

            modalEl.innerHTML = headerHtml + bodyHtml + footerHtml;

            // Bind Close Event
            if (showClose) {
                const closeBtn = modalEl.querySelector('.modal-close-btn');
                closeBtn.addEventListener('click', () => this.close());
                closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = '#4b5563');
                closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = '#9ca3af');
            }

            this.onCloseCallback = onClose;

            return modalEl;
        }

        show(options) {
            // 如果已有打开的模态框，先关闭
            if (this.activeModal) {
                this.close(true);
            }

            const modalEl = this.create(options);
            document.body.appendChild(modalEl);
            this.activeModal = modalEl;

            // 显示遮罩
            this.overlay.style.display = 'block';
            // 强制重绘
            this.overlay.offsetHeight;

            // 动画入场
            this.overlay.style.opacity = '1';
            this.activeModal.style.opacity = '1';
            this.activeModal.style.transform = 'translate(-50%, -50%) scale(1)';

            return modalEl;
        }

        close(immediate = false) {
            if (!this.activeModal) return;

            const modal = this.activeModal;
            this.activeModal = null;

            if (immediate) {
                this.overlay.style.display = 'none';
                this.overlay.style.opacity = '0';
                modal.remove();
                if (this.onCloseCallback) this.onCloseCallback();
                return;
            }

            // 动画离场
            this.overlay.style.opacity = '0';
            modal.style.opacity = '0';
            modal.style.transform = 'translate(-50%, -50%) scale(0.9)';

            setTimeout(() => {
                this.overlay.style.display = 'none';
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
                if (this.onCloseCallback) this.onCloseCallback();
            }, 300);
        }

        // 快捷方法：确认框
        confirm(message, onConfirm) {
            const modalEl = this.show({
                title: '确认操作',
                content: message,
                width: '400px',
                footer: `
                    <button class="btn-cancel" style="
                        padding: 8px 16px;
                        border: 1px solid #d1d5db;
                        background: white;
                        color: #374151;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                    ">取消</button>
                    <button class="btn-confirm" style="
                        padding: 8px 16px;
                        border: none;
                        background: #9d7a54;
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                    ">确认</button>
                `
            });

            // 绑定按钮事件
            const cancelBtn = modalEl.querySelector('.btn-cancel');
            const confirmBtn = modalEl.querySelector('.btn-confirm');

            cancelBtn.addEventListener('click', () => this.close());
            confirmBtn.addEventListener('click', () => {
                if (onConfirm) onConfirm();
                this.close();
            });

            return modalEl;
        }

        // 快捷方法：提示框
        alert(message, title = '提示') {
            return this.show({
                title: title,
                content: message,
                width: '400px',
                footer: `
                    <button class="btn-ok" style="
                        padding: 8px 16px;
                        border: none;
                        background: #9d7a54;
                        color: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                    ">确定</button>
                `
            });
        }
    }

    // 创建全局实例
    const ModalInstance = new Modal();

    // 挂载到全局对象
    window.App = window.App || {};
    window.App.Modal = ModalInstance;

})();