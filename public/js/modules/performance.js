/**
 * 供应商绩效评价模块
 */
(function() {
    // 模块状态
    const state = {
        currentEvaluation: null,
        currentEntity: null,
        config: null,
        entities: [],
        selectedPeriodType: null,
        createEvaluationData: null
    };

    // DOM 元素缓存
    const els = {};

    const PerformanceModule = {
        // 初始化模块
        init() {
            console.log('Performance Module: Initializing...');
            this.cacheElements();
            this.bindEvents();
            this.loadConfig();
            this.loadEvaluationPeriods();
            console.log('Performance Module: Initialization complete');
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

        // 缓存 DOM 元素
        cacheElements() {
            els.createEvaluationBtn = document.getElementById('createEvaluationBtn');
            els.configBtn = document.getElementById('configBtn');
            els.createEvaluationModal = document.getElementById('createEvaluationModal');
            els.closeCreateModalBtn = document.getElementById('closeCreateModalBtn');
            els.evaluationInterface = document.getElementById('evaluationInterface');
            els.evaluationTitle = document.getElementById('evaluationTitle');
            els.evaluationPeriod = document.getElementById('evaluationPeriod');
            els.evaluationEntityCount = document.getElementById('evaluationEntityCount');
            els.exitEvaluationBtn = document.getElementById('exitEvaluationBtn');
            els.entityCardsList = document.getElementById('entityCardsList');
            els.evaluationSidebar = document.getElementById('evaluationSidebar');
            els.sidebarEntityName = document.getElementById('sidebarEntityName');
            els.closeSidebarBtn = document.getElementById('closeSidebarBtn');
            els.qualityTotalBatches = document.getElementById('qualityTotalBatches');
            els.qualityOkBatches = document.getElementById('qualityOkBatches');
            els.qualityPassRate = document.getElementById('qualityPassRate');
            els.dimensionInputs = document.getElementById('dimensionInputs');
            els.evaluationForm = document.getElementById('evaluationForm');
            els.evaluationRemarks = document.getElementById('evaluationRemarks');
            els.periodsList = document.getElementById('periodsList');
        },

        // 绑定事件
        bindEvents() {
            console.log('绑定事件...');
            console.log('createEvaluationBtn:', els.createEvaluationBtn);
            console.log('configBtn:', els.configBtn);

            if (els.createEvaluationBtn) {
                els.createEvaluationBtn.addEventListener('click', () => {
                    console.log('点击创建评价周期按钮');
                    this.showCreateEvaluationDialog();
                });
            } else {
                console.error('createEvaluationBtn 元素未找到！');
            }

            if (els.configBtn) {
                els.configBtn.addEventListener('click', () => this.showConfigDialog());
            } else {
                console.error('configBtn 元素未找到！');
            }

            if (els.exitEvaluationBtn) {
                els.exitEvaluationBtn.addEventListener('click', () => this.exitEvaluation());
            }

            if (els.closeSidebarBtn) {
                els.closeSidebarBtn.addEventListener('click', () => this.closeSidebar());
            }

            if (els.evaluationForm) {
                els.evaluationForm.addEventListener('submit', (e) => this.handleEvaluationSubmit(e));
            }
        },

        // 加载配置
        async loadConfig() {
            try {
                const response = await this.authenticatedFetch('/api/evaluation-config');
                const result = await response.json();

                if (result.success) {
                    state.config = result.data;
                }
            } catch (error) {
                console.error('加载配置失败:', error);
            }
        },

        // 加载评价周期列表
        async loadEvaluationPeriods() {
            try {
                const response = await this.authenticatedFetch('/api/evaluations');
                const result = await response.json();

                if (result.success) {
                    this.renderPeriodsList(result.data);
                }
            } catch (error) {
                console.error('加载评价周期列表失败:', error);
            }
        },

        // 渲染评价周期列表
        renderPeriodsList(evaluations) {
            els.periodsList.innerHTML = '';

            if (evaluations.length === 0) {
                els.periodsList.innerHTML = '<p style="text-align: center; color: #718096; padding: 2rem;">暂无评价周期</p>';
                return;
            }

            evaluations.forEach(evaluation => {
                const item = document.createElement('div');
                item.className = 'period-item';
                item.innerHTML = `
                    <div class="period-item-info">
                        <h4>${evaluation.period_name}</h4>
                        <p>${evaluation.start_date} 至 ${evaluation.end_date}</p>
                    </div>
                    <div class="period-item-status">
                        <span class="status-badge ${evaluation.status}">${this.getStatusText(evaluation.status)}</span>
                        <div class="period-item-actions">
                            ${evaluation.status === 'draft' && evaluation.id ? `<button class="btn btn-sm btn-primary" onclick="window.App.Modules.Performance.startEvaluation(${evaluation.id})">开始评价</button>` : ''}
                            ${evaluation.status === 'completed' && evaluation.id ? `<button class="btn btn-sm btn-secondary" onclick="window.App.Modules.Performance.viewResults(${evaluation.id})">查看结果</button>` : ''}
                        </div>
                    </div>
                `;
                els.periodsList.appendChild(item);
            });
        },

        // 获取状态文本
        getStatusText(status) {
            const statusMap = {
                'draft': '草稿',
                'in_progress': '进行中',
                'completed': '已完成'
            };
            return statusMap[status] || status;
        },

        // 显示创建评价周期对话框
        showCreateEvaluationDialog() {
            console.log('showCreateEvaluationDialog 被调用');
            const modal = document.getElementById('createEvaluationModal');
            console.log('modal元素:', modal);

            if (!modal) {
                console.error('createEvaluationModal 元素未找到！');
                return;
            }

            modal.classList.remove('hidden');
            console.log('移除hidden类');

            // 重置对话框状态
            this.resetCreateModal();

            // 初始化年份选择器
            this.initializeYearSelectors();

            // 绑定事件
            this.bindCreateModalEvents();
        },

        // 重置创建对话框
        resetCreateModal() {
            document.getElementById('createStep1').classList.remove('hidden');
            document.getElementById('createStep2').classList.add('hidden');
            document.getElementById('monthlySelector').classList.add('hidden');
            document.getElementById('quarterlySelector').classList.add('hidden');
            document.getElementById('yearlySelector').classList.add('hidden');
            document.getElementById('customSelector').classList.add('hidden');
            document.getElementById('periodPreview').classList.add('hidden');
            document.getElementById('createEvaluationForm').reset();
        },

        // 初始化年份选择器
        initializeYearSelectors() {
            const currentYear = new Date().getFullYear();
            const years = [];

            // 生成前后5年的年份
            for (let i = currentYear - 5; i <= currentYear + 1; i++) {
                years.push(i);
            }

            // 填充月度年份选择器
            const monthlyYear = document.getElementById('monthlyYear');
            monthlyYear.innerHTML = years.map(year => 
                `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}年</option>`
            ).join('');

            // 填充季度年份选择器
            const quarterlyYear = document.getElementById('quarterlyYear');
            quarterlyYear.innerHTML = years.map(year => 
                `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}年</option>`
            ).join('');

            // 填充年度年份选择器
            const yearlyYear = document.getElementById('yearlyYear');
            yearlyYear.innerHTML = years.map(year => 
                `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}年</option>`
            ).join('');

            // 填充月份选择器
            const monthlyMonth = document.getElementById('monthlyMonth');
            const currentMonth = new Date().getMonth() + 1;
            monthlyMonth.innerHTML = Array.from({ length: 12 }, (_, i) => 
                `<option value="${i + 1}" ${(i + 1) === currentMonth ? 'selected' : ''}>${i + 1}月</option>`
            ).join('');
        },

        // 绑定创建对话框事件
        bindCreateModalEvents() {
            const self = this;

            // 周期类型选择
            document.querySelectorAll('.period-type-card').forEach(card => {
                card.onclick = function() {
                    const periodType = this.dataset.type;
                    self.selectPeriodType(periodType);
                };
            });

            // 返回按钮
            document.getElementById('backToStep1').onclick = function() {
                document.getElementById('createStep1').classList.remove('hidden');
                document.getElementById('createStep2').classList.add('hidden');
            };

            // 关闭按钮
            document.getElementById('closeCreateModalBtn').onclick = function() {
                document.getElementById('createEvaluationModal').classList.add('hidden');
            };

            // 表单提交
            document.getElementById('createEvaluationForm').onsubmit = function(e) {
                e.preventDefault();
                self.handleCreateEvaluationSubmit();
            };

            // 日期选择器变更事件
            document.getElementById('monthlyYear').onchange = function() {
                self.updatePeriodPreview('monthly');
            };
            document.getElementById('monthlyMonth').onchange = function() {
                self.updatePeriodPreview('monthly');
            };
            document.getElementById('quarterlyYear').onchange = function() {
                self.updatePeriodPreview('quarterly');
            };
            document.getElementById('quarterlyQuarter').onchange = function() {
                self.updatePeriodPreview('quarterly');
            };
            document.getElementById('yearlyYear').onchange = function() {
                self.updatePeriodPreview('yearly');
            };
            document.getElementById('customPeriodName').oninput = function() {
                self.updatePeriodPreview('custom');
            };
            document.getElementById('customStartDate').onchange = function() {
                self.updatePeriodPreview('custom');
            };
            document.getElementById('customEndDate').onchange = function() {
                self.updatePeriodPreview('custom');
            };
        },

        // 选择周期类型
        selectPeriodType(periodType) {
            state.selectedPeriodType = periodType;

            // 隐藏步骤1，显示步骤2
            document.getElementById('createStep1').classList.add('hidden');
            document.getElementById('createStep2').classList.remove('hidden');

            // 隐藏所有日期选择器
            document.querySelectorAll('.date-selector').forEach(selector => {
                selector.classList.add('hidden');
            });

            // 显示对应的日期选择器
            switch (periodType) {
                case 'monthly':
                    document.getElementById('monthlySelector').classList.remove('hidden');
                    document.getElementById('step2Title').textContent = '选择月份';
                    break;
                case 'quarterly':
                    document.getElementById('quarterlySelector').classList.remove('hidden');
                    document.getElementById('step2Title').textContent = '选择季度';
                    break;
                case 'yearly':
                    document.getElementById('yearlySelector').classList.remove('hidden');
                    document.getElementById('step2Title').textContent = '选择年份';
                    break;
                case 'custom':
                    document.getElementById('customSelector').classList.remove('hidden');
                    document.getElementById('step2Title').textContent = '自定义日期范围';
                    break;
            }

            // 更新预览
            this.updatePeriodPreview(periodType);
        },

        // 更新周期预览
        updatePeriodPreview(periodType) {
            const preview = document.getElementById('periodPreview');
            const previewName = document.getElementById('previewName');
            const previewStartDate = document.getElementById('previewStartDate');
            const previewEndDate = document.getElementById('previewEndDate');

            let periodName = '';
            let startDate = '';
            let endDate = '';

            switch (periodType) {
                case 'monthly':
                    const year = parseInt(document.getElementById('monthlyYear').value);
                    const month = parseInt(document.getElementById('monthlyMonth').value);
                    periodName = `${year}年${month}月`;

                    // 计算该月的开始和结束日期
                    startDate = `${year}-${String(month).padStart(2, '0')}-01`;
                    const lastDay = new Date(year, month, 0).getDate();
                    endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
                    break;

                case 'quarterly':
                    const qYear = parseInt(document.getElementById('quarterlyYear').value);
                    const quarter = parseInt(document.getElementById('quarterlyQuarter').value);
                    periodName = `${qYear}年Q${quarter}`;

                    // 计算该季度的开始和结束日期
                    const qStartMonth = (quarter - 1) * 3 + 1;
                    const qEndMonth = quarter * 3;
                    startDate = `${qYear}-${String(qStartMonth).padStart(2, '0')}-01`;
                    const qLastDay = new Date(qYear, qEndMonth, 0).getDate();
                    endDate = `${qYear}-${String(qEndMonth).padStart(2, '0')}-${qLastDay}`;
                    break;

                case 'yearly':
                    const yYear = parseInt(document.getElementById('yearlyYear').value);
                    periodName = `${yYear}年`;
                    startDate = `${yYear}-01-01`;
                    endDate = `${yYear}-12-31`;
                    break;

                case 'custom':
                    const customName = document.getElementById('customPeriodName').value;
                    const customStart = document.getElementById('customStartDate').value;
                    const customEnd = document.getElementById('customEndDate').value;

                    if (customName && customStart && customEnd) {
                        periodName = customName;
                        startDate = customStart;
                        endDate = customEnd;
                    } else {
                        preview.classList.add('hidden');
                        return;
                    }
                    break;
            }

            previewName.textContent = periodName;
            previewStartDate.textContent = startDate;
            previewEndDate.textContent = endDate;
            preview.classList.remove('hidden');

            // 保存到状态
            state.createEvaluationData = {
                period_name: periodName,
                period_type: periodType,
                start_date: startDate,
                end_date: endDate
            };
        },

        // 处理创建评价周期提交
        async handleCreateEvaluationSubmit() {
            if (!state.createEvaluationData) {
                alert('请先选择周期类型和日期');
                return;
            }

            await this.createEvaluation(state.createEvaluationData);

            // 关闭对话框
            document.getElementById('createEvaluationModal').classList.add('hidden');
        },

        // 创建评价周期
        async createEvaluation(data) {
            try {
                const response = await this.authenticatedFetch('/api/evaluations', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    alert('创建评价周期成功！');
                    this.loadEvaluationPeriods();
                } else {
                    alert('创建评价周期失败：' + result.message);
                }
            } catch (error) {
                console.error('创建评价周期失败:', error);
                alert('创建评价周期失败');
            }
        },

        // 开始评价
        async startEvaluation(evaluationId) {
            try {
                const response = await this.authenticatedFetch(`/api/evaluations/${evaluationId}/start`, {
                    method: 'POST'
                });

                const result = await response.json();

                if (result.success) {
                    state.currentEvaluation = result.data.evaluation;
                    state.entities = result.data.evaluationEntities;

                    this.showEvaluationInterface();
                } else {
                    alert('开始评价失败：' + result.message);
                }
            } catch (error) {
                console.error('开始评价失败:', error);
                alert('开始评价失败');
            }
        },

        // 显示评价界面
        showEvaluationInterface() {
            els.evaluationTitle.textContent = state.currentEvaluation.period_name;
            els.evaluationPeriod.textContent = `${state.currentEvaluation.start_date} 至 ${state.currentEvaluation.end_date}`;
            els.evaluationEntityCount.textContent = state.entities.length;

            this.renderEntityCards();

            els.evaluationInterface.classList.remove('hidden');
            document.getElementById('evaluationPeriodsList').classList.add('hidden');
        },

        // 渲染评价实体卡片
        renderEntityCards() {
            els.entityCardsList.innerHTML = '';

            state.entities.forEach(entity => {
                const card = document.createElement('div');
                card.className = 'entity-card';
                card.innerHTML = `
                    <div class="entity-card-header">
                        <h4 class="entity-card-title">${entity.name}</h4>
                        <span class="entity-card-status pending">待评价</span>
                    </div>
                    <div class="entity-card-quality">
                        <div class="quality-item">
                            <label>总批次</label>
                            <span>${entity.qualityData.totalBatches}</span>
                        </div>
                        <div class="quality-item">
                            <label>合格批次</label>
                            <span>${entity.qualityData.okBatches}</span>
                        </div>
                        <div class="quality-item">
                            <label>合格率</label>
                            <span class="pass-rate">${entity.qualityData.passRate}%</span>
                        </div>
                    </div>
                `;

                card.addEventListener('click', () => this.openSidebar(entity));
                els.entityCardsList.appendChild(card);
            });
        },

        // 打开侧边栏
        openSidebar(entity) {
            state.currentEntity = entity;

            els.sidebarEntityName.textContent = entity.name;
            els.qualityTotalBatches.textContent = entity.qualityData.totalBatches;
            els.qualityOkBatches.textContent = entity.qualityData.okBatches;
            els.qualityPassRate.textContent = entity.qualityData.passRate + '%';

            this.renderDimensionInputs();

            els.evaluationSidebar.classList.remove('hidden');
        },

        // 渲染维度输入框
        renderDimensionInputs() {
            els.dimensionInputs.innerHTML = '';

            if (!state.config || !state.config.dimensions) {
                return;
            }

            state.config.dimensions.forEach(dimension => {
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';
                formGroup.innerHTML = `
                    <label>${dimension.name} (权重: ${(dimension.weight * 100).toFixed(0)}%)</label>
                    <input type="number" name="${dimension.key}" min="0" max="100" step="0.1" required>
                `;
                els.dimensionInputs.appendChild(formGroup);
            });
        },

        // 关闭侧边栏
        closeSidebar() {
            els.evaluationSidebar.classList.add('hidden');
            state.currentEntity = null;
            els.evaluationForm.reset();
        },

        // 处理评价提交
        async handleEvaluationSubmit(e) {
            e.preventDefault();

            if (!state.currentEvaluation || !state.currentEntity) {
                return;
            }

            const formData = new FormData(els.evaluationForm);
            const scores = {};

            if (state.config && state.config.dimensions) {
                state.config.dimensions.forEach(dimension => {
                    scores[dimension.key] = parseFloat(formData.get(dimension.key)) || 0;
                });
            }

            const remarks = els.evaluationRemarks.value;

            try {
                const response = await this.authenticatedFetch(`/api/evaluations/${state.currentEvaluation.id}/entities/${encodeURIComponent(state.currentEntity.name)}`, {
                    method: 'PUT',
                    body: JSON.stringify({ scores, remarks })
                });

                const result = await response.json();

                if (result.success) {
                    alert('保存成功！');
                    this.closeSidebar();
                    this.loadEvaluationPeriods();
                } else {
                    alert('保存失败：' + result.message);
                }
            } catch (error) {
                console.error('保存评价失败:', error);
                alert('保存评价失败');
            }
        },

        // 退出评价
        exitEvaluation() {
            if (confirm('确定要退出评价吗？未保存的数据将丢失。')) {
                els.evaluationInterface.classList.add('hidden');
                document.getElementById('evaluationPeriodsList').classList.remove('hidden');
                state.currentEvaluation = null;
                state.currentEntity = null;
                state.entities = [];
            }
        },

        // 显示配置对话框
        showConfigDialog() {
            if (window.App.Modules.PerformanceConfig) {
                window.App.Modules.PerformanceConfig.openConfigModal();
            } else {
                alert('绩效评价配置管理模块未加载');
            }
        },

        // 查看结果
        viewResults(evaluationId) {
            if (window.App.Modules.PerformanceDashboard) {
                window.App.Modules.PerformanceDashboard.loadResults(evaluationId);
            } else {
                alert('绩效评价主界面模块未加载');
            }
        }
    };

    // 暴露到全局
    window.App = window.App || {};
    window.App.Modules = window.App.Modules || {};
    window.App.Modules.Performance = PerformanceModule;

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PerformanceModule.init());
    } else {
        PerformanceModule.init();
    }
})();