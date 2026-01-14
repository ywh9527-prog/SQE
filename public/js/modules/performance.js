/**
 * 供应商绩效评价模块
 */
(function() {
    // 模块状态
    const state = {
        currentEvaluation: null,
        currentEntity: null,
        config: null,
        entities: []
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

        // 缓存 DOM 元素
        cacheElements() {
            els.createEvaluationBtn = document.getElementById('createEvaluationBtn');
            els.configBtn = document.getElementById('configBtn');
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
            els.createEvaluationBtn.addEventListener('click', () => this.showCreateEvaluationDialog());
            els.configBtn.addEventListener('click', () => this.showConfigDialog());
            els.exitEvaluationBtn.addEventListener('click', () => this.exitEvaluation());
            els.closeSidebarBtn.addEventListener('click', () => this.closeSidebar());
            els.evaluationForm.addEventListener('submit', (e) => this.handleEvaluationSubmit(e));
        },

        // 加载配置
        async loadConfig() {
            try {
                const response = await fetch('/api/evaluation-config');
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
                const response = await fetch('/api/evaluations');
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
                            ${evaluation.status === 'draft' ? `<button class="btn btn-sm btn-primary" onclick="window.App.Modules.Performance.startEvaluation(${evaluation.id})">开始评价</button>` : ''}
                            ${evaluation.status === 'completed' ? `<button class="btn btn-sm btn-secondary" onclick="window.App.Modules.Performance.viewResults(${evaluation.id})">查看结果</button>` : ''}
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
            // 这里应该显示一个对话框，让用户输入评价周期信息
            // 为了简化，这里使用prompt
            const periodName = prompt('请输入评价周期名称（如：2025年1月）：');
            if (!periodName) return;

            const periodType = prompt('请输入周期类型（monthly/quarterly/yearly/custom）：', 'monthly');
            if (!periodType) return;

            const startDate = prompt('请输入开始日期（YYYY-MM-DD）：');
            if (!startDate) return;

            const endDate = prompt('请输入结束日期（YYYY-MM-DD）：');
            if (!endDate) return;

            this.createEvaluation({
                period_name: periodName,
                period_type: periodType,
                start_date: startDate,
                end_date: endDate
            });
        },

        // 创建评价周期
        async createEvaluation(data) {
            try {
                const response = await fetch('/api/evaluations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
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
                const response = await fetch(`/api/evaluations/${evaluationId}/start`, {
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
                const response = await fetch(`/api/evaluations/${state.currentEvaluation.id}/entities/${encodeURIComponent(state.currentEntity.name)}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
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
            alert('配置功能开发中...');
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