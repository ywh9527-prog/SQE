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
        createEvaluationData: null,
        currentType: 'purchase', // 当前选择的数据类型：purchase-外购/external-外协
        isInitialized: false, // 防止重复初始化
        isEditMode: false // 编辑模式标记：true=编辑已完成的评价，false=正常评价流程
    };

    // DOM 元素缓存
    const els = {};

    const PerformanceModule = {
        // 暴露state供外部访问
        state: state,
        
        // 初始化模块
        async init() {
            // 防止重复初始化
            if (state.isInitialized) {
                console.log('Performance Module: Already initialized, skipping...');
                return;
            }

            console.log('Performance Module: Initializing...');
            this.cacheElements();
            this.bindEvents();
            await this.loadConfig();
            await this.loadYearlyConfig(); // 加载年度评价配置
            await this.loadDashboard();

            // 标记为已初始化
            state.isInitialized = true;
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
            els.entityCardsListWithMaterial = document.getElementById('entityCardsListWithMaterial');
            els.entityCardsListWithoutMaterial = document.getElementById('entityCardsListWithoutMaterial');
            els.withMaterialCount = document.getElementById('withMaterialCount');
            els.withoutMaterialCount = document.getElementById('withoutMaterialCount');
            els.evaluationModal = document.getElementById('evaluationModal');
            els.modalEntityName = document.getElementById('modalEntityName');
            els.closeModalBtn = document.getElementById('closeModalBtn');
            els.cancelEvaluationBtn = document.getElementById('cancelEvaluationBtn');
            els.qualityTotalBatches = document.getElementById('qualityTotalBatches');
            els.qualityOkBatches = document.getElementById('qualityOkBatches');
            els.qualityPassRate = document.getElementById('qualityPassRate');
            els.dimensionInputs = document.getElementById('dimensionInputs');
            els.evaluationForm = document.getElementById('evaluationForm');
            els.evaluationRemarks = document.getElementById('evaluationRemarks');
            els.periodsList = document.getElementById('periodsList');
            
            // 主界面和周期列表
            els.resultsInterface = document.getElementById('resultsInterface');
            els.evaluationPeriodsList = document.getElementById('evaluationPeriodsList');
            els.showPeriodsBtn = document.getElementById('showPeriodsBtn');
            els.backToMainBtn = document.getElementById('backToMainBtn');
            
            // 外购/外协切换卡片
            els.performanceTypeCards = document.querySelectorAll('.performance__type-card');
            els.performancePurchaseCount = document.getElementById('performancePurchaseCount');
            els.performanceExternalCount = document.getElementById('performanceExternalCount');
            
            // 总分预览元素
            els.totalScorePreview = document.getElementById('totalScorePreview');
            els.totalScoreGrade = document.getElementById('totalScoreGrade');
            els.submitEvaluationBtn = document.getElementById('submitEvaluationBtn');
            els.evaluateNextBtn = document.getElementById('evaluateNextBtn');

            // 确认对话框元素
            els.confirmDialog = document.getElementById('confirmDialog');
            els.confirmDialogTitle = document.getElementById('confirmDialogTitle');
            els.confirmDialogMessage = document.getElementById('confirmDialogMessage');
            els.confirmDialogCancel = document.getElementById('confirmDialogCancel');
            els.confirmDialogConfirm = document.getElementById('confirmDialogConfirm');
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

            // 切换到历史评价列表
            if (els.showPeriodsBtn) {
                els.showPeriodsBtn.addEventListener('click', () => this.showPeriodsList());
            }

            // 返回主界面
            if (els.backToMainBtn) {
                els.backToMainBtn.addEventListener('click', () => this.backToMain());
            }

            if (els.closeModalBtn) {
                els.closeModalBtn.addEventListener('click', () => this.closeEvaluationModal());
            }

            if (els.cancelEvaluationBtn) {
                els.cancelEvaluationBtn.addEventListener('click', () => this.closeEvaluationModal());
            }

            // 外购/外协切换事件
            if (els.performanceTypeCards.length > 0) {
                els.performanceTypeCards.forEach(card => {
                    card.addEventListener('click', () => {
                        const type = card.dataset.type;
                        this.switchType(type);
                    });
                });
            }

            if (els.submitEvaluationBtn) {
                // 移除旧的事件监听器（通过克隆节点）
                const newBtn = els.submitEvaluationBtn.cloneNode(true);
                els.submitEvaluationBtn.parentNode.replaceChild(newBtn, els.submitEvaluationBtn);
                els.submitEvaluationBtn = newBtn;
                
                // 绑定新的事件监听器
                els.submitEvaluationBtn.addEventListener('click', () => this.handleEvaluationSubmit());
            }

            // 评价下一个按钮事件
            if (els.evaluateNextBtn) {
                const newNextBtn = els.evaluateNextBtn.cloneNode(true);
                els.evaluateNextBtn.parentNode.replaceChild(newNextBtn, els.evaluateNextBtn);
                els.evaluateNextBtn = newNextBtn;
                els.evaluateNextBtn.addEventListener('click', () => this.handleEvaluateNext());
            }
        },

        // 加载配置
        async loadConfig() {
            console.log('Performance Module: Loading config...');
            try {
                const response = await this.authenticatedFetch('/api/evaluation-config');
                const result = await response.json();

                if (result.success) {
                    state.config = result.data;
                    console.log('配置加载成功:', state.config);
                    console.log('维度数量:', state.config.dimensions.length);
                    console.log('维度列表:', state.config.dimensions);
                } else {
                    console.error('加载配置失败:', result.message);
                }
            } catch (error) {
                console.error('加载配置失败:', error);
            }
        },

        // 加载年度评价配置
        async loadYearlyConfig() {
            console.log('Performance Module: Loading yearly config...');
            try {
                const response = await this.authenticatedFetch('/api/evaluation-config/yearly');
                const result = await response.json();

                if (result.success) {
                    state.yearlyConfig = result.data;
                    console.log('年度配置加载成功:', state.yearlyConfig);
                } else {
                    console.error('加载年度配置失败:', result.message);
                }
            } catch (error) {
                console.error('加载年度配置失败:', error);
            }
        },

        // 加载主界面
        async loadDashboard() {
            try {
                // 确保显示主界面，隐藏历史评价周期列表
                this.showDashboard();

                // 从localStorage读取保存的年份，如果没有则使用当前年份
                const savedYear = localStorage.getItem('performance_year');
                const currentYear = savedYear ? parseInt(savedYear) : new Date().getFullYear();

                // 加载累计数据（外购）
                if (window.App.Modules.PerformanceDashboard) {
                    window.App.Modules.PerformanceDashboard.loadAccumulatedResults(currentYear, 'purchase');
                }
            } catch (error) {
                console.error('加载主界面失败:', error);
                // 显示空状态
                if (window.App.Modules.PerformanceDashboard) {
                    window.App.Modules.PerformanceDashboard.showEmptyState();
                }
            }
        },

        // 显示主界面
        showDashboard() {
            if (els.resultsInterface) {
                els.resultsInterface.classList.remove('hidden');
            }
            if (els.evaluationPeriodsList) {
                els.evaluationPeriodsList.classList.add('hidden');
            }
        },

        // 显示历史周期列表
        showPeriodsList() {
            if (els.resultsInterface) {
                els.resultsInterface.classList.add('hidden');
            }
            if (els.evaluationPeriodsList) {
                els.evaluationPeriodsList.classList.remove('hidden');
            }
            this.loadEvaluationPeriods();
        },

        // 返回主界面
        // 说明：从评价周期列表返回累计绩效主界面
        // 会重新加载累计绩效数据，确保编辑后的数据能显示
        backToMain() {
            if (els.evaluationPeriodsList) {
                els.evaluationPeriodsList.classList.add('hidden');
            }
            if (els.resultsInterface) {
                els.resultsInterface.classList.remove('hidden');
            }

            // 重新加载累计绩效数据
            this.loadDashboard();
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
                item.className = 'performance__period-item';
                // ==========================================
                // 测试数据生成按钮 - 开始
                // 代码隔离：此功能仅用于测试，后续可一键删除
                // ==========================================
                // ==========================================
                // 测试数据生成按钮 - 已启用
                // 仅在草稿或进行中状态显示
                // ==========================================
                const showGenerateTestDataBtn = (evaluation.status === 'draft' || evaluation.status === 'in_progress') && evaluation.id;
                // ==========================================
                // 测试数据生成按钮 - 结束
                // ==========================================
                // 按钮说明：
                // - draft 状态：显示"开始评价"按钮
                // - in_progress 状态：显示"继续评价"按钮
                // - completed 状态：显示"编辑评价"和"查看结果"按钮
                // ==========================================
                item.innerHTML = `
                    <div class="performance__period-item-info">
                        <h4>${evaluation.period_name}</h4>
                        <p>${evaluation.start_date} 至 ${evaluation.end_date}</p>
                    </div>
                    <div class="performance__period-item-status">
                        <span class="status-badge ${evaluation.status}">${this.getStatusText(evaluation.status)}</span>
                        <div class="performance__period-item-actions">
                            ${evaluation.status === 'draft' && evaluation.id ? `<button class="btn btn-sm btn-primary" onclick="window.App.Modules.Performance.startEvaluation(${evaluation.id})">开始评价</button>` : ''}
                            ${evaluation.status === 'in_progress' && evaluation.id ? `<button class="btn btn-sm btn-primary" onclick="window.App.Modules.Performance.startEvaluation(${evaluation.id})">继续评价</button>` : ''}
                            ${evaluation.status === 'completed' && evaluation.id ? `<button class="btn btn-sm btn-warning" onclick="window.App.Modules.Performance.editEvaluation(${evaluation.id})">编辑评价</button>` : ''}
                            ${evaluation.status === 'completed' && evaluation.id ? `<button class="btn btn-sm btn-secondary" onclick="window.App.Modules.Performance.viewResults(${evaluation.id})">查看结果</button>` : ''}
                            ${showGenerateTestDataBtn ? `<button class="btn btn-sm btn-info" onclick="window.App.Modules.Performance.generateTestData(${evaluation.id})" title="生成测试数据（自动评价所有有来料的供应商）">🧪 测试数据</button>` : ''}
                            ${evaluation.id ? `<button class="btn btn-sm btn-danger" onclick="window.App.Modules.Performance.deleteEvaluation(${evaluation.id})">删除</button>` : ''}
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

        // 删除评价周期
        async deleteEvaluation(evaluationId) {
            // 使用自定义确认对话框
            this.showConfirmDialog(
                '确认删除评价周期',
                '确定要删除这个评价周期吗？删除后无法恢复。',
                async () => {
                    try {
                        const response = await this.authenticatedFetch(`/api/evaluations/${evaluationId}`, {
                            method: 'DELETE'
                        });

                        const result = await response.json();

                        if (result.success) {
                            // 使用 Toast 通知
                            if (window.App && window.App.Toast) {
                                window.App.Toast.success('删除成功');
                            }
                            this.loadEvaluationPeriods();
                        } else {
                            // 使用 Toast 通知
                            if (window.App && window.App.Toast) {
                                window.App.Toast.error('删除失败：' + result.message);
                            }
                        }
                    } catch (error) {
                        console.error('删除评价周期失败:', error);
                        // 使用 Toast 通知
                        if (window.App && window.App.Toast) {
                            window.App.Toast.error('删除评价周期失败');
                        }
                    }
                }
            );
        },

        // ==========================================
        // 测试数据生成功能 - 开始
        // 代码隔离：此功能仅用于测试，后续可一键删除
        // ==========================================

        // 生成测试数据（模拟真实手动评价）
        async generateTestData(evaluationId) {
            // 使用自定义确认对话框
            this.showConfirmDialog(
                '生成测试数据',
                '此操作将为该周期内所有有来料的供应商自动生成评价数据（随机分数60-100分），并提交评价。是否继续？',
                async () => {
                    try {
                        const response = await this.authenticatedFetch(`/api/evaluations/${evaluationId}/generate-test-data`, {
                            method: 'POST'
                        });

                        const result = await response.json();

                        if (result.success) {
                            // 使用 Toast 通知
                            if (window.App && window.App.Toast) {
                                window.App.Toast.success(result.message);
                            }
                            // 刷新周期列表
                            this.loadEvaluationPeriods();
                        } else {
                            // 使用 Toast 通知
                            if (window.App && window.App.Toast) {
                                window.App.Toast.error('生成失败：' + result.message);
                            }
                        }
                    } catch (error) {
                        console.error('生成测试数据失败:', error);
                        // 使用 Toast 通知
                        if (window.App && window.App.Toast) {
                            window.App.Toast.error('生成测试数据失败');
                        }
                    }
                }
            );
        },

        // ==========================================
        // 测试数据生成功能 - 结束
        // ==========================================

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
            document.querySelectorAll('.performance__period-type-card').forEach(card => {
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
                // 使用 Toast 通知
                if (window.App && window.App.Toast) {
                    window.App.Toast.warning('请先选择周期类型和日期');
                }
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
                    // 使用 Toast 通知
                    if (window.App && window.App.Toast) {
                        window.App.Toast.success('创建评价周期成功！');
                    }
                    // 刷新周期列表并跳转到历史评价界面
                    this.loadEvaluationPeriods();
                    this.showPeriodsList();
                } else {
                    // 使用 Toast 通知
                    if (window.App && window.App.Toast) {
                        window.App.Toast.error('创建评价周期失败：' + result.message);
                    }
                }
            } catch (error) {
                console.error('创建评价周期失败:', error);
                // 使用 Toast 通知
                if (window.App && window.App.Toast) {
                    window.App.Toast.error('创建评价周期失败');
                }
            }
        },

        /**
         * 编辑已完成的评价
         * 说明：用于重新编辑已完成的评价周期，状态保持 completed 不变
         * 与 startEvaluation 的区别：
         *   - startEvaluation: 仅用于 draft/in_progress 状态，会调用 /start 接口
         *   - editEvaluation: 用于 completed 状态，直接获取实体数据，设置编辑模式
         */
        async editEvaluation(evaluationId) {
            try {
                console.log('编辑评价, ID:', evaluationId);

                // 获取评价周期基本信息
                const periodsResponse = await this.authenticatedFetch('/api/evaluations');
                const periodsResult = await periodsResponse.json();

                if (!periodsResult.success) {
                    throw new Error('获取评价周期失败');
                }

                const evaluation = periodsResult.data.find(e => e.id === evaluationId);
                if (!evaluation) {
                    throw new Error('评价周期不存在');
                }

                // 获取评价实体数据（已评价的数据）
                const entitiesResponse = await this.authenticatedFetch(`/api/evaluations/${evaluationId}/entities`);
                const entitiesResult = await entitiesResponse.json();

                if (!entitiesResult.success) {
                    throw new Error('获取评价实体失败');
                }

                // 设置编辑模式标记
                state.isEditMode = true;
                state.currentEvaluation = evaluation;
                state.entities = entitiesResult.data;

                console.log('编辑模式: 已加载评价实体数据', state.entities.length, '个');

                // 显示评价界面（复用现有界面）
                this.showEvaluationInterface();
            } catch (error) {
                console.error('编辑评价失败:', error);
                if (window.App && window.App.Toast) {
                    window.App.Toast.error('编辑评价失败：' + error.message);
                }
            }
        },

        // 开始评价
        async startEvaluation(evaluationId) {
            try {
                console.log('开始评价, ID:', evaluationId);
                const response = await this.authenticatedFetch(`/api/evaluations/${evaluationId}/start`, {
                    method: 'POST'
                });

                const result = await response.json();

                if (result.success) {
                    state.currentEvaluation = result.data.evaluation;
                    state.entities = result.data.evaluationEntities;
                    // 不要重置 currentType，保持用户当前选择的供应商类型（外购/外协）
                    // state.currentType = 'purchase'; // 已移除，避免保存后类型被重置

                    console.log('评价实体数据:', state.entities);
                    console.log('实体数量:', state.entities.length);
                    console.log('当前供应商类型:', state.currentType);

                    this.showEvaluationInterface();
                } else {
                    // 使用 Toast 通知
                    if (window.App && window.App.Toast) {
                        window.App.Toast.error('开始评价失败：' + result.message);
                    }
                }
            } catch (error) {
                console.error('开始评价失败:', error);
                // 使用 Toast 通知
                if (window.App && window.App.Toast) {
                    window.App.Toast.error('开始评价失败');
                }
            }
        },

        // 显示评价界面
        showEvaluationInterface() {
            console.log('显示评价界面');
            console.log('当前评价:', state.currentEvaluation);
            console.log('评价实体:', state.entities);

            els.evaluationTitle.textContent = state.currentEvaluation.period_name;
            els.evaluationPeriod.textContent = `${state.currentEvaluation.start_date} 至 ${state.currentEvaluation.end_date}`;

            // 过滤实体
            const filteredEntities = this.filterEntitiesByType(state.entities);

            // 按是否有来料分组统计
            let withMaterialCount = 0;
            let withoutMaterialCount = 0;

            filteredEntities.forEach(entity => {
                const qualityData = entity.qualityData || { totalBatches: 0 };
                if (qualityData.totalBatches > 0) {
                    withMaterialCount++;
                } else {
                    withoutMaterialCount++;
                }
            });

            // 更新描述文字
            els.evaluationEntityCount.textContent = `需评价供应商 ${withMaterialCount} 家，因无来料不参与评价供应商 ${withoutMaterialCount} 家`;

            this.renderEntityCards();
            this.loadTypeStatistics();

            els.evaluationInterface.classList.remove('hidden');
            document.getElementById('evaluationPeriodsList').classList.add('hidden');
        },

        // 按类型过滤实体
        filterEntitiesByType(entities) {
            if (!state.currentType || state.currentType === '') {
                return entities;
            }
            
            const filtered = entities.filter(entity => {
                // 兼容不同的字段名
                const entityType = entity.data_type || entity.dataType;
                const result = entityType === state.currentType;
                return result;
            });
            
            return filtered;
        },

        // 切换数据类型
        switchType(type) {
            state.currentType = type;

            // 更新卡片样式
            if (els.performanceTypeCards.length > 0) {
                els.performanceTypeCards.forEach(card => {
                    const statusElement = card.querySelector('.performance__type-status');
                    if (card.dataset.type === type) {
                        card.classList.add('performance__type-card--active');
                        if (statusElement) statusElement.textContent = '当前选中';
                    } else {
                        card.classList.remove('performance__type-card--active');
                        if (statusElement) statusElement.textContent = '未选中';
                    }
                });
            }

            // 重新渲染卡片
            this.renderEntityCards();

            // 更新数量统计
            const filteredEntities = this.filterEntitiesByType(state.entities);

            let withMaterialCount = 0;
            let withoutMaterialCount = 0;

            filteredEntities.forEach(entity => {
                const qualityData = entity.qualityData || { totalBatches: 0 };
                if (qualityData.totalBatches > 0) {
                    withMaterialCount++;
                } else {
                    withoutMaterialCount++;
                }
            });

            els.evaluationEntityCount.textContent = `需评价供应商 ${withMaterialCount} 家，因无来料不参与评价供应商 ${withoutMaterialCount} 家`;
        },

        // 加载类型统计数据
        async loadTypeStatistics() {
            try {
                const response = await this.authenticatedFetch('/api/vendors/config/type-statistics');
                const result = await response.json();

                if (result.success && result.data) {
                    if (els.performancePurchaseCount) {
                        els.performancePurchaseCount.textContent = result.data.purchase || 0;
                    }
                    if (els.performanceExternalCount) {
                        els.performanceExternalCount.textContent = result.data.external || 0;
                    }
                }
            } catch (error) {
                console.error('加载类型统计数据失败:', error);
            }
        },

// 渲染实体卡片
        renderEntityCards() {
            console.log('渲染实体卡片...');
            console.log('当前配置:', state.config);
            console.log('配置维度:', state.config?.dimensions);

            if (!els.entityCardsListWithMaterial || !els.entityCardsListWithoutMaterial) return;

            // 清空两个容器
            els.entityCardsListWithMaterial.innerHTML = '';
            els.entityCardsListWithoutMaterial.innerHTML = '';

            // 按类型过滤
            const filteredEntities = this.filterEntitiesByType(state.entities);

            // 按是否有来料分组
            const entitiesWithMaterial = [];
            const entitiesWithoutMaterial = [];

            filteredEntities.forEach(entity => {
                const qualityData = entity.qualityData || { totalBatches: 0 };
                if (qualityData.totalBatches > 0) {
                    entitiesWithMaterial.push(entity);
                } else {
                    entitiesWithoutMaterial.push(entity);
                }
            });

            // 每组按拼音首字母排序（A-Z）
            const sortByName = (a, b) => {
                const nameA = (a.name || a.entityName || '').toLowerCase();
                const nameB = (b.name || b.entityName || '').toLowerCase();
                return nameA.localeCompare(nameB, 'zh-CN');
            };

            entitiesWithMaterial.sort(sortByName);
            entitiesWithoutMaterial.sort(sortByName);

            console.log('有来料的供应商数量:', entitiesWithMaterial.length);
            console.log('无来料的供应商数量:', entitiesWithoutMaterial.length);

            // 更新数量统计
            if (els.withMaterialCount) {
                els.withMaterialCount.textContent = `${entitiesWithMaterial.length} 家`;
            }
            if (els.withoutMaterialCount) {
                els.withoutMaterialCount.textContent = `${entitiesWithoutMaterial.length} 家`;
            }

            // 渲染有来料的供应商卡片
            entitiesWithMaterial.forEach(entity => {
                const card = this.createEntityCard(entity);
                card.addEventListener('click', () => this.openEvaluationModal(entity));
                els.entityCardsListWithMaterial.appendChild(card);
            });

            // 渲染无来料的供应商卡片
            entitiesWithoutMaterial.forEach(entity => {
                const card = this.createEntityCard(entity);
                card.addEventListener('click', () => {
                    // 显示友好的提示信息
                    if (window.App && window.App.Toast) {
                        window.App.Toast.info('本评价周期无来料，无需评价');
                    }
                });
                els.entityCardsListWithoutMaterial.appendChild(card);
            });
        },

        // 创建单个供应商卡片
        createEntityCard(entity) {
            const card = document.createElement('div');
            card.className = 'performance__entity-card';

            // 判断是否已评价
            const isEvaluated = entity.totalScore !== null && entity.totalScore !== undefined;

            // 判断是否有来料
            const qualityData = entity.qualityData || { totalBatches: 0, okBatches: 0, passRate: 0 };
            const hasMaterial = qualityData.totalBatches > 0;

            if (!hasMaterial) {
                card.classList.add('performance__entity-card--no-material');
            }

            if (isEvaluated) {
                // 已评价：显示总分、等级和维度
                const gradeText = this.getGradeText(entity.grade);
                const gradeClass = this.getGradeClass(entity.grade);

                // 动态生成维度HTML，支持自定义维度
                let dimensionsHtml = '';

                // 自定义维度的5种预设颜色
                const customDimensionColors = [
                    'progress-custom-1', // 粉红渐变
                    'progress-custom-2', // 青色渐变
                    'progress-custom-3', // 玫红渐变
                    'progress-custom-4', // 靛蓝渐变
                    'progress-custom-5'  // 橙红渐变
                ];

                let customIndex = 0;

                // 根据评价周期类型选择正确的配置
                const isYearlyEvaluation = state.currentEvaluation && state.currentEvaluation.period_type === 'yearly';
                const cardConfig = isYearlyEvaluation && state.yearlyConfig ? state.yearlyConfig : state.config;

                // 遍历配置中的所有维度
                if (cardConfig && cardConfig.dimensions) {
                    cardConfig.dimensions.forEach((dimension, index) => {
                        const score = entity.scores[dimension.key] || 0;

                        // 根据维度类型选择进度条样式
                        let progressClass = '';
                        if (dimension.key === 'quality') {
                            progressClass = 'performance__progress-quality';
                        } else if (dimension.key === 'delivery') {
                            progressClass = 'performance__progress-delivery';
                        } else if (dimension.key === 'service') {
                            progressClass = 'performance__progress-service';
                        } else {
                            // 自定义维度使用预设的5种颜色策略
                            progressClass = 'performance__' + customDimensionColors[customIndex % customDimensionColors.length];
                            customIndex++;
                        }

                        dimensionsHtml += `
                            <div class="performance__dimension-item">
                                <div class="performance__dimension-header">
                                    <span class="performance__dimension-name">${dimension.name}</span>
                                    <span class="performance__dimension-score">${score}</span>
                                </div>
                                <div class="performance__progress-bar">
                                    <div class="performance__progress-fill ${progressClass}" style="width: ${score}%" data-score="${score}"></div>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    console.warn('配置或维度不存在');
                }

                card.innerHTML = `
                    <div class="performance__entity-card-header">
                        <span class="performance__rank-badge performance__rank-other">#</span>
                        <h4 class="performance__entity-card-title">${entity.name || entity.entityName}</h4>
                        ${!hasMaterial ? '<span class="performance__entity-card-badge performance__no-material">本评价周期无来料</span>' : ''}
                    </div>
                    <div class="performance__entity-card-score">
                        <div class="performance__total-score">${entity.totalScore}</div>
                        <span class="performance__grade-badge ${gradeClass}">${gradeText}</span>
                    </div>
                    <div class="performance__entity-card-quality">
                        <div class="performance__quality-item">
                            <label>总批次</label>
                            <span>${qualityData.totalBatches}</span>
                        </div>
                        <div class="performance__quality-item">
                            <label>合格批次</label>
                            <span>${qualityData.okBatches}</span>
                        </div>
                        <div class="performance__quality-item">
                            <label>合格率</label>
                            <span class="performance__pass-rate">${qualityData.passRate}%</span>
                        </div>
                    </div>
                    <div class="performance__entity-card-dimensions">
                        ${dimensionsHtml}
                    </div>
                    <div class="performance__entity-card-footer">
                        <span>趋势: <span class="performance__trend-flat">-</span></span>
                        <span>${new Date().toISOString().split('T')[0]}</span>
                    </div>
                `;
                card.classList.add('evaluated');
            } else {
                // 未评价：只显示质量数据，不显示总分和维度
                card.innerHTML = `
                    <div class="performance__entity-card-header">
                        <h4 class="performance__entity-card-title">${entity.name || entity.entityName}</h4>
                        ${!hasMaterial ? '<span class="performance__entity-card-badge performance__no-material">本评价周期无来料</span>' : '<span class="performance__entity-card-status performance__pending">待评价</span>'}
                    </div>
                    <div class="performance__entity-card-quality">
                        <div class="performance__quality-item">
                            <label>总批次</label>
                            <span>${qualityData.totalBatches}</span>
                        </div>
                        <div class="performance__quality-item">
                            <label>合格批次</label>
                            <span>${qualityData.okBatches}</span>
                        </div>
                        <div class="performance__quality-item">
                            <label>合格率</label>
                            <span class="performance__pass-rate">${qualityData.passRate}%</span>
                        </div>
                    </div>
                    <div class="performance__entity-card-footer">
                        <span>${hasMaterial ? '点击卡片开始评价' : '无需评价'}</span>
                    </div>
                `;
            }

            return card;
        },

        // 获取等级文本
        getGradeText(grade) {
            const gradeMap = {
                '优秀': '优秀',
                '合格': '合格',
                '整改后合格': '整改后合格',
                '不合格': '不合格'
            };
            return gradeMap[grade] || grade;
        },

        // 获取等级样式类
        getGradeClass(grade) {
            const classMap = {
                '优秀': 'performance__grade-excellent',
                '合格': 'performance__grade-good',
                '整改后合格': 'performance__grade-improve',
                '不合格': 'performance__grade-poor'
            };
            return classMap[grade] || 'performance__grade-good';
        },

        // 打开侧边栏
        // 打开评价模态框
        async openEvaluationModal(entity) {
            state.currentEntity = entity;

            els.modalEntityName.textContent = entity.entityName;
            
            // 检查是否是年度评价
            const isYearlyEvaluation = state.currentEvaluation && state.currentEvaluation.period_type === 'yearly';
            
            if (isYearlyEvaluation) {
                // 年度评价：使用 IQC 原始数据（全年累计），同时保留月度平均分用于维度评分
                const yearlyData = entity.yearlyQualityData;
                
                // 年度质量数据来自 IQC 原始累计（与月度/季度一致）
                if (entity.qualityData && entity.qualityData.totalBatches > 0) {
                    els.qualityTotalBatches.textContent = entity.qualityData.totalBatches;
                    els.qualityOkBatches.textContent = entity.qualityData.okBatches;
                    els.qualityPassRate.textContent = entity.qualityData.passRate + '%';
                    
                    // 如果有月度平均分，也保存起来用于维度自动评分
                    if (yearlyData && yearlyData.averageScores) {
                        entity.yearlyAverageScores = yearlyData.averageScores;
                        entity.yearlyValidMonthCount = yearlyData.validMonthCount;
                    }
                } else {
                    entity.yearlyAverageScores = {};
                    entity.yearlyValidMonthCount = 0;
                    els.qualityTotalBatches.textContent = '无数据';
                    els.qualityOkBatches.textContent = '-';
                    els.qualityPassRate.textContent = '-';
                }
            } else {
                // 月度/季度评价：显示质量数据
                els.qualityTotalBatches.textContent = entity.qualityData.totalBatches;
                els.qualityOkBatches.textContent = entity.qualityData.okBatches;
                els.qualityPassRate.textContent = entity.qualityData.passRate + '%';
            }

            this.renderDimensionInputs();

            els.evaluationModal.classList.remove('hidden');
            
            // 滚动到模态框内容顶部
            const modalContent = els.evaluationModal.querySelector('.performance__evaluation-modal-content');
            if (modalContent) {
                modalContent.scrollTop = 0;
            }
        },

        // 加载年度评价数据
        async loadYearlyEvaluationData(entity) {
            try {
                const year = new Date(state.currentEvaluation.start_date).getFullYear();
                const dataSource = state.currentEvaluation.data_source || 'purchase';
                
                const response = await this.authenticatedFetch(
                    `/api/evaluations/yearly-average/${encodeURIComponent(entity.entityName)}?year=${year}&dataSource=${dataSource}`
                );
                const result = await response.json();
                
                if (result.success && result.data) {
                    // 保存年度平均分到entity
                    entity.yearlyAverageScores = result.data.averageScores;
                    entity.yearlyValidMonthCount = result.data.validMonthCount;
                    state.currentEntity = entity;
                    
                    // 更新质量数据显示年度汇总信息
                    els.qualityTotalBatches.textContent = `${result.data.validMonthCount}个月`;
                    els.qualityOkBatches.textContent = '已汇总';
                    els.qualityPassRate.textContent = '自动计算';
                } else {
                    // 无年度数据
                    entity.yearlyAverageScores = {};
                    entity.yearlyValidMonthCount = 0;
                    els.qualityTotalBatches.textContent = '无数据';
                    els.qualityOkBatches.textContent = '-';
                    els.qualityPassRate.textContent = '-';
                }
            } catch (error) {
                console.error('加载年度评价数据失败:', error);
                els.qualityTotalBatches.textContent = '加载失败';
                els.qualityOkBatches.textContent = '-';
                els.qualityPassRate.textContent = '-';
            }
        },

        // 渲染维度输入框
        renderDimensionInputs() {
            els.dimensionInputs.innerHTML = '';

            // 检查是否是年度评价
            const isYearlyEvaluation = state.currentEvaluation && state.currentEvaluation.period_type === 'yearly';
            
            // 确定使用哪个配置
            let config = state.config;
            
            if (isYearlyEvaluation) {
                // 如果已经有年度配置，直接使用
                if (state.yearlyConfig) {
                    this.renderDimensionCards(state.yearlyConfig.dimensions, true);
                    return;
                }
                
                // 尝试加载年度配置
                this.loadYearlyConfigForEvaluation().then(yearlyConfig => {
                    if (yearlyConfig) {
                        state.yearlyConfig = yearlyConfig;
                        this.renderDimensionInputs();
                    }
                });
                return; // 异步加载配置后再渲染
            }

            if (!config || !config.dimensions) {
                return;
            }

            this.renderDimensionCards(config.dimensions, false);
        },

        // 加载年度配置用于评价
        async loadYearlyConfigForEvaluation() {
            try {
                const response = await this.authenticatedFetch('/api/evaluation-config/yearly');
                const result = await response.json();
                
                if (result.success) {
                    return result.data;
                }
                return null;
            } catch (error) {
                console.error('加载年度配置失败:', error);
                return null;
            }
        },

        // 渲染维度卡片
        renderDimensionCards(dimensions, isYearly = false) {
            // 创建维度卡片网格（垂直排列）
            const dimensionsGrid = document.createElement('div');
            dimensionsGrid.className = 'performance__dimensions-grid';

            dimensions.forEach(dimension => {
                // 创建维度卡片
                const dimensionCard = document.createElement('div');
                dimensionCard.className = 'performance__dimension-card';
                
                // 判断维度类型
                const isQualityDimension = dimension.key === 'quality';
                const isManualDimension = dimension.type === 'manual' || (isYearly && ['continuous_improvement', 'price_level'].includes(dimension.key));
                const isGreenEnv = dimension.key === 'green_environment' || dimension.key === 'green' || dimension.key === 'environmental';
                
                // 计算输入值
                let inputValue = '';
                let autoCalcInfo = '';
                let isReadOnly = false;

                if (isYearly) {
                    // 年度评价：根据维度类型决定
                    if (isGreenEnv) {
                        // 绿色环保：勾选框
                        inputValue = state.currentEntity.scores?.[dimension.key] !== false ? 'true' : 'false';
                    } else if (isManualDimension || dimension.type === 'manual') {
                        // 手动维度：可编辑
                        inputValue = state.currentEntity.scores?.[dimension.key] || 50;
                    } else if (isQualityDimension && state.currentEntity && state.currentEntity.qualityData) {
                        // 自动维度-来料质量：使用 IQC 原始数据计算的合格率
                        const qualityData = state.currentEntity.qualityData;
                        const passRate = parseFloat(qualityData.passRate) || 0;
                        const totalBatches = qualityData.totalBatches || 0;
                        const okBatches = qualityData.okBatches || 0;
                        
                        inputValue = passRate.toFixed(1);
                        isReadOnly = true;
                        autoCalcInfo = `
                            <div class="performance__auto-calc-info">
                                自动评分：年度合格率 ${okBatches}/${totalBatches} = ${passRate}%
                            </div>
                        `;
                    } else {
                        // 其他自动维度：从年度平均分获取，只读
                        inputValue = state.currentEntity.yearlyAverageScores?.[dimension.key] || 0;
                        isReadOnly = true;
                        autoCalcInfo = `
                            <div class="performance__auto-calc-info">
                                自动评分：年度平均分（${state.currentEntity.yearlyValidMonthCount || 0}个月数据）
                            </div>
                        `;
                    }
                } else if (isQualityDimension && state.currentEntity && state.currentEntity.qualityData) {
                    const qualityData = state.currentEntity.qualityData;
                    const passRate = parseFloat(qualityData.passRate) || 0;
                    const totalBatches = qualityData.totalBatches || 0;
                    const okBatches = qualityData.okBatches || 0;

                    inputValue = passRate.toFixed(1);
                    autoCalcInfo = `
                        <div class="performance__auto-calc-info">
                            自动评分：当月合格批次 ${okBatches}/${totalBatches} = ${passRate}%
                        </div>
                    `;
                } else if (state.currentEntity && state.currentEntity.scores && state.currentEntity.scores[dimension.key] !== undefined) {
                    inputValue = state.currentEntity.scores[dimension.key];
                }

                // 获取计算规则和评分标准提示
                const calculationRuleTip = dimension.calculationRule ? `
                    <div class="performance__dimension-tip">
                        <span class="performance__dimension-tip-label">计算规则：</span>
                        <span class="performance__dimension-tip-content">${dimension.calculationRule}</span>
                    </div>
                ` : '';
                const scoringStandardTip = dimension.scoringStandard ? `
                    <div class="performance__dimension-tip">
                        <span class="performance__dimension-tip-label">评分标准：</span>
                        <span class="performance__dimension-tip-content">${dimension.scoringStandard}</span>
                    </div>
                ` : '';

                // 根据维度类型渲染不同的输入控件
                let inputHTML = '';
                
                if (isYearly && isGreenEnv) {
                    // 绿色环保：单选按钮（合格/不合格）
                    inputHTML = `
                        <div class="performance__green-env-radio">
                            <label class="performance__radio-label">
                                <input type="radio" 
                                       name="${dimension.key}" 
                                       value="true" 
                                       ${inputValue === 'true' || inputValue === true || inputValue === undefined ? 'checked' : ''}
                                       onchange="window.App.Modules.Performance.handleGreenEnvChange(this)">
                                <span>合格</span>
                            </label>
                            <label class="performance__radio-label">
                                <input type="radio" 
                                       name="${dimension.key}" 
                                       value="false" 
                                       ${inputValue === 'false' || inputValue === false ? 'checked' : ''}
                                       onchange="window.App.Modules.Performance.handleGreenEnvChange(this)">
                                <span>不合格</span>
                            </label>
                        </div>
                    `;
                } else {
                    // 滑块输入
                    inputHTML = `
                        <div class="performance__dimension-slider-row">
                            <div class="performance__dimension-slider-track" data-key="${dimension.key}" data-dimension-name="${dimension.name}" ${isQualityDimension ? 'data-quality="true"' : ''}>
                                <div class="performance__dimension-slider-fill" style="width: ${inputValue}%"></div>
                                <div class="performance__dimension-slider-thumb" style="left: ${inputValue}%"></div>
                                <input type="range" class="performance__dimension-slider-input" 
                                       name="${dimension.key}_slider" 
                                       min="0" max="100" step="0.1" 
                                       value="${inputValue}" 
                                       data-dimension-key="${dimension.key}"
                                       ${isReadOnly || isQualityDimension ? 'data-readonly="true"' : ''}
                                       ${isQualityDimension ? 'data-quality="true"' : ''}>
                            </div>
                            <div class="performance__dimension-number-box-wrapper">
                                <input type="number" class="performance__dimension-number-box" 
                                       name="${dimension.key}" 
                                       min="0" max="100" step="0.1" 
                                       value="${inputValue}"
                                       data-dimension-key="${dimension.key}"
                                       ${isReadOnly || isQualityDimension ? 'readonly' : ''}>
                                <div class="performance__dimension-spinner">
                                    <span data-action="up">▲</span>
                                    <span data-action="down">▼</span>
                                </div>
                            </div>
                        </div>
                    `;
                }

                dimensionCard.innerHTML = `
                    <div class="performance__dimension-card-header">
                        <div class="performance__dimension-card-title">${dimension.name}</div>
                        ${!isGreenEnv ? `<div class="performance__dimension-card-weight">权重 ${((dimension.weight || 0) * 100).toFixed(0)}%</div>` : ''}
                    </div>
                    ${inputHTML}
                    ${autoCalcInfo}
                    ${calculationRuleTip}
                    ${scoringStandardTip}
                `;

                dimensionsGrid.appendChild(dimensionCard);
            });

            els.dimensionInputs.appendChild(dimensionsGrid);

            // 添加滑块交互事件
            this.setupSliderInteractions();

            // 渲染完成后更新总分预览
            this.updateTotalScorePreview();
        },

        // 设置滑块交互
        setupSliderInteractions() {
            const sliderTracks = els.dimensionInputs.querySelectorAll('.performance__dimension-slider-track');
            const numberInputs = els.dimensionInputs.querySelectorAll('.performance__dimension-number-box');

            sliderTracks.forEach(track => {
                const key = track.getAttribute('data-key');
                const isQuality = track.getAttribute('data-quality') === 'true';
                const sliderInput = track.querySelector('.performance__dimension-slider-input');
                const fill = track.querySelector('.performance__dimension-slider-fill');
                const thumb = track.querySelector('.performance__dimension-slider-thumb');
                const numberInput = els.dimensionInputs.querySelector(`.performance__dimension-number-box[name="${key}"]`);

                // 保存质量维度的原始值
                const originalValue = parseFloat(sliderInput.value);

                // 质量维度：鼠标悬停显示提示，移走后消失
                if (isQuality) {
                    let tooltipTimeout;
                    const dimensionName = track.getAttribute('data-dimension-name');
                    
                    const showTooltip = () => {
                        clearTimeout(tooltipTimeout);
                        this.showQualityTooltipAtTitle(track, dimensionName);
                    };
                    
                    const hideTooltip = () => {
                        tooltipTimeout = setTimeout(() => {
                            const existing = document.querySelector('.performance__quality-tooltip');
                            if (existing) existing.remove();
                        }, 200);
                    };
                    
                    track.addEventListener('mouseenter', showTooltip);
                    track.addEventListener('mouseleave', hideTooltip);
                }

                // 质量维度：点击轨道时也显示提示
                if (isQuality) {
                    track.addEventListener('click', (e) => {
                        const dimensionName = track.getAttribute('data-dimension-name');
                        this.showQualityTooltipAtTitle(track, dimensionName);
                    });
                }

                // 滑块拖动事件
                sliderInput.addEventListener('input', () => {
                    const value = sliderInput.value;
                    
                    // 质量维度：拖动时弹回原位并提示
                    if (isQuality) {
                        const dimensionName = track.getAttribute('data-dimension-name');
                        this.showQualityTooltipAtTitle(track, dimensionName);
                        sliderInput.value = originalValue;
                        fill.style.width = originalValue + '%';
                        thumb.style.left = originalValue + '%';
                        if (numberInput) numberInput.value = originalValue;
                        return;
                    }
                    
                    fill.style.width = value + '%';
                    thumb.style.left = value + '%';
                    if (numberInput) numberInput.value = value;
                    this.updateTotalScorePreview();
                });

                // 滑块获得焦点时（键盘操作）- 质量维度提示
                if (isQuality) {
                    sliderInput.addEventListener('focus', () => {
                        const dimensionName = track.getAttribute('data-dimension-name');
                        this.showQualityTooltipAtTitle(track, dimensionName);
                    });
                }

                // 修复：thumb在0位置时也能拖动 - 让thumb也能触发range input
                thumb.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    sliderInput.focus();
                    // 模拟拖动开始
                    const startX = e.clientX;
                    const startValue = parseFloat(sliderInput.value);
                    
                    const onMouseMove = (moveEvent) => {
                        const rect = track.getBoundingClientRect();
                        const percent = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
                        sliderInput.value = percent;
                        
                        // 质量维度：拖动时弹回
                        if (isQuality) {
                            sliderInput.value = originalValue;
                            fill.style.width = originalValue + '%';
                            thumb.style.left = originalValue + '%';
                            if (numberInput) numberInput.value = originalValue;
                        } else {
                            fill.style.width = percent + '%';
                            thumb.style.left = percent + '%';
                            if (numberInput) numberInput.value = percent.toFixed(1);
                            this.updateTotalScorePreview();
                        }
                    };
                    
                    const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                    };
                    
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });

                // 数字输入框事件
                if (numberInput) {
                    numberInput.addEventListener('input', () => {
                        const value = numberInput.value;
                        sliderInput.value = value;
                        fill.style.width = value + '%';
                        thumb.style.left = value + '%';
                        this.updateTotalScorePreview();
                    });
                }

                // Spinner按钮点击事件
                const spinner = track.parentElement.querySelector('.performance__dimension-spinner');
                if (spinner) {
                    spinner.querySelectorAll('span').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const action = btn.getAttribute('data-action');
                            const step = parseFloat(sliderInput.step) || 0.1;
                            let currentValue = parseFloat(numberInput.value) || 0;
                            
                            if (action === 'up') {
                                currentValue = Math.min(100, currentValue + step);
                            } else if (action === 'down') {
                                currentValue = Math.max(0, currentValue - step);
                            }
                            
                            // 更新所有显示
                            const newValue = Math.round(currentValue * 10) / 10;
                            numberInput.value = newValue;
                            sliderInput.value = newValue;
                            fill.style.width = newValue + '%';
                            thumb.style.left = newValue + '%';
                            this.updateTotalScorePreview();
                        });
                    });

                    // 【关键修复】Number输入框实时验证，限制最大值不超过100
                    // 使用 input 事件而非 change 事件，实现实时修正
                    numberInput.addEventListener('input', () => {
                        let value = parseFloat(numberInput.value) || 0;
                        
                        // 输入过程中实时限制范围
                        if (value > 100) {
                            numberInput.value = 100;
                            value = 100;
                        } else if (value < 0) {
                            numberInput.value = 0;
                            value = 0;
                        }
                        
                        // 实时更新 Fill 和 Thumb 位置
                        sliderInput.value = value;
                        fill.style.width = value + '%';
                        thumb.style.left = value + '%';
                        this.updateTotalScorePreview();
                    });

                    // 失去焦点时最终确认值
                    numberInput.addEventListener('change', () => {
                        let value = parseFloat(numberInput.value) || 0;
                        if (value > 100) value = 100;
                        if (value < 0) value = 0;
                        
                        numberInput.value = value;
                        sliderInput.value = value;
                        fill.style.width = value + '%';
                        thumb.style.left = value + '%';
                        this.updateTotalScorePreview();
                    });
                }
            });
        },

        // 显示质量维度提示（滑块下方）
        showQualityTooltip(track) {
            const existing = document.querySelector('.quality-tooltip');
            if (existing) existing.remove();

            const tooltip = document.createElement('div');
            tooltip.className = 'quality-tooltip';
            tooltip.textContent = '质量维度由系统根据当月合格率自动评分，如需修改分数，请在右侧输入框中直接输入数值';
            
            const rect = track.getBoundingClientRect();
            tooltip.style.position = 'fixed';
            tooltip.style.left = rect.left + 'px';
            tooltip.style.top = (rect.bottom + 8) + 'px';
            tooltip.style.zIndex = '10000';
            
            document.body.appendChild(tooltip);

            setTimeout(() => tooltip.remove(), 3000);
        },

        // 在标题位置显示质量维度提示（不遮挡内容）
        showQualityTooltipAtTitle(track, title) {
            const existing = document.querySelector('.performance__quality-tooltip');
            if (existing) existing.remove();

            const tooltip = document.createElement('div');
            tooltip.className = 'performance__quality-tooltip';
            tooltip.textContent = '质量维度由系统根据当月合格率自动评分，如需修改分数，请在右侧输入框中直接输入数值';
            
            // 查找标题位置
            const header = track.closest('.performance__dimension-card').querySelector('.performance__dimension-card-title');
            const headerRect = header.getBoundingClientRect();
            
            tooltip.style.position = 'fixed';
            tooltip.style.left = headerRect.left + 'px';
            tooltip.style.top = (headerRect.top - 40) + 'px';
            tooltip.style.zIndex = '10000';
            
            document.body.appendChild(tooltip);
        },

        // 更新总分预览
        updateTotalScorePreview() {
            // 检查是否是年度评价
            const isYearlyEvaluation = state.currentEvaluation && state.currentEvaluation.period_type === 'yearly';
            const config = isYearlyEvaluation && state.yearlyConfig ? state.yearlyConfig : state.config;
            
            if (!config || !config.dimensions) {
                return;
            }

            // 只获取数字输入框，避免和range输入框重复计算
            const inputs = els.dimensionInputs.querySelectorAll('.performance__dimension-number-box');
            const scores = {};

            inputs.forEach(input => {
                const key = input.getAttribute('data-dimension-key');
                if (key) {
                    scores[key] = parseFloat(input.value) || 0;
                }
            });

            // 检查绿色环保是否合格（单选按钮方式）
            const greenEnvRadios = els.dimensionInputs.querySelectorAll('input[name="green_environment"], input[name="green"], input[name="environmental"]');
            let greenEnvPass = true;
            if (greenEnvRadios.length > 0) {
                // 找到选中的单选按钮
                for (const radio of greenEnvRadios) {
                    if (radio.checked && radio.value === 'false') {
                        greenEnvPass = false;
                        break;
                    }
                    if (radio.checked && radio.value === 'true') {
                        greenEnvPass = true;
                        break;
                    }
                }
            }

            // 计算总分
            let totalScore = 0;
            
            if (isYearlyEvaluation) {
                // 年度评价：排除绿色环保计算权重
                const validDimensions = config.dimensions.filter(d => d.key !== 'green_environment' && d.key !== 'green');
                const totalWeight = validDimensions.reduce((sum, d) => sum + (d.weight || 0), 0);
                
                validDimensions.forEach(dimension => {
                    const score = scores[dimension.key] || 0;
                    // 归一化权重
                    const normalizedWeight = dimension.weight / totalWeight;
                    totalScore += score * normalizedWeight;
                });
            } else {
                config.dimensions.forEach(dimension => {
                    const score = scores[dimension.key] || 0;
                    totalScore += score * dimension.weight;
                });
            }

            // 绿色环保一票否决
            if (isYearlyEvaluation && !greenEnvPass) {
                totalScore = 0;
            }

            // 计算等级
            const grade = this.calculateGrade(totalScore, config);

            // 更新显示
            if (els.totalScorePreview) {
                els.totalScorePreview.textContent = totalScore.toFixed(1);
            }
            if (els.totalScoreGrade) {
                els.totalScoreGrade.textContent = grade;
                
                // 年度评价显示特殊标记
                if (isYearlyEvaluation && !greenEnvPass) {
                    els.totalScoreGrade.textContent = '不合格(环保否决)';
                }
            }
        },

        // 处理绿色环保勾选变化
        handleGreenEnvChange(checkbox) {
            this.updateTotalScorePreview();
        },

        // 计算等级
        calculateGrade(totalScore, config) {
            // 如果没有提供config，使用默认逻辑
            const gradeRules = config?.gradeRules || [
                { min: 95, max: 100, label: 'A' },
                { min: 85, max: 95, label: 'B' },
                { min: 70, max: 85, label: 'C' },
                { min: 60, max: 70, label: 'D' },
                { min: 0, max: 60, label: 'E' }
            ];
            
            const sortedRules = [...gradeRules].sort((a, b) => a.min - b.min);
            
            for (let i = 0; i < sortedRules.length; i++) {
                const rule = sortedRules[i];
                const isLast = i === sortedRules.length - 1;
                
                if (isLast) {
                    if (totalScore >= rule.min && totalScore <= rule.max) {
                        return rule.label;
                    }
                } else {
                    if (totalScore >= rule.min && totalScore < rule.max) {
                        return rule.label;
                    }
                }
            }
            
            return 'E';
        },

        // 关闭评价模态框
        closeEvaluationModal() {
            els.evaluationModal.classList.add('hidden');
            state.currentEntity = null;
            if (els.evaluationForm) {
                els.evaluationForm.reset();
            }
        },

        // 处理评价提交
        // 说明：保存单个供应商的评价分数
        // 编辑模式 vs 正常模式：
        //   - 正常模式：保存后检查是否全部完成，自动提交周期
        //   - 编辑模式：仅保存数据，不触发自动提交，保持 completed 状态
        async handleEvaluationSubmit() {
            if (!state.currentEvaluation || !state.currentEntity) {
                return;
            }

            // 只获取数字输入框，避免和range输入框重复
            const inputs = els.dimensionInputs.querySelectorAll('.performance__dimension-number-box');
            const scores = {};

            inputs.forEach(input => {
                const key = input.getAttribute('data-dimension-key');
                if (key) {
                    scores[key] = parseFloat(input.value) || 0;
                }
            });

            // 获取环保单选按钮的值（年度评价）
            const greenEnvRadios = els.dimensionInputs.querySelectorAll('input[name="green_environment"], input[name="green"], input[name="environmental"]');
            greenEnvRadios.forEach(radio => {
                if (radio.checked) {
                    scores[radio.name] = radio.value;
                }
            });

            console.log('📊 提交的评价分数:', scores);
            console.log('📊 当前评价实体:', state.currentEntity);
            console.log('📊 当前模式:', state.isEditMode ? '编辑模式' : '正常模式');

            const remarks = els.evaluationRemarks.value;

            // 调试日志
            console.log('📊 保存参数:', {
                entityName: state.currentEntity.entityName,
                dataType: state.currentEntity.data_type,
                scores: Object.keys(scores).length + ' 个维度'
            });

            try {
                const response = await this.authenticatedFetch(`/api/evaluations/${state.currentEvaluation.id}/entities/${encodeURIComponent(state.currentEntity.entityName)}`, {
                    method: 'PUT',
                    body: JSON.stringify({ scores, remarks, dataType: state.currentEntity.data_type })
                });

                console.log('📊 HTTP状态码:', response.status);
                const result = await response.json();
                console.log('📊 保存结果原始数据:', JSON.stringify(result));

                if (result && result.success === true) {
                    console.log('📊 保存成功，进入成功分支');
                    console.log('📊 API返回数据:', result.data);
                    
                    // 显示保存成功视觉反馈
                    this.showSaveSuccessFeedback();
                    
                    // 标记当前实体已评价
                    state.currentEntity.evaluated = true;
                    
                    // 直接用API返回的数据更新当前实体
                    if (result.data) {
                        state.currentEntity.totalScore = result.data.total_score;
                        state.currentEntity.grade = result.data.grade;
                        state.currentEntity.scores = result.data.scores;
                        
                        // 更新模态框内显示的总分
                        this.updateModalScoreDisplay({
                            totalScore: result.data.total_score,
                            grade: result.data.grade
                        });
                    }
                    
                    // 使用 Toast 通知
                    if (window.App && window.App.Toast) {
                        window.App.Toast.success('保存成功！');
                    }
                    
                    // 重新获取实体列表并更新卡片显示
                    const entitiesResponse = await this.authenticatedFetch(`/api/evaluations/${state.currentEvaluation.id}/entities`);
                    const entitiesResult = await entitiesResponse.json();
                    if (entitiesResult.success) {
                        state.entities = entitiesResult.data;
                        // 重新渲染卡片列表以更新分数显示
                        this.renderEntityCards();
                        // 更新统计
                        this.loadTypeStatistics();
                    }
                    
                    // 如果是编辑模式，更新统计
                    if (state.isEditMode) {
                        this.renderEntityCards();
                        this.loadTypeStatistics();
                    }
                } else {
                    console.log('📊 保存失败，返回数据:', result);
                    // 使用 Toast 通知替代 alert
                    if (window.App && window.App.Toast) {
                        window.App.Toast.error('保存失败：' + (result.message || '未知错误'));
                    } else {
                        alert('保存失败：' + (result.message || '未知错误'));
                    }
                }
            } catch (error) {
                console.error('📊 提交评价出错:', error);
                // 使用 Toast 通知替代 alert
                if (window.App && window.App.Toast) {
                    window.App.Toast.error('提交失败，请重试');
                } else {
                    alert('提交失败，请重试');
                }
            }
        },

        // 显示保存成功视觉反馈
        showSaveSuccessFeedback() {
            if (!els.submitEvaluationBtn) return;
            
            els.submitEvaluationBtn.classList.remove('btn-primary');
            els.submitEvaluationBtn.classList.add('btn-success');
            els.submitEvaluationBtn.innerHTML = '<i class="ph ph-check-circle"></i> 已保存';
            
            setTimeout(() => {
                this.resetSaveButtonState();
            }, 2000);
        },

        // 重置保存按钮状态
        resetSaveButtonState() {
            if (els.submitEvaluationBtn) {
                els.submitEvaluationBtn.classList.remove('btn-success');
                els.submitEvaluationBtn.classList.add('btn-primary');
                els.submitEvaluationBtn.innerHTML = '<i class="ph ph-check"></i> 保存';
            }
        },

        // 更新模态框内分数显示
        updateModalScoreDisplay(entity) {
            if (!entity) return;
            
            // 更新总分
            const totalScorePreview = document.getElementById('totalScorePreview');
            if (totalScorePreview) {
                const totalScore = entity.totalScore || 0;
                totalScorePreview.textContent = totalScore.toFixed(1);
            }
            
            // 更新等级
            if (els.totalScoreGrade && entity.grade) {
                els.totalScoreGrade.textContent = entity.grade;
                // 使用已有的等级样式类
                els.totalScoreGrade.className = 'performance__total-score-grade ' + this.getGradeClass(entity.grade);
            }
        },

        // 更新实体卡片状态
        updateEntityCardStatus(entityName) {
            if (!entityName) return;
            
            const allCards = [];
            if (els.entityCardsListWithMaterial) {
                allCards.push(...els.entityCardsListWithMaterial.querySelectorAll('.performance__entity-card'));
            }
            if (els.entityCardsListWithoutMaterial) {
                allCards.push(...els.entityCardsListWithoutMaterial.querySelectorAll('.performance__entity-card'));
            }
            
            allCards.forEach(card => {
                const nameEl = card.querySelector('.performance__entity-name');
                if (nameEl && nameEl.textContent === entityName) {
                    card.classList.add('evaluated');
                    const statusBadge = card.querySelector('.performance__entity-status');
                    if (statusBadge) {
                        statusBadge.textContent = '已评价';
                        statusBadge.classList.remove('status-pending');
                        statusBadge.classList.add('status-completed');
                    }
                }
            });
        },

        // 处理"评价下一个"
        async handleEvaluateNext() {
            if (!state.currentEvaluation || !state.currentEntity) {
                return;
            }

            // 先保存当前评价
            await this.handleEvaluationSubmit();

            // 找到下一个未评价的供应商
            const nextEntity = this.findNextUnevaluatedEntity();
            
            if (nextEntity) {
                // 重置保存按钮状态
                this.resetSaveButtonState();
                // 打开下一个供应商的评价
                this.openEvaluationModal(nextEntity);
            } else {
                // 所有供应商都已评价完成
                if (window.App && window.App.Toast) {
                    window.App.Toast.success('所有供应商已评价完成！');
                }
                this.closeEvaluationModal();
            }
        },

        // 查找下一个未评价的供应商
        findNextUnevaluatedEntity() {
            if (!state.entities || state.entities.length === 0) {
                return null;
            }

            // 过滤当前类型的供应商
            const filteredEntities = this.filterEntitiesByType(state.entities);
            
            // 找到当前供应商的索引
            const currentIndex = filteredEntities.findIndex(
                e => e.entityName === state.currentEntity.entityName
            );

            // 从当前位置往后找第一个未评价的
            for (let i = currentIndex + 1; i < filteredEntities.length; i++) {
                if (!filteredEntities[i].evaluated) {
                    return filteredEntities[i];
                }
            }

            // 如果后面没有，从头开始找
            for (let i = 0; i < currentIndex; i++) {
                if (!filteredEntities[i].evaluated) {
                    return filteredEntities[i];
                }
            }

            return null;
        },

        // 显示确认对话框
        showConfirmDialog(title, message, onConfirm) {
            if (!els.confirmDialog) {
                console.error('确认对话框元素未找到');
                return;
            }

            // 设置标题和消息
            if (els.confirmDialogTitle) {
                els.confirmDialogTitle.textContent = title;
            }
            if (els.confirmDialogMessage) {
                els.confirmDialogMessage.textContent = message;
            }

            // 显示对话框
            els.confirmDialog.classList.remove('hidden');

            // 绑定取消按钮事件
            els.confirmDialogCancel.onclick = () => {
                els.confirmDialog.classList.add('hidden');
            };

            // 绑定确认按钮事件
            els.confirmDialogConfirm.onclick = () => {
                els.confirmDialog.classList.add('hidden');
                if (onConfirm) {
                    onConfirm();
                }
            };
        },

        // 退出评价
        // 说明：退出评价界面，返回评价周期列表
        // 会重置 isEditMode 标记，确保下次进入是正常模式
        exitEvaluation() {
            // 防止重复调用
            if (this.isExiting) {
                return;
            }
            this.isExiting = true;

            // 根据模式显示不同的提示信息
            const confirmMessage = state.isEditMode
                ? '确定要退出编辑吗？未保存的修改将丢失。'
                : '确定要退出评价吗？未保存的数据将丢失。';

            // 使用自定义确认对话框
            this.showConfirmDialog(
                '确认退出',
                confirmMessage,
                async () => {
                    els.evaluationInterface.classList.add('hidden');
                    document.getElementById('evaluationPeriodsList').classList.remove('hidden');
                    state.currentEvaluation = null;
                    state.currentEntity = null;
                    state.entities = [];
                    state.isEditMode = false; // 重置编辑模式标记

                    // 重新加载评价周期列表，确保修改后的数据能显示
                    await this.loadEvaluationPeriods();

                    // 重置标志
                    setTimeout(() => {
                        this.isExiting = false;
                    }, 500);
                }
            );

            // 如果用户取消，重置标志
            setTimeout(() => {
                if (this.isExiting && !els.confirmDialog.classList.contains('hidden')) {
                    this.isExiting = false;
                }
            }, 100);
        },

        // 显示配置对话框
        showConfigDialog() {
            if (window.App.Modules.PerformanceConfig) {
                window.App.Modules.PerformanceConfig.openConfigModal();
            } else {
                // 使用 Toast 通知
                if (window.App && window.App.Toast) {
                    window.App.Toast.error('绩效评价配置管理模块未加载');
                }
            }
        },

        // 检查并提交评价周期
        async checkAndSubmitEvaluation() {
            if (!state.currentEvaluation || !state.entities) {
                return;
            }

            // 只检查有来料的供应商是否都已评价
            const entitiesWithMaterial = state.entities.filter(entity => {
                const qualityData = entity.qualityData || { totalBatches: 0 };
                return qualityData.totalBatches > 0; // 只检查有来料的供应商
            });

            const unevaluatedCount = entitiesWithMaterial.filter(entity => 
                entity.totalScore === null || entity.totalScore === undefined
            ).length;

            console.log('📊 有来料的供应商数量:', entitiesWithMaterial.length);
            console.log('📊 有来料的未评价供应商数量:', unevaluatedCount);
            console.log('📊 总供应商数量:', state.entities.length);

            // 如果还有未评价的有来料供应商，不提交
            if (unevaluatedCount > 0) {
                console.log('📊 还有供应商未评价，不提交评价周期');
                return;
            }

            // 所有有来料的供应商都已评价，提交评价周期
            try {
                console.log('📊 所有有来料的供应商已评价，开始提交评价周期...');
                const response = await this.authenticatedFetch(`/api/evaluations/${state.currentEvaluation.id}/submit`, {
                    method: 'PUT'
                });

                const result = await response.json();
                console.log('📊 提交评价周期响应:', result);

                if (result.success) {
                    console.log('📊 评价周期提交成功');
                    // 使用 Toast 通知
                    if (window.App && window.App.Toast) {
                        window.App.Toast.success('评价周期已完成！');
                    }
                    
                    // 跳转到主界面显示累计绩效（通过hash导航）
                    window.location.hash = 'performance';
                } else {
                    console.error('📊 提交评价周期失败:', result.message);
                    // 使用 Toast 通知
                    if (window.App && window.App.Toast) {
                        window.App.Toast.error('提交评价周期失败：' + result.message);
                    }
                }
            } catch (error) {
                console.error('📊 提交评价周期异常:', error);
                // 使用 Toast 通知
                if (window.App && window.App.Toast) {
                    window.App.Toast.error('提交评价周期失败');
                }
            }
        },

        // 查看结果 - 根据周期类型跳转到对应的累计绩效Tab
        viewResults(evaluationId) {
            // 先获取评价周期的详细信息来提取年份和周期类型
            this.authenticatedFetch(`/api/evaluations/${evaluationId}`)
                .then(response => response.json())
                .then(result => {
                    if (result.success && result.data) {
                        const evaluation = result.data;
                        
                        // 从start_date中提取年份
                        let year = new Date().getFullYear();
                        if (evaluation.start_date) {
                            const match = evaluation.start_date.match(/^(\d{4})/);
                            if (match && match[1]) {
                                year = parseInt(match[1], 10);
                            }
                        }
                        
                        // 获取周期类型
                        const periodType = evaluation.period_type || 'monthly';
                        
                        // 跳转到绩效评价模块
                        window.location.hash = 'performance';
                        
                        // 等待页面跳转完成后，根据周期类型加载对应数据
                        setTimeout(() => {
                            if (window.App && window.App.Modules && window.App.Modules.PerformanceDashboard) {
                                const dashboard = window.App.Modules.PerformanceDashboard;
                                
                                // 直接调用 loadAccumulatedResults 加载数据并切换Tab
                                // 注意：不再调用 switchTab，因为 switchTab 内部也会调用 loadAccumulatedResults 导致重复
                                if (periodType === 'yearly') {
                                    // 年度：加载年度数据
                                    dashboard.loadAccumulatedResults(year, 'purchase', 'yearly');
                                    // 手动切换Tab样式
                                    dashboard.switchTabStyle('tab-trend');
                                } else {
                                    // 月度/季度：加载月度数据
                                    dashboard.loadAccumulatedResults(year, 'purchase', 'monthly');
                                    // 手动切换Tab样式
                                    dashboard.switchTabStyle('tab-heatmap');
                                }
                            }
                        }, 100);
                    } else {
                        // 如果获取失败，直接跳转
                        window.location.hash = 'performance';
                    }
                })
                .catch(error => {
                    console.error('获取评价周期信息失败:', error);
                    window.location.hash = 'performance';
                });
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