// UI 模块
(function () {
    const UI = {
        elements: {
            loading: 'loading',
            results: 'results',
            error: 'error',
            errorMessage: 'errorMessage',
            supplierSearch: 'supplierSearch',
            sheetSelection: 'sheetSelection',
            sheetTabContainer: 'sheetTabContainer',
            supplierOptions: 'supplierOptions',
            monthlyData: 'monthlyData',
            cumulativePassRateTableBody: '#cumulativePassRateTable tbody',
            filterInfo: 'filter-info'
        },

        getElement(id) {
            return document.getElementById(id) || document.querySelector(id);
        },

        showLoading() {
            this.getElement(this.elements.loading).classList.remove('hidden');
            this.getElement(this.elements.results).classList.add('hidden');
            this.getElement(this.elements.error).classList.add('hidden');
            this.getElement(this.elements.supplierSearch).classList.add('hidden');
        },

        hideLoading() {
            this.getElement(this.elements.loading).classList.add('hidden');
        },

        showError(message) {
            this.getElement(this.elements.errorMessage).textContent = message;
            this.getElement(this.elements.error).classList.remove('hidden');
            this.hideLoading();
        },

        showResults() {
            this.getElement(this.elements.results).classList.remove('hidden');
            this.hideLoading();
        },

        showSheetSelection() {
            this.getElement(this.elements.sheetSelection).classList.remove('hidden');
            // 隐藏"上传并分析"按钮，避免与"开始分析"按钮混淆
            const uploadBtn = document.getElementById('uploadBtn');
            if (uploadBtn) uploadBtn.classList.add('hidden');
            this.hideLoading();
        },

        hideSheetSelection() {
            this.getElement(this.elements.sheetSelection).classList.add('hidden');
            // 恢复显示"上传并分析"按钮
            const uploadBtn = document.getElementById('uploadBtn');
            if (uploadBtn) uploadBtn.classList.remove('hidden');
        },

        showSupplierSearch() {
            this.getElement(this.elements.supplierSearch).classList.remove('hidden');
        },

        // 填充工作表选择
        fillSheetSelection(sheetNames, recommendedSheet) {
            const container = this.getElement(this.elements.sheetTabContainer);
            container.innerHTML = '';

            sheetNames.forEach(sheetName => {
                const tab = document.createElement('div');
                tab.className = 'sheet-tab';
                tab.textContent = sheetName;
                tab.dataset.sheetName = sheetName;

                if (sheetName === recommendedSheet) {
                    tab.classList.add('selected');
                }

                tab.addEventListener('click', function () {
                    document.querySelectorAll('.sheet-tab').forEach(t => t.classList.remove('selected'));
                    this.classList.add('selected');
                });

                container.appendChild(tab);
            });
        },

        // 获取选中的工作表
        getSelectedSheet() {
            const selectedTab = document.querySelector('.sheet-tab.selected');
            return selectedTab ? selectedTab.dataset.sheetName : null;
        },

        // 填充供应商列表
        populateSupplierDatalist(suppliers) {
            const datalist = this.getElement(this.elements.supplierOptions);
            datalist.innerHTML = '';
            suppliers.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier;
                datalist.appendChild(option);
            });
        },

        // 显示分析结果
        displayResults(data) {
            // 1. 显示汇总统计
            this.updateSummaryStats(data.summary);

            // 2. 显示周度对比
            this.updateWeekComparison(data.recentTwoWeeks);

            // 3. 显示月度数据
            this.displayMonthlyData(data.monthlyData, data.supplierFilter);

            // 4. 显示图表 (调用 Charts 模块)
            if (window.App && window.App.Charts) {
                window.App.Charts.displayCharts(data);

                // 填充平均合格率趋势表 (需要重新计算累计合格率，或从Charts模块获取)
                const cumulativePassRates = window.App.Charts.calculateCumulativePassRates(data.monthlyTrend);
                this.populateCumulativePassRateTable(data.monthlyTrend, cumulativePassRates);
            }

            // 5. 显示筛选信息
            this.updateFilterInfo(data.supplierFilter);
        },

        updateSummaryStats(summary) {
            document.getElementById('totalBatches').textContent = summary.totalBatches;
            document.getElementById('okBatches').textContent = summary.okBatches;
            document.getElementById('returnBatches').textContent = summary.returnBatches;
            document.getElementById('specialBatches').textContent = summary.specialBatches;
            document.getElementById('passRate').textContent = summary.overallPassRate + '%';
        },

        updateWeekComparison(recentTwoWeeks) {
            const els = {
                currentTotal: document.getElementById('currentWeekTotal'),
                currentOk: document.getElementById('currentWeekOk'),
                currentReturn: document.getElementById('currentWeekReturn'),
                currentSpecial: document.getElementById('currentWeekSpecial'),
                currentPassRate: document.getElementById('currentWeekPassRate'),
                prevTotal: document.getElementById('previousWeekTotal'),
                prevOk: document.getElementById('previousWeekOk'),
                prevReturn: document.getElementById('previousWeekReturn'),
                prevSpecial: document.getElementById('previousWeekSpecial'),
                prevPassRate: document.getElementById('previousWeekPassRate'),
                currentTitle: document.getElementById('currentPeriodTitle'),
                prevTitle: document.getElementById('previousPeriodTitle')
            };

            if (recentTwoWeeks) {
                if (els.currentTotal) els.currentTotal.textContent = recentTwoWeeks.currentWeek?.total ?? '-';
                if (els.currentOk) els.currentOk.textContent = recentTwoWeeks.currentWeek?.ok ?? '-';
                if (els.currentReturn) els.currentReturn.textContent = recentTwoWeeks.currentWeek?.return ?? '-';
                if (els.currentSpecial) els.currentSpecial.textContent = recentTwoWeeks.currentWeek?.special ?? '-';

                // 计算并显示本周合格率
                if (els.currentPassRate && recentTwoWeeks.currentWeek) {
                    const currentTotal = recentTwoWeeks.currentWeek.total || 0;
                    const currentOk = recentTwoWeeks.currentWeek.ok || 0;
                    const currentPassRate = currentTotal > 0 ? ((currentOk / currentTotal) * 100).toFixed(2) : 0;
                    els.currentPassRate.textContent = currentPassRate + '%';
                }

                if (els.prevTotal) els.prevTotal.textContent = recentTwoWeeks.previousWeek?.total ?? '-';
                if (els.prevOk) els.prevOk.textContent = recentTwoWeeks.previousWeek?.ok ?? '-';
                if (els.prevReturn) els.prevReturn.textContent = recentTwoWeeks.previousWeek?.return ?? '-';
                if (els.prevSpecial) els.prevSpecial.textContent = recentTwoWeeks.previousWeek?.special ?? '-';

                // 计算并显示上周合格率
                if (els.prevPassRate && recentTwoWeeks.previousWeek) {
                    const prevTotal = recentTwoWeeks.previousWeek.total || 0;
                    const prevOk = recentTwoWeeks.previousWeek.ok || 0;
                    const prevPassRate = prevTotal > 0 ? ((prevOk / prevTotal) * 100).toFixed(2) : 0;
                    els.prevPassRate.textContent = prevPassRate + '%';
                }

                if (els.currentTitle) {
                    if (recentTwoWeeks.currentWeekStart && recentTwoWeeks.currentWeekEnd) {
                        els.currentTitle.textContent = `本周数据 (${this.formatDate(recentTwoWeeks.currentWeekStart)} 至 ${this.formatDate(recentTwoWeeks.currentWeekEnd)})`;
                    } else {
                        els.currentTitle.textContent = '本周数据 (上周五至本周四)';
                    }
                }
                if (els.prevTitle) {
                    if (recentTwoWeeks.previousWeekStart && recentTwoWeeks.previousWeekEnd) {
                        els.prevTitle.textContent = `上周数据 (${this.formatDate(recentTwoWeeks.previousWeekStart)} 至 ${this.formatDate(recentTwoWeeks.previousWeekEnd)})`;
                    } else {
                        els.prevTitle.textContent = '上周数据 (上上周五至上周四)';
                    }
                }
            } else {
                // Reset to defaults
                Object.values(els).forEach(el => { if (el && !el.id.includes('Title')) el.textContent = '-'; });
                if (els.currentTitle) els.currentTitle.textContent = '本周数据 (上周五至本周四)';
                if (els.prevTitle) els.prevTitle.textContent = '上周数据 (上上周五至上周四)';
                if (els.currentPassRate) els.currentPassRate.textContent = '-%';
                if (els.prevPassRate) els.prevPassRate.textContent = '-%';
            }
        },

        displayMonthlyData(monthlyData, supplierFilter) {
            const container = this.getElement(this.elements.monthlyData);
            container.innerHTML = '';

            const title = document.querySelector('#results .monthly-stats h3');
            if (title) {
                title.textContent = supplierFilter ? `月度统计 （供应商: ${supplierFilter}）` : '月度统计';
            }

            const sortedMonths = Object.keys(monthlyData).sort();
            if (sortedMonths.length === 0) {
                container.innerHTML = '<p>暂无月度数据</p>';
                return;
            }

            const grid = document.createElement('div');
            grid.className = 'monthly-stats-grid';

            sortedMonths.forEach(month => {
                const data = monthlyData[month];
                const div = document.createElement('div');
                div.className = 'monthly-record';
                div.dataset.month = month; // Store month for click handler

                const passRate = data.total > 0 ? (data.ok / data.total * 100).toFixed(2) : 0;

                div.innerHTML = `
                    <div class="monthly-summary">
                        <h4>${month}月 <span class="expand-icon">▼</span></h4>
                        <p>总批次数: ${data.total}</p>
                        <p>合格: <span style="color: #27ae60; font-weight: bold;">${data.ok}</span> | 不合格: <span style="color: #e74c3c; font-weight: bold;">${data.ng}</span></p>
                        <p>合格入库: ${data.pass} | 退货: ${data.return} | 特采: ${data.special}</p>
                        <p>合格率: <span style="font-weight: bold; color: ${passRate >= 95 ? '#27ae60' : passRate >= 85 ? '#f39c12' : '#e74c3c'};">${passRate}%</span></p>
                    </div>
                    <div class="month-details-container hidden" id="details-${month}">
                        <div class="loading-spinner-small hidden"></div>
                        <div class="details-content"></div>
                    </div>
                `;

                // Add click event listener
                div.querySelector('.monthly-summary').addEventListener('click', async () => {
                    const detailsContainer = div.querySelector(`#details-${month}`);
                    const expandIcon = div.querySelector('.expand-icon');
                    const detailsContent = detailsContainer.querySelector('.details-content');
                    const spinner = detailsContainer.querySelector('.loading-spinner-small');

                    // Toggle visibility
                    if (!detailsContainer.classList.contains('hidden')) {
                        detailsContainer.classList.add('hidden');
                        div.classList.remove('expanded'); // Remove expanded class
                        expandIcon.style.transform = 'rotate(0deg)';
                        return;
                    }

                    // Show container and rotate icon
                    detailsContainer.classList.remove('hidden');
                    div.classList.add('expanded'); // Add expanded class
                    expandIcon.style.transform = 'rotate(180deg)';

                    // If content is already loaded, don't fetch again
                    if (detailsContent.innerHTML.trim() !== '') {
                        return;
                    }

                    // Fetch details
                    spinner.classList.remove('hidden');
                    try {
                        // Get fileId from main.js state (need to access it globally or pass it)
                        // Assuming window.App.State.fileId is available or we need to find another way
                        // For now, let's try to find a way to access the fileId. 
                        // Since UI doesn't have direct access to state, we might need to trigger an event or use a global.
                        // Let's assume we can pass a callback or use a global for now, or better, 
                        // let's make sure main.js exposes the fileId.

                        // Actually, let's use a custom event to request details, handled in main.js?
                        // Or simpler: just access window.App.State if we expose it.
                        // Let's modify main.js to expose state or use a global variable for fileId if needed.
                        // But wait, main.js is inside a closure. 
                        // Let's dispatch an event that main.js listens to? 
                        // No, that's too complex for now.

                        // Let's try to use the API directly if we have the fileId.
                        // We can store fileId in a data attribute on the container when results are shown?
                        // Yes, let's update main.js to store fileId on the results container.

                        const fileId = document.getElementById('results').dataset.fileId;
                        if (!fileId) {
                            throw new Error('File ID not found');
                        }

                        const response = await window.App.API.getMonthDetails({
                            fileId: fileId,
                            month: month,
                            supplierName: supplierFilter // Pass current filter if any
                        });

                        this.renderMonthDetails(detailsContent, response.details);

                    } catch (error) {
                        console.error('Error fetching details:', error);
                        detailsContent.innerHTML = `<p class="error-text">加载失败: ${error.message}</p>`;
                    } finally {
                        spinner.classList.add('hidden');
                    }
                });

                grid.appendChild(div);
            });
            container.appendChild(grid);
        },

        renderMonthDetails(container, data) {
            if (!data || data.length === 0) {
                container.innerHTML = '<p>该月无详细数据</p>';
                return;
            }

            const table = document.createElement('table');
            table.className = 'month-details-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>日期</th>
                        <th>供应商</th>
                        <th>判定</th>
                        <th>处理</th>
                        <th>不良描述</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            `;

            const tbody = table.querySelector('tbody');
            data.forEach(item => {
                const tr = document.createElement('tr');
                const dateStr = new Date(item.time).toLocaleDateString('zh-CN');
                tr.innerHTML = `
                    <td>${dateStr}</td>
                    <td title="${item.supplier}">${item.supplier}</td>
                    <td class="${item.result === 'NG' ? 'status-ng' : 'status-ok'}">${item.result}</td>
                    <td>${item.action}</td>
                    <td title="${item.defectDetail || ''}">${item.defectDetail || '-'}</td>
                `;
                tbody.appendChild(tr);
            });

            container.appendChild(table);
        },

        populateCumulativePassRateTable(monthlyTrendData, cumulativePassRates) {
            const tbody = document.querySelector(this.elements.cumulativePassRateTableBody);
            if (!tbody) return;
            tbody.innerHTML = '';

            const allMonths = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
            const monthDataMap = {};
            monthlyTrendData.forEach(item => {
                const monthKey = item.month.split('-')[1];
                monthDataMap[monthKey] = item;
            });

            allMonths.forEach((month, index) => {
                const data = monthDataMap[month];
                if (data) {
                    const tr = document.createElement('tr');
                    const okCount = Math.round(data.passRate * data.total / 100);
                    tr.innerHTML = `
                        <td>${month}月</td>
                        <td>${data.total}</td>
                        <td>${okCount}</td>
                        <td>${data.specialCount || 0}</td>
                        <td>${data.returnCount || 0}</td>
                        <td>${Number(data.passRate).toFixed(2)}%</td>
                        <td>${Number(cumulativePassRates[index]).toFixed(2)}%</td>
                    `;
                    tbody.appendChild(tr);
                }
            });
        },

        updateFilterInfo(filter) {
            const h2 = document.querySelector('#results h2');
            const existingInfo = document.getElementById('filter-info');

            if (filter) {
                const html = `（${filter}）`;
                if (existingInfo) {
                    existingInfo.innerHTML = html;
                } else {
                    h2.innerHTML = `分析结果 <span id="filter-info" style="color: #3498db; font-size: 0.8em;">${html}</span>`;
                }
            } else if (existingInfo) {
                existingInfo.remove();
            }
        },

        formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
        }
    };

    window.App = window.App || {};
    window.App.UI = UI;
})();
