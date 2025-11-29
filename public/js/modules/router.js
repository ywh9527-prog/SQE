/**
 * 简易 Hash 路由管理器
 * 负责监听 URL hash 变化，并切换对应的模块视图
 */
class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;

        // 绑定 hashchange 事件
        window.addEventListener('hashchange', () => this.handleHashChange());
        // 页面加载时也触发一次
        window.addEventListener('load', () => this.handleHashChange());
    }

    /**
     * 注册路由
     * @param {string} path - 路由路径 (如 'dashboard')
     * @param {Function} callback - 路由激活时的回调
     */
    register(path, callback) {
        this.routes[path] = callback;
    }

    /**
     * 处理 Hash 变化
     */
    handleHashChange() {
        // 获取当前 hash，去掉 # 号。如果为空，默认为 'dashboard'
        const hash = window.location.hash.slice(1) || 'dashboard';

        if (this.currentRoute === hash) return;
        this.currentRoute = hash;

        // 1. 更新侧边栏激活状态
        this.updateSidebar(hash);

        // 2. 切换视图显示
        this.switchView(hash);

        // 3. 更新页面标题
        this.updateTitle(hash);

        // 4. 执行注册的回调（如果有）
        if (this.routes[hash]) {
            this.routes[hash]();
        }
    }

    updateSidebar(hash) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.module === hash) {
                item.classList.add('active');
            }
        });
    }

    switchView(hash) {
        // 隐藏所有模块
        document.querySelectorAll('.module-view').forEach(view => {
            view.classList.add('hidden');
        });

        // 显示目标模块
        const targetView = document.getElementById(`module-${hash}`) || 
                           document.getElementById(`module-${hash}s`); // 处理复数形式
        if (targetView) {
            targetView.classList.remove('hidden');
        } else {
            console.warn(`未找到模块视图: module-${hash}`);
            // 可以在这里显示 404 页面
        }
    }

    updateTitle(hash) {
        const titleMap = {
            'dashboard': '工作台',
            'iqc': 'IQC 质量分析',
            'supplier': '供应商档案',
            'documents': '供应商资料管理',
            'certificates': '资质证书',
            'performance': '绩效评价'
        };
        const title = titleMap[hash] || 'SQE 系统';
        document.getElementById('page-title').textContent = title;
    }
}

// 导出 Router 实例
window.App = window.App || {};
window.App.Router = new Router();

// 注册documents模块回调
window.App.Router.register('documents', () => {
  if (window.supplierManager) {
    window.supplierManager.loadDocuments();
  }
});
