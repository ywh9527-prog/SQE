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
        charts: {
            ranking: null,
            gradePie: null
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
            els.vendorCardsRanking = document.getElementById('vendorCardsRanking');
            // 趋势分析
            els.trendVendorSelect = document.getElementById('trendVendorSelect');
            els.vendorTrendChart = document.getElementById('vendorTrendChart');
            els.trendList = document.getElementById('trendList');
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

            // 生成月份列表（1-12月）
            const months = [];
            for (let i = 1; i <= 12; i++) {
                months.push(`${i}月`);
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

                    // 假设detail中有period信息，需要根据period的startDate判断月份
                    if (detail.period && detail.period.startDate) {
                        const month = new Date(detail.period.startDate).getMonth() + 1;
                        const monthKey = `${month}月`;
                        vendorScores.get(vendorName).set(monthKey, detail.totalScore);
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
            heatmapHtml += '<th style="padding: 8px; background: #f8fafc; min-width: 150px;">供应商</th>';
            months.forEach(month => {
                heatmapHtml += `<th style="padding: 8px; background: #f8fafc; text-align: center; width: 70px;">${month}</th>`;
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

                // 供应商名称
                heatmapHtml += `<td style="padding: 8px; font-weight: 500;">${vendor}</td>`;

                // 月份分数
                const scores = vendorScores.get(vendor);
                months.forEach(month => {
                    const score = scores.get(month);
                    if (score !== undefined && score !== null) {
                        // 从配置获取颜色
                        const scoreColor = this.getScoreColor(score);
                        heatmapHtml += `<td style="padding: 8px; text-align: center;">
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
                        <td colspan="${months.length + 5}" style="padding: 0; border: none;">
                            <div class="performance__heatmap-unevaluated-section">
                                <div class="performance__heatmap-unevaluated-header performance__collapsed" id="unevaluatedHeader">
                                    <h4><i class="ph ph-warning-circle"></i> 未评价供应商 (${vendorsWithoutData.length}家)</h4>
                                    <i class="ph ph-caret-down performance__toggle-icon"></i>
                                </div>
                                <div class="performance__heatmap-unevaluated-body" id="unevaluatedBody">
                                    <table style="width: 100%; border-collapse: collapse;">
                                        <thead><tr>
                                            <th style="padding: 8px; background: #f8fafc; width: 60px;">排名</th>
                                            <th style="padding: 8px; background: #f8fafc; min-width: 150px;">供应商</th>
                                            ${months.map(m => `<th style="padding: 8px; background: #f8fafc; text-align: center; width: 70px;">${m}</th>`).join('')}
                                            <th style="padding: 8px; background: #f8fafc; text-align: center; width: 80px;">年度平均分</th>
                                            <th style="padding: 8px; background: #f8fafc; text-align: center; width: 60px;">等级</th>
                                        </tr></thead>
                                        <tbody>
                `;

                vendorsWithoutData.forEach((vendor, index) => {
                    heatmapHtml += '<tr>';
                    // 排名列 - 60px
                    heatmapHtml += `<td style="padding: 8px; text-align: center; width: 60px;">
                        <span class="performance__heatmap-rank-badge" style="background: #9ca3af;">-</span>
                    </td>`;
                    // 供应商名称列 - min-width 150px
                    heatmapHtml += `<td style="padding: 8px; font-weight: 500; color: #6b7280; min-width: 150px;">${vendor}</td>`;
                    // 月份列 - 70px each
                    months.forEach(() => {
                        heatmapHtml += `<td style="padding: 8px; text-align: center; width: 70px;">
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
        },

        // 显示结果界面
        showResultsInterface() {
            els.resultsTitle.textContent = `${state.currentEvaluation.period_name} - 评价结果`;
            els.resultsPeriod.textContent = `${state.currentEvaluation.start_date} 至 ${state.currentEvaluation.end_date}`;

            els.resultsInterface.classList.remove('hidden');
            document.getElementById('evaluationPeriodsList').classList.add('hidden');
            document.getElementById('evaluationInterface').classList.add('hidden');
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
            this.renderVendorCards();
            this.renderVendorTrendSelect();
            this.renderVendorTrendChart();
            this.renderTrendImprovement();
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

        // 渲染供应商卡片（Top5/Bottom5）
        renderVendorCards() {
            const { annualRankings } = state.resultsData;

            if (!annualRankings || annualRankings.length === 0) {
                if (els.vendorCardsRanking) {
                    els.vendorCardsRanking.innerHTML = '<div style="text-align: center; padding: 2rem; color: #718096;">暂无数据</div>';
                }
                return;
            }

            const top5 = annualRankings.slice(0, 5);
            const bottom5 = annualRankings.slice(-5).reverse();

            const getGradeInfo = (score) => {
                if (score >= 95) return { grade: '优秀', class: 'success' };
                if (score >= 85) return { grade: '合格', class: 'success' };
                if (score >= 70) return { grade: '整改后合格', class: 'warning' };
                return { grade: '不合格', class: 'danger' };
            };

            const top5Html = top5.map(vendor => {
                const gradeInfo = getGradeInfo(vendor.totalScore);
                return `
                    <div class="performance__vendor-card top">
                        <div class="performance__vendor-card-header">
                            <span class="performance__vendor-card-title">${vendor.entityName}</span>
                            <span class="performance__vendor-card-badge ${gradeInfo.class}">${gradeInfo.grade}</span>
                        </div>
                        <div class="performance__vendor-card-score">${vendor.totalScore.toFixed(1)}</div>
                        <div class="performance__vendor-card-meta">年度平均分</div>
                    </div>
                `;
            }).join('');

            const bottom5Html = bottom5.map(vendor => {
                const gradeInfo = getGradeInfo(vendor.totalScore);
                return `
                    <div class="performance__vendor-card bottom">
                        <div class="performance__vendor-card-header">
                            <span class="performance__vendor-card-title">${vendor.entityName}</span>
                            <span class="performance__vendor-card-badge ${gradeInfo.class}">${gradeInfo.grade}</span>
                        </div>
                        <div class="performance__vendor-card-score">${vendor.totalScore.toFixed(1)}</div>
                        <div class="performance__vendor-card-meta">年度平均分</div>
                    </div>
                `;
            }).join('');

            const cardsHtml = `
                <div>
                    <h4 style="margin-bottom: var(--border-radius-md); color: var(--success); font-size: 1rem; font-weight: 600;">
                        <i class="ph ph-trophy"></i> Top 5 优秀供应商
                    </h4>
                    ${top5Html}
                </div>
                <div>
                    <h4 style="margin-bottom: var(--border-radius-md); color: var(--danger); font-size: 1rem; font-weight: 600;">
                        <i class="ph ph-warning-circle"></i> Bottom 5 待改进供应商
                    </h4>
                    ${bottom5Html}
                </div>
            `;

            if (els.vendorCardsRanking) {
                els.vendorCardsRanking.innerHTML = cardsHtml;
            }
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

        // 渲染改进/恶化识别
        renderTrendImprovement() {
            const { details, annualRankings } = state.resultsData;

            if (!details || details.length === 0) {
                if (els.trendList) {
                    els.trendList.innerHTML = '<div style="text-align: center; padding: 2rem; color: #718096;">暂无数据</div>';
                }
                return;
            }

            // 计算每个供应商在相邻周期之间的得分变化
            const vendorChanges = new Map();

            details.forEach(detail => {
                const vendorName = detail.entityName;
                if (!vendorChanges.has(vendorName)) {
                    vendorChanges.set(vendorName, []);
                }
                vendorChanges.get(vendorName).push({
                    periodName: detail.period.periodName,
                    score: detail.totalScore,
                    date: new Date(detail.period.startDate)
                });
            });

            // 按日期排序
            vendorChanges.forEach((changes, vendorName) => {
                changes.sort((a, b) => a.date - b.date);
            });

            // 计算改进和恶化
            const improvements = [];
            const worsenings = [];

            vendorChanges.forEach((changes, vendorName) => {
                // 【关键修复】过滤掉没有分数的月份数据
                // 原因：某些供应商可能某月没有来料记录，导致该月分数为 null
                // 影响：如果不过滤，prevScore 或 lastScore 可能为 null，导致 toFixed() 调用报错
                // 解决：使用 validChanges 只保留有有效分数的月份
                const validChanges = changes.filter(change => change.score !== null);

                // 只有2个以上有效分数才能计算趋势变化（需要至少2个月份对比）
                if (validChanges.length >= 2) {
                    // 取最后2个有效月份计算趋势
                    const lastScore = validChanges[validChanges.length - 1].score;
                    const prevScore = validChanges[validChanges.length - 2].score;

                    // 计算得分变化（当前期 - 上一期）
                    const change = lastScore - prevScore;

                    // 得分提升超过5分视为改进
                    if (change > 5) {
                        improvements.push({
                            vendorName,
                            prevScore,
                            lastScore,
                            change: change.toFixed(1),
                            lastPeriod: validChanges[validChanges.length - 1].periodName
                        });
                    } else if (change < -5) {
                        // 得分下降超过5分视为恶化
                        worsenings.push({
                            vendorName,
                            prevScore,
                            lastScore,
                            change: change.toFixed(1),
                            lastPeriod: validChanges[validChanges.length - 1].periodName
                        });
                    }
                }
            });

            // 渲染列表
            let trendListHtml = '';

            if (improvements.length > 0) {
                trendListHtml += '<h4 style="margin-bottom: var(--border-radius-md); color: var(--success); font-size: 0.875rem; font-weight: 600;">📈 改进供应商</h4>';
                improvements.forEach(item => {
                    trendListHtml += `
                        <div class="trend-item improved">
                            <div class="trend-item-info">
                                <div class="trend-item-name">${item.vendorName}</div>
                                <div class="trend-item-change">${item.lastPeriod}: ${item.prevScore.toFixed(1)}分 → ${item.lastScore.toFixed(1)}分</div>
                            </div>
                            <div class="trend-item-badge success">
                                <i class="ph ph-arrow-up"></i>
                                +${item.change}分
                            </div>
                        </div>
                    `;
                });
            }

            if (worsenings.length > 0) {
                if (improvements.length > 0) {
                    trendListHtml += '<div style="margin-top: var(--border-radius-md);"></div>';
                }
                trendListHtml += '<h4 style="margin-bottom: var(--border-radius-md); color: var(--danger); font-size: 0.875rem; font-weight: 600;">📉 恶化供应商</h4>';
                worsenings.forEach(item => {
                    trendListHtml += `
                        <div class="trend-item worsened">
                            <div class="trend-item-info">
                                <div class="trend-item-name">${item.vendorName}</div>
                                <div class="trend-item-change">${item.lastPeriod}: ${item.prevScore.toFixed(1)}分 → ${item.lastScore.toFixed(1)}分</div>
                            </div>
                            <div class="trend-item-badge danger">
                                <i class="ph ph-arrow-down"></i>
                                ${item.change}分
                            </div>
                        </div>
                    `;
                });
            }

            if (improvements.length === 0 && worsenings.length === 0) {
                trendListHtml = '<div style="text-align: center; padding: 2rem; color: #718096;">暂无明显改进或恶化的供应商</div>';
            }

            if (els.trendList) {
                els.trendList.innerHTML = trendListHtml;
            }
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