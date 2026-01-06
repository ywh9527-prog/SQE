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
        // 移除现有对话框
        const existingDialog = document.querySelector('.vendor-config-modal');
        if (existingDialog) {
            existingDialog.remove();
        }

        // 创建对话框
        const dialog = document.createElement('div');
        dialog.className = 'vendor-config-modal';

        const buttonsHtml = buttons.map(btn => {
            const btnClass = btn.class.includes('primary') ? 'vendor-config-modal-btn-confirm' : 'vendor-config-modal-btn-cancel';
            return `<button class="vendor-config-modal-btn ${btnClass}">${btn.text}</button>`;
        }).join('');

        dialog.innerHTML = `
            <div class="vendor-config-modal-backdrop"></div>
            <div class="vendor-config-modal-content">
                <div class="vendor-config-modal-header">
                    <h3 class="vendor-config-modal-title">${title}</h3>
                    <button class="vendor-config-modal-close">&times;</button>
                </div>
                <div class="vendor-config-modal-body">
                    ${content}
                </div>
                <div class="vendor-config-modal-footer">
                    ${buttonsHtml}
                </div>
            </div>
        `;

        // 添加样式
        if (!document.querySelector('#vendor-config-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'vendor-config-modal-styles';
            style.textContent = `
                .vendor-config-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 1003000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .vendor-config-modal-backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(4px);
                }

                .vendor-config-modal-content {
                    position: relative;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    max-width: 500px;
                    width: 90%;
                    max-height: 90vh;
                    padding: 0;
                    transform: scale(0.9) translateY(20px);
                    opacity: 0;
                    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    display: flex;
                    flex-direction: column;
                }

                .vendor-config-modal.show .vendor-config-modal-content {
                    transform: scale(1) translateY(0);
                    opacity: 1;
                }

                .vendor-config-modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 24px 24px 16px;
                    border-bottom: 1px solid #f3f4f6;
                }

                .vendor-config-modal-title {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 600;
                    color: #374151;
                }

                .vendor-config-modal-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    color: #9ca3af;
                    cursor: pointer;
                    padding: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                }

                .vendor-config-modal-close:hover {
                    background: #f3f4f6;
                    color: #374151;
                }

                .vendor-config-modal-body {
                    padding: 24px;
                    overflow-y: auto;
                    flex: 1;
                }

                .vendor-config-modal-footer {
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                    padding: 16px 24px 24px;
                    border-top: 1px solid #f3f4f6;
                }

                .vendor-config-modal-btn {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .vendor-config-modal-btn-cancel {
                    background: #f9fafb;
                    color: #6b7280;
                    border: 2px solid #e5e7eb;
                }

                .vendor-config-modal-btn-cancel:hover {
                    background: #f3f4f6;
                    color: #4b5563;
                    transform: translateY(-1px);
                }

                .vendor-config-modal-btn-confirm {
                    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                    color: white;
                    box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
                }

                .vendor-config-modal-btn-confirm:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
                }
            `;
            document.head.appendChild(style);
        }

        // 添加到页面
        document.body.appendChild(dialog);

        // 绑定事件
        const closeBtn = dialog.querySelector('.vendor-config-modal-close');
        const backdrop = dialog.querySelector('.vendor-config-modal-backdrop');
        const btnElements = dialog.querySelectorAll('.vendor-config-modal-btn');

        const closeDialog = () => {
            dialog.classList.remove('show');
            setTimeout(() => {
                dialog.remove();
            }, 300);
        };

        closeBtn.addEventListener('click', closeDialog);
        backdrop.addEventListener('click', closeDialog);

        buttons.forEach((btn, index) => {
            if (btnElements[index]) {
                btnElements[index].addEventListener('click', () => {
                    if (btn.onClick) btn.onClick();
                    closeDialog();
                });
            }
        });

        // 显示动画
        requestAnimationFrame(() => {
            dialog.classList.add('show');
        });

        return dialog;
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
            `<button class="vendor-config__btn vendor-config__btn--delete" data-id="${id}">🗑️</button>`
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
            // 移除现有对话框
            const existingDialog = document.querySelector('.vendor-config-confirm-dialog');
            if (existingDialog) {
                existingDialog.remove();
            }

            // 创建对话框
            const dialog = document.createElement('div');
            dialog.className = 'vendor-config-confirm-dialog';
            dialog.innerHTML = `
                <div class="vendor-config-confirm-dialog-backdrop"></div>
                <div class="vendor-config-confirm-dialog-content">
                    <div class="vendor-config-confirm-dialog-header">
                        <h3 class="vendor-config-confirm-dialog-title">确认操作</h3>
                        <button class="vendor-config-confirm-dialog-close">&times;</button>
                    </div>
                    <div class="vendor-config-confirm-dialog-body">
                        <div class="vendor-config-confirm-dialog-icon">⚠️</div>
                        <p class="vendor-config-confirm-dialog-message">${message}</p>
                    </div>
                    <div class="vendor-config-confirm-dialog-footer">
                        <button class="vendor-config-confirm-dialog-btn vendor-config-confirm-dialog-cancel">取消</button>
                        <button class="vendor-config-confirm-dialog-btn vendor-config-confirm-dialog-confirm">确认</button>
                    </div>
                </div>
            `;

            // 添加样式
            if (!document.querySelector('#vendor-config-confirm-dialog-styles')) {
                const style = document.createElement('style');
                style.id = 'vendor-config-confirm-dialog-styles';
                style.textContent = `
                    .vendor-config-confirm-dialog {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: 1003000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .vendor-config-confirm-dialog-backdrop {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.5);
                        backdrop-filter: blur(4px);
                    }

                    .vendor-config-confirm-dialog-content {
                        position: relative;
                        background: white;
                        border-radius: 16px;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                        max-width: 450px;
                        width: 90%;
                        padding: 0;
                        transform: scale(0.9) translateY(20px);
                        opacity: 0;
                        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }

                    .vendor-config-confirm-dialog.show .vendor-config-confirm-dialog-content {
                        transform: scale(1) translateY(0);
                        opacity: 1;
                    }

                    .vendor-config-confirm-dialog-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 24px 24px 16px;
                        border-bottom: 1px solid #f3f4f6;
                    }

                    .vendor-config-confirm-dialog-title {
                        margin: 0;
                        font-size: 18px;
                        font-weight: 600;
                        color: #374151;
                    }

                    .vendor-config-confirm-dialog-close {
                        background: none;
                        border: none;
                        font-size: 24px;
                        color: #9ca3af;
                        cursor: pointer;
                        padding: 0;
                        width: 32px;
                        height: 32px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 8px;
                        transition: all 0.2s ease;
                    }

                    .vendor-config-confirm-dialog-close:hover {
                        background: #f3f4f6;
                        color: #374151;
                    }

                    .vendor-config-confirm-dialog-body {
                        padding: 24px;
                        display: flex;
                        align-items: center;
                        gap: 16px;
                    }

                    .vendor-config-confirm-dialog-icon {
                        font-size: 48px;
                        flex-shrink: 0;
                    }

                    .vendor-config-confirm-dialog-message {
                        margin: 0;
                        font-size: 16px;
                        line-height: 1.5;
                        color: #4b5563;
                    }

                    .vendor-config-confirm-dialog-footer {
                        display: flex;
                        gap: 12px;
                        justify-content: flex-end;
                        padding: 16px 24px 24px;
                    }

                    .vendor-config-confirm-dialog-btn {
                        padding: 12px 24px;
                        border: none;
                        border-radius: 12px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }

                    .vendor-config-confirm-dialog-cancel {
                        background: #f9fafb;
                        color: #6b7280;
                        border: 2px solid #e5e7eb;
                    }

                    .vendor-config-confirm-dialog-cancel:hover {
                        background: #f3f4f6;
                        color: #4b5563;
                        transform: translateY(-1px);
                    }

                    .vendor-config-confirm-dialog-confirm {
                        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                        color: white;
                        box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
                    }

                    .vendor-config-confirm-dialog-confirm:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
                    }
                `;
                document.head.appendChild(style);
            }

            // 添加到页面
            document.body.appendChild(dialog);

            // 绑定事件
            const closeBtn = dialog.querySelector('.vendor-config-confirm-dialog-close');
            const cancelBtn = dialog.querySelector('.vendor-config-confirm-dialog-cancel');
            const backdrop = dialog.querySelector('.vendor-config-confirm-dialog-backdrop');
            const confirmBtn = dialog.querySelector('.vendor-config-confirm-dialog-confirm');

            const closeDialog = (result = false) => {
                dialog.classList.remove('show');
                setTimeout(() => {
                    dialog.remove();
                    resolve(result);
                }, 300);
            };

            closeBtn.addEventListener('click', () => closeDialog(false));
            cancelBtn.addEventListener('click', () => closeDialog(false));
            backdrop.addEventListener('click', () => closeDialog(false));
            confirmBtn.addEventListener('click', () => closeDialog(true));

            // 显示动画
            requestAnimationFrame(() => {
                dialog.classList.add('show');
            });
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
        container.innerHTML = `
          <tr>
            <td colspan="7" class="vendor-config__empty">
              <div class="no-data-content">
                <div class="no-data-icon">📭</div>
                <p>暂无数据</p>
              </div>
            </td>
          </tr>
        `;
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
        // 批量操作按钮现在在控制面板中静态显示，不再需要动态控制
        // 保留此方法以保持向后兼容性
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