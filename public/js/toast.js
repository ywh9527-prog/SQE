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
            
            // 设置样式
            const typeStyles = {
                success: { bg: '#28a745', icon: '✓' },
                warning: { bg: '#ffc107', icon: '⚠' },
                error: { bg: '#dc3545', icon: '✕' },
                info: { bg: '#17a2b8', icon: 'ℹ' }
            };
            
            const style = typeStyles[type] || typeStyles.info;
            
            toast.style.cssText = `
                background: ${style.bg};
                color: white;
                padding: 12px 20px;
                border-radius: 4px;
                margin-bottom: 10px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                font-size: 14px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                align-items: center;
                gap: 8px;
                min-width: 250px;
                max-width: 400px;
                pointer-events: auto;
                cursor: pointer;
                transform: translateX(100%);
                transition: transform 0.3s ease-out;
                opacity: 0;
            `;
            
            toast.innerHTML = `
                <span style="font-size: 16px; font-weight: bold;">${style.icon}</span>
                <span>${message}</span>
            `;
            
            this.container.appendChild(toast);
            
            // 触发动画
            setTimeout(() => {
                toast.style.transform = 'translateX(0)';
                toast.style.opacity = '1';
            }, 10);
            
            // 点击关闭
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
            
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
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