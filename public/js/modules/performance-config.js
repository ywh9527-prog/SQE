/**
 * 供应商绩效评价配置管理模块
 * 负责管理评价维度、权重、等级规则等配置
 */
(function() {
    // 模块状态
    const state = {
        config: null,
        originalConfig: null
    };

    // DOM 元素缓存
    const els = {};

    const PerformanceConfigModule = {
        // 初始化模块
        init() {
            console.log('Performance Config Module: Initializing...');
            this.cacheElements();
            this.bindEvents();
            console.log('Performance Config Module: Initialization complete');
        },

        // 缓存 DOM 元素
        cacheElements() {
            els.configModal = document.getElementById('configModal');
            els.closeConfigModalBtn = document.getElementById('closeConfigModalBtn');
            els.dimensionsList = document.getElementById('dimensionsList');
            els.gradeRulesList = document.getElementById('gradeRulesList');
            els.totalWeight = document.getElementById('totalWeight');
            els.addDimensionBtn = document.getElementById('addDimensionBtn');
            els.addGradeRuleBtn = document.getElementById('addGradeRuleBtn');
            els.resetConfigBtn = document.getElementById('resetConfigBtn');
            els.saveConfigBtn = document.getElementById('saveConfigBtn');
        },

        // 绑定事件
        bindEvents() {
            if (els.closeConfigModalBtn) {
                els.closeConfigModalBtn.addEventListener('click', () => this.closeConfigModal());
            }

            if (els.addDimensionBtn) {
                els.addDimensionBtn.addEventListener('click', () => this.addDimension());
            }

            if (els.addGradeRuleBtn) {
                els.addGradeRuleBtn.addEventListener('click', () => this.addGradeRule());
            }

            if (els.resetConfigBtn) {
                els.resetConfigBtn.addEventListener('click', () => this.resetToDefault());
            }

            if (els.saveConfigBtn) {
                els.saveConfigBtn.addEventListener('click', () => this.saveConfig());
            }
        },

        // 辅助函数：发送带认证的请求
        async authenticatedFetch(url, options = {}) {
            const token = localStorage.getItem('authToken');
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            return fetch(url, {
                ...options,
                headers
            });
        },

        // 打开配置对话框
        async openConfigModal() {
            if (!els.configModal) return;

            try {
                // 加载配置
                const response = await this.authenticatedFetch('/api/evaluation-config');
                const result = await response.json();

                if (result.success) {
                    state.config = JSON.parse(JSON.stringify(result.data));
                    state.originalConfig = JSON.parse(JSON.stringify(result.data));
                    this.renderDimensions();
                    this.renderGradeRules();
                    this.updateTotalWeight();
                    els.configModal.classList.remove('hidden');
                } else {
                    alert('加载配置失败：' + result.message);
                }
            } catch (error) {
                console.error('加载配置失败:', error);
                alert('加载配置失败');
            }
        },

        // 关闭配置对话框
        closeConfigModal() {
            if (confirm('确定要关闭配置对话框吗？未保存的更改将丢失。')) {
                els.configModal.classList.add('hidden');
                state.config = null;
                state.originalConfig = null;
            }
        },

        // 渲染维度列表
        renderDimensions() {
            if (!state.config || !state.config.dimensions) return;

            els.dimensionsList.innerHTML = '';

            state.config.dimensions.forEach((dimension, index) => {
                const item = document.createElement('div');
                item.className = 'dimension-item';
                item.innerHTML = `
                    <div class="form-group">
                        <label>维度名称</label>
                        <input type="text" class="form-control" value="${dimension.name}" 
                            onchange="window.App.Modules.PerformanceConfig.updateDimension(${index}, 'name', this.value)">
                    </div>
                    <div class="form-group">
                        <label>维度键值</label>
                        <input type="text" class="form-control" value="${dimension.key}" 
                            onchange="window.App.Modules.PerformanceConfig.updateDimension(${index}, 'key', this.value)">
                    </div>
                    <div class="form-group">
                        <label>权重</label>
                        <input type="number" class="form-control" value="${dimension.weight}" step="0.01" min="0" max="1"
                            onchange="window.App.Modules.PerformanceConfig.updateDimension(${index}, 'weight', parseFloat(this.value))">
                    </div>
                    <button class="btn-icon" onclick="window.App.Modules.PerformanceConfig.removeDimension(${index})">
                        <i class="ph ph-trash"></i>
                    </button>
                `;
                els.dimensionsList.appendChild(item);
            });
        },

        // 渲染等级规则列表
        renderGradeRules() {
            if (!state.config || !state.config.gradeRules) return;

            els.gradeRulesList.innerHTML = '';

            state.config.gradeRules.forEach((rule, index) => {
                const item = document.createElement('div');
                item.className = 'grade-rule-item';
                item.innerHTML = `
                    <div class="form-group">
                        <label>等级名称</label>
                        <input type="text" class="form-control" value="${rule.label}" 
                            onchange="window.App.Modules.PerformanceConfig.updateGradeRule(${index}, 'label', this.value)">
                    </div>
                    <div class="form-group">
                        <label>最低分</label>
                        <input type="number" class="form-control" value="${rule.min}" step="0.01" min="0" max="100"
                            onchange="window.App.Modules.PerformanceConfig.updateGradeRule(${index}, 'min', parseFloat(this.value))">
                    </div>
                    <div class="form-group">
                        <label>最高分</label>
                        <input type="number" class="form-control" value="${rule.max}" step="0.01" min="0" max="100"
                            onchange="window.App.Modules.PerformanceConfig.updateGradeRule(${index}, 'max', parseFloat(this.value))">
                    </div>
                    <div class="range-display">
                        ${rule.min} - ${rule.max}
                    </div>
                    <button class="btn-icon" onclick="window.App.Modules.PerformanceConfig.removeGradeRule(${index})">
                        <i class="ph ph-trash"></i>
                    </button>
                `;
                els.gradeRulesList.appendChild(item);
            });
        },

        // 更新维度
        updateDimension(index, field, value) {
            if (!state.config || !state.config.dimensions) return;
            state.config.dimensions[index][field] = value;
            this.updateTotalWeight();
        },

        // 更新等级规则
        updateGradeRule(index, field, value) {
            if (!state.config || !state.config.gradeRules) return;
            state.config.gradeRules[index][field] = value;
        },

        // 添加维度
        addDimension() {
            if (!state.config) return;

            const newDimension = {
                name: '新维度',
                key: `dimension_${Date.now()}`,
                weight: 0.1
            };

            state.config.dimensions.push(newDimension);
            this.renderDimensions();
            this.updateTotalWeight();
        },

        // 删除维度
        removeDimension(index) {
            if (!state.config || !state.config.dimensions) return;

            if (state.config.dimensions.length <= 1) {
                alert('至少需要保留一个维度');
                return;
            }

            state.config.dimensions.splice(index, 1);
            this.renderDimensions();
            this.updateTotalWeight();
        },

        // 添加等级规则
        addGradeRule() {
            if (!state.config) return;

            const newRule = {
                min: 0,
                max: 60,
                label: '新等级'
            };

            state.config.gradeRules.push(newRule);
            this.renderGradeRules();
        },

        // 删除等级规则
        removeGradeRule(index) {
            if (!state.config || !state.config.gradeRules) return;

            if (state.config.gradeRules.length <= 1) {
                alert('至少需要保留一个等级规则');
                return;
            }

            state.config.gradeRules.splice(index, 1);
            this.renderGradeRules();
        },

        // 更新权重总和显示
        updateTotalWeight() {
            if (!state.config || !state.config.dimensions) return;

            const totalWeight = state.config.dimensions.reduce((sum, dim) => sum + (dim.weight || 0), 0);
            els.totalWeight.textContent = totalWeight.toFixed(2);

            // 权重总和不为1时显示警告
            if (Math.abs(totalWeight - 1) > 0.01) {
                els.totalWeight.style.color = 'var(--danger)';
            } else {
                els.totalWeight.style.color = 'var(--gray-50)';
            }
        },

        // 重置为默认配置
        async resetToDefault() {
            if (!confirm('确定要重置为默认配置吗？这将清除所有自定义配置。')) return;

            try {
                const response = await this.authenticatedFetch('/api/evaluation-config/reset', {
                    method: 'POST'
                });
                const result = await response.json();

                if (result.success) {
                    alert('已重置为默认配置');
                    state.config = JSON.parse(JSON.stringify(result.data));
                    state.originalConfig = JSON.parse(JSON.stringify(result.data));
                    this.renderDimensions();
                    this.renderGradeRules();
                    this.updateTotalWeight();
                } else {
                    alert('重置配置失败：' + result.message);
                }
            } catch (error) {
                console.error('重置配置失败:', error);
                alert('重置配置失败');
            }
        },

        // 保存配置
        async saveConfig() {
            if (!state.config) return;

            // 验证配置
            try {
                const totalWeight = state.config.dimensions.reduce((sum, dim) => sum + (dim.weight || 0), 0);
                if (Math.abs(totalWeight - 1) > 0.01) {
                    alert(`权重总和必须为1，当前为${totalWeight.toFixed(2)}`);
                    return;
                }

                // 验证等级规则
                for (const rule of state.config.gradeRules) {
                    if (rule.min >= rule.max) {
                        alert(`等级"${rule.label}"的最低分必须小于最高分`);
                        return;
                    }
                }

                // 保存配置
                const response = await this.authenticatedFetch('/api/evaluation-config', {
                    method: 'PUT',
                    body: JSON.stringify(state.config)
                });
                const result = await response.json();

                if (result.success) {
                    alert('配置保存成功！');
                    state.originalConfig = JSON.parse(JSON.stringify(state.config));
                    els.configModal.classList.add('hidden');
                } else {
                    alert('保存配置失败：' + result.message);
                }
            } catch (error) {
                console.error('保存配置失败:', error);
                alert('保存配置失败');
            }
        }
    };

    // 暴露到全局
    window.App = window.App || {};
    window.App.Modules = window.App.Modules || {};
    window.App.Modules.PerformanceConfig = PerformanceConfigModule;

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PerformanceConfigModule.init());
    } else {
        PerformanceConfigModule.init();
    }
})();