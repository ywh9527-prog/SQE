(function () {
    'use strict';

    class SupplierModule {
        constructor() {
            this.moduleName = 'suppliers';
            this.initialized = false;
        }

        init() {
            if (this.initialized) return;
            console.log('Supplier Module Initialized');

            this.cacheDOM();
            this.bindEvents();
            this.loadSuppliers(); // 初始加载数据

            this.initialized = true;
        }

        cacheDOM() {
            this.container = document.getElementById('module-suppliers');
            this.addBtn = document.getElementById('addSupplierBtn');
            this.searchInput = document.getElementById('supplierListSearch');
            this.levelFilter = document.getElementById('supplierLevelFilter');
            this.statusFilter = document.getElementById('supplierStatusFilter');
            this.tableBody = document.getElementById('supplierTableBody');
        }

        bindEvents() {
            if (this.addBtn) {
                this.addBtn.addEventListener('click', () => this.openAddModal());
            }

            // 搜索和筛选事件
            if (this.searchInput) {
                this.searchInput.addEventListener('input', this.debounce(() => this.filterSuppliers(), 300));
            }
            if (this.levelFilter) {
                this.levelFilter.addEventListener('change', () => this.filterSuppliers());
            }
            if (this.statusFilter) {
                this.statusFilter.addEventListener('change', () => this.filterSuppliers());
            }
        }

        async loadSuppliers() {
            // 暂时模拟数据，后续对接 API
            // TODO: Replace with API call: const response = await window.App.API.get('/suppliers');
            this.suppliersData = [
                { id: 1, code: 'SUP001', name: '示例供应商A', level: 'Strategic', contact_person: '张三', status: 'Active' },
                { id: 2, code: 'SUP002', name: '示例供应商B', level: 'General', contact_person: '李四', status: 'Active' },
                { id: 3, code: 'SUP003', name: '示例供应商C', level: 'Eliminated', contact_person: '王五', status: 'Inactive' }
            ];
            this.renderTable(this.suppliersData);
        }

        filterSuppliers() {
            const searchTerm = this.searchInput.value.toLowerCase();
            const level = this.levelFilter.value;
            const status = this.statusFilter.value;

            const filtered = this.suppliersData.filter(item => {
                const matchSearch = item.name.toLowerCase().includes(searchTerm) || item.code.toLowerCase().includes(searchTerm);
                const matchLevel = level ? item.level === level : true;
                const matchStatus = status ? item.status === status : true;
                return matchSearch && matchLevel && matchStatus;
            });

            this.renderTable(filtered);
        }

        renderTable(data) {
            if (!this.tableBody) return;

            if (data.length === 0) {
                this.tableBody.innerHTML = '<tr><td colspan="6" class="text-center">暂无数据</td></tr>';
                return;
            }

            this.tableBody.innerHTML = data.map(item => `
                <tr>
                    <td>${item.code}</td>
                    <td>${item.name}</td>
                    <td><span class="badge badge-${item.level.toLowerCase()}">${this.getLevelLabel(item.level)}</span></td>
                    <td>${item.contact_person}</td>
                    <td><span class="status-dot status-${item.status.toLowerCase()}"></span> ${this.getStatusLabel(item.status)}</td>
                    <td>
                        <button class="btn-icon" onclick="window.App.Modules.Suppliers.editSupplier(${item.id})" title="编辑"><i class="ph ph-pencil"></i></button>
                        <button class="btn-icon" onclick="window.App.Modules.Suppliers.viewDetails(${item.id})" title="详情"><i class="ph ph-eye"></i></button>
                    </td>
                </tr>
            `).join('');
        }

        getLevelLabel(level) {
            const map = {
                'Strategic': '战略',
                'Core': '核心',
                'General': '一般',
                'Eliminated': '淘汰'
            };
            return map[level] || level;
        }

        getStatusLabel(status) {
            const map = {
                'Active': '活跃',
                'Inactive': '停用',
                'Blacklisted': '黑名单'
            };
            return map[status] || status;
        }

        openAddModal() {
            window.App.Toast.info('新增功能开发中...');
        }

        editSupplier(id) {
            window.App.Toast.info(`编辑供应商 ${id} 开发中...`);
        }

        viewDetails(id) {
            window.App.Toast.info(`查看详情 ${id} 开发中...`);
        }

        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    }

    // 注册模块
    window.App = window.App || {};
    window.App.Modules = window.App.Modules || {};
    window.App.Modules.Suppliers = new SupplierModule();

})();
