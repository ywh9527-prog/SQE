// 图表模块
(function () {
    // 内部存储图表实例
    let charts = {
        monthlyTrend: null,
        supplierDefectRate: null,
        defectDistribution: null
    };

    const Charts = {
        // 显示所有图表
        displayCharts(data) {
            this.destroyCharts();
            this.renderMonthlyTrendChart(data);
            this.renderSupplierDefectRateChart(data);
            this.renderDefectDistributionChart(data);
            this.updateChartTitles(data.supplierFilter);
        },

        // 销毁现有图表
        destroyCharts() {
            if (charts.monthlyTrend) {
                charts.monthlyTrend.destroy();
                charts.monthlyTrend = null;
            }
            if (charts.supplierDefectRate) {
                charts.supplierDefectRate.destroy();
                charts.supplierDefectRate = null;
            }
            if (charts.defectDistribution) {
                charts.defectDistribution.destroy();
                charts.defectDistribution = null;
            }
        },

        // 渲染平均合格率趋势图
        renderMonthlyTrendChart(data) {
            const ctx = document.getElementById('monthlyTrendChart').getContext('2d');

            const allMonths = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
            const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

            const monthDataMap = {};
            data.monthlyTrend.forEach(item => {
                const monthKey = item.month.split('-')[1];
                if (allMonths.includes(monthKey)) {
                    // 确保 passRate 是数字类型，防止 toFixed 报错
                    const passRate = parseFloat(item.passRate) || 0;
                    const okValue = Math.round(passRate * item.total / 100);
                    monthDataMap[monthKey] = {
                        total: item.total,
                        ok: okValue,
                        passRate: passRate,
                        return: item.returnCount || 0,
                        special: item.specialCount || 0
                    };
                }
            });

            let cumulativeTotal = 0;
            let cumulativeOk = 0;
            const cumulativePassRates = [];

            allMonths.forEach(month => {
                const monthData = monthDataMap[month];
                if (monthData) {
                    cumulativeTotal += monthData.total;
                    cumulativeOk += monthData.ok;
                }

                const cumulativePassRate = cumulativeTotal > 0 ? (cumulativeOk / cumulativeTotal * 100) : 0;
                cumulativePassRates.push(parseFloat(cumulativePassRate.toFixed(2)));
            });

            charts.monthlyTrend = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: monthLabels,
                    datasets: [
                        {
                            label: '批次数',
                            data: allMonths.map(month => monthDataMap[month]?.total || null),
                            backgroundColor: 'rgba(52, 152, 219, 0.7)',
                            borderColor: 'rgba(52, 152, 219, 1)',
                            borderWidth: 1,
                            order: 1
                        },
                        {
                            label: '合格数',
                            data: allMonths.map(month => monthDataMap[month]?.ok || null),
                            backgroundColor: 'rgba(46, 204, 113, 0.7)',
                            borderColor: 'rgba(46, 204, 113, 1)',
                            borderWidth: 1,
                            stack: 'stack1',
                            order: 2
                        },
                        {
                            label: '特采数',
                            data: allMonths.map(month => monthDataMap[month]?.special || null),
                            backgroundColor: 'rgba(241, 196, 15, 0.7)',
                            borderColor: 'rgba(241, 196, 15, 1)',
                            borderWidth: 1,
                            stack: 'stack1',
                            order: 3
                        },
                        {
                            label: '批退数',
                            data: allMonths.map(month => monthDataMap[month]?.return || null),
                            backgroundColor: 'rgba(231, 76, 60, 0.7)',
                            borderColor: 'rgba(231, 76, 60, 1)',
                            borderWidth: 1,
                            stack: 'stack1',
                            order: 4
                        },
                        {
                            label: '当月合格率 (%)',
                            data: allMonths.map(month => monthDataMap[month]?.passRate || null),
                            type: 'line',
                            fill: false,
                            borderColor: 'rgba(46, 204, 113, 1)',
                            backgroundColor: 'rgba(46, 204, 113, 0.5)',
                            borderWidth: 2,
                            yAxisID: 'y1',
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            order: 10
                        },
                        {
                            label: '平均合格率 (%)',
                            data: cumulativePassRates,
                            type: 'line',
                            fill: false,
                            borderColor: 'rgba(155, 89, 182, 1)',
                            backgroundColor: 'rgba(155, 89, 182, 0.5)',
                            borderWidth: 2,
                            yAxisID: 'y1',
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            order: 11
                        }
                    ]
                },
                options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 1, // 强制正方形比例
                    layout: { padding: { top: 20, bottom: 20 } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: '批次数 / 合格数 / 特采数 / 批退数' },
                            stacked: true
                        },
                        y1: {
                            position: 'right',
                            min: 0,
                            max: 120,
                            title: { display: true, text: '合格率 (%)' },
                            grid: { drawOnChartArea: false },
                            ticks: { callback: value => value + '%' }
                        }
                    },
                    plugins: {
                        title: { display: true, text: '平均合格率趋势' },
                        legend: {
                            position: 'top',
                            labels: {
                                generateLabels: function (chart) {
                                    const original = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                                    return original.map(label => {
                                        if (['特采数', '批退数', '当月合格率 (%)', '平均合格率 (%)'].includes(label.text)) {
                                            return { ...label, pointStyle: 'line', rotation: 0 };
                                        }
                                        return label;
                                    });
                                }
                            }
                        }
                    }
                }
            });

            // 填充数据表
            this.populateMonthlyPassRateTable(monthDataMap, cumulativePassRates, monthLabels);

            return cumulativePassRates;
        },

        // 填充平均合格率趋势详细数据表
        populateMonthlyPassRateTable(monthDataMap, cumulativePassRates, monthLabels) {
            const tableBody = document.querySelector('#monthlyPassRateTable tbody');
            if (!tableBody) return;

            let cumulativeTotal = 0;
            let cumulativeOk = 0;
            let html = '';

            monthLabels.forEach((label, index) => {
                const month = String(index + 1).padStart(2, '0');
                const monthData = monthDataMap[month];
                
                if (monthData) {
                    cumulativeTotal += monthData.total;
                    cumulativeOk += monthData.ok;
                }

                const avgPassRate = cumulativeTotal > 0 ? (cumulativeOk / cumulativeTotal * 100).toFixed(2) : '0.00';

                if (monthData) {
                    // 确保 passRate 是数字类型后再调用 toFixed
                    const passRateValue = parseFloat(monthData.passRate) || 0;
                    html += `
                        <tr>
                            <td>${label}</td>
                            <td>${monthData.total}</td>
                            <td>${monthData.ok}</td>
                            <td>${monthData.special}</td>
                            <td>${monthData.return}</td>
                            <td>${passRateValue.toFixed(2)}%</td>
                            <td>${avgPassRate}%</td>
                        </tr>
                    `;
                } else {
                    html += `
                        <tr>
                            <td>${label}</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>-</td>
                            <td>${avgPassRate}%</td>
                        </tr>
                    `;
                }
            });

            tableBody.innerHTML = html;
        },

        // 🎯 [DATA-FLOW] 供应商良率排名图渲染 - 将API数据转换为柱状图
        // 📍 数据来源：data.supplierDefectRates
        // 🔗 前端显示：供应商良率排名柱状图
        renderSupplierDefectRateChart(data) {
            const ctx = document.getElementById('supplierDefectRateChart').getContext('2d');
            const allSuppliers = data.supplierRanking || [];
            const allSupplierNames = allSuppliers.map(item => item.supplier);
            const allYieldRates = allSuppliers.map(item => item.yieldRate);

            charts.supplierDefectRate = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: allSupplierNames,
                    datasets: [{
                        data: allYieldRates,
                        backgroundColor: allYieldRates.map(rate => {
                            if (rate >= 90) return 'rgba(46, 204, 113, 0.7)';
                            if (rate >= 70) return 'rgba(255, 165, 0, 0.7)';
                            return 'rgba(231, 76, 60, 0.7)';
                        }),
                        borderColor: allYieldRates.map(rate => {
                            if (rate >= 90) return 'rgba(46, 204, 113, 1)';
                            if (rate >= 70) return 'rgba(255, 165, 0, 1)';
                            return 'rgba(231, 76, 60, 1)';
                        }),
                        borderWidth: 2
                    }]
                },
                options: {
                    indexAxis: 'x',
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: { display: true, text: '供应商' },
                            ticks: {
                                font: { size: allSupplierNames.length > 20 ? 9 : 11 },
                                autoSkip: false,
                                maxRotation: 45,
                                minRotation: 45
                            }
                        },
                        y: {
                            title: { display: true, text: '良率 (%)' },
                            min: 0,
                            max: 120,
                            ticks: { callback: value => value + '%' }
                        }
                    },
                    plugins: {
                        title: { display: true, text: '供应商良率排名' },
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                generateLabels: function (chart) {
                                    return [
                                        { text: '90% - 100% 良率', fillStyle: 'rgba(46, 204, 113, 0.7)', strokeStyle: 'rgba(46, 204, 113, 1)', lineWidth: 2 },
                                        { text: '70% - 90% 良率', fillStyle: 'rgba(255, 165, 0, 0.7)', strokeStyle: 'rgba(255, 165, 0, 1)', lineWidth: 2 },
                                        { text: '70% 以下良率', fillStyle: 'rgba(231, 76, 60, 0.7)', strokeStyle: 'rgba(231, 76, 60, 1)', lineWidth: 2 }
                                    ];
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function (context) {
                                    const index = context.dataIndex;
                                    const originalData = allSuppliers[index];
                                    return [
                                        `良率: ${context.parsed.y}%`,
                                        `总批次数: ${originalData.total}`,
                                        `合格数: ${originalData.okCount}`,
                                        `排名: ${originalData.rank}`
                                    ];
                                }
                            }
                        }
                    }
                }
            });
        },

        // 🎯 [DATA-FLOW] 缺陷分布图渲染 - 将API数据转换为饼状图
        // 📍 数据来源：data.defectDistribution或data.supplierDefectDistribution
        // 🔗 前端显示：缺陷类型分布饼状图
        renderDefectDistributionChart(data) {
            const ctx = document.getElementById('defectDistributionChart').getContext('2d');
            let defectData = data.defectDistribution;
            if (data.supplierFilter && data.supplierDefectDistribution && data.supplierDefectDistribution.length > 0) {
                defectData = data.supplierDefectDistribution;
            }

            if (!defectData || defectData.length === 0) {
                const canvas = ctx.canvas;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.font = 'bold 24px Arial';
                ctx.fillStyle = '#7f8c8d';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('暂无缺陷数据', canvas.width / 2, canvas.height / 2);
                return;
            }

            const totalDefects = defectData.reduce((sum, item) => sum + item.count, 0);

            charts.defectDistribution = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: defectData.map(item => item.defectType),
                    datasets: [{
                        data: defectData.map(item => item.count),
                        backgroundColor: [
                            'rgba(231, 76, 60, 0.8)', 'rgba(52, 152, 219, 0.8)', 'rgba(241, 196, 15, 0.8)',
                            'rgba(46, 204, 113, 0.8)', 'rgba(155, 89, 182, 0.8)', 'rgba(243, 156, 18, 0.8)',
                            'rgba(230, 126, 34, 0.8)', 'rgba(235, 126, 184, 0.8)', 'rgba(113, 198, 117, 0.8)',
                            'rgba(133, 193, 233, 0.8)'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        title: { 
                            display: true, 
                            text: '缺陷类型分布',
                            font: { size: 18, weight: 'bold' },
                            padding: { top: 10, bottom: 20 }
                        },
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                font: { size: 14 },
                                padding: 15,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        tooltip: {
                            titleFont: { size: 14 },
                            bodyFont: { size: 13 },
                            padding: 12,
                            callbacks: {
                                label: function (context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const percentage = totalDefects > 0 ? ((value / totalDefects) * 100).toFixed(1) : 0;
                                    return `${label}: ${value}次 (${percentage}%)`;
                                }
                            }
                        }
                    },
                    layout: { padding: 25 }
                },
                plugins: [{
                    id: 'textLabels',
                    afterDatasetsDraw: function (chart) {
                        const ctx = chart.ctx;
                        chart.data.datasets.forEach((dataset, datasetIndex) => {
                            const meta = chart.getDatasetMeta(datasetIndex);
                            meta.data.forEach((element, index) => {
                                const data = dataset.data[index];
                                const percentage = totalDefects > 0 ? ((data / totalDefects) * 100).toFixed(1) : 0;
                                // ✅ 修复：使用更准确的元素中心位置
            const { x, y } = element.getCenterPoint();

            // 设置文字样式
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 添加文字阴影以提高可读性
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;

            // 绘制文字标签，调整间距
            ctx.fillText(`${data}次`, x, y - 10);
            ctx.fillText(`${percentage}%`, x, y + 10);

            // 重置阴影
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
                            });
                        });
                    }
                }]
            });
        },

        // 更新图表标题
        updateChartTitles(supplierFilter) {
            if (charts.monthlyTrend) {
                charts.monthlyTrend.options.plugins.title.text = supplierFilter ? `平均合格率趋势（${supplierFilter}）` : '平均合格率趋势';
                charts.monthlyTrend.update();
            }
            if (charts.supplierDefectRate) {
                charts.supplierDefectRate.options.plugins.title.text = supplierFilter ? `供应商良率排名（${supplierFilter}）` : '供应商良率排名';
                charts.supplierDefectRate.update();
            }
            if (charts.defectDistribution) {
                charts.defectDistribution.options.plugins.title.text = supplierFilter ? `缺陷类型分布（${supplierFilter}）` : '缺陷类型分布';
                charts.defectDistribution.update();
            }
        },

        // 计算累计合格率（辅助方法，供UI使用）
        calculateCumulativePassRates(monthlyTrendData) {
            const allMonths = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
            const monthDataMap = {};
            monthlyTrendData.forEach(item => {
                const monthKey = item.month.split('-')[1];
                if (allMonths.includes(monthKey)) {
                    const okValue = Math.round(item.passRate * item.total / 100);
                    monthDataMap[monthKey] = {
                        total: item.total,
                        ok: okValue
                    };
                }
            });

            let cumulativeTotal = 0;
            let cumulativeOk = 0;
            const cumulativePassRates = [];

            allMonths.forEach(month => {
                const monthData = monthDataMap[month];
                if (monthData) {
                    cumulativeTotal += monthData.total;
                    cumulativeOk += monthData.ok;
                }
                const cumulativePassRate = cumulativeTotal > 0 ? (cumulativeOk / cumulativeTotal * 100) : 0;
                cumulativePassRates.push(parseFloat(cumulativePassRate.toFixed(2)));
            });
            return cumulativePassRates;
        }
    };

    window.App = window.App || {};
    window.App.Charts = Charts;
})();
