/**
 * 供应商绩效评价主界面模块
 * 负责展示评价结果、统计数据、图表
 */
(function() {
    // 模块状态
    const state = {
        currentEvaluation: null,
        resultsData: null,
        charts: {
            trend: null,
            grade: null,
            radar: null
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

        // 缓存 DOM 元素
        cacheElements() {
            els.resultsInterface = document.getElementById('resultsInterface');
            els.resultsTitle = document.getElementById('resultsTitle');
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
            els.trendChart = document.getElementById('trendChart');
            els.gradeChart = document.getElementById('gradeChart');
            els.radarChart = document.getElementById('radarChart');
            els.resultsTableBody = document.getElementById('resultsTableBody');
        },

        // 绑定事件
        bindEvents() {
            if (els.exitResultsBtn) {
                els.exitResultsBtn.addEventListener('click', () => this.exitResults());
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
                els.resultsTitle.textContent = '供应商月度评价';
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
            
            // 显示空状态表格
            if (els.resultsTableBody) {
                els.resultsTableBody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 3rem 1rem; color: #718096;">
                            <div style="margin-bottom: 1rem;">
                                <i class="ph ph-chart-bar" style="font-size: 48px; opacity: 0.5;"></i>
                            </div>
                            <div style="font-size: 16px; font-weight: 500; margin-bottom: 0.5rem;">暂无评价数据</div>
                            <div style="font-size: 14px;">请先创建评价周期开始评价</div>
                        </td>
                    </tr>
                `;
            }
        },

        // 渲染空状态图表
        renderEmptyCharts() {
            // 清空现有图表
            if (state.charts.trend) {
                state.charts.trend.destroy();
                state.charts.trend = null;
            }
            if (state.charts.grade) {
                state.charts.grade.destroy();
                state.charts.grade = null;
            }
            if (state.charts.radar) {
                state.charts.radar.destroy();
                state.charts.radar = null;
            }
            
            // 显示占位符
            if (els.trendChart) {
                els.trendChart.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #718096;"><i class="ph ph-trend-up" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i><span style="font-size: 14px;">暂无数据</span></div>';
            }
            if (els.gradeChart) {
                els.gradeChart.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #718096;"><i class="ph ph-chart-pie-slice" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i><span style="font-size: 14px;">暂无数据</span></div>';
            }
            if (els.radarChart) {
                els.radarChart.innerHTML = '<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #718096;"><i class="ph ph-polygon" style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;"></i><span style="font-size: 14px;">暂无数据</span></div>';
            }
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
                    this.renderTable();
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
            this.renderTrendChart();
            this.renderGradeChart();
            this.renderRadarChart();
        },

        // 渲染趋势图
        renderTrendChart() {
            // TODO: 实现趋势图渲染
            // 需要获取历史周期的平均得分数据
            console.log('渲染趋势图');
        },

        // 渲染等级分布图
        renderGradeChart() {
            const { statistics } = state.resultsData;
            const ctx = els.gradeChart.getContext('2d');

            if (state.charts.grade) {
                state.charts.grade.destroy();
            }

            state.charts.grade = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['优秀', '合格', '整改后合格', '不合格'],
                    datasets: [{
                        data: [
                            statistics.gradeCount['优秀'] || 0,
                            statistics.gradeCount['合格'] || 0,
                            statistics.gradeCount['整改后合格'] || 0,
                            statistics.gradeCount['不合格'] || 0
                        ],
                        backgroundColor: [
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(239, 68, 68, 0.8)'
                        ],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        },

        // 渲染雷达图
        renderRadarChart() {
            const { details } = state.resultsData;
            const top3 = details
                .sort((a, b) => b.totalScore - a.totalScore)
                .slice(0, 3);

            const ctx = els.radarChart.getContext('2d');

            if (state.charts.radar) {
                state.charts.radar.destroy();
            }

            const labels = top3.map(d => d.entityName);
            const dimensions = [];
            const datasets = [];

            // 提取维度数据
            const dimensionKeys = top3[0].scores ? Object.keys(top3[0].scores) : ['质量', '交付', '服务'];

            dimensionKeys.forEach((key, index) => {
                const dataset = {
                    label: key,
                    data: top3.map(d => d.scores[key] || 0),
                    backgroundColor: `rgba(${index * 60 + 20}, ${index * 80 + 40}, ${index * 100 + 60}, 0.2)`,
                    borderColor: `rgba(${index * 60 + 20}, ${index * 80 + 40}, ${index * 100 + 60}, 1)`,
                    borderWidth: 2
                };
                datasets.push(dataset);
            });

            state.charts.radar = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        },

        // 渲染表格
        renderTable() {
            const { details } = state.resultsData;
            
            // 按总分排序
            const sortedDetails = [...details].sort((a, b) => b.totalScore - a.totalScore);

            els.resultsTableBody.innerHTML = '';

            sortedDetails.forEach((detail, index) => {
                const row = document.createElement('tr');
                
                // 排名
                let rankHtml = '';
                if (index === 0) {
                    rankHtml = '<span class="rank-badge rank-1">1</span>';
                } else if (index === 1) {
                    rankHtml = '<span class="rank-badge rank-2">2</span>';
                } else if (index === 2) {
                    rankHtml = '<span class="rank-badge rank-3">3</span>';
                } else {
                    rankHtml = `<span class="rank-badge rank-other">${index + 1}</span>`;
                }

                // 分数颜色
                const scoreClass = detail.totalScore >= 95 ? 'score-high' 
                                  : detail.totalScore >= 85 ? 'score-medium' 
                                  : 'score-low';

                // 等级徽章
                const gradeClass = `grade-${detail.grade === '优秀' ? 'excellent' 
                                              : detail.grade === '合格' ? 'good' 
                                              : detail.grade === '整改后合格' ? 'improve' 
                                              : 'poor'}`;

                // 维度进度条
                const scores = detail.scores || {};
                const dimensionBars = Object.entries(scores).map(([key, value]) => {
                    const colorClass = key === '质量' ? 'quality' 
                                     : key === '交付' ? 'delivery' 
                                     : 'service';
                    return `<div class="dimension-bar">
                        <div class="dimension-fill ${colorClass}" style="width: ${value}%"></div>
                    </div>`;
                }).join('');

                row.innerHTML = `
                    <td class="rank-cell">${rankHtml}</td>
                    <td>${detail.entityName}</td>
                    <td class="score-cell">
                        <span class="score-value ${scoreClass}">${detail.totalScore !== null && detail.totalScore !== undefined ? detail.totalScore.toFixed(1) : '-'}</span>
                    </td>
                    <td>
                        <span class="grade-badge ${gradeClass}">${detail.grade || '-'}</span>
                    </td>
                    <td class="dimensions-cell">
                        ${dimensionBars}
                    </td>
                    <td class="trend-cell">
                        <span class="trend-flat">-</span>
                    </td>
                `;

                els.resultsTableBody.appendChild(row);
            });
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