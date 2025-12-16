// 应用入口文件
document.addEventListener('DOMContentLoaded', () => {
    console.log('SQE System v2.0 Initializing...');

    // 首先检查认证状态
    checkAuthentication();
});

// 认证检查函数
async function checkAuthentication() {
    try {
        // 检查是否有有效的登录令牌
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        
        if (!token || !user) {
            // 没有令牌或用户信息，跳转到登录页面
            window.location.href = '/pages/login.html';
            return;
        }

        // 验证令牌有效性
        const response = await fetch('/api/auth/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            // 令牌无效，跳转到登录页面
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/pages/login.html';
            return;
        }

        const result = await response.json();
        if (!result.success) {
            // 认证失败，跳转到登录页面
            localStorage.removeItem('authToken');
            localStorage.removeItem('user');
            window.location.href = '/pages/login.html';
            return;
        }

        // 认证成功，初始化应用
        initializeApp();

    } catch (error) {
        console.error('认证检查失败:', error);
        // 出错时跳转到登录页面
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/pages/login.html';
    }
}

// 初始化应用
function initializeApp() {
    console.log('用户已认证，初始化应用...');

    // 初始化路由
    // 这里可以注册特定模块的初始化逻辑
    // 例如：当切换到 IQC 模块时，如果还没加载过数据，则自动加载

    window.App.Router.register('iqc', () => {
        console.log('IQC 模块已激活');
        // 初始化 IQC 模块
        if (window.App.Modules && window.App.Modules.IQC) {
            window.App.Modules.IQC.init();
        }
    });

    

    // 手动触发一次路由处理，确保直接访问带 hash 的 URL 时能正确渲染
    if (window.App.Router) {
        window.App.Router.handleHashChange();
    }

    // 显示用户信息
    displayUserInfo();

    // 添加登出功能
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// 显示用户信息
function displayUserInfo() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const userNameEl = document.getElementById('userName');
            const userAvatarEl = document.getElementById('userAvatar');
            
            if (userNameEl) {
                userNameEl.textContent = user.fullName || user.username;
            }
            
            if (userAvatarEl) {
                userAvatarEl.textContent = (user.fullName || user.username).charAt(0).toUpperCase();
            }
        } catch (error) {
            console.error('解析用户信息失败:', error);
        }
    }
}

// 登出功能
async function logout() {
    // 使用供应商专用确认弹窗（如果可用）
    if (window.supplierUIUtils) {
      const confirmed = await window.supplierUIUtils.confirmAction('确定要退出登录吗？', {
        type: 'info',
        confirmText: '退出登录',
        cancelText: '取消'
      });

      if (!confirmed) {
        return;
      }
    } else {
      // 降级到原生confirm
      if (!confirm('确定要退出登录吗？')) {
        return;
      }
    }

    // 清除本地存储
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    // 跳转到登录页面
    window.location.href = '/pages/login.html';
}
