// Toast 通知组件
(function() {
    'use strict';
    
    class ToastNotification {
        constructor() {
            this.container = null;
            this.init();
        }
        
        init() {
            // 创建容器
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                pointer-events: none;
            `;
            document.body.appendChild(this.container);
        }
        
        show(message, type = 'info', duration = 3000) {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            
            // 图标映射
            const icons = {
                success: '✓',
                warning: '⚠',
                error: '✕',
                info: 'ℹ'
            };
            
            const icon = icons[type] || icons.info;
            
            toast.innerHTML = `
                <div class="toast-icon">${icon}</div>
                <div class="toast-message">${message}</div>
                <button class="toast-close" aria-label="关闭">×</button>
            `;
            
            this.container.appendChild(toast);
            
            // 触发入场动画
            setTimeout(() => {
                toast.classList.add('toast-show');
            }, 10);
            
            // 绑定关闭事件
            const closeBtn = toast.querySelector('.toast-close');
            closeBtn.addEventListener('click', () => {
                this.remove(toast);
            });
            
            toast.addEventListener('click', () => {
                this.remove(toast);
            });
            
            // 自动关闭
            setTimeout(() => {
                this.remove(toast);
            }, duration);
            
            return toast;
        }
        
        remove(toast) {
            if (!toast || !toast.parentNode) return;
            
            // 触发出场动画
            toast.classList.remove('toast-show');
            toast.classList.add('toast-hide');
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 400);
        }
        
        // 便捷方法
        success(message, duration) {
            return this.show(message, 'success', duration);
        }
        
        warning(message, duration) {
            return this.show(message, 'warning', duration);
        }
        
        error(message, duration) {
            return this.show(message, 'error', duration);
        }
        
        info(message, duration) {
            return this.show(message, 'info', duration);
        }
    }
    
    // 创建全局实例
    const Toast = new ToastNotification();
    
    // 挂载到全局对象
    window.App = window.App || {};
    window.App.Toast = Toast;
    
    // 静态方法快捷调用
    window.showToast = (message, type, duration) => Toast.show(message, type, duration);
    window.showSuccess = (message, duration) => Toast.success(message, duration);
    window.showWarning = (message, duration) => Toast.warning(message, duration);
    window.showError = (message, duration) => Toast.error(message, duration);
    window.showInfo = (message, duration) => Toast.info(message, duration);
    
})();