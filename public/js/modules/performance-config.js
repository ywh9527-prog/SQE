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
            els.configWarningBanner = document.getElementById('configWarningBanner');
            els.inProgressCount = document.getElementById('inProgressCount');
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
                    
                    // 检查是否有进行中的评价周期
                    await this.checkInProgressEvaluations();
                    
                    els.configModal.classList.remove('hidden');
                } else {
                    // 使用 Toast 通知
                    if (window.App && window.App.Toast) {
                        window.App.Toast.error('加载配置失败：' + result.message);
                    }
                }
            } catch (error) {
                console.error('加载配置失败:', error);
                // 使用 Toast 通知
                if (window.App && window.App.Toast) {
                    window.App.Toast.error('加载配置失败');
                }
            }
        },

        // 检查是否有进行中的评价周期
        async checkInProgressEvaluations() {
            try {
                const response = await this.authenticatedFetch('/api/evaluations/in-progress-check');
                const result = await response.json();

                if (result.success && result.data) {
                    // 显示警告横幅
                    els.inProgressCount.textContent = result.data.count;
                    els.configWarningBanner.classList.remove('hidden');
                } else {
                    // 隐藏警告横幅
                    els.configWarningBanner.classList.add('hidden');
                }
            } catch (error) {
                console.error('检查进行中评价周期失败:', error);
                // 即使检查失败也隐藏警告横幅
                els.configWarningBanner.classList.add('hidden');
            }
        },

        // 关闭配置对话框
        closeConfigModal() {
            // 检查是否有未保存的更改
            const hasChanges = this.hasUnsavedChanges();
            
            if (!hasChanges) {
                // 没有变更，直接关闭
                els.configModal.classList.add('hidden');
                state.config = null;
                state.originalConfig = null;
                return;
            }

            // 有变更，显示确认对话框
            if (window.App && window.App.Modules && window.App.Modules.Performance) {
                window.App.Modules.Performance.showConfirmDialog(
                    '确认关闭配置',
                    '确定要关闭配置对话框吗？未保存的更改将丢失。',
                    () => {
                        els.configModal.classList.add('hidden');
                        state.config = null;
                        state.originalConfig = null;
                    }
                );
            }
        },

        // 检查是否有未保存的更改
        hasUnsavedChanges() {
            if (!state.config || !state.originalConfig) {
                return false;
            }
            // 深度比较两个对象
            return JSON.stringify(state.config) !== JSON.stringify(state.originalConfig);
        },

        // 渲染维度列表
        renderDimensions() {
            if (!state.config || !state.config.dimensions) return;

            els.dimensionsList.innerHTML = '';

            state.config.dimensions.forEach((dimension, index) => {
                const item = document.createElement('div');
                item.className = 'performance__dimension-item';
                item.innerHTML = `
                    <div class="dimension-edit-row">
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
                            <label>权重（%）</label>
                            <input type="number" class="form-control" value="${(dimension.weight * 100).toFixed(0)}" step="1" min="0" max="100"
                                onchange="window.App.Modules.PerformanceConfig.updateDimension(${index}, 'weight', parseFloat(this.value) / 100)">
                        </div>
                        <button class="btn-icon" onclick="window.App.Modules.PerformanceConfig.removeDimension(${index})">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                    <div class="dimension-tip-row">
                        <div class="form-group">
                            <label>计算规则</label>
                            <textarea class="form-control" rows="2" placeholder="输入计算规则说明"
                                onchange="window.App.Modules.PerformanceConfig.updateDimension(${index}, 'calculationRule', this.value)">${dimension.calculationRule || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>评分标准</label>
                            <textarea class="form-control" rows="2" placeholder="输入评分标准说明"
                                onchange="window.App.Modules.PerformanceConfig.updateDimension(${index}, 'scoringStandard', this.value)">${dimension.scoringStandard || ''}</textarea>
                        </div>
                    </div>
                `;
                els.dimensionsList.appendChild(item);
            });
        },

        // 渲染等级规则列表
        renderGradeRules() {
            if (!state.config || !state.config.gradeRules) return;

            // 预设颜色（按顺序自动分配）
            const gradeColors = state.config.gradeColors || [
                '#16a34a', '#2563eb', '#f59e0b', '#dc2626', '#6b7280', '#1f2937'
            ];

            els.gradeRulesList.innerHTML = '';

            state.config.gradeRules.forEach((rule, index) => {
                // 按顺序自动获取颜色
                const color = gradeColors[index] || gradeColors[gradeColors.length - 1];

                const item = document.createElement('div');
                item.className = 'performance__grade-rule-item';
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
                    <div class="form-group strategy-group">
                        <label>等级策略</label>
                        <textarea class="form-control" rows="2" placeholder="输入等级策略说明"
                            onchange="window.App.Modules.PerformanceConfig.updateGradeRule(${index}, 'strategy', this.value)">${rule.strategy || ''}</textarea>
                    </div>
                    <div class="range-display">
                        <span class="color-preview" style="background: ${color}"></span>
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
                weight: 0.1,
                calculationRule: '',
                scoringStandard: ''
            };

            state.config.dimensions.push(newDimension);
            this.renderDimensions();
            this.updateTotalWeight();
        },

        // 删除维度
        removeDimension(index) {
            if (!state.config || !state.config.dimensions) return;

            if (state.config.dimensions.length <= 1) {
                // 使用 Toast 通知
                if (window.App && window.App.Toast) {
                    window.App.Toast.warning('至少需要保留一个维度');
                }
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
                label: '新等级',
                strategy: ''
            };

            state.config.gradeRules.push(newRule);
            this.renderGradeRules();
        },

        // 删除等级规则
        removeGradeRule(index) {
            if (!state.config || !state.config.gradeRules) return;

            if (state.config.gradeRules.length <= 1) {
                // 使用 Toast 通知
                if (window.App && window.App.Toast) {
                    window.App.Toast.warning('至少需要保留一个等级规则');
                }
                return;
            }

            state.config.gradeRules.splice(index, 1);
            this.renderGradeRules();
        },

        // 更新权重总和显示
        updateTotalWeight() {
            if (!state.config || !state.config.dimensions) return;

            const totalWeight = state.config.dimensions.reduce((sum, dim) => sum + (dim.weight || 0), 0);
            els.totalWeight.textContent = (totalWeight * 100).toFixed(0) + '%';

            // 权重总和不为1时显示警告
            if (Math.abs(totalWeight - 1) > 0.01) {
                els.totalWeight.style.color = 'var(--danger)';
            } else {
                els.totalWeight.style.color = 'var(--gray-50)';
            }
        },

        // 重置为默认配置

                async resetToDefault() {

                    // 使用全局确认对话框

                    if (window.App && window.App.Modules && window.App.Modules.Performance) {

                        window.App.Modules.Performance.showConfirmDialog(

                            '确认重置配置',

                            '确定要重置为默认配置吗？这将清除所有自定义配置。',

                            async () => {

                                try {

                                    const response = await this.authenticatedFetch('/api/evaluation-config/reset', {

                                        method: 'POST'

                                    });

                                    const result = await response.json();

        

                                    if (result.success) {

                                        // 使用 Toast 通知

                                        if (window.App && window.App.Toast) {

                                            window.App.Toast.success('已重置为默认配置');

                                        }

                                        state.config = JSON.parse(JSON.stringify(result.data));

                                        state.originalConfig = JSON.parse(JSON.stringify(result.data));

                                        this.renderDimensions();

                                        this.renderGradeRules();

                                        this.updateTotalWeight();

                                    } else {

                                        // 使用 Toast 通知

                                        if (window.App && window.App.Toast) {

                                            window.App.Toast.error('重置配置失败：' + result.message);

                                        }

                                    }

        

                                } catch (error) {

                                    console.error('重置配置失败:', error);

                                    // 使用 Toast 通知

                                    if (window.App && window.App.Toast) {

                                        window.App.Toast.error('重置配置失败');

                                    }

                                }

                            }

                        );

                    }

                },

        // 保存配置
        async saveConfig() {
            if (!state.config) return;

            // 验证配置
            try {
                const totalWeight = state.config.dimensions.reduce((sum, dim) => sum + (dim.weight || 0), 0);
                if (Math.abs(totalWeight - 1) > 0.01) {
                    // 使用 Toast 通知
                    if (window.App && window.App.Toast) {
                        window.App.Toast.warning(`权重总和必须为100%，当前为${(totalWeight * 100).toFixed(0)}%`);
                    }
                    return;
                }

                // 验证等级规则
                for (const rule of state.config.gradeRules) {
                    if (rule.min >= rule.max) {
                        // 使用 Toast 通知
                        if (window.App && window.App.Toast) {
                            window.App.Toast.warning(`等级"${rule.label}"的最低分必须小于最高分`);
                        }
                        return;
                    }
                }

                // 检查是否有进行中的评价周期
                const inProgressCheck = await this.checkInProgressEvaluationsSync();

                // 总是显示确认对话框，让用户明确知道配置变更的影响
                let confirmTitle = '确认保存配置';
                let confirmMessage = '确定要保存配置吗？';
                
                if (inProgressCheck.hasInProgress) {
                    confirmTitle = '⚠️ 配置变更提醒';
                    confirmMessage = 
                        `检测到有 ${inProgressCheck.count} 个评价周期正在进行中。` +
                        `修改配置将影响这些周期的评价结果计算，已评价的供应商分数将自动重新计算。` +
                        `是否继续保存配置？`;
                } else {
                    confirmMessage = 
                        `确定要保存配置吗？` +
                        `保存后，评价界面将自动刷新以应用新配置。`;
                }

                // 使用全局确认对话框
                if (window.App && window.App.Modules && window.App.Modules.Performance) {
                    window.App.Modules.Performance.showConfirmDialog(
                        confirmTitle,
                        confirmMessage,
                        async () => {
                            // 用户确认后的操作
                            await this.doSaveConfig(inProgressCheck);
                        }
                    );
                    return; // 等待用户确认
                }
            } catch (error) {
                console.error('保存配置异常:', error);
                // 使用 Toast 通知
                if (window.App && window.App.Toast) {
                    window.App.Toast.error('保存配置失败：' + error.message);
                }
            }
        },

        // 执行保存配置的实际操作
        async doSaveConfig(inProgressCheck) {
            try {
                // 保存配置
                console.log('开始保存配置:', state.config);
                const response = await this.authenticatedFetch('/api/evaluation-config', {
                    method: 'PUT',
                    body: JSON.stringify(state.config)
                });
                
                console.log('保存配置响应状态:', response.status);
                const result = await response.json();
                console.log('保存配置响应数据:', result);

                if (result.success) {
                    let message = '配置保存成功！';
                    
                    // 如果有进行中的评价周期，提示用户
                    if (inProgressCheck.hasInProgress) {
                        message += ` 已更新 ${result.data.updatedEvaluations} 个评价周期的配置快照。`;
                        if (result.data.recalculatedDetails > 0) {
                            message += ` 已自动重新计算 ${result.data.recalculatedDetails} 条评价数据。`;
                        }
                        message += ` 建议重新检查已评价的供应商分数。`;
                    } else {
                        message += ` 评价界面将自动刷新以应用新配置。`;
                    }
                    
                    // 使用 Toast 通知
                    if (window.App && window.App.Toast) {
                        window.App.Toast.success(message);
                    }
                    
                    state.originalConfig = JSON.parse(JSON.stringify(state.config));
                    els.configModal.classList.add('hidden');
                    
                    // 提示用户配置已保存，并刷新页面以应用最新配置
                    if (window.App && window.App.Toast) {
                        window.App.Toast.success('配置已保存，页面将刷新以应用最新配置');
                    }
                    
                    // 延迟刷新页面，确保Toast显示完成
                    setTimeout(() => {
                        window.location.reload();
                    }, 100);
                } else {
                    console.error('保存配置失败:', result);
                    // 使用 Toast 通知
                    if (window.App && window.App.Toast) {
                        window.App.Toast.error('保存配置失败：' + result.message);
                    }
                }
            } catch (error) {
                console.error('保存配置异常:', error);
                // 使用 Toast 通知
                if (window.App && window.App.Toast) {
                    window.App.Toast.error('保存配置失败：' + error.message);
                }
            }
        },

        // 同步检查是否有进行中的评价周期
        async checkInProgressEvaluationsSync() {
            try {
                const response = await this.authenticatedFetch('/api/evaluations/in-progress-check');
                const result = await response.json();

                if (result.success && result.data) {
                    return result.data;
                } else {
                    return { hasInProgress: false, count: 0 };
                }
            } catch (error) {
                console.error('检查进行中评价周期失败:', error);
                // 即使检查失败也返回默认值，不影响配置保存
                return { hasInProgress: false, count: 0 };
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