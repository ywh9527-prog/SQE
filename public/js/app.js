// 应用入口文件
document.addEventListener('DOMContentLoaded', () => {
    console.log('SQE System v2.0 Initializing...');

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

    window.App.Router.register('suppliers', () => {
        console.log('供应商模块已激活');
    });

    // 手动触发一次路由处理，确保直接访问带 hash 的 URL 时能正确渲染
    if (window.App.Router) {
        window.App.Router.handleHashChange();
    }
});
