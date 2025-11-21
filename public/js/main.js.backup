// 主入口文件
document.addEventListener('DOMContentLoaded', function () {
    const API = window.App.API;
    const UI = window.App.UI;

    // 状态变量
    let state = {
        uploadedFile: null,
        selectedSheetName: null,
        fileId: null
    };

    // DOM 元素
    const elements = {
        uploadForm: document.getElementById('uploadForm'),
        fileInput: document.getElementById('excelFile'),
        confirmSheetBtn: document.getElementById('confirmSheetBtn'),
        searchSupplierBtn: document.getElementById('searchSupplierBtn'),
        showAllBtn: document.getElementById('showAllBtn'),
        supplierSearchInput: document.getElementById('supplierSearchInput'),
        customCompareBtn: document.getElementById('compareBtn'),
        resetBtn: document.getElementById('resetBtn')
    };

    // 1. 文件上传处理
    elements.uploadForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!elements.fileInput.files[0]) {
            showWarning('请选择一个Excel文件');
            return;
        }

        UI.showLoading();

        const formData = new FormData();
        formData.append('excelFile', elements.fileInput.files[0]);

        try {
            // 尝试获取工作表信息
            const sheetData = await API.getSheets(formData);

            if (sheetData.error) throw new Error(sheetData.error);

            UI.fillSheetSelection(sheetData.sheetNames, sheetData.recommendedSheet);
            UI.showSheetSelection();
            state.uploadedFile = elements.fileInput.files[0];
            state.fileId = null; // 重置 fileId

        } catch (error) {
            console.error('获取工作表失败，尝试直接上传:', error);
            // 降级处理：直接上传
            handleDirectUpload(formData);
        }
    });

    // 2. 确认工作表选择
    elements.confirmSheetBtn.addEventListener('click', async function () {
        if (!state.uploadedFile) {
            showWarning('请先上传文件');
            return;
        }

        const selectedSheet = UI.getSelectedSheet();
        if (!selectedSheet) {
            showWarning('请选择一个工作表');
            return;
        }
        state.selectedSheetName = selectedSheet;

        UI.showLoading();
        UI.hideSheetSelection();

        const formData = new FormData();
        formData.append('excelFile', state.uploadedFile);

        try {
            const data = await API.uploadFile(formData);
            handleAnalysisResult(data);
        } catch (error) {
            UI.showError('上传失败: ' + error.message);
        }
    });

    // 3. 搜索供应商
    elements.searchSupplierBtn.addEventListener('click', async function () {
        const supplierName = elements.supplierSearchInput.value;
        if (!supplierName) {
            showWarning('请选择一个供应商');
            return;
        }
        if (!state.uploadedFile && !state.fileId) {
            showWarning('请先上传文件');
            return;
        }

        UI.showLoading();

        try {
            let data;
            if (state.fileId) {
                // 使用缓存数据进行筛选 (无需重新上传)
                data = await API.filterData({
                    fileId: state.fileId,
                    supplierName: supplierName
                });
            } else {
                // 降级处理：重新上传文件
                const formData = new FormData();
                formData.append('excelFile', state.uploadedFile);
                formData.append('supplierName', supplierName);
                data = await API.searchSupplier(formData);
            }

            handleAnalysisResult(data, false); // false 表示不重新获取供应商列表
        } catch (error) {
            UI.showError('搜索失败: ' + error.message);
        }
    });

    // 4. 显示全部
    elements.showAllBtn.addEventListener('click', async function () {
        if (!state.uploadedFile && !state.fileId) {
            showWarning('请先上传文件');
            return;
        }

        UI.showLoading();
        elements.supplierSearchInput.value = ''; // 清空搜索框

        try {
            let data;
            if (state.fileId) {
                // 使用缓存数据重置筛选
                data = await API.filterData({
                    fileId: state.fileId,
                    supplierName: ''
                });
            } else {
                const formData = new FormData();
                formData.append('excelFile', state.uploadedFile);
                data = await API.uploadFile(formData);
            }

            handleAnalysisResult(data, false);
        } catch (error) {
            UI.showError('分析失败: ' + error.message);
        }
    });

    // 5. 自定义时间段对比
    if (elements.customCompareBtn) {
        elements.customCompareBtn.addEventListener('click', async function () {
            const start1 = document.getElementById('currentPeriodStart').value;
            const end1 = document.getElementById('currentPeriodEnd').value;
            const start2 = document.getElementById('previousPeriodStart').value;
            const end2 = document.getElementById('previousPeriodEnd').value;

            if (!start1 || !end1 || !start2 || !end2) {
                showWarning('请完善所有日期选择');
                return;
            }
            if (new Date(start1) > new Date(end1) || new Date(start2) > new Date(end2)) {
                showWarning('开始日期不能晚于结束日期');
                return;
            }

            const btn = elements.customCompareBtn;
            const originalText = btn.textContent;
            btn.textContent = '分析中...';
            btn.disabled = true;

            const formData = new FormData();
            formData.append('excelFile', state.uploadedFile);
            formData.append('currentPeriodStart', start1);
            formData.append('currentPeriodEnd', end1);
            formData.append('previousPeriodStart', start2);
            formData.append('previousPeriodEnd', end2);

            try {
                const data = await API.compareCustomPeriods(formData);
                if (data.error) {
                    showError('分析出错: ' + data.error);
                } else {
                    // 更新 UI 显示自定义对比结果
                    const customData = {
                        currentWeek: data.currentPeriod.stats,
                        previousWeek: data.previousPeriod.stats,
                        currentWeekStart: data.currentPeriod.startDate,
                        currentWeekEnd: data.currentPeriod.endDate,
                        previousWeekStart: data.previousPeriod.startDate,
                        previousWeekEnd: data.previousPeriod.endDate
                    };
                    UI.updateWeekComparison(customData);

                    showSuccess(`自定义分析完成
当前段合格率: ${data.currentPeriod.passRate}%
对比段合格率: ${data.previousPeriod.passRate}%`, 5000);
                }
            } catch (error) {
                console.error(error);
                showError('分析失败: ' + error.message);
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }

    // 6. 重置对比
    if (elements.resetBtn) {
        elements.resetBtn.addEventListener('click', function () {
            document.getElementById('currentPeriodStart').value = '';
            document.getElementById('currentPeriodEnd').value = '';
            document.getElementById('previousPeriodStart').value = '';
            document.getElementById('previousPeriodEnd').value = '';

            UI.updateWeekComparison(null);
            elements.showAllBtn.click();
        });
    }

    // 辅助函数：处理直接上传
    async function handleDirectUpload(formData) {
        try {
            const data = await API.uploadFile(formData);
            handleAnalysisResult(data);
        } catch (error) {
            UI.showError('上传失败: ' + error.message);
        }
    }

    // 辅助函数：处理分析结果
    async function handleAnalysisResult(data, fetchSuppliers = true) {
        if (data.error) {
            UI.showError(data.error);
            return;
        }

        // 保存文件ID，用于后续快速筛选
        if (data.fileId) {
            state.fileId = data.fileId;
            // Store fileId in DOM for UI access
            const resultsContainer = document.getElementById('results');
            if (resultsContainer) {
                resultsContainer.dataset.fileId = data.fileId;
            }
        }

        UI.displayResults(data);
        UI.showResults();
        UI.showSupplierSearch();

        if (data.sheetInfo) {
            console.log(data.sheetInfo.message);
        }

        if (fetchSuppliers && state.uploadedFile) {
            try {
                const supplierFormData = new FormData();
                supplierFormData.append('excelFile', state.uploadedFile);
                const supplierData = await API.getSuppliers(supplierFormData);
                UI.populateSupplierDatalist(supplierData.suppliers);
            } catch (err) {
                console.error('获取供应商列表失败:', err);
            }
        }
    }
});