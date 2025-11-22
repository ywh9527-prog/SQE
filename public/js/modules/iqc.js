/**
 * IQC 模块控制器
 * 负责处理 IQC 数据分析页面的所有逻辑
 */
(function () {
    // 模块状态
    const state = {
        uploadedFile: null,
        selectedSheetName: null,
        fileId: null,
        isInitialized: false
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
                previousPeriodEnd: document.getElementById('previousPeriodEnd')
            };
            console.log('IQC Module: Elements cached', {
                form: !!els.uploadForm,
                input: !!els.fileInput,
                btn: !!els.uploadBtn
            });
        },

        // 绑定事件
        bindEvents() {
            // 文件选择监听 (优化 UX: 选择文件后自动显示文件名)
            if (els.fileInput) {
                console.log('IQC Module: Binding file input change event');
                els.fileInput.addEventListener('change', (e) => {
                    console.log('IQC Module: File selected', e.target.files[0]?.name);
                    const fileName = e.target.files[0]?.name;
                    const label = e.target.nextElementSibling.querySelector('span');
                    if (fileName && label) label.textContent = fileName;

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
        },

        // --- 业务逻辑处理 ---

        // 处理上传
        async handleUpload(e) {
            if (e && e.preventDefault) e.preventDefault();

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

                // 显示工作表选择区域，隐藏上传按钮
                els.sheetSelection.classList.remove('hidden');
                if (els.uploadBtn) {
                    els.uploadBtn.classList.add('hidden');
                }
                this.showLoading(false);

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
                btn.onclick = () => {
                    document.querySelectorAll('.sheet-tab').forEach(t => t.classList.remove('selected'));
                    btn.classList.add('selected');
                };
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
            // 注意：后端 upload 接口目前可能还没处理 sheetName 参数，
            // 如果后端逻辑是自动取第一个或推荐的，这里可能需要后端配合修改。
            // 暂时假设后端会处理，或者我们先上传，后端解析逻辑不变。
            // *修正*：查看后端代码，upload 接口确实没接收 sheetName。
            // 但为了保持兼容，我们先按原逻辑走，后续优化后端。

            try {
                const data = await window.App.API.uploadFile(formData);
                this.processAnalysisResult(data);
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
            if (fetchSuppliers && state.uploadedFile) {
                try {
                    const formData = new FormData();
                    formData.append('excelFile', state.uploadedFile);
                    const supplierData = await window.App.API.getSuppliers(formData);
                    window.App.UI.populateSupplierDatalist(supplierData.suppliers);
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
                const formData = new FormData();
                formData.append('excelFile', state.uploadedFile);
                formData.append('currentPeriodStart', s1);
                formData.append('currentPeriodEnd', e1);
                formData.append('previousPeriodStart', s2);
                formData.append('previousPeriodEnd', e2);

                const data = await window.App.API.compareCustomPeriods(formData);

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

        // --- 工具方法 ---
        showLoading(show) {
            if (!els.loading) {
                console.warn('IQC Module: loading element not found');
                return;
            }
            if (show) {
                els.loading.classList.remove('hidden');
                // 不隐藏结果区域，防止布局跳动，Loading 遮罩会覆盖在上面
                // els.results.classList.add('hidden');
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
            // 简单的 alert 替代，后续可接入 Toast 组件
            alert(msg);
        }
    };

    // 暴露给全局 App
    window.App = window.App || {};
    window.App.Modules = window.App.Modules || {};
    window.App.Modules.IQC = IQCModule;

})();
