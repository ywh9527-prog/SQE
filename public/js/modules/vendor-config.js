/**
 * 供应商配置中心主管理器
 * 负责模块的初始化、事件绑定和界面渲染
 */
class VendorConfigManager {
    constructor() {
        this.vendors = [];
        this.selectedVendors = new Set();
        this.filter = {
            source: '',
            status: '',
            keyword: ''
        };
        this.currentPage = 1;
        this.pageSize = 20;
    }

    /**
     * 初始化模块
     */
    async init() {
        window.vendorConfigManager = this;
        console.log('🚀 供应商配置中心模块初始化...');

        // 先绑定事件，再加载数据，最后渲染
        this.bindEvents();
        await this.loadVendors();
    }

    /**
     * 加载供应商列表
     */
    async loadVendors() {
        window.vendorConfigUIUtils.setLoading(true);

        const result = await window.vendorConfigServices.getConfig(this.filter);

        if (result.success) {
            this.vendors = result.data || [];
            this.render();
        } else {
            window.vendorConfigUIUtils.showErrorState(result.error);
            window.vendorConfigUIUtils.showToast(result.error, 'error');
        }
    }

    /**
     * 重新绑定事件（在模块切换时调用）
     */
    rebindEvents() {
        console.log('🔄 重新绑定事件...');

        // 从IQC同步按钮
        const syncFromIQCBtn = document.getElementById('syncFromIQCBtn');
        if (syncFromIQCBtn) {
            syncFromIQCBtn.removeEventListener('click', this.syncFromIQCHandler);
            this.syncFromIQCHandler = () => this.syncFromIQC();
            syncFromIQCBtn.addEventListener('click', this.syncFromIQCHandler);
            console.log('✅ syncFromIQCBtn 事件绑定成功');
        }

        // 添加供应商按钮
        const addVendorBtn = document.getElementById('addVendorBtn');
        if (addVendorBtn) {
            addVendorBtn.removeEventListener('click', this.addVendorHandler);
            this.addVendorHandler = () => this.showAddVendorModal();
            addVendorBtn.addEventListener('click', this.addVendorHandler);
            console.log('✅ addVendorBtn 事件绑定成功');
        }

        // 刷新按钮
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.removeEventListener('click', this.refreshHandler);
            this.refreshHandler = () => this.loadVendors();
            refreshBtn.addEventListener('click', this.refreshHandler);
            console.log('✅ refreshBtn 事件绑定成功');
        }

        // 重新绑定表格和批量操作事件
        this.bindTableEvents();
        this.bindBatchEvents();
    }

    /**
     * 绑定表格内的事件
     */
    bindTableEvents() {
        console.log('🔗 绑定表格内事件...');

        // 全选复选框
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.removeEventListener('change', this.selectAllHandler);
            this.selectAllHandler = (e) => this.toggleSelectAll(e.target.checked);
            selectAll.addEventListener('change', this.selectAllHandler);
            console.log('✅ selectAll 事件绑定成功');
        }

        // 表格点击事件（使用事件委托）
        const tableBody = document.getElementById('vendorTableBody');
        if (tableBody) {
            tableBody.removeEventListener('click', this.tableBodyHandler);
            this.tableBodyHandler = (e) => {
                // 复选框点击（用于批量选择）
                if (e.target.matches('.vendor-config__checkbox')) {
                    this.toggleSelectVendor(parseInt(e.target.dataset.id));
                }
                // 切换复选框点击（用于启用/禁用功能）
                if (e.target.matches('.vendor-config__toggle-checkbox')) {
                    this.toggleVendorConfig(parseInt(e.target.dataset.vendorId), e.target.dataset.field, e.target.checked);
                }
                // 编辑按钮点击
                if (e.target.matches('.vendor-config__btn--edit')) {
                    this.showEditVendorModal(parseInt(e.target.dataset.id));
                }
                // 删除按钮点击
                if (e.target.matches('.vendor-config__btn--delete')) {
                    this.deleteVendor(parseInt(e.target.dataset.id));
                }
            };
            tableBody.addEventListener('click', this.tableBodyHandler);
            console.log('✅ tableBody 事件绑定成功');
        }
    }

    /**
     * 绑定批量操作事件
     */
    bindBatchEvents() {
        console.log('🔗 绑定批量操作事件...');

        // 批量操作按钮（事件委托）
        const batchActions = document.querySelector('.vendor-config__batch-actions');
        if (batchActions) {
            batchActions.removeEventListener('click', this.batchActionsHandler);
            this.batchActionsHandler = (e) => {
                if (e.target.id === 'batchEnableDocument') {
                    this.batchUpdateConfig({ enable_document_mgmt: 1 });
                } else if (e.target.id === 'batchEnablePerformance') {
                    this.batchUpdateConfig({ enable_performance_mgmt: 1 });
                } else if (e.target.id === 'batchDelete') {
                    this.batchDeleteVendors();
                } else if (e.target.id === 'batchCancel') {
                    this.clearSelection();
                }
            };
            batchActions.addEventListener('click', this.batchActionsHandler);
            console.log('✅ batchActions 事件绑定成功');
        }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        console.log('🔗 开始绑定事件...');

        // 从IQC同步按钮
        const syncFromIQCBtn = document.getElementById('syncFromIQCBtn');
        if (syncFromIQCBtn) {
            // 移除旧的事件监听器（如果存在）
            syncFromIQCBtn.removeEventListener('click', this.syncFromIQCHandler);
            // 添加新的事件监听器
            this.syncFromIQCHandler = () => this.syncFromIQC();
            syncFromIQCBtn.addEventListener('click', this.syncFromIQCHandler);
            console.log('✅ syncFromIQCBtn 事件绑定成功');
        } else {
            console.error('❌ syncFromIQCBtn 未找到');
        }

        // 添加供应商按钮
        const addVendorBtn = document.getElementById('addVendorBtn');
        if (addVendorBtn) {
            addVendorBtn.removeEventListener('click', this.addVendorHandler);
            this.addVendorHandler = () => this.showAddVendorModal();
            addVendorBtn.addEventListener('click', this.addVendorHandler);
            console.log('✅ addVendorBtn 事件绑定成功');
        } else {
            console.error('❌ addVendorBtn 未找到');
        }

        // 刷新按钮
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.removeEventListener('click', this.refreshHandler);
            this.refreshHandler = () => this.loadVendors();
            refreshBtn.addEventListener('click', this.refreshHandler);
            console.log('✅ refreshBtn 事件绑定成功');
        } else {
            console.error('❌ refreshBtn 未找到');
        }

        // 绑定表格内的事件
        this.bindTableEvents();

        // 绑定批量操作事件
        this.bindBatchEvents();

        // 筛选器
        const sourceFilter = document.getElementById('sourceFilter');
        if (sourceFilter) {
            sourceFilter.addEventListener('change', (e) => {
                this.filter.source = e.target.value;
                this.loadVendors();
            });
        }

        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filter.status = e.target.value;
                this.loadVendors();
            });
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.filter.keyword = e.target.value;
                    this.loadVendors();
                }, 300);
            });
        }

        // 全选复选框
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }

        // 表格点击事件（使用事件委托）
        const tableBody = document.getElementById('vendorTableBody');
        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                // 复选框点击
                if (e.target.matches('.vendor-config__checkbox')) {
                    this.toggleSelectVendor(parseInt(e.target.dataset.id));
                }
                // 编辑按钮点击
                if (e.target.matches('.vendor-config__btn--edit')) {
                    this.showEditVendorModal(parseInt(e.target.dataset.id));
                }
                // 删除按钮点击
                if (e.target.matches('.vendor-config__btn--delete')) {
                    this.deleteVendor(parseInt(e.target.dataset.id));
                }
            });
        }

        // 批量操作按钮（事件委托）
        const batchActions = document.querySelector('.vendor-config__batch-actions');
        if (batchActions) {
            batchActions.addEventListener('click', (e) => {
                if (e.target.id === 'batchEnableDocument') {
                    this.batchUpdateConfig({ enable_document_mgmt: 1 });
                } else if (e.target.id === 'batchEnablePerformance') {
                    this.batchUpdateConfig({ enable_performance_mgmt: 1 });
                } else if (e.target.id === 'batchDelete') {
                    this.batchDeleteVendors();
                } else if (e.target.id === 'batchCancel') {
                    this.clearSelection();
                }
            });
        }
    }

    /**
     * 切换供应商配置（启用/禁用）
     * @param {number} id - 供应商ID
     * @param {string} field - 字段名（enable_document_mgmt 或 enable_performance_mgmt）
     * @param {boolean} value - 新值
     */
    async toggleVendorConfig(id, field, value) {
        const vendor = this.vendors.find(v => v.id === id);
        if (!vendor) return;

        const fieldName = field === 'enable_document_mgmt' ? '资料管理' : '绩效评价';
        const action = value ? '启用' : '禁用';
        const message = `确定要${action}供应商"${vendor.supplier_name}"的${fieldName}功能吗？`;

        if (!await window.vendorConfigUIUtils.confirm(message)) {
            // 如果用户取消，恢复复选框状态
            await this.loadVendors();
            return;
        }

        try {
            const result = await window.vendorConfigServices.updateConfig(id, { [field]: value ? 1 : 0 });

            if (result.success) {
                window.vendorConfigUIUtils.showToast(`${action}成功`, 'success');
                await this.loadVendors();
            } else {
                window.vendorConfigUIUtils.showToast(result.error, 'error');
                // 失败后恢复复选框状态
                await this.loadVendors();
            }
        } catch (error) {
            console.error('切换配置失败:', error);
            window.vendorConfigUIUtils.showToast('操作失败', 'error');
            // 失败后恢复复选框状态
            await this.loadVendors();
        }
    }

    /**
     * 从IQC同步供应商
     */
    async syncFromIQC() {
        console.log('🔄 点击了从IQC同步按钮');

        if (!await window.vendorConfigUIUtils.confirm('确定要从IQC数据同步供应商吗？')) {
            console.log('❌ 用户取消了同步');
            return;
        }

        console.log('📤 开始从IQC同步供应商...');
        window.vendorConfigUIUtils.showToast('正在同步...', 'info');

        try {
            const result = await window.vendorConfigServices.syncFromIQC('full');
            console.log('📊 同步结果:', result);

            if (result.success) {
                window.vendorConfigUIUtils.showToast(result.message, 'success');
                await this.loadVendors();
            } else {
                window.vendorConfigUIUtils.showToast(result.error, 'error');
            }
        } catch (error) {
            console.error('❌ 同步失败:', error);
            window.vendorConfigUIUtils.showToast('同步失败: ' + error.message, 'error');
        }
    }

    /**
     * 显示添加供应商模态框
     */
    showAddVendorModal() {
        const content = `
            <form id="addVendorForm">
                <div class="vendor-config__form-group">
                    <label for="supplierName">供应商名称 *</label>
                    <input type="text" id="supplierName" name="supplierName" required>
                </div>
                <div class="vendor-config__form-group">
                    <label for="source">来源</label>
                    <select id="source" name="source">
                        <option value="MANUAL">手动添加</option>
                    </select>
                </div>
            </form>
        `;

        window.vendorConfigUIUtils.showModal('添加供应商', content, [
            {
                text: '取消',
                class: 'vendor-config__modal-btn vendor-config__modal-btn--secondary',
                onClick: () => {}
            },
            {
                text: '确认',
                class: 'vendor-config__modal-btn vendor-config__modal-btn--primary',
                onClick: () => this.addVendor()
            }
        ]);
    }

    /**
     * 添加供应商
     */
    async addVendor() {
        const form = document.getElementById('addVendorForm');
        const supplierName = form.supplierName.value.trim();
        const source = form.source.value;

        const validation = window.vendorConfigUIUtils.validateSupplierName(supplierName);
        if (!validation.valid) {
            window.vendorConfigUIUtils.showToast(validation.error, 'error');
            return;
        }

        const result = await window.vendorConfigServices.addVendor({
            supplier_name: supplierName,
            source: source,
            enable_document_mgmt: 0,
            enable_performance_mgmt: 0,
            status: 'Active'
        });

        if (result.success) {
            window.vendorConfigUIUtils.showToast(result.message, 'success');
            await this.loadVendors();
        } else {
            window.vendorConfigUIUtils.showToast(result.error, 'error');
        }
    }

    /**
     * 显示编辑供应商模态框
     * @param {number} id - 供应商ID
     */
    showEditVendorModal(id) {
        const vendor = this.vendors.find(v => v.id === id);
        if (!vendor) return;

        const content = `
            <form id="editVendorForm">
                <div class="vendor-config__form-group">
                    <label for="editSupplierName">供应商名称</label>
                    <input type="text" id="editSupplierName" name="supplierName" value="${vendor.supplier_name}" readonly>
                </div>
                <div class="vendor-config__form-group">
                    <label>
                        <input type="checkbox" id="enableDocumentMgmt" name="enableDocumentMgmt" ${vendor.enable_document_mgmt ? 'checked' : ''}>
                        启用资料管理
                    </label>
                </div>
                <div class="vendor-config__form-group">
                    <label>
                        <input type="checkbox" id="enablePerformanceMgmt" name="enablePerformanceMgmt" ${vendor.enable_performance_mgmt ? 'checked' : ''}>
                        启用绩效评价
                    </label>
                </div>
                <div class="vendor-config__form-group">
                    <label for="status">状态</label>
                    <select id="status" name="status">
                        <option value="Active" ${vendor.status === 'Active' ? 'selected' : ''}>启用</option>
                        <option value="Inactive" ${vendor.status === 'Inactive' ? 'selected' : ''}>停用</option>
                    </select>
                </div>
            </form>
        `;

        window.vendorConfigUIUtils.showModal('编辑供应商配置', content, [
            {
                text: '取消',
                class: 'vendor-config__modal-btn vendor-config__modal-btn--secondary',
                onClick: () => {}
            },
            {
                text: '保存',
                class: 'vendor-config__modal-btn vendor-config__modal-btn--primary',
                onClick: () => this.updateVendorConfig(id)
            }
        ]);
    }

    /**
     * 更新供应商配置
     * @param {number} id - 供应商ID
     */
    async updateVendorConfig(id) {
        const form = document.getElementById('editVendorForm');
        const config = {
            enable_document_mgmt: form.enableDocumentMgmt.checked ? 1 : 0,
            enable_performance_mgmt: form.enablePerformanceMgmt.checked ? 1 : 0,
            status: form.status.value
        };

        const result = await window.vendorConfigServices.updateConfig(id, config);

        if (result.success) {
            window.vendorConfigUIUtils.showToast(result.message, 'success');
            await this.loadVendors();
        } else {
            window.vendorConfigUIUtils.showToast(result.error, 'error');
        }
    }

    /**
     * 删除供应商
     * @param {number} id - 供应商ID
     */
    async deleteVendor(id) {
        if (!await window.vendorConfigUIUtils.confirm('确定要删除这个供应商配置吗？')) {
            return;
        }

        const result = await window.vendorConfigServices.deleteVendor(id);

        if (result.success) {
            window.vendorConfigUIUtils.showToast(result.message, 'success');
            await this.loadVendors();
        } else {
            window.vendorConfigUIUtils.showToast(result.error, 'error');
        }
    }

    /**
     * 切换全选
     * @param {boolean} checked - 是否全选
     */
    toggleSelectAll(checked) {
        this.selectedVendors.clear();
        if (checked) {
            this.vendors.forEach(vendor => this.selectedVendors.add(vendor.id));
        }
        this.render();
        this.updateBatchActions();
    }

    /**
     * 切换单个供应商选择
     * @param {number} id - 供应商ID
     */
    toggleSelectVendor(id) {
        if (this.selectedVendors.has(id)) {
            this.selectedVendors.delete(id);
        } else {
            this.selectedVendors.add(id);
        }
        this.render();
        this.updateBatchActions();
    }

    /**
     * 清空选择
     */
    clearSelection() {
        this.selectedVendors.clear();
        this.render();
        this.updateBatchActions();
    }

    /**
     * 更新批量操作栏
     */
    updateBatchActions() {
        window.vendorConfigUIUtils.updateBatchActions(
            this.selectedVendors.size > 0,
            this.selectedVendors.size
        );
    }

    /**
     * 批量更新配置
     * @param {Object} config - 配置数据
     */
    async batchUpdateConfig(config) {
        if (this.selectedVendors.size === 0) {
            window.vendorConfigUIUtils.showToast('请先选择要操作的供应商', 'warning');
            return;
        }

        const ids = Array.from(this.selectedVendors);
        const result = await window.vendorConfigServices.batchUpdateConfig(ids, config);

        if (result.success) {
            window.vendorConfigUIUtils.showToast(result.message, 'success');
            this.clearSelection();
            await this.loadVendors();
        } else {
            window.vendorConfigUIUtils.showToast(result.error, 'error');
        }
    }

    /**
     * 批量删除供应商
     */
    async batchDeleteVendors() {
        if (this.selectedVendors.size === 0) {
            window.vendorConfigUIUtils.showToast('请先选择要删除的供应商', 'warning');
            return;
        }

        if (!await window.vendorConfigUIUtils.confirm(`确定要删除选中的 ${this.selectedVendors.size} 个供应商吗？`)) {
            return;
        }

        const ids = Array.from(this.selectedVendors);
        const result = await window.vendorConfigServices.batchDeleteVendors(ids);

        if (result.success) {
            window.vendorConfigUIUtils.showToast(result.message, 'success');
            this.clearSelection();
            await this.loadVendors();
        } else {
            window.vendorConfigUIUtils.showToast(result.error, 'error');
        }
    }

    /**
     * 渲染界面
     */
    render() {
        const container = document.getElementById('vendorTableBody');
        if (!container) return;

        if (this.vendors.length === 0) {
            window.vendorConfigUIUtils.showEmptyState();
            return;
        }

        const html = this.vendors.map(vendor => `
            <tr class="vendor-config__row">
                <td>${window.vendorConfigUIUtils.renderCheckbox(this.selectedVendors.has(vendor.id), vendor.id)}</td>
                <td class="vendor-config__cell vendor-config__cell--name">${vendor.supplier_name}</td>
                <td class="vendor-config__cell vendor-config__cell--source">${window.vendorConfigUIUtils.renderSourceBadge(vendor.source)}</td>
                <td class="vendor-config__cell vendor-config__cell--document">
                    <input type="checkbox" 
                           class="vendor-config__toggle-checkbox" 
                           data-vendor-id="${vendor.id}" 
                           data-field="enable_document_mgmt"
                           ${vendor.enable_document_mgmt ? 'checked' : ''}>
                </td>
                <td class="vendor-config__cell vendor-config__cell--performance">
                    <input type="checkbox" 
                           class="vendor-config__toggle-checkbox" 
                           data-vendor-id="${vendor.id}" 
                           data-field="enable_performance_mgmt"
                           ${vendor.enable_performance_mgmt ? 'checked' : ''}>
                </td>
                <td class="vendor-config__cell vendor-config__cell--status">${window.vendorConfigUIUtils.renderStatusBadge(vendor.status)}</td>
                <td class="vendor-config__cell vendor-config__cell--actions">${window.vendorConfigUIUtils.renderActionButtons(vendor.id, vendor.status)}</td>
            </tr>
        `).join('');

        container.innerHTML = html;

        // 重新绑定表格内的事件（因为HTML被重新生成了）
        this.bindTableEvents();

        // 更新全选复选框状态
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.checked = this.selectedVendors.size === this.vendors.length && this.vendors.length > 0;
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (!window.vendorConfigManager) {
            console.log('🚀 开始初始化供应商配置中心模块...');
            const manager = new VendorConfigManager();
            manager.init().catch(error => {
                console.error('❌ 供应商配置中心初始化失败:', error);
            });
        }
    } catch (error) {
        console.error('❌ 供应商配置中心初始化异常:', error);
    }
});