/**
 * 供应商配置中心主管理器
 * 负责模块的初始化、事件绑定和界面渲染
 */
class VendorConfigManager {
    constructor() {
        this.vendors = [];
        this.selectedVendors = new Set();
        this.currentType = 'purchase'; // 当前选择的数据类型：purchase-外购/external-外协
        this.filter = {
            source: '',
            status: '',
            keyword: ''
        };
        this.currentPage = 1;
        this.pageSize = 20;

        // 📋 定义所有管理模块字段
        // 新增模块时，只需在此处添加字段名即可，无需修改其他逻辑
        this.managementFields = [
            'enable_document_mgmt',      // 资料管理
            'enable_performance_mgmt'    // 绩效评价
            // 未来新增模块，例如：
            // 'enable_monthly_performance',  // 月度绩效评价
            // 'enable_quality_tracking',     // 质量追踪
        ];
    }

    /**
     * 初始化模块
     */
    async init() {
        window.vendorConfigManager = this;
        console.log('🚀 供应商配置中心模块初始化...');
        console.log('🚀 当前选择的数据类型:', this.currentType);

        // 先绑定事件，再加载数据，最后渲染
        this.bindEvents();
        await this.loadVendors();
    }

    /**
     * 加载供应商列表
     */
    async loadVendors() {
        window.vendorConfigUIUtils.setLoading(true);

        // 添加data_type到筛选条件
        const filterWithDataType = {
            ...this.filter,
            data_type: this.currentType
        };

        const result = await window.vendorConfigServices.getConfig(filterWithDataType);

        if (result.success) {
            this.vendors = result.data || [];
            
            // 中文拼音排序：先按来源排序（手动添加在前，IQC导入在后），然后按供应商名称拼音A-Z排序
            this.vendors.sort((a, b) => {
                // 第一级排序：按供应商名称拼音排序
                const nameCompare = a.supplier_name.localeCompare(b.supplier_name, 'zh-CN');
                if (nameCompare !== 0) {
                    return nameCompare;
                }
                
                // 第二级排序：按来源
                const sourceOrder = { 'MANUAL': 0, 'IQC': 1 };
                const sourceA = sourceOrder[a.source] ?? 2;
                const sourceB = sourceOrder[b.source] ?? 2;
                
                return sourceA - sourceB;
            });
            
            this.render();
        } else {
            window.vendorConfigUIUtils.showErrorState(result.error);
            window.vendorConfigUIUtils.showToast(result.error, 'error');
        }

        // 加载统计数据
        await this.loadStatistics();
    }

    /**
     * 加载统计数据
     */
    async loadStatistics() {
        try {
            console.log('📊 开始加载统计数据...');
            console.log('📊 当前选择的数据类型:', this.currentType);
            
            // 获取统计数据（根据当前类型筛选）
            const result = await window.vendorConfigServices.getStatistics(this.currentType);
            console.log('📊 统计数据API返回:', result);

            if (result.success) {
                console.log('📊 统计数据:', result.data);
                this.renderStatistics(result.data);
            } else {
                console.error('❌ 加载统计数据失败:', result.error);
            }

            // 获取类型统计数据（更新类型切换卡片）
            const typeResult = await window.vendorConfigServices.getTypeStatistics();
            if (typeResult.success) {
                this.renderTypeStatistics(typeResult.data);
            }
        } catch (error) {
            console.error('❌ 加载统计数据异常:', error);
        }
    }

    /**
     * 渲染统计数据
     */
    renderStatistics(data) {
        const statTotal = document.getElementById('statTotal');
        const statDocument = document.getElementById('statDocument');
        const statPerformance = document.getElementById('statPerformance');
        const statSyncTime = document.getElementById('statSyncTime');

        if (statTotal) statTotal.textContent = data.total || 0;
        if (statDocument) statDocument.textContent = data.document || 0;
        if (statPerformance) statPerformance.textContent = data.performance || 0;
        if (statSyncTime) statSyncTime.textContent = data.syncTime || '-';
    }

    /**
     * 渲染类型统计数据
     */
    renderTypeStatistics(data) {
        const purchaseCount = document.getElementById('purchaseCount');
        const externalCount = document.getElementById('externalCount');

        if (purchaseCount) purchaseCount.textContent = data.purchase || 0;
        if (externalCount) externalCount.textContent = data.external || 0;
    }

    /**
     * 加载供应商列表（保存和恢复滚动位置）
     */
    async loadVendorsWithScrollPosition() {
        // 保存滚动位置
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        console.log('📌 保存滚动位置:', scrollTop);

        // 加载列表
        await this.loadVendors();

        // 使用setTimeout确保DOM完全渲染后再恢复滚动位置
        setTimeout(() => {
            console.log('📍 恢复滚动位置:', scrollTop);
            window.scrollTo(0, scrollTop);
            document.documentElement.scrollTop = scrollTop;
            document.body.scrollTop = scrollTop;
        }, 100);
    }

    /**
     * 检查是否有任何一个管理模块被启用
     * @param {Object} vendor - 供应商数据
     * @returns {boolean} 是否有任何一个模块被启用
     */
    hasAnyManagementEnabled(vendor) {
        return this.managementFields.some(field => vendor[field] === 1 || vendor[field] === true);
    }

    /**
     * 更新单个供应商行的状态（不刷新整个列表）
     * @param {number} id - 供应商ID
     * @param {string} field - 字段名
     * @param {*} value - 新值
     */
    updateVendorRow(id, field, value) {
        // 更新数据
        const vendor = this.vendors.find(v => v.id === id);
        if (vendor) {
            vendor[field] = value;
        }

        // 更新DOM
        const row = document.querySelector(`tr[data-vendor-id="${id}"]`);
        if (row) {
            // 更新复选框
            const checkbox = row.querySelector(`input[data-field="${field}"]`);
            if (checkbox) {
                checkbox.checked = value;
            }

            // 更新状态选择器
            if (field === 'status') {
                const statusSelect = row.querySelector('.vendor-config__status-select');
                if (statusSelect) {
                    statusSelect.value = value;
                }
            }
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

        // 绑定类型切换卡片事件
        this.bindTypeSwitcherEvents();
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
                // 切换开关点击（用于启用/禁用功能）
                if (e.target.matches('.vendor-config__plane-switch input')) {
                    this.toggleVendorConfig(parseInt(e.target.dataset.vendorId), e.target.dataset.field, e.target.checked);
                }
                // 删除按钮点击
                if (e.target.matches('.vendor-config__btn--delete')) {
                    this.deleteVendor(parseInt(e.target.dataset.id));
                }
            };
            tableBody.addEventListener('click', this.tableBodyHandler);
            console.log('✅ tableBody 事件绑定成功');
        }

        // 状态下拉框变化事件
        const statusSelects = document.querySelectorAll('.vendor-config__status-select');
        statusSelects.forEach(select => {
            select.removeEventListener('change', this.statusChangeHandler);
            this.statusChangeHandler = (e) => {
                this.updateVendorStatus(parseInt(e.target.dataset.vendorId), e.target.value);
            };
            select.addEventListener('change', this.statusChangeHandler);
        });
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
                } else if (e.target.id === 'batchDisable') {
                    this.batchDisableVendors();
                } else if (e.target.id === 'batchCancel') {
                    this.clearSelection();
                }
            };
            batchActions.addEventListener('click', this.batchActionsHandler);
            console.log('✅ batchActions 事件绑定成功');
        }
    }

    /**
     * 绑定类型切换卡片事件
     */
    bindTypeSwitcherEvents() {
        console.log('🔗 绑定类型切换卡片事件...');

        const typeCards = document.querySelectorAll('.vendor-config__type-card');
        typeCards.forEach(card => {
            card.addEventListener('click', () => {
                const type = card.dataset.type;
                this.switchType(type);
            });
        });

        console.log('✅ 类型切换卡片事件绑定成功');
    }

    /**
     * 切换数据类型
     * @param {string} type - 数据类型（purchase-外购/external-外协）
     */
    switchType(type) {
        console.log(`🔄 切换数据类型: ${type}`);

        // 更新当前类型
        this.currentType = type;

        // 更新卡片样式
        const typeCards = document.querySelectorAll('.vendor-config__type-card');
        typeCards.forEach(card => {
            const statusElement = card.querySelector('.vendor-config__type-status');
            if (card.dataset.type === type) {
                card.classList.add('vendor-config__type-card--active');
                if (statusElement) statusElement.textContent = '当前选中';
            } else {
                card.classList.remove('vendor-config__type-card--active');
                if (statusElement) statusElement.textContent = '未选中';
            }
        });

        // 重新加载数据
        this.loadVendors();
        this.loadStatistics();
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
            let suggestionTimer;
            let activeSuggestionIndex = -1;

            // 点击搜索框 - 显示所有供应商
            searchInput.addEventListener('focus', () => {
                this.showSearchSuggestions('');
            });

            // 输入事件 - 显示建议列表
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                clearTimeout(suggestionTimer);
                const keyword = e.target.value.trim();

                // 显示建议列表
                if (keyword.length > 0) {
                    suggestionTimer = setTimeout(() => {
                        this.showSearchSuggestions(keyword);
                    }, 300);
                } else {
                    // 如果清空了输入框，显示所有供应商
                    this.showSearchSuggestions('');
                }

                // 防抖搜索
                debounceTimer = setTimeout(() => {
                    this.filter.keyword = keyword;
                    this.loadVendors();
                }, 500);
            });

            // 键盘事件 - 导航建议列表
            searchInput.addEventListener('keydown', (e) => {
                const suggestions = document.querySelectorAll('.vendor-config__search-suggestion-item');

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    activeSuggestionIndex = Math.min(activeSuggestionIndex + 1, suggestions.length - 1);
                    this.updateActiveSuggestion(suggestions, activeSuggestionIndex);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    activeSuggestionIndex = Math.max(activeSuggestionIndex - 1, -1);
                    this.updateActiveSuggestion(suggestions, activeSuggestionIndex);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
                        suggestions[activeSuggestionIndex].click();
                    } else {
                        // 执行搜索
                        this.filter.keyword = searchInput.value.trim();
                        this.loadVendors();
                        this.hideSearchSuggestions();
                    }
                } else if (e.key === 'Escape') {
                    this.hideSearchSuggestions();
                    activeSuggestionIndex = -1;
                }
            });

            // 点击外部隐藏建议列表
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.vendor-config__search-wrapper')) {
                    this.hideSearchSuggestions();
                    activeSuggestionIndex = -1;
                }
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
                // 复选框点击（用于批量选择）
                if (e.target.matches('.vendor-config__checkbox')) {
                    this.toggleSelectVendor(parseInt(e.target.dataset.id));
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
                } else if (e.target.id === 'batchDisable') {
                    this.batchDisableVendors();
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

        try {
            // 先更新要修改的字段
            const updateData = { [field]: value ? 1 : 0 };

            // 检查是否有任何一个管理模块被启用
            // 临时更新数据以进行判断
            const tempVendor = { ...vendor, [field]: value ? 1 : 0 };
            const hasAnyEnabled = this.hasAnyManagementEnabled(tempVendor);

            // 如果有任何一个模块被启用，状态应该为"Active"
            if (hasAnyEnabled) {
                updateData.status = 'Active';
            }

            const result = await window.vendorConfigServices.updateConfig(id, updateData);

            if (result.success) {
                window.vendorConfigUIUtils.showToast(`已${action}供应商"${vendor.supplier_name}"的${fieldName}功能`, 'success');
                // 只更新单个供应商行，不刷新整个列表
                this.updateVendorRow(id, field, value);
                // 如果状态改变了，也要更新状态选择器
                if (hasAnyEnabled) {
                    this.updateVendorRow(id, 'status', 'Active');
                }

                // 延迟刷新数据概览,确保后端同步完成
                setTimeout(() => {
                    this.loadStatistics();
                }, 500);

                // 通知资料管理模块刷新
                window.dispatchEvent(new CustomEvent('vendor-config-updated', {
                    detail: { field, value }
                }));
            } else {
                window.vendorConfigUIUtils.showToast(result.error, 'error');
                // 失败后恢复复选框状态
                this.updateVendorRow(id, field, !value);
            }
        } catch (error) {
            console.error('切换配置失败:', error);
            window.vendorConfigUIUtils.showToast('操作失败', 'error');
            // 失败后恢复复选框状态
            this.updateVendorRow(id, field, !value);
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

                // 通知资料管理模块刷新
                window.dispatchEvent(new CustomEvent('vendor-config-updated', {
                    detail: { action: 'sync-from-iqc' }
                }));
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
                    <label for="dataType">数据类型 *</label>
                    <select id="dataType" name="dataType" required>
                        <option value="purchase">外购</option>
                        <option value="external">外协</option>
                    </select>
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
        const dataType = form.dataType.value;
        const source = form.source.value;

        const validation = window.vendorConfigUIUtils.validateSupplierName(supplierName);
        if (!validation.valid) {
            window.vendorConfigUIUtils.showToast(validation.error, 'error');
            return;
        }

        const result = await window.vendorConfigServices.addVendor({
            supplier_name: supplierName,
            data_type: dataType,
            source: source,
            enable_document_mgmt: 0,
            enable_performance_mgmt: 0,
            status: 'Inactive'
        });

        if (result.success) {
            window.vendorConfigUIUtils.showToast(result.message, 'success');
            await this.loadVendors();

            // 通知资料管理模块刷新
            window.dispatchEvent(new CustomEvent('vendor-config-updated', {
                detail: { action: 'add' }
            }));
        } else {
            window.vendorConfigUIUtils.showToast(result.error, 'error');
        }
    }

    /**
     * 更新供应商状态
     * @param {number} id - 供应商ID
     * @param {string} newStatus - 新状态
     */
    async updateVendorStatus(id, newStatus) {
        const vendor = this.vendors.find(v => v.id === id);
        if (!vendor) return;

        const action = newStatus === 'Active' ? '启用' : '禁用';
        const message = `确定要${action}供应商"${vendor.supplier_name}"吗？`;

        if (!await window.vendorConfigUIUtils.confirm(message)) {
            // 恢复下拉框状态
            const select = document.querySelector(`.vendor-config__status-select[data-vendor-id="${id}"]`);
            if (select) {
                select.value = vendor.status;
            }
            return;
        }

        // 根据状态自动启用/禁用功能
        const config = {
            status: newStatus,
            enable_document_mgmt: newStatus === 'Active' ? 1 : 0,
            enable_performance_mgmt: newStatus === 'Active' ? 1 : 0
        };

        const result = await window.vendorConfigServices.updateConfig(id, config);

        if (result.success) {
            window.vendorConfigUIUtils.showToast(`${action}成功`, 'success');
            // 更新本地数据
            vendor.status = newStatus;
            vendor.enable_document_mgmt = config.enable_document_mgmt;
            vendor.enable_performance_mgmt = config.enable_performance_mgmt;

            // 更新复选框状态
            const row = document.querySelector(`tr[data-vendor-id="${id}"]`);
            if (row) {
                const docCheckbox = row.querySelector('[data-field="enable_document_mgmt"]');
                const perfCheckbox = row.querySelector('[data-field="enable_performance_mgmt"]');
                if (docCheckbox) {
                    docCheckbox.checked = config.enable_document_mgmt === 1;
                }
                if (perfCheckbox) {
                    perfCheckbox.checked = config.enable_performance_mgmt === 1;
                }
            }

            // 通知资料管理模块刷新
            window.dispatchEvent(new CustomEvent('vendor-config-updated', {
                detail: { status: newStatus }
            }));
        } else {
            window.vendorConfigUIUtils.showToast(result.error, 'error');
            // 恢复下拉框状态
            const select = document.querySelector(`.vendor-config__status-select[data-vendor-id="${id}"]`);
            if (select) {
                select.value = vendor.status;
            }
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

            // 通知资料管理模块刷新
            window.dispatchEvent(new CustomEvent('vendor-config-updated', {
                detail: { action: 'delete', id }
            }));
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
     * 批量更新配置（对当前筛选结果中的所有供应商生效）
     * @param {Object} config - 配置数据
     */
    async batchUpdateConfig(config) {
        if (this.vendors.length === 0) {
            window.vendorConfigUIUtils.showToast('当前没有供应商可操作', 'warning');
            return;
        }

        // 检查是否有任何一个供应商启用了管理模块
        // 临时更新数据以进行判断
        const hasAnyEnabled = this.vendors.some(vendor => {
            const tempVendor = { ...vendor, ...config };
            return this.hasAnyManagementEnabled(tempVendor);
        });

        // 如果有任何一个模块被启用，状态应该为"Active"
        if (hasAnyEnabled) {
            config.status = 'Active';
        }

        // 根据config中的字段确定提示信息
        let actionText = '';
        if (config.enable_document_mgmt !== undefined) {
            actionText = config.enable_document_mgmt ? '为所有供应商启用资料管理' : '为所有供应商禁用资料管理';
        } else if (config.enable_performance_mgmt !== undefined) {
            actionText = config.enable_performance_mgmt ? '为所有供应商启用绩效评价' : '为所有供应商禁用绩效评价';
        } else if (config.status !== undefined) {
            actionText = config.status === 'Active' ? '启用所有供应商' : '禁用所有供应商';
        }

        if (!await window.vendorConfigUIUtils.confirm(`确定要${actionText}吗？当前筛选结果中共有 ${this.vendors.length} 个供应商。`)) {
            return;
        }

        const ids = this.vendors.map(v => v.id);
        const result = await window.vendorConfigServices.batchUpdateConfig(ids, config);

        if (result.success) {
            window.vendorConfigUIUtils.showToast(result.message, 'success');
            await this.loadVendorsWithScrollPosition();

            // 延迟发送事件,确保后端同步完成
            console.log('📢 批量更新成功,1秒后通知资料管理模块刷新...');
            setTimeout(() => {
                console.log('📢 发送vendor-config-updated事件');
                window.dispatchEvent(new CustomEvent('vendor-config-updated', {
                    detail: { config }
                }));
            }, 1000);
        } else {
            window.vendorConfigUIUtils.showToast(result.error, 'error');
        }
    }

    /**
     * 批量禁用供应商（对当前筛选结果中的所有供应商生效）
     */
    async batchDisableVendors() {
        if (this.vendors.length === 0) {
            window.vendorConfigUIUtils.showToast('当前没有供应商可操作', 'warning');
            return;
        }

        if (!await window.vendorConfigUIUtils.confirm(`确定要禁用所有供应商吗？当前筛选结果中共有 ${this.vendors.length} 个供应商。`)) {
            return;
        }

        const ids = this.vendors.map(v => v.id);
        const config = {
            status: 'Inactive',
            enable_document_mgmt: false,
            enable_performance_mgmt: false
        };

        const result = await window.vendorConfigServices.batchUpdateConfig(ids, config);

        

                if (result.success) {

        

                            window.vendorConfigUIUtils.showToast(result.message, 'success');

        

                            await this.loadVendorsWithScrollPosition();

        

                

        

                            // 延迟发送事件,确保后端同步完成

        

                            console.log('📢 批量禁用成功,1秒后通知资料管理模块刷新...');

        

                            setTimeout(() => {

        

                                console.log('📢 发送vendor-config-updated事件');

        

                                window.dispatchEvent(new CustomEvent('vendor-config-updated', {

        

                                    detail: { config }

        

                                }));

        

                            }, 1000);

        

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

        const html = this.vendors.map(vendor => {
            // 只显示供应商名称，不显示类型标签（因为已经通过卡片筛选了）
            return `
            <tr class="vendor-config__row" data-vendor-id="${vendor.id}">
                <td class="vendor-config__cell vendor-config__cell--name"><i class="ph ph-building-office" style="color: var(--primary-600); margin-right: 4px;"></i>${vendor.supplier_name}</td>
                <td class="vendor-config__cell vendor-config__cell--source">${window.vendorConfigUIUtils.renderSourceBadge(vendor.source)}</td>
                <td class="vendor-config__cell vendor-config__cell--document">
                    <label class="vendor-config__plane-switch">
                        <input type="checkbox"
                               data-vendor-id="${vendor.id}"
                               data-field="enable_document_mgmt"
                               ${vendor.enable_document_mgmt ? 'checked' : ''}>
                        <div>
                            <span class="street-middle"></span>
                            <span class="cloud"></span>
                            <span class="cloud two"></span>
                            <div>
                                <svg viewBox="0 0 13 13">
                                    <path d="M1.5535 6.375L6.5 1.4285V6.375H1.5535ZM6.5 12.3215V7.375H1.5535L6.5 12.3215ZM7.5 1.4285L12.4465 6.375H7.5V1.4285ZM12.4465 7.375L7.5 12.3215V7.375H12.4465Z" fill="currentColor"/>
                                </svg>
                            </div>
                        </div>
                    </label>
                </td>
                <td class="vendor-config__cell vendor-config__cell--performance">
                    <label class="vendor-config__plane-switch">
                        <input type="checkbox"
                               data-vendor-id="${vendor.id}"
                               data-field="enable_performance_mgmt"
                               ${vendor.enable_performance_mgmt ? 'checked' : ''}>
                        <div>
                            <span class="street-middle"></span>
                            <span class="cloud"></span>
                            <span class="cloud two"></span>
                            <div>
                                <svg viewBox="0 0 13 13">
                                    <path d="M1.5535 6.375L6.5 1.4285V6.375H1.5535ZM6.5 12.3215V7.375H1.5535L6.5 12.3215ZM7.5 1.4285L12.4465 6.375H7.5V1.4285ZM12.4465 7.375L7.5 12.3215V7.375H12.4465Z" fill="currentColor"/>
                                </svg>
                            </div>
                        </div>
                    </label>
                </td>
                <td class="vendor-config__cell vendor-config__cell--status">
                    <select class="vendor-config__status-select" data-vendor-id="${vendor.id}">
                        <option value="Active" ${vendor.status === 'Active' ? 'selected' : ''}>启用</option>
                        <option value="Inactive" ${vendor.status === 'Inactive' ? 'selected' : ''}>禁用</option>
                    </select>
                </td>
                <td class="vendor-config__cell vendor-config__cell--actions">${window.vendorConfigUIUtils.renderActionButtons(vendor.id, vendor.status)}</td>
            </tr>
        `;
        }).join('');

        container.innerHTML = html;

        // 重新绑定表格内的事件（因为HTML被重新生成了）
        this.bindTableEvents();
    }

    /**
     * 显示搜索建议列表
     * @param {string} keyword - 搜索关键词
     */
    showSearchSuggestions(keyword) {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (!suggestionsContainer) return;

        // 如果keyword为空，显示所有供应商；否则进行模糊匹配
        let matchedVendors;
        if (keyword === '' || keyword === null || keyword === undefined) {
            matchedVendors = this.vendors; // 显示所有供应商
        } else {
            matchedVendors = this.vendors.filter(vendor =>
                vendor.supplier_name.toLowerCase().includes(keyword.toLowerCase())
            );
        }

        if (matchedVendors.length === 0) {
            suggestionsContainer.innerHTML = '<div class="vendor-config__search-suggestions__no-result">没有找到匹配的供应商</div>';
        } else {
            suggestionsContainer.innerHTML = matchedVendors.map(vendor => `
                <div class="vendor-config__search-suggestion-item" data-vendor-name="${vendor.supplier_name}">
                    <span class="vendor-config__search-suggestion-item__name">${vendor.supplier_name}</span>
                    <div class="vendor-config__search-suggestion-item__tags">
                        <span class="vendor-config__search-suggestion-item__tag vendor-config__search-suggestion-item__tag--source">${vendor.source}</span>
                        <span class="vendor-config__search-suggestion-item__tag vendor-config__search-suggestion-item__tag--${vendor.status.toLowerCase()}">${vendor.status === 'Active' ? '启用' : '禁用'}</span>
                    </div>
                </div>
            `).join('');

            // 为每个建议项添加点击事件
            suggestionsContainer.querySelectorAll('.vendor-config__search-suggestion-item').forEach(item => {
                item.addEventListener('click', () => {
                    const supplierName = item.dataset.vendorName;
                    const searchInput = document.getElementById('searchInput');
                    if (searchInput) {
                        searchInput.value = supplierName;
                        this.filter.keyword = supplierName;
                        this.loadVendors();
                        this.hideSearchSuggestions();
                    }
                });
            });
        }

        // 计算并设置下拉列表的位置和宽度
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            const rect = searchInput.getBoundingClientRect();
            
            suggestionsContainer.style.top = `${rect.bottom + 4}px`;
            suggestionsContainer.style.left = `${rect.left}px`;
            suggestionsContainer.style.width = `${rect.width}px`;
        }

        suggestionsContainer.classList.add('vendor-config__search-suggestions--visible');
    }

    /**
     * 隐藏搜索建议列表
     */
    hideSearchSuggestions() {
        const suggestionsContainer = document.getElementById('searchSuggestions');
        if (suggestionsContainer) {
            suggestionsContainer.classList.remove('vendor-config__search-suggestions--visible');
        }
    }

    /**
     * 更新活动建议项
     * @param {NodeList} suggestions - 建议项列表
     * @param {number} activeIndex - 活动索引
     */
    updateActiveSuggestion(suggestions, activeIndex) {
        suggestions.forEach((item, index) => {
            if (index === activeIndex) {
                item.classList.add('vendor-config__search-suggestion-item--active');
            } else {
                item.classList.remove('vendor-config__search-suggestion-item--active');
            }
        });
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