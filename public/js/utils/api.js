// API 模块
console.log('🐱 API.js is loading...');
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

        // 获取最新数据
        async getLatestData(year = null, dataType = null) {
            const params = new URLSearchParams();
            if (year) params.append('year', year);
            if (dataType) params.append('dataType', dataType);
            
            const response = await fetch(`/api/latest-data?${params}`);
            if (!response.ok) {
                if (response.status === 404) return null;
                const errorText = await response.text();
                throw new Error(errorText || '获取最新数据失败');
            }
            return await response.json();
        },

        // 获取可用年份列表
async getAvailableYears() {
    const response = await fetch('/api/available-years');
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || '获取可用年份失败');
    }
    return await response.json();
},

        // 按数据类型获取可用年份
async getAvailableYearsByType(dataType) {
    const response = await fetch(`/api/available-years/${dataType}`);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || '获取可用年份失败');
    }
    return await response.json();
},

        // 🎯 [API-ENDPOINT] 获取数据源统计 - 调用后端/data-source-stats接口
        async getDataSourceStats(year = null) {
            // 📍 支持年份参数的数据统计获取
            // 🔗 后端接口：server/routes/data-source.js
            // 简化的缓存绕过策略，让业务层处理具体缓存逻辑
            const timestamp = Date.now();
            const params = year ? `?year=${year}&_t=${timestamp}` : `?_t=${timestamp}`;
            
            const response = await fetch(`/api/data-source-stats${params}`, {
                cache: 'no-cache'
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '获取数据源统计失败');
            }
            
            // 强制重新解析响应
            const responseText = await response.text();
            return JSON.parse(responseText);
        },

        // 自定义时间段对比
        async compareCustomPeriods(data) {
            let options = {};
            if (data instanceof FormData) {
                options = {
                    method: 'POST',
                    body: data
                };
            } else {
                options = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                };
            }

            const response = await fetch('/api/compare-custom-periods', options);
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
        },

        // 获取历史记录
        async getHistory() {
            const response = await fetch('/api/history');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || '获取历史记录失败');
            }
            return await response.json();
        }
    };

    window.App = window.App || {};
    window.App.API = API;
    console.log('🐱 API.js loaded successfully! Methods:', Object.keys(API));
})();
