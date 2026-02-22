/**
 * 供应商绩效评价主界面模块
 * 负责展示评价结果、统计数据、图表
 */
(function() {
    // 模块状态
    const state = {
        currentEvaluation: null,
        resultsData: null,
        currentYear: null,
        currentType: 'purchase', // purchase-外购/external-外协
        gradeRules: [], // 等级规则（从配置动态获取）
        gradeColors: [], // 预设颜色数组（按顺序分配）
        dimensions: [], // 评价维度（从配置动态获取）
        charts: {
            ranking: null,
            gradePie: null,
            drawerVendorTrend: null,
            overallTrend: null
        }
    };

    // DOM 元素缓存
    const els = {};

    const PerformanceDashboardModule = {
        // 初始化模块
        init() {
            console.log('Performance Dashboard Module: Initializing...');
            this.cacheElements();
            this.bindEvents();
            this.initYearSelector();
            console.log('Performance Dashboard Module: Initialization complete');
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

        // 辅助函数：根据分数获取颜色（按等级顺序自动分配）
        getScoreColor(score) {
            if (score === null || score === undefined) return '#d1d5db';
            
            // 按min从大到小排序（优先匹配更高的等级）
            const sortedRules = [...state.gradeRules].sort((a, b) => b.min - a.min);
            
            for (let i = 0; i < sortedRules.length; i++) {
                const rule = sortedRules[i];
                if (score >= rule.min && score <= rule.max) {
                    // 按排序后的索引获取颜色
                    return state.gradeColors[i] || state.gradeColors[state.gradeColors.length - 1] || '#6b7280';
                }
            }
            
            return '#6b7280';
        },

        // 辅助函数：根据等级名称获取颜色
        getGradeColorByName(gradeName) {
            if (!gradeName || gradeName === '-') return '#6b7280';

            // 按min从大到小排序
            const sortedRules = [...state.gradeRules].sort((a, b) => b.min - a.min);

            for (let i = 0; i < sortedRules.length; i++) {
                if (sortedRules[i].label === gradeName) {
                    return state.gradeColors[i] || state.gradeColors[state.gradeColors.length - 1] || '#6b7280';
                }
            }

            return '#6b7280';
        },

        // 辅助函数：根据等级名称获取策略
        getGradeStrategyByName(gradeName) {
            if (!gradeName || gradeName === '-') return '';

            // 按min从大到小排序
            const sortedRules = [...state.gradeRules].sort((a, b) => b.min - a.min);

            for (const rule of sortedRules) {
                if (rule.label === gradeName) {
                    return rule.strategy || '';
                }
            }

            return '';
        },

        // 加载配置
        async loadConfig() {
            try {
                const response = await this.authenticatedFetch('/api/evaluation-config');
                const result = await response.json();
                
                if (result.success && result.data) {
                    if (result.data.gradeRules) {
                        state.gradeRules = result.data.gradeRules;
                    }
                    if (result.data.gradeColors) {
                        state.gradeColors = result.data.gradeColors;
                    }
                    if (result.data.dimensions) {
                        state.dimensions = result.data.dimensions;
                    }
                }
            } catch (error) {
                console.error('加载等级配置失败:', error);
            }
        },

        // 渲染图例（根据配置动态生成）
        renderLegend() {
            if (!els.heatmapLegend || state.gradeRules.length === 0) return;

            // 按min从大到小排序
            const sortedRules = [...state.gradeRules].sort((a, b) => b.min - a.min);

            let legendHtml = '';
            sortedRules.forEach((rule, index) => {
                // 生成描述文本
                let desc = '';
                if (rule.max === 100) {
                    desc = `≥${rule.min}分`;
                } else if (rule.min === 0) {
                    desc = `<${rule.max}分`;
                } else {
                    desc = `${rule.min}-${rule.max}分`;
                }

                // 按索引获取颜色
                const color = state.gradeColors[index] || state.gradeColors[state.gradeColors.length - 1] || '#6b7280';

                legendHtml += `<span class="performance__legend-item">
                    <span class="performance__legend-color" style="background: ${color}"></span>
                    ${rule.label} (${desc})
                </span>`;
            });

            els.heatmapLegend.innerHTML = legendHtml;
        },

        // 缓存 DOM 元素
        cacheElements() {
            els.resultsInterface = document.getElementById('resultsInterface');
            els.resultsTitle = document.getElementById('resultsTitle');
            els.yearSelector = document.getElementById('yearSelector');
            els.resultsPeriod = document.getElementById('resultsPeriod');
            els.exitResultsBtn = document.getElementById('exitResultsBtn');
            els.averageScore = document.getElementById('averageScore');
            els.scoreTrend = document.getElementById('scoreTrend');
            els.gradeExcellent = document.getElementById('gradeExcellent');
            els.gradeGood = document.getElementById('gradeGood');
            els.gradeImprove = document.getElementById('gradeImprove');
            els.gradePoor = document.getElementById('gradePoor');
            els.gradeExcellentPercent = document.getElementById('gradeExcellentPercent');
            els.gradeGoodPercent = document.getElementById('gradeGoodPercent');
            els.gradeImprovePercent = document.getElementById('gradeImprovePercent');
            els.gradePoorPercent = document.getElementById('gradePoorPercent');
            els.evaluatedCount = document.getElementById('evaluatedCount');
            els.unevaluatedCount = document.getElementById('unevaluatedCount');
            els.totalCount = document.getElementById('totalCount');
            // 外购/外购切换卡片
            els.resultsTypeCards = document.querySelectorAll('#resultsInterface .performance__type-card');
            els.resultsPurchaseCount = document.getElementById('resultsPurchaseCount');
            els.resultsExternalCount = document.getElementById('resultsExternalCount');
            // Tab导航
            els.tabButtons = document.querySelectorAll('.performance__results-tab-btn');
            els.tabContents = document.querySelectorAll('.performance__results-tab-content');
            // 热力图
            els.heatmapTable = document.getElementById('heatmapTable');
            els.heatmapLegend = document.getElementById('heatmapLegend');
            // 年度排名和饼图
            els.rankingChart = document.getElementById('rankingChart');
            els.gradePieChart = document.getElementById('gradePieChart');
            // 全供应商趋势图
            els.overallTrendChart = document.getElementById('overallTrendChart');
            // 趋势分析
            els.trendVendorSelect = document.getElementById('trendVendorSelect');
            els.vendorTrendChart = document.getElementById('vendorTrendChart');
            // 底部抽屉
            els.vendorTrendDrawer = document.getElementById('vendorTrendDrawer');
            els.drawerOverlay = document.getElementById('drawerOverlay');
            els.drawerCloseBtn = document.getElementById('drawerCloseBtn');
            els.drawerVendorName = document.getElementById('drawerVendorName');
            els.drawerVendorTrendChart = document.getElementById('drawerVendorTrendChart');
            // 详情模态框
            els.scoreDetailModal = document.getElementById('scoreDetailModal');
            els.scoreDetailOverlay = document.getElementById('scoreDetailOverlay');
            els.scoreDetailCloseBtn = document.getElementById('scoreDetailCloseBtn');
            els.scoreDetailTitle = document.getElementById('scoreDetailTitle');
            els.scoreDetailVendor = document.getElementById('scoreDetailVendor');
            els.scoreDetailPeriod = document.getElementById('scoreDetailPeriod');
            els.scoreDetailTotal = document.getElementById('scoreDetailTotal');
            els.scoreDetailGrade = document.getElementById('scoreDetailGrade');
            els.scoreDetailStrategy = document.getElementById('scoreDetailStrategy');
            els.scoreDetailDimensions = document.getElementById('scoreDetailDimensions');
            els.scoreDetailRemarksText = document.getElementById('scoreDetailRemarksText');
            els.scoreDetailGradeStrategiesList = document.getElementById('scoreDetailGradeStrategiesList');
            
        },

        // 绑定事件
        bindEvents() {
            if (els.exitResultsBtn) {
                els.exitResultsBtn.addEventListener('click', () => this.exitResults());
            }

            // 年份选择器切换事件
            if (els.yearSelector) {
                els.yearSelector.addEventListener('change', () => {
                    const year = parseInt(els.yearSelector.value);
                    this.switchYear(year);
                });
            }

            // 外购/外购卡片切换事件
            if (els.resultsTypeCards.length > 0) {
                els.resultsTypeCards.forEach(card => {
                    card.addEventListener('click', () => {
                        const type = card.getAttribute('data-type');
                        this.switchType(type);
                    });
                });
            }

            // Tab导航切换事件
            if (els.tabButtons.length > 0) {
                els.tabButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const tabId = btn.getAttribute('data-tab');
                        this.switchTab(tabId);
                    });
                });
            }

            // 底部抽屉关闭事件
            if (els.drawerCloseBtn) {
                els.drawerCloseBtn.addEventListener('click', () => this.closeDrawer());
            }
            if (els.drawerOverlay) {
                els.drawerOverlay.addEventListener('click', () => this.closeDrawer());
            }

            // 详情模态框关闭事件
            if (els.scoreDetailCloseBtn) {
                els.scoreDetailCloseBtn.addEventListener('click', () => this.closeScoreDetailModal());
            }
            if (els.scoreDetailOverlay) {
                els.scoreDetailOverlay.addEventListener('click', () => this.closeScoreDetailModal());
            }
        },

        // 显示空状态（无评价数据时）
        showEmptyState() {
            console.log('显示空状态');
            // 显示主界面
            if (els.resultsInterface) {
                els.resultsInterface.classList.remove('hidden');
            }
            
            // 更新标题
            if (els.resultsTitle) {
                els.resultsTitle.textContent = '供应商绩效评价';
            }
            if (els.resultsPeriod) {
                els.resultsPeriod.textContent = '暂无评价数据';
            }
            
            // 显示空状态统计
            if (els.averageScore) {
                els.averageScore.textContent = '-';
            }
            if (els.scoreTrend) {
                els.scoreTrend.textContent = '暂无数据';
            }
            
            // 显示空状态等级分布
            if (els.gradeExcellent) els.gradeExcellent.textContent = '0';
            if (els.gradeGood) els.gradeGood.textContent = '0';
            if (els.gradeImprove) els.gradeImprove.textContent = '0';
            if (els.gradePoor) els.gradePoor.textContent = '0';
            if (els.gradeExcellentPercent) els.gradeExcellentPercent.textContent = '0%';
            if (els.gradeGoodPercent) els.gradeGoodPercent.textContent = '0%';
            if (els.gradeImprovePercent) els.gradeImprovePercent.textContent = '0%';
            if (els.gradePoorPercent) els.gradePoorPercent.textContent = '0%';
            
            // 显示空状态指标
            if (els.evaluatedCount) els.evaluatedCount.textContent = '0';
            if (els.unevaluatedCount) els.unevaluatedCount.textContent = '0';
            if (els.totalCount) els.totalCount.textContent = '0';

            // 显示空状态图表
            this.renderEmptyCharts();
        },

        // 渲染空状态图表
        renderEmptyCharts() {
            // 显示占位符
        },

        // 加载评价结果
        async loadResults(evaluationId) {
            try {
                const response = await this.authenticatedFetch(`/api/evaluations/${evaluationId}/results`);
                const result = await response.json();

                if (result.success) {
                    state.currentEvaluation = result.data.evaluation;
                    state.resultsData = result.data;

                    this.showResultsInterface();
                    this.updateStats();
                    this.updateHeatmapModeIndicator();
                    this.renderCharts();
                } else {
                    if (window.App && window.App.Toast) {
                        window.App.Toast.error('加载评价结果失败：' + result.message);
                    } else {
                        alert('加载评价结果失败：' + result.message);
                    }
                }
            } catch (error) {
                console.error('加载评价结果失败:', error);
                if (window.App && window.App.Toast) {
                    window.App.Toast.error('加载评价结果失败');
                } else {
                    alert('加载评价结果失败');
                }
            }
        },

        // 加载年度累计数据
        async loadAccumulatedResults(year, type = 'purchase') {
            try {
                // 同步年份选择器的值
                if (els.yearSelector) {
                    els.yearSelector.value = year;
                }
                state.currentYear = year;
                state.currentType = type;

                const response = await this.authenticatedFetch(`/api/evaluations/accumulated/${year}?type=${type}`);
                const result = await response.json();

                if (result.success) {
                    state.resultsData = result.data;

                    // 检查是否有数据
                    if (result.data.evaluations && result.data.evaluations.length === 0) {
                        // 没有评价数据，显示友好提示
                        this.showEmptyState();
                        if (window.App && window.App.Toast) {
                            window.App.Toast.info(`${year}年暂未进行绩效评价`);
                        }
                        return;
                    }

                    this.showAccumulatedResults();
                    this.updateStats();
                    this.renderCharts();
                    this.updateTypeCounts();
                } else {
                    if (window.App && window.App.Toast) {
                        window.App.Toast.error('加载累计数据失败：' + result.message);
                    } else {
                        alert('加载累计数据失败：' + result.message);
                    }
                }
            } catch (error) {
                console.error('加载累计数据失败:', error);
                if (window.App && window.App.Toast) {
                    window.App.Toast.error('加载累计数据失败');
                } else {
                    alert('加载累计数据失败');
                }
            }
        },

        // 切换数据类型（外购/外购）
        switchType(type) {
            if (state.currentType === type) return;

            state.currentType = type;

            // 更新卡片样式
            if (els.resultsTypeCards.length > 0) {
                els.resultsTypeCards.forEach(card => {
                    const cardType = card.getAttribute('data-type');
                    const statusElement = card.querySelector('.performance__type-status');

                    if (cardType === type) {
                        card.classList.add('performance__type-card--active');
                        if (statusElement) {
                            statusElement.textContent = '当前选中';
                        }
                    } else {
                        card.classList.remove('performance__type-card--active');
                        if (statusElement) {
                            statusElement.textContent = '未选中';
                        }
                    }
                });
            }

            // 重新加载数据
            if (state.currentYear) {
                this.loadAccumulatedResults(state.currentYear, type);
            }
        },

        // 更新外购/外购数量
        updateTypeCounts() {
            if (!state.resultsData || !state.resultsData.statistics) return;

            const { statistics } = state.resultsData;

            if (els.resultsPurchaseCount) {
                // 查询外购数据
                this.authenticatedFetch(`/api/evaluations/accumulated/${state.currentYear}?type=purchase`)
                    .then(res => res.json())
                    .then(result => {
                        if (result.success && result.data.statistics) {
                            els.resultsPurchaseCount.textContent = result.data.statistics.totalEntities || 0;
                        }
                    })
                    .catch(err => console.error('获取外购数量失败:', err));
            }

            if (els.resultsExternalCount) {
                // 查询外购数据
                this.authenticatedFetch(`/api/evaluations/accumulated/${state.currentYear}?type=external`)
                    .then(res => res.json())
                    .then(result => {
                        if (result.success && result.data.statistics) {
                            els.resultsExternalCount.textContent = result.data.statistics.totalEntities || 0;
                        }
                    })
                    .catch(err => console.error('获取外购数量失败:', err));
            }
        },

        // 初始化年份选择器
        initYearSelector() {
            if (!els.yearSelector) return;

            const currentYear = new Date().getFullYear();
            // 生成最近5年的选项
            const startYear = currentYear - 4;
            const endYear = currentYear + 1;

            // 读取localStorage中保存的上一次年份选择
            const savedYear = localStorage.getItem('performance_year');
            const defaultYear = savedYear && parseInt(savedYear) >= startYear && parseInt(savedYear) <= endYear 
                ? parseInt(savedYear) 
                : currentYear;

            els.yearSelector.innerHTML = '';
            for (let year = endYear; year >= startYear; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = `${year}年`;
                if (year === defaultYear) {
                    option.selected = true;
                }
                els.yearSelector.appendChild(option);
            }

            // 同步状态
            state.currentYear = defaultYear;
        },

        // 切换年份
        switchYear(year) {
            if (state.currentYear === year) return;

            state.currentYear = year;
            localStorage.setItem('performance_year', year);

            // 重新加载数据
            this.loadAccumulatedResults(year, state.currentType);
        },

        // 显示累计结果界面
        showAccumulatedResults() {
            console.log('显示累计结果界面');
            // 显示主界面
            if (els.resultsInterface) {
                els.resultsInterface.classList.remove('hidden');
            }

            // 更新标题
            if (els.resultsTitle) {
                els.resultsTitle.textContent = `${state.currentYear}年累计绩效评价`;
            }
            if (els.resultsPeriod) {
                const { evaluations } = state.resultsData;
                if (evaluations && evaluations.length > 0) {
                    const firstPeriod = evaluations[0].startDate;
                    const lastPeriod = evaluations[evaluations.length - 1].endDate;
                    els.resultsPeriod.textContent = `${firstPeriod} 至 ${lastPeriod}`;
                } else {
                    els.resultsPeriod.textContent = `${state.currentYear}年暂无评价数据`;
                }
            }

            // 渲染热力图
            this.renderSimpleHeatmap();
        },

        // 切换Tab
        switchTab(tabId) {
            // 更新按钮样式
            if (els.tabButtons.length > 0) {
                els.tabButtons.forEach(btn => {
                    const btnTabId = btn.getAttribute('data-tab');
                    if (btnTabId === tabId) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            }

            // 切换内容显示
            if (els.tabContents.length > 0) {
                els.tabContents.forEach(content => {
                    if (content.id === tabId) {
                        content.classList.add('active');
                        content.classList.remove('hidden');
                    } else {
                        content.classList.remove('active');
                        content.classList.add('hidden');
                    }
                });
            }
        },

        // 渲染年度排名热力图
        async renderSimpleHeatmap() {
            if (!els.heatmapTable || !state.resultsData) return;

            // 获取配置（如果还没有加载）
            if (state.gradeRules.length === 0 || state.gradeColors.length === 0) {
                await this.loadConfig();
            }

            // 渲染图例
            this.renderLegend();

            const { details, annualRankings, unevaluatedVendors } = state.resultsData;

            // 生成时间列表（月份或季度）
            const timeColumns = [];
            
            // 检查数据中是否有季度类型
            const hasQuarterly = details && details.some(d => d.period && d.period.periodType === 'quarterly');
            const hasYearly = details && details.some(d => d.period && d.period.periodType === 'yearly');
            
            if (hasQuarterly) {
                // 季度模式：显示Q1-Q4
                for (let i = 1; i <= 4; i++) {
                    timeColumns.push(`Q${i}`);
                }
            } else if (hasYearly) {
                // 年度模式：显示"年度"
                timeColumns.push('年度');
            } else {
                // 月度模式：显示1-12月
                for (let i = 1; i <= 12; i++) {
                    timeColumns.push(`${i}月`);
                }
            }

            // 构建供应商分数映射：供应商名称 -> 月份 -> 分数
            const vendorScores = new Map();
            const vendorAnnualData = new Map();

            // 从details中提取每个月的数据
            if (details && details.length > 0) {
                details.forEach(detail => {
                    const vendorName = detail.entityName;
                    if (!vendorScores.has(vendorName)) {
                        vendorScores.set(vendorName, new Map());
                    }

                    // 根据period_type判断是月度还是季度
                    if (detail.period && detail.period.startDate) {
                        const startDate = new Date(detail.period.startDate);
                        let timeKey;
                        
                        if (detail.period.periodType === 'quarterly') {
                            // 季度：计算是第几个季度
                            const month = startDate.getMonth() + 1;
                            const quarter = Math.ceil(month / 3);
                            timeKey = `Q${quarter}`;
                        } else if (detail.period.periodType === 'yearly') {
                            // 年度：显示为"年度"
                            timeKey = '年度';
                        } else {
                            // 月度或自定义
                            const month = startDate.getMonth() + 1;
                            timeKey = `${month}月`;
                        }
                        
                        vendorScores.get(vendorName).set(timeKey, detail.totalScore);
                    }
                });
            }

            // 从annualRankings中提取年度平均分和等级
            if (annualRankings && annualRankings.length > 0) {
                annualRankings.forEach(ranking => {
                    vendorAnnualData.set(ranking.entityName, {
                        averageScore: ranking.totalScore,
                        grade: ranking.grade
                    });
                });
            }

            // 获取所有供应商（从annualRankings和unevaluatedVendors中获取）
            const allVendors = annualRankings && annualRankings.length > 0
                ? annualRankings.map(r => r.entityName)
                : [];
            
            // 添加未评价的供应商
            const vendorsWithoutData = unevaluatedVendors || [];
            const vendorsWithData = allVendors;

            // 渲染表格
            let heatmapHtml = '<thead><tr>';
            heatmapHtml += '<th style="padding: 8px; background: #f8fafc; width: 60px;">排名</th>';
            // 季度模式供应商列宽120px，月度模式150px
            heatmapHtml += `<th style="padding: 8px; background: #f8fafc; min-width: ${hasQuarterly ? '120px' : '150px'}; width: ${hasQuarterly ? '120px' : '150px'};">供应商</th>`;
            timeColumns.forEach(col => {
                // 季度模式列宽90px，月度模式70px
                const colWidth = hasQuarterly ? '90px' : '70px';
                heatmapHtml += `<th style="padding: 8px; background: #f8fafc; text-align: center; width: ${colWidth};">${col}</th>`;
            });
            heatmapHtml += '<th style="padding: 8px; background: #f8fafc; text-align: center; width: 80px;">年度平均分</th>';
            heatmapHtml += '<th style="padding: 8px; background: #f8fafc; text-align: center; width: 60px;">等级</th>';
            heatmapHtml += '</tr></thead>';

            // 渲染有数据的供应商
            heatmapHtml += '<tbody>';
            vendorsWithData.forEach((vendor, index) => {
                heatmapHtml += '<tr>';

                // 排名徽章
                const annualData = vendorAnnualData.get(vendor);
                const sortedVendors = [...vendorAnnualData.entries()]
                    .sort((a, b) => b[1].averageScore - a[1].averageScore);
                const rank = sortedVendors.findIndex(([name]) => name === vendor) + 1;
                const totalCount = sortedVendors.length;

                // 根据排名设置data属性，用于CSS选择
                let rankDataAttr = '';
                if (rank <= 5) {
                    rankDataAttr = `data-rank="top-${rank}"`;
                } else if (rank > totalCount - 5) {
                    rankDataAttr = 'data-rank="last"';
                } else {
                    rankDataAttr = 'data-rank="middle"';
                }

                heatmapHtml += `<td style="padding: 8px; text-align: center;">
                    <span class="performance__heatmap-rank-badge" ${rankDataAttr}>${rank}</span>
                </td>`;

                // 供应商名称（可点击查看趋势）
                const vendorWidth = hasQuarterly ? '120px' : '150px';
                heatmapHtml += `<td style="padding: 8px; font-weight: 500; cursor: pointer; min-width: ${vendorWidth}; width: ${vendorWidth};" class="performance__heatmap-vendor-cell" data-vendor="${vendor}">${vendor}</td>`;

                // 时间分数
                const scores = vendorScores.get(vendor);
                timeColumns.forEach(col => {
                    const score = scores.get(col);
                    if (score !== undefined && score !== null) {
                        // 从配置获取颜色
                        const scoreColor = this.getScoreColor(score);
                        heatmapHtml += `<td style="padding: 8px; text-align: center; cursor: pointer;" class="performance__heatmap-score-cell" data-vendor="${vendor}" data-month="${col}">
                            <span class="performance__heatmap-score" style="background: ${scoreColor}">${score.toFixed(1)}</span>
                        </td>`;
                    } else {
                        heatmapHtml += `<td style="padding: 8px; text-align: center;">
                            <span class="performance__heatmap-score empty">-</span>
                        </td>`;
                    }
                });

                // 年度平均分
                const avgScore = annualData ? annualData.averageScore : '-';
                heatmapHtml += `<td style="padding: 8px; text-align: center; font-weight: 600;">
                    ${avgScore !== '-' ? avgScore.toFixed(1) : avgScore}
                </td>`;

                // 等级（使用配置中的颜色）
                const grade = annualData ? annualData.grade : '-';
                const gradeColor = this.getGradeColorByName(grade);
                heatmapHtml += `<td style="padding: 8px; text-align: center;">
                    <span class="performance__grade-badge" style="background: ${gradeColor}; color: white;">${grade}</span>
                </td>`;

                heatmapHtml += '</tr>';
            });

            // 渲染无数据的供应商（可折叠）
            if (vendorsWithoutData.length > 0) {
                heatmapHtml += '</tbody>';
                heatmapHtml += `
                    <tr>
                        <td colspan="${timeColumns.length + 5}" style="padding: 0; border: none;">
                            <div class="performance__heatmap-unevaluated-section">
                                <div class="performance__heatmap-unevaluated-header performance__collapsed" id="unevaluatedHeader">
                                    <h4><i class="ph ph-warning-circle"></i> 未评价供应商 (${vendorsWithoutData.length}家)</h4>
                                    <i class="ph ph-caret-down performance__toggle-icon"></i>
                                </div>
                                <div class="performance__heatmap-unevaluated-body" id="unevaluatedBody">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <thead><tr>
                                            <th style="padding: 8px; background: #f8fafc; width: 60px;">排名</th>
                                            <th style="padding: 8px; background: #f8fafc; min-width: ${hasQuarterly ? '120px' : '150px'}; width: ${hasQuarterly ? '120px' : '150px'};">供应商</th>
                                            ${timeColumns.map(m => `<th style="padding: 8px; background: #f8fafc; text-align: center; width: ${hasQuarterly ? '90px' : '70px'};">${m}</th>`).join('')}
                                            <th style="padding: 8px; background: #f8fafc; text-align: center; width: 80px;">年度平均分</th>
                                            <th style="padding: 8px; background: #f8fafc; text-align: center; width: 60px;">等级</th>
                                        </tr></thead>
                                        <tbody>
                `;

                vendorsWithoutData.forEach((vendor, index) => {
                    const vendorWidth = hasQuarterly ? '120px' : '150px';
                    const colWidth = hasQuarterly ? '90px' : '70px';
                    heatmapHtml += '<tr>';
                    // 排名列 - 60px
                    heatmapHtml += `<td style="padding: 8px; text-align: center; width: 60px;">
                        <span class="performance__heatmap-rank-badge" style="background: #9ca3af;">-</span>
                    </td>`;
                    // 供应商名称列
                    heatmapHtml += `<td style="padding: 8px; font-weight: 500; color: #6b7280; min-width: ${vendorWidth}; width: ${vendorWidth};">${vendor}</td>`;
                    // 时间列
                    timeColumns.forEach(() => {
                        heatmapHtml += `<td style="padding: 8px; text-align: center; width: ${colWidth};">
                            <span class="performance__heatmap-score empty">-</span>
                        </td>`;
                    });
                    // 年度平均分列 - 80px
                    heatmapHtml += `<td style="padding: 8px; text-align: center; font-weight: 600; color: #6b7280; width: 80px;">-</td>`;
                    // 等级列 - 60px
                    heatmapHtml += `<td style="padding: 8px; text-align: center; width: 60px;">
                        <span class="performance__grade-badge" style="background: #9ca3af; color: white;">-</span>
                    </td>`;
                    heatmapHtml += '</tr>';
                });

                heatmapHtml += `
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }

            heatmapHtml += '</tbody>';
            els.heatmapTable.innerHTML = heatmapHtml;

            // 绑定折叠事件
            const unevaluatedHeader = document.getElementById('unevaluatedHeader');
            const unevaluatedBody = document.getElementById('unevaluatedBody');
            if (unevaluatedHeader && unevaluatedBody) {
                // 点击头部切换折叠状态
                unevaluatedHeader.addEventListener('click', () => {
                    const isExpanded = unevaluatedBody.classList.contains('performance__expanded');
                    if (isExpanded) {
                        unevaluatedBody.classList.remove('performance__expanded');
                        unevaluatedHeader.classList.add('performance__collapsed');
                    } else {
                        unevaluatedBody.classList.add('performance__expanded');
                        unevaluatedHeader.classList.remove('performance__collapsed');
                    }
                });
            }

            // 绑定热力图单元格点击事件
            const vendorCells = document.querySelectorAll('.performance__heatmap-vendor-cell');
            vendorCells.forEach(cell => {
                cell.addEventListener('click', () => {
                    const vendorName = cell.getAttribute('data-vendor');
                    this.openDrawer(vendorName);
                });
            });

            const scoreCells = document.querySelectorAll('.performance__heatmap-score-cell');
            scoreCells.forEach(cell => {
                cell.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const vendorName = cell.getAttribute('data-vendor');
                    const month = cell.getAttribute('data-month');
                    this.showScoreDetailModal(vendorName, month);
                });
            });
        },

        // 显示结果界面
        showResultsInterface() {
            els.resultsTitle.textContent = `${state.currentEvaluation.period_name} - 评价结果`;
            els.resultsPeriod.textContent = `${state.currentEvaluation.start_date} 至 ${state.currentEvaluation.end_date}`;

            els.resultsInterface.classList.remove('hidden');
            document.getElementById('evaluationPeriodsList').classList.add('hidden');
            document.getElementById('evaluationInterface').classList.add('hidden');
        },

        // 更新热力图模式指示器
        updateHeatmapModeIndicator() {
            const indicator = document.getElementById('heatmapModeIndicator');
            if (!indicator || !state.currentEvaluation) return;

            const periodType = state.currentEvaluation.period_type;
            const typeNames = {
                'monthly': '月度',
                'quarterly': '季度',
                'yearly': '年度',
                'custom': '自定义'
            };

            const typeName = typeNames[periodType] || periodType;
            
            if (periodType && periodType !== 'custom') {
                indicator.textContent = `（${typeName}）`;
                indicator.className = `period-mode-indicator ${periodType}`;
            } else {
                indicator.textContent = '';
                indicator.className = 'period-mode-indicator';
            }
        },

        // 更新统计数据
        updateStats() {
            const { statistics, details } = state.resultsData;

            // 平均得分
            els.averageScore.textContent = statistics.averageScore.toFixed(1);

            // 等级分布
            els.gradeExcellent.textContent = statistics.gradeCount['优秀'] || 0;
            els.gradeGood.textContent = statistics.gradeCount['合格'] || 0;
            els.gradeImprove.textContent = statistics.gradeCount['整改后合格'] || 0;
            els.gradePoor.textContent = statistics.gradeCount['不合格'] || 0;

            const total = details.length;
            els.gradeExcellentPercent.textContent = total > 0 
                ? ((statistics.gradeCount['优秀'] || 0) / total * 100).toFixed(1) + '%' 
                : '0%';
            els.gradeGoodPercent.textContent = total > 0 
                ? ((statistics.gradeCount['合格'] || 0) / total * 100).toFixed(1) + '%' 
                : '0%';
            els.gradeImprovePercent.textContent = total > 0 
                ? ((statistics.gradeCount['整改后合格'] || 0) / total * 100).toFixed(1) + '%' 
                : '0%';
            els.gradePoorPercent.textContent = total > 0 
                ? ((statistics.gradeCount['不合格'] || 0) / total * 100).toFixed(1) + '%' 
                : '0%';

            // 关键指标
            els.evaluatedCount.textContent = statistics.evaluatedCount;
            els.unevaluatedCount.textContent = statistics.unevaluatedCount;
            els.totalCount.textContent = statistics.totalEntities;
        },

        // 渲染图表
        renderCharts() {
            this.renderRankingChart();
            this.renderGradePieChart();
            this.renderVendorTrendSelect();
            this.renderVendorTrendChart();
            this.renderOverallTrendChart();
        },

        // 渲染年度排名柱状图
                            renderRankingChart() {
            const { annualRankings } = state.resultsData;

            if (!annualRankings || annualRankings.length === 0) {
                // 显示空状态
                if (els.rankingChart) {
                    els.rankingChart.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #718096;"><i class="ph ph-chart-bar" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i><span style="font-size: 14px;">暂无排名数据</span></div>';
                }
                return;
            }

            const ctx = els.rankingChart.getContext('2d');

            if (state.charts.ranking) {
                state.charts.ranking.destroy();
            }

            // 显示所有供应商
            const labels = annualRankings.map(r => r.entityName);
            const data = annualRankings.map(r => r.totalScore);
            const colors = annualRankings.map(r => {
                if (r.totalScore >= 95) return 'rgba(16, 185, 129, 0.8)';
                if (r.totalScore >= 85) return 'rgba(245, 158, 11, 0.8)';
                if (r.totalScore >= 70) return 'rgba(249, 115, 22, 0.8)';
                return 'rgba(239, 68, 68, 0.8)';
            });

            state.charts.ranking = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '年度平均分',
                        data: data,
                        backgroundColor: colors,
                        borderColor: colors.map(c => c.replace('0.8', '1')),
                        borderWidth: 2,
                        borderRadius: 4
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleFont: {
                                size: 14,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: 12
                            },
                            padding: 12,
                            cornerRadius: 6,
                            callbacks: {
                                label: function(context) {
                                    return `平均得分: ${context.parsed.x.toFixed(1)}分`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            min: 0,
                            max: 100,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            },
                            ticks: {
                                font: {
                                    size: 11
                                },
                                callback: function(value) {
                                    return value + '分';
                                }
                            }
                        },
                        y: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 12
                                },
                                autoSkip: false,
                                maxRotation: 0,
                                minRotation: 0
                            }
                        }
                    }
                }
            });
        },

        // 渲染绩效等级分布饼图
        renderGradePieChart() {
            const { statistics } = state.resultsData;

            if (!statistics) return;

            const ctx = els.gradePieChart.getContext('2d');

            if (state.charts.gradePie) {
                state.charts.gradePie.destroy();
            }

            const data = [
                statistics.gradeCount['优秀'] || 0,
                statistics.gradeCount['合格'] || 0,
                statistics.gradeCount['整改后合格'] || 0,
                statistics.gradeCount['不合格'] || 0
            ];

            const total = data.reduce((a, b) => a + b, 0);

            if (total === 0) {
                // 显示空状态
                if (els.gradePieChart) {
                    els.gradePieChart.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #718096;"><i class="ph ph-chart-pie-slice" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i><span style="font-size: 14px;">暂无等级数据</span></div>';
                }
                return;
            }

            state.charts.gradePie = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['优秀', '合格', '整改后合格', '不合格'],
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(249, 115, 22, 0.8)',
                            'rgba(239, 68, 68, 0.8)'
                        ],
                        borderColor: '#ffffff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: {
                                    size: 12
                                },
                                padding: 12,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleFont: {
                                size: 14,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: 12
                            },
                            padding: 12,
                            cornerRadius: 6,
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed;
                                    const percentage = ((value / total) * 100).toFixed(1);
                                    return `${context.label}: ${value}家 (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        },

        // 渲染单供应商趋势选择器
        renderVendorTrendSelect() {
            const { annualRankings } = state.resultsData;

            if (!annualRankings || annualRankings.length === 0) return;

            // 清空选择器
            if (els.trendVendorSelect) {
                els.trendVendorSelect.innerHTML = '<option value="">选择供应商查看趋势...</option>';

                // 添加所有供应商选项
                annualRankings.forEach(vendor => {
                    const option = document.createElement('option');
                    option.value = vendor.entityName;
                    option.textContent = vendor.entityName;
                    els.trendVendorSelect.appendChild(option);
                });

                // 绑定变化事件
                els.trendVendorSelect.addEventListener('change', () => {
                    this.renderVendorTrendChart();
                });
            }
        },

        // 渲染单供应商趋势图
        renderVendorTrendChart() {
            const selectedVendor = els.trendVendorSelect ? els.trendVendorSelect.value : null;
            const { details } = state.resultsData;

            if (!selectedVendor || !details || details.length === 0) {
                // 显示空状态
                if (els.vendorTrendChart) {
                    els.vendorTrendChart.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #718096;"><i class="ph ph-trend-up" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i><span style="font-size: 14px;">请选择供应商查看趋势</span></div>';
                }
                return;
            }

            // 筛选选中供应商的数据
            const vendorDetails = details.filter(d => d.entityName === selectedVendor);

            if (vendorDetails.length === 0) {
                if (els.vendorTrendChart) {
                    els.vendorTrendChart.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #718096;"><i class="ph ph-trend-up" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i><span style="font-size: 14px;">该供应商暂无评价数据</span></div>';
                }
                return;
            }

            // 按周期排序
            vendorDetails.sort((a, b) => {
                const dateA = new Date(a.period.startDate);
                const dateB = new Date(b.period.startDate);
                return dateA - dateB;
            });

            const ctx = els.vendorTrendChart.getContext('2d');

            if (state.charts.vendorTrend) {
                state.charts.vendorTrend.destroy();
            }

            const labels = vendorDetails.map(d => d.period.periodName);
            const data = vendorDetails.map(d => d.totalScore);

            state.charts.vendorTrend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: selectedVendor,
                        data: data,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: 'rgb(59, 130, 246)',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleFont: {
                                size: 14,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: 12
                            },
                            padding: 12,
                            cornerRadius: 6,
                            callbacks: {
                                label: function(context) {
                                    const index = context.dataIndex;
                                    const detail = vendorDetails[index];
                                    return [
                                        `得分: ${context.parsed.y.toFixed(1)}分`,
                                        `等级: ${detail.grade || '-'}`
                                    ];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 11
                                }
                            }
                        },
                        y: {
                            beginAtZero: false,
                            min: 60,
                            max: 100,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            },
                            ticks: {
                                font: {
                                    size: 11
                                },
                                callback: function(value) {
                                    return value + '分';
                                }
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        },

        // 打开底部抽屉
        openDrawer(vendorName) {
            if (!els.vendorTrendDrawer || !els.drawerOverlay) return;

            // 提取年份
            let year = '';
            const { details } = state.resultsData;
            if (details && details.length > 0) {
                const vendorDetails = details.filter(d => d.entityName === vendorName);
                if (vendorDetails.length > 0 && vendorDetails[0].period && vendorDetails[0].period.startDate) {
                    year = new Date(vendorDetails[0].period.startDate).getFullYear();
                }
            }

            // 设置供应商名称
            if (els.drawerVendorName) {
                els.drawerVendorName.textContent = `${vendorName} ${year}年绩效趋势`;
            }

            // 渲染趋势图
            this.renderDrawerTrendChart(vendorName);

            // 显示抽屉
            els.vendorTrendDrawer.classList.add('active');
            els.drawerOverlay.classList.add('active');
        },

        // 关闭底部抽屉
        closeDrawer() {
            if (!els.vendorTrendDrawer || !els.drawerOverlay) return;

            els.vendorTrendDrawer.classList.remove('active');
            els.drawerOverlay.classList.remove('active');
        },

        // 关闭详情模态框
        closeScoreDetailModal() {
            if (!els.scoreDetailModal || !els.scoreDetailOverlay) return;

            els.scoreDetailModal.classList.remove('active');
            els.scoreDetailOverlay.classList.remove('active');
        },

        // 显示评分详情模态框
        async showScoreDetailModal(vendorName, month) {
            // 确保配置已加载
            if (state.gradeRules.length === 0) {
                await this.loadConfig();
            }

            const { details, evaluations } = state.resultsData;

            if (!details || details.length === 0) {
                this.showToast('暂无评价数据', 'warning');
                return;
            }

            // 解析时间标识（月或季度）
            let vendorDetail;
            if (month.startsWith('Q')) {
                // 季度模式：匹配Q1-Q4
                const quarter = parseInt(month.replace('Q', ''));
                vendorDetail = details.find(d => {
                    if (d.entityName !== vendorName) return false;
                    if (!d.period || !d.period.startDate) return false;
                    if (d.period.periodType !== 'quarterly') return false;
                    const detailMonth = new Date(d.period.startDate).getMonth() + 1;
                    const detailQuarter = Math.ceil(detailMonth / 3);
                    return detailQuarter === quarter;
                });
            } else if (month === '年度') {
                // 年度模式
                vendorDetail = details.find(d => {
                    if (d.entityName !== vendorName) return false;
                    if (!d.period || !d.period.startDate) return false;
                    return d.period.periodType === 'yearly';
                });
            } else {
                // 月度模式
                const monthNum = parseInt(month.replace('月', ''));
                vendorDetail = details.find(d => {
                    if (d.entityName !== vendorName) return false;
                    if (!d.period || !d.period.startDate) return false;
                    const detailMonth = new Date(d.period.startDate).getMonth() + 1;
                    return detailMonth === monthNum;
                });
            }

            if (!vendorDetail) {
                this.showToast('该时段暂无评价数据', 'warning');
                return;
            }

            // 填充基本信息
            if (els.scoreDetailVendor) {
                els.scoreDetailVendor.textContent = vendorName;
            }
            if (els.scoreDetailPeriod) {
                els.scoreDetailPeriod.textContent = `${month}评价详情`;
            }

            // 填充总分
            if (els.scoreDetailTotal) {
                els.scoreDetailTotal.textContent = vendorDetail.totalScore 
                    ? vendorDetail.totalScore.toFixed(1) 
                    : '-';
            }

            // 填充等级
            if (els.scoreDetailGrade) {
                const grade = vendorDetail.grade || '-';
                els.scoreDetailGrade.textContent = grade;
                const gradeColor = this.getGradeColorByName(grade);
                els.scoreDetailGrade.style.background = gradeColor;
            }

            // 填充策略
            if (els.scoreDetailStrategy) {
                const strategy = this.getGradeStrategyByName(vendorDetail.grade);
                els.scoreDetailStrategy.textContent = strategy || '';
                els.scoreDetailStrategy.style.display = strategy ? 'block' : 'none';
            }

            // 填充维度得分
            if (els.scoreDetailDimensions) {
                let dimensionsHtml = '<h4>分项得分</h4>';
                
                const scores = vendorDetail.scores || {};
                
                if (state.dimensions && state.dimensions.length > 0) {
                    // 使用配置中的维度
                    state.dimensions.forEach(dim => {
                        const score = scores[dim.key];
                        const displayScore = score !== undefined && score !== null 
                            ? score.toFixed(1) 
                            : '-';
                        const icon = this.getDimensionIcon(dim.key);
                        dimensionsHtml += `
                            <div class="performance__score-detail-dimension">
                                <span class="performance__score-detail-dimension-name">
                                    <i class="ph ${icon}"></i>
                                    ${dim.name}
                                </span>
                                <span class="performance__score-detail-dimension-score">${displayScore}</span>
                            </div>
                        `;
                    });
                } else if (Object.keys(scores).length > 0) {
                    // 如果没有配置，使用scores中的键
                    Object.keys(scores).forEach(key => {
                        const score = scores[key];
                        const displayScore = score !== undefined && score !== null 
                            ? score.toFixed(1) 
                            : '-';
                        const icon = this.getDimensionIcon(key);
                        const name = this.getDimensionName(key);
                        dimensionsHtml += `
                            <div class="performance__score-detail-dimension">
                                <span class="performance__score-detail-dimension-name">
                                    <i class="ph ${icon}"></i>
                                    ${name}
                                </span>
                                <span class="performance__score-detail-dimension-score">${displayScore}</span>
                            </div>
                        `;
                    });
                } else {
                    dimensionsHtml += '<p style="color: #718096; font-size: 0.875rem;">暂无分项得分数据</p>';
                }

                els.scoreDetailDimensions.innerHTML = dimensionsHtml;
            }

            // 填充备注
            if (els.scoreDetailRemarksText) {
                els.scoreDetailRemarksText.textContent = vendorDetail.remarks || '无';
            }

            // 填充等级策略列表
            if (els.scoreDetailGradeStrategiesList && state.gradeRules && state.gradeRules.length > 0) {
                let gradeStrategiesHtml = '';
                const sortedRules = [...state.gradeRules].sort((a, b) => a.min - b.min);
                sortedRules.forEach(rule => {
                    const scoreRange = rule.max === 100 ? `≥${rule.min}分` : `${rule.min}-${rule.max}分`;
                    gradeStrategiesHtml += `<div class="performance__grade-strategy-item">`;
                    gradeStrategiesHtml += `<strong>${rule.label}(${scoreRange}):</strong> ${rule.strategy || '无'}`;
                    gradeStrategiesHtml += `</div>`;
                });
                els.scoreDetailGradeStrategiesList.innerHTML = gradeStrategiesHtml;
            } else if (els.scoreDetailGradeStrategiesList) {
                els.scoreDetailGradeStrategiesList.innerHTML = '<div class="performance__grade-strategy-item">暂无等级策略配置</div>';
            }

            // 显示模态框
            if (els.scoreDetailModal && els.scoreDetailOverlay) {
                els.scoreDetailModal.classList.add('active');
                els.scoreDetailOverlay.classList.add('active');
            }
        },

        // 获取维度图标
        getDimensionIcon(key) {
            const iconMap = {
                'quality': 'ph-medal',
                'delivery': 'ph-truck',
                'service': 'ph-hand-heart',
                'cost': 'ph-currency-cny',
                'technical': 'ph-wrench'
            };
            return iconMap[key] || 'ph-star';
        },

        // 获取维度名称
        getDimensionName(key) {
            const nameMap = {
                'quality': '质量',
                'delivery': '交付',
                'service': '服务',
                'cost': '成本',
                'technical': '技术'
            };
            return nameMap[key] || key;
        },

        // 渲染全供应商绩效趋势图
        renderOverallTrendChart() {
            const { details } = state.resultsData;

            if (!els.overallTrendChart || !details || details.length === 0) {
                if (els.overallTrendChart) {
                    els.overallTrendChart.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #718096;"><i class="ph ph-trend-up" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i><span style="font-size: 14px;">暂无数据</span></div>';
                }
                return;
            }

            // 构建每月所有供应商的平均分
            const monthScores = new Map();
            const monthCounts = new Map();

            details.forEach(detail => {
                // 只统计有分数的记录
                if (detail.period && detail.period.startDate && detail.totalScore !== null && detail.totalScore !== undefined) {
                    let timeKey;
                    
                    if (detail.period.periodType === 'quarterly') {
                        const month = new Date(detail.period.startDate).getMonth() + 1;
                        const quarter = Math.ceil(month / 3);
                        timeKey = `Q${quarter}`;
                    } else if (detail.period.periodType === 'yearly') {
                        timeKey = '年度';
                    } else {
                        timeKey = new Date(detail.period.startDate).getMonth() + 1;
                    }
                    
                    const score = detail.totalScore;

                    if (!monthScores.has(timeKey)) {
                        monthScores.set(timeKey, 0);
                        monthCounts.set(timeKey, 0);
                    }
                    monthScores.set(timeKey, monthScores.get(timeKey) + score);
                    monthCounts.set(timeKey, monthCounts.get(timeKey) + 1);
                }
            });

            // 计算每时段平均分
            const labels = [];
            const data = [];
            
            // 检查是否有季度数据
            const hasQuarterly = monthScores.has('Q1') || monthScores.has('Q2') || monthScores.has('Q3') || monthScores.has('Q4');
            const hasYearly = monthScores.has('年度');
            
            if (hasQuarterly) {
                // 季度模式
                for (let i = 1; i <= 4; i++) {
                    const key = `Q${i}`;
                    labels.push(key);
                    if (monthScores.has(key) && monthCounts.get(key) > 0) {
                        data.push(monthScores.get(key) / monthCounts.get(key));
                    } else {
                        data.push(null);
                    }
                }
            } else if (hasYearly) {
                labels.push('年度');
                data.push(monthScores.get('年度') / monthCounts.get('年度'));
            } else {
                // 月度模式
                for (let i = 1; i <= 12; i++) {
                    labels.push(`${i}月`);
                    if (monthScores.has(i) && monthCounts.get(i) > 0) {
                        data.push(monthScores.get(i) / monthCounts.get(i));
                    } else {
                        data.push(null);
                    }
                }
            }

            // 销毁旧图表
            if (state.charts.overallTrend) {
                state.charts.overallTrend.destroy();
            }

            const ctx = els.overallTrendChart.getContext('2d');

            // 动态计算Y轴范围
            const validScores = data.filter(v => v !== null);
            let yMin = 0;
            let yMax = 100;
            if (validScores.length > 0) {
                const minScore = Math.min(...validScores);
                const maxScore = Math.max(...validScores);
                yMin = Math.floor(minScore / 5) * 5;
                yMax = Math.ceil(maxScore / 5) * 5;
                if (yMax - yMin < 20) {
                    const mid = (yMin + yMax) / 2;
                    yMin = Math.floor((mid - 10) / 5) * 5;
                    yMax = Math.ceil((mid + 10) / 5) * 5;
                }
            }

            state.charts.overallTrend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '平均得分',
                        data: data,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: 'rgb(59, 130, 246)',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            backgroundColor: 'rgba(30, 58, 138, 0.95)',
                            titleFont: {
                                size: 14,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: 13
                            },
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: function(context) {
                                    return `平均得分: ${context.parsed.y ? context.parsed.y.toFixed(1) : '-'}分`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 11
                                }
                            }
                        },
                        y: {
                            beginAtZero: false,
                            min: yMin,
                            max: yMax,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            },
                            ticks: {
                                font: {
                                    size: 11
                                },
                                callback: function(value) {
                                    return value + '分';
                                }
                            }
                        }
                    }
                }
            });
        },

        // 渲染抽屉中的供应商趋势图
        renderDrawerTrendChart(vendorName) {
            const { details } = state.resultsData;

            if (!details || details.length === 0) {
                if (els.drawerVendorTrendChart) {
                    els.drawerVendorTrendChart.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #718096;"><i class="ph ph-trend-up" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i><span style="font-size: 14px;">暂无数据</span></div>';
                }
                return;
            }

            // 筛选选中供应商的数据
            const vendorDetails = details.filter(d => d.entityName === vendorName);

            if (vendorDetails.length === 0) {
                if (els.drawerVendorTrendChart) {
                    els.drawerVendorTrendChart.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #718096;"><i class="ph ph-trend-up" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i><span style="font-size: 14px;">该供应商暂无评价数据</span></div>';
                }
                return;
            }

            // 按周期排序
            vendorDetails.sort((a, b) => {
                const dateA = new Date(a.period.startDate);
                const dateB = new Date(b.period.startDate);
                return dateA - dateB;
            });

            // 提取年份
            let year = '';
            if (vendorDetails.length > 0 && vendorDetails[0].period && vendorDetails[0].period.startDate) {
                year = new Date(vendorDetails[0].period.startDate).getFullYear();
            }

            // 构建时间数据映射，包含环比变化
            const timeDataMap = new Map();
            let prevScore = null;
            vendorDetails.forEach(detail => {
                if (detail.period && detail.period.startDate) {
                    let timeKey;
                    
                    if (detail.period.periodType === 'quarterly') {
                        const month = new Date(detail.period.startDate).getMonth() + 1;
                        const quarter = Math.ceil(month / 3);
                        timeKey = `Q${quarter}`;
                    } else if (detail.period.periodType === 'yearly') {
                        timeKey = '年度';
                    } else {
                        timeKey = new Date(detail.period.startDate).getMonth() + 1;
                    }
                    
                    const currentScore = detail.totalScore;
                    let change = null;
                    
                    if (prevScore !== null && prevScore !== undefined) {
                        change = currentScore - prevScore;
                    }
                    
                    timeDataMap.set(timeKey, {
                        score: currentScore,
                        grade: detail.grade,
                        change: change,
                        prevScore: prevScore
                    });
                    prevScore = currentScore;
                }
            });

            const ctx = els.drawerVendorTrendChart.getContext('2d');

            if (state.charts.drawerVendorTrend) {
                state.charts.drawerVendorTrend.destroy();
            }

            // 生成时间标签和数据
            const labels = [];
            const data = [];
            const changes = [];
            
            // 检查是否有季度数据
            const hasQuarterly = Array.from(timeDataMap.keys()).some(k => k.startsWith('Q'));
            const hasYearly = timeDataMap.has('年度');
            
            if (hasQuarterly) {
                // 季度模式
                for (let i = 1; i <= 4; i++) {
                    const key = `Q${i}`;
                    labels.push(key);
                    if (timeDataMap.has(key)) {
                        const info = timeDataMap.get(key);
                        data.push(info.score);
                        changes.push(info.change);
                    } else {
                        data.push(null);
                        changes.push(null);
                    }
                }
            } else if (hasYearly) {
                // 年度模式
                labels.push('年度');
                if (timeDataMap.has('年度')) {
                    const info = timeDataMap.get('年度');
                    data.push(info.score);
                    changes.push(null);
                } else {
                    data.push(null);
                    changes.push(null);
                }
            } else {
                // 月度模式
                for (let i = 1; i <= 12; i++) {
                    labels.push(`${i}月`);
                    if (timeDataMap.has(i)) {
                        const info = timeDataMap.get(i);
                        data.push(info.score);
                        changes.push(info.change);
                    } else {
                        data.push(null);
                        changes.push(null);
                    }
                }
            }

            // 动态计算Y轴范围
            const validScores = data.filter(v => v !== null);
            let yMin = 0;
            let yMax = 100;
            if (validScores.length > 0) {
                const minScore = Math.min(...validScores);
                const maxScore = Math.max(...validScores);
                // 向下取整到5的倍数，向上取整到5的倍数
                yMin = Math.floor(minScore / 5) * 5;
                yMax = Math.ceil(maxScore / 5) * 5;
                // 确保至少有20分的跨度
                if (yMax - yMin < 20) {
                    const mid = (yMin + yMax) / 2;
                    yMin = Math.floor((mid - 10) / 5) * 5;
                    yMax = Math.ceil((mid + 10) / 5) * 5;
                }
            }

            state.charts.drawerVendorTrend = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: vendorName,
                        data: data,
                        changes: changes, // 存储变化数据
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: function(context) {
                            const index = context.dataIndex;
                            const change = changes[index];
                            if (change === null || change === undefined) return 'rgb(59, 130, 246)';
                            if (change > 0.5) return '#16a34a'; // 绿色 - 上升
                            if (change < -0.5) return '#dc2626'; // 红色 - 下降
                            return 'rgb(59, 130, 246)'; // 蓝色 - 持平
                        },
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            backgroundColor: 'rgba(30, 58, 138, 0.95)',
                            titleFont: {
                                size: 14,
                                weight: 'bold',
                                family: 'Fira Code, monospace'
                            },
                            bodyFont: {
                                size: 13,
                                family: 'Fira Code, monospace'
                            },
                            padding: 14,
                            cornerRadius: 8,
                            callbacks: {
                                title: function(context) {
                                    return context[0].label;
                                },
                                label: function(context) {
                                    const index = context.dataIndex;
                                    const change = changes[index];
                                    const monthInfo = monthDataMap.get(index + 1);
                                    const grade = monthInfo ? monthInfo.grade : '-';
                                    
                                    const lines = [
                                        `得分: ${context.parsed.y.toFixed(1)}分`,
                                        `等级: ${grade || '-'}`
                                    ];
                                    
                                    if (change !== null && change !== undefined) {
                                        let changeText = '';
                                        let changeColor = '';
                                        if (change > 0.5) {
                                            changeText = `↑${change.toFixed(1)} (vs ${index}月)`;
                                            changeColor = '#22c55e';
                                        } else if (change < -0.5) {
                                            changeText = `↓${Math.abs(change).toFixed(1)} (vs ${index}月)`;
                                            changeColor = '#ef4444';
                                        } else {
                                            changeText = `→持平 (vs ${index}月)`;
                                            changeColor = '#6b7280';
                                        }
                                        lines.push('');
                                        lines.push(`环比: ${changeText}`);
                                    }
                                    
                                    return lines;
                                },
                                afterLabel: function(context) {
                                    return '';
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 11
                                }
                            }
                        },
                        y: {
                            beginAtZero: false,
                            min: yMin,
                            max: yMax,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            },
                            ticks: {
                                font: {
                                    size: 11
                                },
                                callback: function(value) {
                                    return value + '分';
                                }
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        },

        // 渲染表格（已删除，改用热力图）
        renderTable() {
            // 排名表格已删除，改用年度排名热力图
            // 不需要实现此方法
        },

        // 退出结果界面
        exitResults() {
            if (window.App && window.App.Modules && window.App.Modules.Performance && window.App.Modules.Performance.showConfirmDialog) {
                window.App.Modules.Performance.showConfirmDialog(
                    '确认返回',
                    '确定要返回评价周期列表吗？',
                    () => {
                        els.resultsInterface.classList.add('hidden');
                        document.getElementById('evaluationPeriodsList').classList.remove('hidden');
                        state.currentEvaluation = null;
                        state.resultsData = null;
                    }
                );
            } else if (confirm('确定要返回评价周期列表吗？')) {
                els.resultsInterface.classList.add('hidden');
                document.getElementById('evaluationPeriodsList').classList.remove('hidden');
                state.currentEvaluation = null;
                state.resultsData = null;
            }
        }
    };

    // 暴露到全局
    window.App = window.App || {};
    window.App.Modules = window.App.Modules || {};
    window.App.Modules.PerformanceDashboard = PerformanceDashboardModule;

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => PerformanceDashboardModule.init());
    } else {
        PerformanceDashboardModule.init();
    }
})();