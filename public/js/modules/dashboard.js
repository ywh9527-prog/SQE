/**
 * 工作台模块
 * 负责展示系统概览、统计卡片、预警提醒、趋势图表等
 */
(function() {
    // 模块状态
    const state = {
        overviewData: null,
        expiringDocuments: [],
        recentActivities: [],
        charts: {
            trendChart: null,
            topVendorsChart: null
        }
    };

    // DOM元素缓存
    const els = {};

    const DashboardModule = {
        // 初始化模块
        init() {
            console.log('Dashboard Module: Initializing...');
            this.cacheElements();
            this.bindEvents();
            this.loadData();
            console.log('Dashboard Module: Initialization complete');
        },

        // 缓存DOM元素
        cacheElements() {
            els.module = document.getElementById('module-dashboard');
            els.currentDate = document.getElementById('current-date');
            
            // 统计卡片
            els.vendorTotal = document.getElementById('stat-vendor-total');
            els.vendorPurchase = document.getElementById('stat-vendor-purchase');
            els.vendorExternal = document.getElementById('stat-vendor-external');
            els.purchasePassRate = document.getElementById('stat-purchase-pass-rate');
            els.externalPassRate = document.getElementById('stat-external-pass-rate');
            els.purchaseLabel = document.getElementById('stat-purchase-label');
            els.externalLabel = document.getElementById('stat-external-label');
            els.documentAlerts = document.getElementById('stat-document-alerts');
            
            // 预警区域
            els.expiredCount = document.getElementById('alert-expired');
            els.urgentCount = document.getElementById('alert-urgent');
            els.warningCount = document.getElementById('alert-warning');
            els.expiringList = document.getElementById('expiring-documents-list');
            
            // 图表区域
            els.trendChart = document.getElementById('trendChart');
            els.topVendorsChart = document.getElementById('topVendorsChart');
            
            // 最近活动
            els.recentActivities = document.getElementById('recent-activities-list');
            
            // 快捷操作按钮
            els.quickUploadIQC = document.getElementById('quick-upload-iqc');
            els.quickCreateEvaluation = document.getElementById('quick-create-evaluation');
            els.quickDocumentMgmt = document.getElementById('quick-document-mgmt');
            
            // IQC数据状态
            els.iqcPurchaseUpdate = document.getElementById('iqc-purchase-update');
            els.iqcExternalUpdate = document.getElementById('iqc-external-update');
        },

        // 绑定事件
        bindEvents() {
            // 快捷操作按钮
            if (els.quickUploadIQC) {
                els.quickUploadIQC.addEventListener('click', () => {
                    window.location.hash = 'iqc';
                });
            }
            if (els.quickCreateEvaluation) {
                els.quickCreateEvaluation.addEventListener('click', () => {
                    window.location.hash = 'performance';
                    // 延迟触发创建对话框
                    setTimeout(() => {
                        const createBtn = document.getElementById('createEvaluationBtn');
                        if (createBtn) createBtn.click();
                    }, 300);
                });
            }
            if (els.quickDocumentMgmt) {
                els.quickDocumentMgmt.addEventListener('click', () => {
                    window.location.hash = 'documents';
                });
            }
        },

        // 辅助函数：发送带认证的请求
        async authenticatedFetch(url, options = {}) {
            const token = localStorage.getItem('authToken');
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            return fetch(url, {
                ...options,
                headers
            });
        },

        // 加载所有数据
        async loadData() {
            await Promise.all([
                this.loadOverview(),
                this.loadExpiringDocuments(),
                this.loadRecentActivities()
            ]);
        },

        // 加载概览数据
        async loadOverview() {
            try {
                const response = await this.authenticatedFetch('/api/dashboard/overview');
                const result = await response.json();

                if (result.success) {
                    state.overviewData = result.data;
                    this.renderOverview();
                } else {
                    console.error('加载概览数据失败:', result.message);
                }
            } catch (error) {
                console.error('加载概览数据失败:', error);
            }
        },

        // 加载即将过期资料
        async loadExpiringDocuments() {
            try {
                const response = await this.authenticatedFetch('/api/dashboard/expiring-documents?days=30&limit=10');
                const result = await response.json();

                if (result.success) {
                    state.expiringDocuments = result.data;
                    this.renderExpiringDocuments();
                }
            } catch (error) {
                console.error('加载即将过期资料失败:', error);
            }
        },

        // 加载最近活动
        async loadRecentActivities() {
            try {
                const response = await this.authenticatedFetch('/api/dashboard/recent-activities?limit=8');
                const result = await response.json();

                if (result.success) {
                    state.recentActivities = result.data;
                    this.renderRecentActivities();
                }
            } catch (error) {
                console.error('加载最近活动失败:', error);
            }
        },

        // 渲染概览数据
        renderOverview() {
            const data = state.overviewData;
            if (!data) return;

            // 更新当前日期
            if (els.currentDate) {
                const now = new Date();
                const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
                els.currentDate.textContent = now.toLocaleDateString('zh-CN', options);
            }

            // 供应商统计
            if (els.vendorTotal && data.vendors) {
                els.vendorTotal.textContent = data.vendors.total || 0;
            }
            if (els.vendorPurchase && data.vendors) {
                els.vendorPurchase.textContent = `外购 ${data.vendors.purchase || 0}`;
            }
            if (els.vendorExternal && data.vendors) {
                els.vendorExternal.textContent = `外协 ${data.vendors.external || 0}`;
            }

            // 更新标签显示月份
            if (data.iqcData && data.iqcData.displayMonth) {
                const monthDisplay = this.formatMonthLabel(data.iqcData.displayMonth);
                if (els.purchaseLabel) {
                    els.purchaseLabel.textContent = `外购 ${monthDisplay} 合格率`;
                }
                if (els.externalLabel) {
                    els.externalLabel.textContent = `外协 ${monthDisplay} 合格率`;
                }
            }

            // 本月合格率（外购）
            if (els.purchasePassRate && data.iqcData) {
                const rate = data.iqcData.purchaseMonthlyPassRate;
                if (rate !== null && rate !== undefined) {
                    els.purchasePassRate.textContent = `${rate}%`;
                    // 根据合格率设置颜色
                    if (parseFloat(rate) >= 95) {
                        els.purchasePassRate.className = 'stat-value success';
                    } else if (parseFloat(rate) >= 85) {
                        els.purchasePassRate.className = 'stat-value warning';
                    } else {
                        els.purchasePassRate.className = 'stat-value danger';
                    }
                } else {
                    els.purchasePassRate.textContent = '-';
                    els.purchasePassRate.className = 'stat-value';
                }
            }

            // 本月合格率（外协）
            if (els.externalPassRate && data.iqcData) {
                const rate = data.iqcData.externalMonthlyPassRate;
                if (rate !== null && rate !== undefined) {
                    els.externalPassRate.textContent = `${rate}%`;
                    // 根据合格率设置颜色
                    if (parseFloat(rate) >= 95) {
                        els.externalPassRate.className = 'stat-value success';
                    } else if (parseFloat(rate) >= 85) {
                        els.externalPassRate.className = 'stat-value warning';
                    } else {
                        els.externalPassRate.className = 'stat-value danger';
                    }
                } else {
                    els.externalPassRate.textContent = '-';
                    els.externalPassRate.className = 'stat-value';
                }
            }

            // 资料预警
            if (els.documentAlerts && data.documents) {
                els.documentAlerts.textContent = data.documents.totalAlerts || 0;
                // 根据预警数量设置颜色
                if (data.documents.totalAlerts > 0) {
                    els.documentAlerts.className = 'stat-value warning';
                } else {
                    els.documentAlerts.className = 'stat-value success';
                }
            }

            // 预警区域
            if (els.expiredCount && data.documents) {
                els.expiredCount.textContent = data.documents.expired || 0;
            }
            if (els.urgentCount && data.documents) {
                els.urgentCount.textContent = data.documents.urgent || 0;
            }
            if (els.warningCount && data.documents) {
                els.warningCount.textContent = data.documents.warning || 0;
            }

            // IQC数据更新状态
            if (els.iqcPurchaseUpdate && data.iqcData) {
                if (data.iqcData.purchaseLastUpdate) {
                    const date = new Date(data.iqcData.purchaseLastUpdate);
                    const daysAgo = Math.floor((Date.now() - date) / (1000 * 60 * 60 * 24));
                    els.iqcPurchaseUpdate.textContent = `${daysAgo}天前更新`;
                    els.iqcPurchaseUpdate.className = daysAgo > 7 ? 'data-status outdated' : 'data-status updated';
                } else {
                    els.iqcPurchaseUpdate.textContent = '暂无数据';
                    els.iqcPurchaseUpdate.className = 'data-status none';
                }
            }
            if (els.iqcExternalUpdate && data.iqcData) {
                if (data.iqcData.externalLastUpdate) {
                    const date = new Date(data.iqcData.externalLastUpdate);
                    const daysAgo = Math.floor((Date.now() - date) / (1000 * 60 * 60 * 24));
                    els.iqcExternalUpdate.textContent = `${daysAgo}天前更新`;
                    els.iqcExternalUpdate.className = daysAgo > 7 ? 'data-status outdated' : 'data-status updated';
                } else {
                    els.iqcExternalUpdate.textContent = '暂无数据';
                    els.iqcExternalUpdate.className = 'data-status none';
                }
            }

            // 渲染图表
            this.renderTrendChart(data.monthlyTrend);
            this.renderTopVendorsChart(data.topVendors);
        },

        // 渲染趋势图表
        renderTrendChart(trendData) {
            if (!els.trendChart || !trendData || trendData.length === 0) {
                if (els.trendChart) {
                    els.trendChart.innerHTML = '<div class="chart-empty">暂无数据</div>';
                }
                return;
            }

            // 使用简单的Canvas绘制
            const canvas = document.createElement('canvas');
            canvas.width = els.trendChart.offsetWidth || 400;
            canvas.height = 200;
            els.trendChart.innerHTML = '';
            els.trendChart.appendChild(canvas);

            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;
            const padding = 40;

            // 数据范围
            const rates = trendData.map(d => parseFloat(d.passRate) || 0);
            const maxRate = Math.max(...rates, 100);
            const minRate = Math.min(...rates, 0);

            // 绘制背景网格
            ctx.strokeStyle = '#e5e7eb';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = padding + (height - 2 * padding) * i / 4;
                ctx.beginPath();
                ctx.moveTo(padding, y);
                ctx.lineTo(width - padding, y);
                ctx.stroke();
            }

            // 绘制折线
            if (trendData.length > 1) {
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.beginPath();

                trendData.forEach((data, index) => {
                    const x = padding + (width - 2 * padding) * index / (trendData.length - 1);
                    const rate = parseFloat(data.passRate) || 0;
                    const y = padding + (height - 2 * padding) * (maxRate - rate) / (maxRate - minRate);

                    if (index === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });

                ctx.stroke();

                // 绘制数据点
                trendData.forEach((data, index) => {
                    const x = padding + (width - 2 * padding) * index / (trendData.length - 1);
                    const rate = parseFloat(data.passRate) || 0;
                    const y = padding + (height - 2 * padding) * (maxRate - rate) / (maxRate - minRate);

                    ctx.fillStyle = '#3b82f6';
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            // 绘制X轴标签
            ctx.fillStyle = '#6b7280';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            trendData.forEach((data, index) => {
                const x = padding + (width - 2 * padding) * index / Math.max(trendData.length - 1, 1);
                ctx.fillText(data.month || '', x, height - 10);
            });

            // 绘制Y轴标签
            ctx.textAlign = 'right';
            for (let i = 0; i <= 4; i++) {
                const y = padding + (height - 2 * padding) * i / 4;
                const value = (maxRate - (maxRate - minRate) * i / 4).toFixed(0);
                ctx.fillText(value + '%', padding - 5, y + 4);
            }
        },

        // 渲染Top供应商图表
        renderTopVendorsChart(vendors) {
            if (!els.topVendorsChart || !vendors || vendors.length === 0) {
                if (els.topVendorsChart) {
                    els.topVendorsChart.innerHTML = '<div class="chart-empty">暂无数据</div>';
                }
                return;
            }

            let html = '<div class="top-vendors-list">';
            vendors.forEach((vendor, index) => {
                const rank = index + 1;
                const rankClass = rank <= 3 ? `rank-${rank}` : '';
                const score = vendor.avgScore || '0';
                const grade = vendor.grade || '-';
                
                html += `
                    <div class="top-vendor-item">
                        <span class="rank ${rankClass}">${rank}</span>
                        <span class="name" title="${vendor.name}">${vendor.name}</span>
                        <span class="score">${score}分</span>
                        <span class="grade">${grade}</span>
                    </div>
                `;
            });
            html += '</div>';

            els.topVendorsChart.innerHTML = html;
        },

        // 渲染即将过期资料列表
        renderExpiringDocuments() {
            if (!els.expiringList) return;

            if (state.expiringDocuments.length === 0) {
                els.expiringList.innerHTML = '<div class="empty-hint">暂无即将过期的资料</div>';
                return;
            }

            let html = '';
            state.expiringDocuments.slice(0, 5).forEach(doc => {
                const warningClass = doc.warningLevel === 'expired' ? 'expired' : 
                                     doc.warningLevel === 'critical' ? 'critical' :
                                     doc.warningLevel === 'urgent' ? 'urgent' : 'warning';
                const statusText = doc.daysUntilExpiry < 0 ? '已过期' : 
                                   doc.daysUntilExpiry === 0 ? '今日到期' : 
                                   `${doc.daysUntilExpiry}天后到期`;
                
                html += `
                    <div class="expiring-item ${warningClass}">
                        <span class="status-dot"></span>
                        <span class="doc-name" title="${doc.document_name}">${doc.document_name || '-'}</span>
                        <span class="doc-type">${doc.document_type || '-'}</span>
                        <span class="doc-expiry">${statusText}</span>
                    </div>
                `;
            });

            els.expiringList.innerHTML = html;
        },

        // 渲染最近活动
        renderRecentActivities() {
            if (!els.recentActivities) return;

            if (state.recentActivities.length === 0) {
                els.recentActivities.innerHTML = '<div class="empty-hint">暂无最近活动</div>';
                return;
            }

            let html = '';
            state.recentActivities.forEach(activity => {
                const timeAgo = this.formatTimeAgo(new Date(activity.time));
                const icon = activity.type === 'iqc_upload' ? 'ph-upload-simple' :
                            activity.type === 'evaluation' ? 'ph-clipboard-text' :
                            activity.type === 'document_upload' ? 'ph-file-plus' : 'ph-activity';
                
                html += `
                    <div class="activity-item">
                        <i class="ph ${icon}"></i>
                        <div class="activity-content">
                            <span class="activity-desc">${activity.description}</span>
                            <span class="activity-time">${timeAgo}</span>
                        </div>
                    </div>
                `;
            });

            els.recentActivities.innerHTML = html;
        },

        // 格式化时间差
        formatTimeAgo(date) {
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (minutes < 1) return '刚刚';
            if (minutes < 60) return `${minutes}分钟前`;
            if (hours < 24) return `${hours}小时前`;
            if (days < 7) return `${days}天前`;
            
            return date.toLocaleDateString('zh-CN');
        },

        // 格式化月份标签
        formatMonthLabel(monthStr) {
            if (!monthStr) return '';
            // 2025-11 -> 11月
            const parts = monthStr.split('-');
            if (parts.length === 2) {
                return `${parseInt(parts[1])}月`;
            }
            return monthStr;
        },

        // 刷新数据
        refresh() {
            this.loadData();
        }
    };

    // 暴露到全局
    window.App = window.App || {};
    window.App.Modules = window.App.Modules || {};
    window.App.Modules.Dashboard = DashboardModule;

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => DashboardModule.init());
    } else {
        DashboardModule.init();
    }
})();
