// API 模块
(function () {
    const API = {
        // 获取工作表信息
        async getSheets(formData) {
            const response = await fetch('/api/get-sheets', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '获取工作表失败');
            }
            return await response.json();
        },

        // 上传并分析文件
        async uploadFile(formData) {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '上传失败');
            }
            return await response.json();
        },

        // 筛选数据 (使用缓存，无需重新上传)
        async filterData(data) {
            const response = await fetch('/api/filter-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '筛选失败');
            }
            return await response.json();
        },

        // 搜索供应商 (旧方法，需要上传文件)
        async searchSupplier(formData) {
            const response = await fetch('/api/search-supplier', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '搜索失败');
            }
            return await response.json();
        },

        // 获取供应商列表
        async getSuppliers(formData) {
            const response = await fetch('/api/get-suppliers', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '获取供应商列表失败');
            }
            return await response.json();
        },

        // 获取供应商排名
        async getSupplierRanking(formData) {
            const response = await fetch('/api/get-supplier-ranking', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '获取排名失败');
            }
            return await response.json();
        },

        // 自定义时间段对比
        async compareCustomPeriods(formData) {
            const response = await fetch('/api/compare-custom-periods', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '自定义对比失败');
            }
            return await response.json();
        },

        // 获取月度详细数据
        async getMonthDetails(data) {
            const response = await fetch('/api/get-month-details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '获取月度详情失败');
            }
            return await response.json();
        }
    };

    window.App = window.App || {};
    window.App.API = API;
})();
