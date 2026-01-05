/**
 * 供应商配置中心UI工具层
 * 负责UI组件的渲染和交互
 */
class VendorConfigUIUtils {
    constructor() {
        if (!window.vendorConfigServices) {
            throw new Error('VendorConfigUIUtils 依赖 VendorConfigServices');
        }
    }

    /**
     * 显示Toast提示
     * @param {string} message - 提示消息
     * @param {string} type - 类型 (success | error | warning | info)
     */
    showToast(message, type = 'success') {
        if (window.showToast) {
            window.showToast(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    /**
     * 显示模态框
     * @param {string} title - 标题
     * @param {string} content - 内容
     * @param {Array} buttons - 按钮数组
     */
    showModal(title, content, buttons = []) {
        // 使用App.Modal显示模态框
        if (window.App && window.App.Modal) {
            const footerButtons = buttons.map(btn => {
                const btnStyle = btn.class.includes('primary') ?
                    'padding: 8px 16px; border: none; background: #2563eb; color: white; border-radius: 6px; cursor: pointer; font-weight: 500;' :
                    'padding: 8px 16px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; cursor: pointer; font-weight: 500;';

                return `<button class="vendor-config__modal-btn" style="${btnStyle}">${btn.text}</button>`;
            }).join('');

            const modalEl = window.App.Modal.show({
                title: title,
                content: content,
                width: '500px',
                footer: footerButtons
            });

            // 绑定按钮事件
            const btnElements = modalEl.querySelectorAll('.vendor-config__modal-btn');
            buttons.forEach((btn, index) => {
                if (btnElements[index]) {
                    btnElements[index].addEventListener('click', () => {
                        if (btn.onClick) btn.onClick();
                        window.App.Modal.close();
                    });
                }
            });

            return modalEl;
        } else {
            console.error('window.App.Modal 未找到');
            return null;
        }
    }

    /**
     * 格式化日期
     * @param {string} dateString - 日期字符串
     * @returns {string} 格式化后的日期
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * 渲染状态徽章
     * @param {string} status - 状态
     * @returns {string} HTML字符串
     */
    renderStatusBadge(status) {
        const statusMap = {
            'Active': { text: '启用', class: 'vendor-config__status-badge--active' },
            'Inactive': { text: '停用', class: 'vendor-config__status-badge--inactive' }
        };
        const badge = statusMap[status] || { text: status, class: '' };
        return `<span class="vendor-config__status-badge ${badge.class}">${badge.text}</span>`;
    }

    /**
     * 渲染来源徽章
     * @param {string} source - 来源
     * @returns {string} HTML字符串
     */
    renderSourceBadge(source) {
        const sourceMap = {
            'IQC': { text: 'IQC数据', class: 'vendor-config__source-badge--iqc' },
            'MANUAL': { text: '手动添加', class: 'vendor-config__source-badge--manual' }
        };
        const badge = sourceMap[source] || { text: source, class: '' };
        return `<span class="vendor-config__source-badge ${badge.class}">${badge.text}</span>`;
    }

    /**
     * 渲染复选框
     * @param {boolean} checked - 是否选中
     * @param {string} id - ID
     * @returns {string} HTML字符串
     */
    renderCheckbox(checked, id) {
        return `<input type="checkbox" class="vendor-config__checkbox" ${checked ? 'checked' : ''} data-id="${id}">`;
    }

    /**
     * 渲染操作按钮
     * @param {number} id - 供应商ID
     * @param {string} status - 状态
     * @returns {string} HTML字符串
     */
    renderActionButtons(id, status) {
        const buttons = [
            `<button class="vendor-config__btn vendor-config__btn--edit" data-id="${id}" title="编辑">✏️</button>`,
            `<button class="vendor-config__btn vendor-config__btn--delete" data-id="${id}" title="删除">🗑️</button>`
        ];
        return buttons.join('');
    }

    /**
     * 确认对话框
     * @param {string} message - 确认消息
     * @returns {Promise<boolean>} 用户是否确认
     */
    async confirm(message) {
        return new Promise((resolve) => {
            if (window.App && window.App.Modal) {
                window.App.Modal.confirm(message, () => {
                    resolve(true);
                });

                // 点击取消按钮时resolve(false)
                const modalEl = document.querySelector('.modal');
                if (modalEl) {
                    const cancelBtn = modalEl.querySelector('.btn-cancel');
                    if (cancelBtn) {
                        cancelBtn.addEventListener('click', () => {
                            resolve(false);
                        }, { once: true });
                    }
                }
            } else {
                console.error('window.App.Modal 未找到');
                resolve(false);
            }
        });
    }

    /**
     * 显示加载状态
     * @param {boolean} loading - 是否加载中
     */
    setLoading(loading) {
        const container = document.getElementById('vendorTableBody');
        if (loading) {
            container.innerHTML = '<tr><td colspan="7" class="vendor-config__loading">加载中...</td></tr>';
        }
    }

    /**
     * 显示空状态
     */
    showEmptyState() {
        const container = document.getElementById('vendorTableBody');
        container.innerHTML = '<tr><td colspan="7" class="vendor-config__empty">暂无数据</td></tr>';
    }

    /**
     * 显示错误状态
     * @param {string} error - 错误信息
     */
    showErrorState(error) {
        const container = document.getElementById('vendorTableBody');
        container.innerHTML = `<tr><td colspan="7" class="vendor-config__error">加载失败: ${error}</td></tr>`;
    }

    /**
     * 更新批量操作栏显示状态
     * @param {boolean} visible - 是否可见
     * @param {number} count - 选中的数量
     */
    updateBatchActions(visible, count = 0) {
        const batchActions = document.querySelector('.vendor-config__batch-actions');
        if (visible) {
            batchActions.classList.remove('hidden');
            batchActions.innerHTML = `
                <span class="vendor-config__batch-info">已选择 ${count} 项</span>
                <button class="btn btn-primary" id="batchEnableDocument">批量启用资料管理</button>
                <button class="btn btn-primary" id="batchEnablePerformance">批量启用绩效评价</button>
                <button class="btn btn-danger" id="batchDelete">批量删除</button>
                <button class="btn btn-secondary" id="batchCancel">取消选择</button>
            `;
        } else {
            batchActions.classList.add('hidden');
        }
    }

    /**
     * 验证供应商名称
     * @param {string} name - 供应商名称
     * @returns {Object} 验证结果
     */
    validateSupplierName(name) {
        if (!name || name.trim() === '') {
            return { valid: false, error: '供应商名称不能为空' };
        }
        if (name.length > 255) {
            return { valid: false, error: '供应商名称不能超过255个字符' };
        }
        return { valid: true };
    }
}

// 创建全局UI工具实例
window.vendorConfigUIUtils = new VendorConfigUIUtils();