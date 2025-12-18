/**
 * 文档状态计算服务 - 统一的状态判断逻辑
 * 🎯 新的状态分类标准：
 * - 🟢 normal: 30天以上（含永久）
 * - 🟡 warning: 15-30天
 * - 🟠 urgent: <15天
 * - 🔴 expired: 过期（<0天）
 */
class DocumentStatusService {
    /**
     * 计算文档状态
     * @param {Date|string} expiryDate - 到期日期
     * @param {boolean} isPermanent - 是否永久有效
     * @returns {Object} 包含状态和剩余天数的对象
     */
    static calculateDocumentStatus(expiryDate, isPermanent = false) {
        let daysUntilExpiry = null;
        let status = 'normal';

        if (!isPermanent && expiryDate) {
            const expiry = new Date(expiryDate);
            const now = new Date();

            // 只比较日期部分，忽略时间部分
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const expiryDay = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());

            daysUntilExpiry = Math.ceil((expiryDay - today) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry < 0) {
                status = 'expired';
            } else if (daysUntilExpiry <= 15) {
                status = 'urgent';
            } else if (daysUntilExpiry <= 30) {
                status = 'warning';
            }
        }

        return {
            status,
            daysUntilExpiry,
            isExpired: status === 'expired',
            isUrgent: status === 'urgent',
            isWarning: status === 'warning',
            isNormal: status === 'normal'
        };
    }

    /**
     * 获取状态图标
     * @param {string} status - 状态代码
     * @returns {string} 状态图标
     */
    static getStatusIcon(status) {
        const iconMap = {
            normal: '🟢',
            warning: '🟡',
            urgent: '🟠',
            expired: '🔴'
        };
        return iconMap[status] || '⚪';
    }

    /**
     * 获取状态文本
     * @param {string} status - 状态代码
     * @returns {string} 状态文本
     */
    static getStatusText(status) {
        const textMap = {
            normal: '🟢 正常',
            warning: '🟡 即将到期',
            urgent: '🟠 紧急',
            expired: '🔴 已过期'
        };
        return textMap[status] || status;
    }

    /**
     * 获取状态颜色
     * @param {string} status - 状态代码
     * @returns {string} 颜色值
     */
    static getStatusColor(status) {
        const colorMap = {
            normal: '#22c55e',    // 绿色
            warning: '#f59e0b',   // 黄色
            urgent: '#f97316',    // 橙色
            expired: '#ef4444'    // 红色
        };
        return colorMap[status] || '#6b7280';
    }

    /**
     * 获取状态优先级（用于排序）
     * @param {string} status - 状态代码
     * @returns {number} 优先级数值（越大越紧急）
     */
    static getStatusPriority(status) {
        const priorityMap = {
            normal: 1,
            warning: 2,
            urgent: 3,
            expired: 4
        };
        return priorityMap[status] || 0;
    }
}

module.exports = DocumentStatusService;