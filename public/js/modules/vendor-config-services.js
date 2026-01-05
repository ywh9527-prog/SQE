/**
 * 供应商配置中心服务层
 * 负责所有与后端API的数据交互
 */
class VendorConfigServices {
    constructor() {
        this.baseURL = '/api/vendors';
    }

    /**
     * 获取配置列表
     * @param {Object} filters - 筛选条件
     * @returns {Promise<Object>} 配置列表
     */
    async getConfig(filters = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.source) params.append('source', filters.source);
            if (filters.status) params.append('status', filters.status);
            if (filters.keyword) params.append('keyword', filters.keyword);

            const response = await fetch(`${this.baseURL}/config?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                return { success: true, data: data.data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('获取配置列表失败:', error);
            return { success: false, error: '获取配置列表失败' };
        }
    }

    /**
     * 更新配置
     * @param {number} id - 配置ID
     * @param {Object} config - 配置数据
     * @returns {Promise<Object>} 更新结果
     */
    async updateConfig(id, config) {
        try {
            const response = await fetch(`${this.baseURL}/config/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            const data = await response.json();
            if (data.success) {
                return { success: true, message: data.message };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('更新配置失败:', error);
            return { success: false, error: '更新配置失败' };
        }
    }

    /**
     * 从IQC同步供应商
     * @param {string} mode - 同步模式 (full | incremental)
     * @returns {Promise<Object>} 同步结果
     */
    async syncFromIQC(mode = 'full') {
        try {
            const response = await fetch(`${this.baseURL}/sync-from-iqc`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ mode })
            });

            const data = await response.json();
            if (data.success) {
                return { success: true, message: data.message, stats: data.stats };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('从IQC同步失败:', error);
            return { success: false, error: '从IQC同步失败' };
        }
    }

    /**
     * 添加供应商
     * @param {Object} vendorData - 供应商数据
     * @returns {Promise<Object>} 添加结果
     */
    async addVendor(vendorData) {
        try {
            const response = await fetch(`${this.baseURL}/config`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(vendorData)
            });

            const data = await response.json();
            if (data.success) {
                return { success: true, message: data.message, data: data.data };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('添加供应商失败:', error);
            return { success: false, error: '添加供应商失败' };
        }
    }

    /**
     * 删除供应商
     * @param {number} id - 供应商ID
     * @returns {Promise<Object>} 删除结果
     */
    async deleteVendor(id) {
        try {
            const response = await fetch(`${this.baseURL}/config/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            const data = await response.json();
            if (data.success) {
                return { success: true, message: data.message };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('删除供应商失败:', error);
            return { success: false, error: '删除供应商失败' };
        }
    }

    /**
     * 批量更新配置
     * @param {Array<number>} ids - 配置ID数组
     * @param {Object} config - 配置数据
     * @returns {Promise<Object>} 批量更新结果
     */
    async batchUpdateConfig(ids, config) {
        try {
            const response = await fetch(`${this.baseURL}/config/batch`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids, config })
            });

            const data = await response.json();
            if (data.success) {
                return { success: true, message: data.message };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('批量更新配置失败:', error);
            return { success: false, error: '批量更新配置失败' };
        }
    }

    /**
     * 批量删除供应商
     * @param {Array<number>} ids - 供应商ID数组
     * @returns {Promise<Object>} 批量删除结果
     */
    async batchDeleteVendors(ids) {
        try {
            const response = await fetch(`${this.baseURL}/config/batch`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ids })
            });

            const data = await response.json();
            if (data.success) {
                return { success: true, message: data.message };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('批量删除供应商失败:', error);
            return { success: false, error: '批量删除供应商失败' };
        }
    }
}

// 创建全局服务实例
window.vendorConfigServices = new VendorConfigServices();