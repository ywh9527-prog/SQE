/**
 * IQC 模块控制器
 * 负责处理 IQC 数据分析页面的所有逻辑
 */

// 🎯 [CORE-CONFIG] 数据类型映射配置 - 修改类型名称请关注此处
// 📍 所有"外购/外协"显示都从这里获取
// 🔗 影响范围：提示消息、文件验证、数据显示
const TYPE_CONFIG = {
    // 数据类型到中文名称的映射
    NAMES: {
        purchase: '外购',
        external: '外协'
    },
    
    // 辅助函数：获取类型中文名称
    getName(dataType) {
        return this.NAMES[dataType] || '未知类型';
    }
};

(function () {
    // 模块状态
    const state = {
        uploadedFile: null,
        selectedSheetName: null,
        fileId: null,
        isInitialized: false,
        // 新增：数据源状态
        dataSourceStats: {
            purchase: null,
            external: null
        },
        currentDataType: null,  // 当前分析的数据类型
        // 新增：年份选择状态
        yearSelection: {
            purchase: '',
            external: '',
            availableYears: {
                purchase: [],
                external: []
            },
            isInitialized: false
        }
    };

    // DOM 元素缓存
    let els = {};

    const IQCModule = {
        // 初始化模块
        init() {
            if (state.isInitialized) return;

            console.log('IQC Module: Initializing...');
            this.cacheElements();
            this.bindEvents();
            this.loadHistory();
            this.loadLatestData();
            this.loadDataSourceStats().then(() => {
                // 在数据源统计加载完成后初始化年份选择器
                this.initializeYearSelector();
            });  // 新增：加载数据源统计
            state.isInitialized = true;
            console.log('IQC Module: Initialization complete');
        },

        // 缓存 DOM 元素
        cacheElements() {
            els = {
                uploadForm: document.getElementById('uploadForm'),
                fileInput: document.getElementById('excelFile'),
                uploadBtn: document.getElementById('uploadBtn'),
                sheetSelection: document.getElementById('sheetSelection'),
                sheetTabContainer: document.getElementById('sheetTabContainer'),
                confirmSheetBtn: document.getElementById('confirmSheetBtn'),
                loading: document.getElementById('loading'),
                results: document.getElementById('results'),
                error: document.getElementById('error'),
                errorMessage: document.getElementById('errorMessage'),
                supplierSearch: document.getElementById('supplierSearch'),
                searchSupplierBtn: document.getElementById('searchSupplierBtn'),
                showAllBtn: document.getElementById('showAllBtn'),
                supplierSearchInput: document.getElementById('supplierSearchInput'),
                supplierOptions: document.getElementById('supplierOptions'),
                customCompareBtn: document.getElementById('compareBtn'),
                resetBtn: document.getElementById('resetBtn'),
                // 日期输入框
                currentPeriodStart: document.getElementById('currentPeriodStart'),
                currentPeriodEnd: document.getElementById('currentPeriodEnd'),
                previousPeriodStart: document.getElementById('previousPeriodStart'),
                previousPeriodEnd: document.getElementById('previousPeriodEnd'),
                historySection: document.getElementById('historySection'),
                historyList: document.getElementById('historyList'),

                // 新增：数据源卡片相关元素
                dataSourceSection: document.querySelector('.iqc-data-source-section'),
                purchaseCard: document.querySelector('.data-card[data-type="purchase"]'),
                externalCard: document.querySelector('.data-card[data-type="external"]'),
                purchaseUpdateStatus: document.getElementById('purchase-update-status'),
                externalUpdateStatus: document.getElementById('external-update-status'),
                purchaseTotalCount: document.getElementById('purchase-total-count'),
                externalTotalCount: document.getElementById('external-total-count'),
                purchaseRecentCount: document.getElementById('purchase-recent-count'),
                externalRecentCount: document.getElementById('external-recent-count'),
                purchaseTimeRange: document.getElementById('purchase-time-range'),
                externalTimeRange: document.getElementById('external-time-range'),
                purchaseYearSelectCompact: document.getElementById('purchaseYearSelectCompact'),
                externalYearSelectCompact: document.getElementById('externalYearSelectCompact')
            };
            console.log('IQC Module: Elements cached', {
                form: !!els.uploadForm,
                input: !!els.fileInput,
                btn: !!els.uploadBtn,
                cards: !!(els.purchaseCard && els.externalCard)
            });
        },

        // 绑定事件
        bindEvents() {
            // 文件选择监听 (优化 UX: 选择文件后自动开始分析)
            if (els.fileInput) {
                console.log('IQC Module: Binding file input change event');
                els.fileInput.addEventListener('change', (e) => {
                    console.log('IQC Module: File selected', e.target.files[0]?.name);
                    const fileName = e.target.files[0]?.name;

                    // 用户期望：选择文件后自动开始分析
                    if (fileName) {
                        console.log('IQC Module: Auto-triggering upload...');
                        this.handleUpload({ preventDefault: () => { } });
                    }
                });
            }

            // 1. 上传按钮点击监听 (直接绑定 click，不依赖 form submit)
            if (els.uploadBtn) {
                console.log('IQC Module: Binding upload button click event');
                els.uploadBtn.addEventListener('click', (e) => {
                    console.log('IQC Module: Upload button clicked');
                    e.preventDefault();
                    this.handleUpload(e);
                });
            }

            // 保留 form submit 作为后备，防止回车提交等情况
            if (els.uploadForm) {
                els.uploadForm.addEventListener('submit', (e) => {
                    console.log('IQC Module: Form submit triggered');
                    e.preventDefault();
                    this.handleUpload(e);
                });
            }

            // 2. 确认工作表
            if (els.confirmSheetBtn) {
                els.confirmSheetBtn.addEventListener('click', () => this.handleSheetConfirm());
            }

            // 3. 搜索供应商
            if (els.searchSupplierBtn) {
                els.searchSupplierBtn.addEventListener('click', () => this.handleSupplierSearch());
            }

            // 4. 显示全部
            if (els.showAllBtn) {
                els.showAllBtn.addEventListener('click', () => this.handleShowAll());
            }

            // 5. 自定义对比
            if (els.customCompareBtn) {
                els.customCompareBtn.addEventListener('click', () => this.handleCustomCompare());
            }

            // 6. 重置对比
            if (els.resetBtn) {
                els.resetBtn.addEventListener('click', () => this.handleResetCompare());
            }

            // 新增：数据源卡片点击事件（直接切换数据）
            if (els.purchaseCard && els.externalCard) {
                els.purchaseCard.addEventListener('click', () => this.handleCardClick('purchase'));
                els.externalCard.addEventListener('click', () => this.handleCardClick('external'));

                // 更新按钮事件
                const updateBtns = document.querySelectorAll('.update-btn');
                updateBtns.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation(); // 防止触发卡片点击事件
                        const dataType = e.currentTarget.dataset.type;
                        this.handleUpdateData(dataType);
                    });
                });
            }

            // 双卡片内年份选择器事件（实时切换）
            if (els.purchaseYearSelectCompact) {
                // 阻止点击事件冒泡到卡片，避免触发多余的提示
                els.purchaseYearSelectCompact.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                
                els.purchaseYearSelectCompact.addEventListener('change', async (e) => {
                    const selectedYear = e.target.value;
                    state.yearSelection.purchase = selectedYear;
                    await this.handleYearChange('purchase', selectedYear);
                });
            }

            if (els.externalYearSelectCompact) {
                // 阻止点击事件冒泡到卡片，避免触发多余的提示
                els.externalYearSelectCompact.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
                
                els.externalYearSelectCompact.addEventListener('change', async (e) => {
                    const selectedYear = e.target.value;
                    state.yearSelection.external = selectedYear;
                    await this.handleYearChange('external', selectedYear);
                });
            }
        },

        // --- 业务逻辑处理 ---

        // 处理上传
        async handleUpload(e) {
            if (e && e.preventDefault) e.preventDefault();

            // 如果已经有文件（通过handleUpdateData设置），直接处理
            if (state.uploadedFile) {
                return this.directUploadFile(state.uploadedFile);
            }

            const file = els.fileInput.files[0];
            if (!file) {
                // 只要没文件，点击按钮就触发文件选择
                console.log('IQC Module: No file selected, triggering file input');
                els.fileInput.click();
                return;
            }

            this.showLoading(true);
            const formData = new FormData();
            formData.append('excelFile', file);

            try {
                // 先尝试获取工作表
                const sheetData = await window.App.API.getSheets(formData);
                if (sheetData.error) throw new Error(sheetData.error);

                this.renderSheetSelection(sheetData.sheetNames, sheetData.recommendedSheet);
                state.uploadedFile = file;
                state.fileId = null;

                // 显示工作表选择区域
                els.sheetSelection.classList.remove('hidden');
                this.showLoading(false);

                // 平滑滚动到工作表选择区域，提升体验
                setTimeout(() => {
                    els.sheetSelection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);

            } catch (error) {
                console.warn('获取工作表失败，尝试直接上传:', error);
                this.directUpload(formData);
            }
        },

        // 渲染工作表选择
        renderSheetSelection(sheetNames, recommendedSheet) {
            els.sheetTabContainer.innerHTML = '';
            sheetNames.forEach(name => {
                const btn = document.createElement('div');
                btn.className = `sheet-tab ${name === recommendedSheet ? 'selected' : ''}`;
                btn.textContent = name;
                btn.dataset.name = name;

                btn.addEventListener('click', () => {
                    document.querySelectorAll('.sheet-tab').forEach(t => t.classList.remove('selected'));
                    btn.classList.add('selected');
                });

                els.sheetTabContainer.appendChild(btn);
            });
        },

        // 确认工作表并分析
        async handleSheetConfirm() {
            const selectedTab = document.querySelector('.sheet-tab.selected');
            if (!selectedTab) return this.showToast('请选择一个工作表', 'warning');

            state.selectedSheetName = selectedTab.dataset.name;
            this.showLoading(true);
            els.sheetSelection.classList.add('hidden');

            const formData = new FormData();
            formData.append('excelFile', state.uploadedFile);
            formData.append('sheetName', state.selectedSheetName); // 传递用户选择的工作表

            try {
                const data = await window.App.API.uploadFile(formData);
                this.processAnalysisResult(data, false); // 不重新获取供应商列表

                // 上传成功后重新加载数据源统计，但不自动选择
                await this.loadDataSourceStats(false);

            } catch (error) {
                this.showError(error.message);
            }
        },

        // 直接上传（降级策略）
        async directUpload(formData) {
            try {
                const data = await window.App.API.uploadFile(formData);
                this.processAnalysisResult(data);
            } catch (error) {
                this.showError(error.message);
            }
        },

        // 处理分析结果
        async processAnalysisResult(data, fetchSuppliers = true) {
            if (data.error) return this.showError(data.error);

            if (data.fileId) {
                state.fileId = data.fileId;
                els.results.dataset.fileId = data.fileId;
            }

            // 渲染 UI
            window.App.UI.displayResults(data);

            // 显示结果区域
            els.results.classList.remove('hidden');
            els.supplierSearch.classList.remove('hidden');
            els.error.classList.add('hidden');
            this.showLoading(false);

            // 获取供应商列表
            if (fetchSuppliers && state.fileId) {
                try {
                    // 基于数据库中的数据获取供应商列表，包含数据类型
                    const data = await window.App.API.filterData({
                        fileId: state.fileId,
                        dataType: state.currentDataType
                    });
                    if (data.supplierRanking) {
                        const suppliers = data.supplierRanking.map(item => item.supplier);
                        window.App.UI.populateSupplierDatalist(suppliers);
                    }
                } catch (e) {
                    console.error('获取供应商列表失败', e);
                }
            }
        },

        // 搜索供应商
        async handleSupplierSearch() {
            const name = els.supplierSearchInput.value;
            if (!name) return this.showToast('请输入供应商名称', 'warning');

            this.showLoading(true);
            try {
                let data;
                if (state.fileId) {
                    data = await window.App.API.filterData({ fileId: state.fileId, supplierName: name });
                } else {
                    const formData = new FormData();
                    formData.append('excelFile', state.uploadedFile);
                    formData.append('supplierName', name);
                    data = await window.App.API.searchSupplier(formData);
                }
                this.processAnalysisResult(data, false);
            } catch (error) {
                this.showError(error.message);
            }
        },

        // 显示全部
        async handleShowAll() {
            this.showLoading(true);
            els.supplierSearchInput.value = '';
            try {
                let data;
                if (state.fileId) {
                    data = await window.App.API.filterData({ fileId: state.fileId, supplierName: '' });
                } else {
                    const formData = new FormData();
                    formData.append('excelFile', state.uploadedFile);
                    data = await window.App.API.uploadFile(formData);
                }
                this.processAnalysisResult(data, false);
            } catch (error) {
                this.showError(error.message);
            }
        },

        // 自定义对比
        async handleCustomCompare() {
            const s1 = els.currentPeriodStart.value;
            const e1 = els.currentPeriodEnd.value;
            const s2 = els.previousPeriodStart.value;
            const e2 = els.previousPeriodEnd.value;

            if (!s1 || !e1 || !s2 || !e2) return this.showToast('请完善日期选择', 'warning');

            const btn = els.customCompareBtn;
            const originalText = btn.textContent;
            btn.textContent = '分析中...';
            btn.disabled = true;

            try {
                let requestData;

                if (state.fileId) {
                    // 优先使用数据库中的数据
                    requestData = {
                        currentPeriodStart: s1,
                        currentPeriodEnd: e1,
                        previousPeriodStart: s2,
                        previousPeriodEnd: e2,
                        fileId: state.fileId
                    };
                } else if (state.uploadedFile) {
                    // 备用：有上传文件时使用 FormData
                    const formData = new FormData();
                    formData.append('excelFile', state.uploadedFile);
                    formData.append('currentPeriodStart', s1);
                    formData.append('currentPeriodEnd', e1);
                    formData.append('previousPeriodStart', s2);
                    formData.append('previousPeriodEnd', e2);
                    requestData = formData;
                } else {
                    throw new Error('没有可用的数据源');
                }

                const data = await window.App.API.compareCustomPeriods(requestData);

                if (data.error) throw new Error(data.error);

                // 更新对比数据
                window.App.UI.updateWeekComparison({
                    currentWeek: data.currentPeriod.stats,
                    previousWeek: data.previousPeriod.stats,
                    currentWeekStart: data.currentPeriod.startDate,
                    currentWeekEnd: data.currentPeriod.endDate,
                    previousWeekStart: data.previousPeriod.startDate,
                    previousWeekEnd: data.previousPeriod.endDate
                });

                this.showToast('自定义对比分析完成', 'success');

            } catch (error) {
                this.showToast(error.message, 'error');
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        },

        // 重置对比
        handleResetCompare() {
            els.currentPeriodStart.value = '';
            els.currentPeriodEnd.value = '';
            els.previousPeriodStart.value = '';
            els.previousPeriodEnd.value = '';
            this.handleShowAll(); // 重新加载默认数据
        },

        // 加载历史记录
        async loadHistory() {
            try {
                const history = await window.App.API.getHistory();
                this.renderHistoryList(history);
            } catch (error) {
                console.error('Failed to load history:', error);
            }
        },

        // 渲染历史记录列表
        renderHistoryList(history) {
            if (!history || history.length === 0) {
                if (els.historySection) els.historySection.classList.add('hidden');
                return;
            }

            if (els.historyList) {
                els.historyList.innerHTML = '';
                history.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'history-item';
                    div.innerHTML = `
                        <h5 title="${item.fileName}">${item.fileName}</h5>
                        <p>工作表: ${item.sheetName || '-'}</p>
                        <div class="meta">
                            <span>${new Date(item.uploadTime).toLocaleDateString()}</span>
                            <span>${new Date(item.uploadTime).toLocaleTimeString()}</span>
                        </div>
                    `;
                    div.addEventListener('click', () => this.handleHistoryClick(item.id));
                    els.historyList.appendChild(div);
                });
            }

            if (els.historySection) els.historySection.classList.remove('hidden');
        },

        // 处理历史记录点击
        async handleHistoryClick(fileId) {
            this.showLoading(true);
            try {
                const data = await window.App.API.filterData({ fileId });
                this.processAnalysisResult(data);

                // 滚动到结果区域
                if (els.results) els.results.scrollIntoView({ behavior: 'smooth' });
            } catch (error) {
                this.showError(error.message);
            }
        },

        // 自动加载最新数据
        async loadLatestData() {
            try {
                console.log('IQC Module: Attempting to auto-load latest data...');
                const data = await window.App.API.getLatestData();
                console.log('IQC Module: getLatestData returned:', data);

                if (data) {
                    console.log('IQC Module: Latest data loaded -', data.fileName);
                    state.fileId = data.fileId;
                    state.uploadedFile = null;
                    this.processAnalysisResult(data, false);

                    if (els.sheetSelection) els.sheetSelection.classList.add('hidden');

                    if (data.supplierRanking) {
                        const suppliers = data.supplierRanking.map(item => item.supplier);
                        console.log('IQC Module: Found', suppliers.length, 'suppliers');
                        window.App.UI.populateSupplierDatalist(suppliers);
                    }

                    // 修复文件名乱码，使用更友好的显示方式
                const displayName = this.decodeFileName(data.fileName);
                this.showToast(`已自动加载: ${displayName}`, 'success');
                } else {
                    console.log('IQC Module: No data available (database empty)');
                }
            } catch (error) {
                console.error('IQC Module: Auto-load failed:', error);
            }
        },

        // --- 工具方法 ---

        // 新增：文件名解码和美化显示
        decodeFileName(fileName) {
            if (!fileName) return '未知文件';
            
            try {
                // 尝试解码可能的UTF-8编码问题
                let decodedName = fileName;
                
                // 如果包含乱码字符，尝试重新解码
                if (fileName.includes('æ') || fileName.includes('ø') || fileName.includes('¥')) {
                    // 尝试从Latin-1解码再编码为UTF-8
                    try {
                        decodedName = decodeURIComponent(escape(fileName));
                    } catch (e) {
                        // 如果失败，尝试其他方法
                        decodedName = fileName.replace(/[æø¥]/g, (match) => {
                            const map = { 'æ': '来', 'ø': '检', '¥': '料' };
                            return map[match] || match;
                        });
                    }
                }
                
                // 提取文件名中的关键信息
                if (decodedName.includes('外购')) {
                    return 'IQC来料检验台账（外购）.xlsx';
                } else if (decodedName.includes('外协')) {
                    return 'IQC来料检验台账（外协）.xlsx';
                } else if (decodedName.includes('IQC')) {
                    return decodedName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5（）.]/g, '');
                } else {
                    // 如果无法识别，返回清理后的文件名
                    return decodedName.length > 30 ? decodedName.substring(0, 27) + '...' : decodedName;
                }
            } catch (error) {
                console.warn('文件名解码失败:', error);
                return fileName.length > 30 ? fileName.substring(0, 27) + '...' : fileName;
            }
        },
        // --- 工具方法 ---
        showLoading(show) {
            if (!els.loading) {
                console.warn('IQC Module: loading element not found');
                return;
            }
            
            if (show) {
                els.loading.classList.remove('hidden');
            } else {
                els.loading.classList.add('hidden');
            }
        },

        showError(msg) {
            els.errorMessage.textContent = msg;
            els.error.classList.remove('hidden');
            this.showLoading(false);
        },

        showToast(msg, type = 'info') {
            // 使用 Toast 组件替代 alert
            if (window.App && window.App.Toast) {
                window.App.Toast.show(msg, type);
            } else {
                // 降级方案：如果 Toast 组件未加载，使用 alert
                console.warn('Toast component not loaded, falling back to alert');
                alert(msg);
            }
        },

        // 新增：更新供应商列表
        async updateSupplierList() {
            if (!state.fileId || !state.currentDataType) return;

            try {
                const data = await window.App.API.filterData({
                    fileId: state.fileId,
                    dataType: state.currentDataType
                });
                if (data.supplierRanking) {
                    // 去重并保持顺序
                    const uniqueSuppliers = [...new Set(data.supplierRanking.map(item => item.supplier))];
                    window.App.UI.populateSupplierDatalist(uniqueSuppliers);
                }
            } catch (e) {
                console.error('更新供应商列表失败', e);
            }
        },

        // --- 新增：数据源管理方法 ---

        // 新增：加载数据源统计
        async loadDataSourceStats(autoSelect = true) {
            try {
                const stats = await window.App.API.getDataSourceStats();
                state.dataSourceStats = stats;
                this.updateDataCards(stats);
                
                // 自动选中最新数据（如果当前没有选中任何类型）
                if (autoSelect && !state.currentDataType) {
                    const latestType = this.getLatestDataType(stats);
                    if (latestType && stats[latestType].hasData) {
                        await this.handleCardClick(latestType, false); // false表示不显示toast
                    }
                }
            } catch (error) {
                console.error('Failed to load data source stats:', error);
                this.showToast('加载数据状态失败', 'error');
            }
        },

        // 新增：获取最新数据类型
        getLatestDataType(stats) {
            if (!stats.purchase.hasData && !stats.external.hasData) return null;
            if (!stats.purchase.hasData) return 'external';
            if (!stats.external.hasData) return 'purchase';

            // 比较更新时间，返回最新的
            const purchaseTime = new Date(stats.purchase.lastUpdate);
            const externalTime = new Date(stats.external.lastUpdate);
            return purchaseTime > externalTime ? 'purchase' : 'external';
        },

        // 新增：更新数据卡片显示
        updateDataCards(stats) {
            console.log('更新数据卡片:', stats);
            this.updateCard('purchase', stats.purchase);
            this.updateCard('external', stats.external);
        },

        // 新增：更新单个卡片
        updateCard(type, data) {
            console.log(`更新${type}卡片:`, data);
            console.log(`卡片${type} - totalCount: ${data.totalCount}, recentCount: ${data.recentCount}`);
            if (!data.hasData) {
                // 无数据时的显示
                document.getElementById(`${type}-total-count`).textContent = '0';
                document.getElementById(`${type}-recent-count`).textContent = '0';
                document.getElementById(`${type}-time-range`).textContent = '暂无数据';

                const statusEl = document.getElementById(`${type}-update-status`);
                statusEl.className = 'update-status none';
                statusEl.innerHTML = '<span class="status-none">📭 暂无数据</span>';
                return;
            }

            // 更新统计数据
            document.getElementById(`${type}-total-count`).textContent = data.totalCount;
            document.getElementById(`${type}-recent-count`).textContent = data.recentCount;

            // 更新时间范围
            if (data.timeRange.start && data.timeRange.end) {
                document.getElementById(`${type}-time-range`).textContent =
                    `${data.timeRange.start} 至 ${data.timeRange.end}`;
            } else {
                document.getElementById(`${type}-time-range`).textContent = '时间范围未知';
            }

            // 更新状态指示
            const statusEl = document.getElementById(`${type}-update-status`);
            if (data.needsUpdate) {
                statusEl.className = 'update-status warning';
                statusEl.innerHTML = '<span class="status-warning">⚠️ 需要更新</span>';
            } else {
                const daysSinceUpdate = Math.floor((new Date() - new Date(data.lastUpdate)) / (1000 * 60 * 60 * 24));
                statusEl.className = 'update-status ok';
                statusEl.innerHTML = `<span class="status-ok">✅ ${daysSinceUpdate}天前更新</span>`;
            }

            // 更新当前选中状态
            const cardEl = document.querySelector(`.data-card[data-type="${type}"]`);
            if (state.currentDataType === type && state.fileId === data.fileId) {
                cardEl.classList.add('active');
            } else {
                cardEl.classList.remove('active');
            }
        },

        // 新增：卡片点击切换数据类型
        async handleCardClick(dataType, showToast = true) {
            const stats = state.dataSourceStats[dataType];
            if (!stats || !stats.hasData) {
                if (showToast) {
                    this.showToast(`${TYPE_CONFIG.getName(dataType)}数据暂无记录，请先上传数据`, 'warning');
                }
                return;
            }

            // 如果点击的是当前已选中的类型，不做任何操作
            if (state.currentDataType === dataType && state.fileId === stats.fileId) {
                return;
            }

            this.showLoading(true);
            state.currentDataType = dataType;
            state.fileId = stats.fileId;
            state.uploadedFile = null;

            try {
                const data = await window.App.API.filterData({
                    fileId: stats.fileId,
                    dataType: dataType
                });

                this.processAnalysisResult(data, false);

                // 更新卡片选中状态
                document.querySelectorAll('.data-card').forEach(card => card.classList.remove('active'));
                document.querySelector(`.data-card[data-type="${dataType}"]`).classList.add('active');

                // 重新获取对应数据类型的供应商列表
                await this.updateSupplierList();

                if (showToast) {
                    this.showToast(`已切换到${TYPE_CONFIG.getName(dataType)}数据`, 'success');
                }
            } catch (error) {
                this.showError(error.message);
            }
        },

        // 处理年份变化（实时切换）- 🎯 [CORE-LOGIC] 年份切换核心逻辑 - 修改年份切换行为请关注此处
    // 📍 处理单个卡片的年份切换，保持卡片间独立性
    // 🔗 影响范围：年份选择、卡片数据更新、分析结果显示
    async handleYearChange(dataType, year) {
        this.showLoading(true);

        try {
            if (year && year !== '') {
                // 获取指定年份的数据源统计
                const stats = await this.getStatsByYear(year);

                // 🎯 关键修复：只更新当前卡片的数据，不影响其他卡片
                if (stats && stats[dataType]) {
                    // 更新对应卡片的数据
                    this.updateCard(dataType, stats[dataType]);

                    // 🎯 关键修复：独立更新当前卡片的年份状态
                    if (!state.dataSourceStats) {
                        state.dataSourceStats = {};
                    }
                    state.dataSourceStats[dataType] = stats[dataType];

                    // 🎯 关键修复：更新当前卡片的年份选择状态
                    state.yearSelection[dataType] = year;

                    // 🎯 关键修复：基于当前卡片年份加载分析结果
                    await this.loadAnalysisDataByTypeAndYear(dataType, year);

                    this.showToast(`已切换到${TYPE_CONFIG.getName(dataType)}${year}年数据`, 'success');
                } else {
                    this.showToast(`${TYPE_CONFIG.getName(dataType)}${year}年数据暂无记录`, 'warning');
                }
            } else {
                // 加载最新数据
                await this.loadLatestDataByType(dataType);
                this.showToast(`已切换到${TYPE_CONFIG.getName(dataType)}最新数据`, 'info');
            }
        } catch (error) {
            console.error('年份切换失败:', error);
            this.showToast(`切换年份失败: ${error.message}`, 'error');
        } finally {
            this.showLoading(false);
        }
    },

    // 🎯 [HELPER] 获取指定年份的统计数据 - 统一缓存逻辑
    async getStatsByYear(year) {
        // 智能缓存策略：按年份缓存并设置短期过期时间
        const cacheKey = `stats_${year}`;
        const now = Date.now();
        const cachedData = localStorage.getItem(cacheKey);
        const cacheExpiry = 5 * 60 * 1000; // 5分钟缓存

        let stats;

        if (cachedData) {
            try {
                const { data, timestamp } = JSON.parse(cachedData);
                if (now - timestamp < cacheExpiry) {
                    console.log(`使用缓存的${year}年数据`);
                    stats = data;
                } else {
                    console.log(`${year}年缓存已过期，重新获取`);
                    localStorage.removeItem(cacheKey);
                }
            } catch (error) {
                console.warn('缓存数据解析失败，重新获取:', error);
                localStorage.removeItem(cacheKey);
            }
        }

        if (!stats) {
            // 使用时间戳参数避免浏览器缓存，但允许我们的localStorage缓存
            const timestamp = Date.now();
            const url = `/api/data-source-stats?year=${year}&_t=${timestamp}`;
            const response = await fetch(url, {
                cache: 'no-cache'
            });
            stats = await response.json();

            // 存储到localStorage
            try {
                localStorage.setItem(cacheKey, JSON.stringify({
                    data: stats,
                    timestamp: now
                }));
                console.log(`获取并缓存${year}年数据:`, stats);
            } catch (error) {
                console.warn('缓存存储失败:', error);
            }
        }

        return stats;
    },

    // 🎯 [HELPER] 按类型和年份加载分析数据 - 确保分析结果与选中年份匹配
    async loadAnalysisDataByTypeAndYear(dataType, year) {
        try {
            // 🎯 关键：基于当前选中的年份加载分析数据
            const response = await fetch(`/api/latest-data?year=${year}&dataType=${dataType}`, {
                cache: 'no-cache'
            });

            if (response.ok) {
                const data = await response.json();
                // 更新分析结果 - 使用现有的displayResults方法
                if (window.App && window.App.UI) {
                    window.App.UI.displayResults(data);
                    window.App.UI.showResults();
                }
                console.log(`已加载${TYPE_CONFIG.getName(dataType)}${year}年分析数据`);
            } else if (response.status === 404) {
                // 如果没有特定年份数据，清空分析结果
                if (window.App && window.App.UI) {
                    window.App.UI.showError(`${TYPE_CONFIG.getName(dataType)}${year}年暂无分析数据`);
                }
                console.log(`${TYPE_CONFIG.getName(dataType)}${year}年暂无分析数据`);
            }
        } catch (error) {
            console.warn(`加载${TYPE_CONFIG.getName(dataType)}${year}年分析数据失败:`, error);
            if (window.App && window.App.UI) {
                window.App.UI.showError(`加载分析数据失败: ${error.message}`);
            }
        }
    },

    // 新增：按数据类型加载最新数据
    async loadLatestDataByType(dataType) {
            try {
                const stats = state.dataSourceStats[dataType];
                if (!stats || !stats.hasData) {
                    throw new Error(`${TYPE_CONFIG.getName(dataType)}数据暂无记录`);
                }

                const data = await window.App.API.getLatestData(null, dataType);
                if (data) {
                    state.fileId = data.fileId;
                    state.uploadedFile = null;
                    state.currentDataType = dataType;
                    
                    this.processAnalysisResult(data, false);

                    // 更新卡片选中状态
                    document.querySelectorAll('.data-card').forEach(card => card.classList.remove('active'));
                    const targetCard = document.querySelector(`.data-card[data-type="${dataType}"]`);
                    if (targetCard) {
                        targetCard.classList.add('active');
                    }

                    // 更新供应商列表
                    await this.updateSupplierList();
                }
            } catch (error) {
                console.error(`加载${dataType}最新数据失败:`, error);
                throw error;
            }
        },

        // 新增：按年份和数据类型加载数据
        async loadDataByYearAndType(dataType, year) {
            try {
                console.log(`loadDataByYearAndType: ${dataType}, ${year}`);
                const data = await window.App.API.getLatestData(year, dataType);
                if (data) {
                    state.fileId = data.fileId;
                    state.uploadedFile = null;
                    state.currentDataType = dataType;
                    
                    this.processAnalysisResult(data, false);

                    // 更新卡片选中状态
                    document.querySelectorAll('.data-card').forEach(card => card.classList.remove('active'));
                    const targetCard = document.querySelector(`.data-card[data-type="${dataType}"]`);
                    if (targetCard) {
                        targetCard.classList.add('active');
                    }

                    // 更新供应商列表
                    await this.updateSupplierList();

                    // 关键修复：确保卡片数据统计与当前选择的年份同步
                    console.log(`正在获取${year}年统计...`);
                    const stats = await window.App.API.getDataSourceStats(year);
                    console.log(`获取到的stats[${dataType}]:`, stats[dataType]);
                    
                    state.dataSourceStats = stats;
                    console.log(`正在更新${dataType}卡片...`);
                    this.updateCard(dataType, stats[dataType]);
                    console.log(`${dataType}卡片更新完成`);
                }
            } catch (error) {
                console.error(`加载${dataType} ${year}年数据失败:`, error);
                this.showToast(`加载${TYPE_CONFIG.getName(dataType)}${year}年数据失败`, 'error');
            }
        },

        // 新增：初始化年份选择器
        async initializeYearSelector() {
            if (state.yearSelection.isInitialized) return;

            try {
                // 获取各数据类型的可用年份
                const [purchaseYears, externalYears] = await Promise.all([
                    window.App.API.getAvailableYearsByType('purchase'),
                    window.App.API.getAvailableYearsByType('external')
                ]);

                state.yearSelection.availableYears.purchase = purchaseYears.years || [];
                state.yearSelection.availableYears.external = externalYears.years || [];

                // 填充下拉框
                this.populateYearSelect('purchase', state.yearSelection.availableYears.purchase);
                this.populateYearSelect('external', state.yearSelection.availableYears.external);

                state.yearSelection.isInitialized = true;
            } catch (error) {
                console.error('初始化年份选择器失败:', error);
            }
        },

        // 新增：填充年份下拉框
        populateYearSelect(dataType, years) {
            const selectElement = dataType === 'purchase' ? els.purchaseYearSelect : els.externalYearSelect;
            if (!selectElement) return;

            // 清空现有选项（保留默认选项）
            selectElement.innerHTML = '<option value="">最新数据</option>';

            // 按年份倒序排列（最新的在前）
            const sortedYears = years.sort((a, b) => b - a);

            // 添加年份选项
            sortedYears.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = `${year}年`;
                selectElement.appendChild(option);
            });

            // 如果没有可用年份，禁用下拉框
            selectElement.disabled = years.length === 0;
        },

        // 新增：更新数据（触发文件上传）
        handleUpdateData(dataType) {
            // 创建一个临时的文件输入，用于特定数据类型的上传
            const tempInput = document.createElement('input');
            tempInput.type = 'file';
            tempInput.accept = '.xlsx,.xls';
            tempInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // 验证文件名是否包含对应的数据类型标识
                    const expectedKeyword = TYPE_CONFIG.getName(dataType);
                    if (!file.name.includes(expectedKeyword)) {
                        this.showToast(`请上传包含"${expectedKeyword}"的文件`, 'warning');
                        return;
                    }

                    // 设置状态并直接处理上传
                    state.currentDataType = dataType;
                    this.directUploadFile(file);
                }
            });
            tempInput.click();
        },

        // 新增：直接上传文件的方法
        async directUploadFile(file) {
            this.showLoading(true);
            const formData = new FormData();
            formData.append('excelFile', file);

            try {
                // 先尝试获取工作表
                const sheetData = await window.App.API.getSheets(formData);
                if (sheetData.error) throw new Error(sheetData.error);

                this.renderSheetSelection(sheetData.sheetNames, sheetData.recommendedSheet);
                state.uploadedFile = file;
                state.fileId = null;

                // 显示工作表选择区域
                els.sheetSelection.classList.remove('hidden');
                this.showLoading(false);

                // 平滑滚动到工作表选择区域
                setTimeout(() => {
                    els.sheetSelection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);

            } catch (error) {
                console.warn('获取工作表失败，尝试直接上传:', error);
                this.directUpload(formData);
            }
        },

        // 新增：直接上传到服务器的方法
        async directUpload(formData) {
            try {
                const data = await window.App.API.uploadFile(formData);
                this.processAnalysisResult(data, false); // 不重新获取供应商列表

                // 上传成功后重新加载数据源统计，但不自动选择
                await this.loadDataSourceStats(false);

            } catch (error) {
                this.showError(error.message);
            }
        },

        

        

        

        // 填充卡片内年份下拉框
        populateYearSelect(dataType, years) {
            const selectElement = dataType === 'purchase' ? els.purchaseYearSelectCompact : els.externalYearSelectCompact;
            if (!selectElement) return;

            // 清空现有选项
            selectElement.innerHTML = '';

            // 添加默认选项
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '最新数据';
            selectElement.appendChild(defaultOption);

            // 添加年份选项
            years.forEach(year => {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = `${year}年`;
                selectElement.appendChild(option);
            });

            // 如果有可用年份，启用下拉框；否则禁用
            selectElement.disabled = years.length === 0;
        }
    };

    // 暴露给全局 App
    window.App = window.App || {};
    window.App.Modules = window.App.Modules || {};
    window.App.Modules.IQC = IQCModule;

})();
