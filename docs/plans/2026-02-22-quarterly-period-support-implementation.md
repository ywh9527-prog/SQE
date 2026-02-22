# 季度绩效支持实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为供应商绩效评价模块增加季度周期类型支持，实现月度与季度严格互斥逻辑，避免数据混乱。

**Architecture:** 后端在创建周期时检测类型冲突，前端根据周期类型动态显示热力图数据，重置模式时清空所有非年度周期数据。

**Tech Stack:** Node.js/Express 后端，Vanilla JS 前端，SQLite 数据库

---

## 实施顺序总览

| 阶段 | 任务数 | 描述 |
|------|--------|------|
| 阶段1 | 3个 | 后端：周期类型检测 + 重置API |
| 阶段2 | 4个 | 前端：周期列表显示类型标签 |
| 阶段3 | 3个 | 前端：模式指示器 + 重置按钮 |
| 阶段4 | 2个 | 前端：热力图数据获取逻辑 |
| 阶段5 | 1个 | 测试验证 |

---

## 阶段1：后端周期类型检测

### Task 1: 添加周期类型冲突检测方法

**Files:**
- Modify: `server/services/performance-evaluation-service.js:129-200`

**Step 1: 在 performance-evaluation-service.js 中找到 createEvaluation 方法**

```javascript
// 在 createEvaluation 方法开头添加类型检测
async createEvaluation(data) {
    // 新增：检查周期类型冲突
    const conflictCheck = await this.checkPeriodTypeConflict(data.period_type);
    if (!conflictCheck.allowed) {
        throw new Error(conflictCheck.message);
    }
    
    // 原有逻辑继续...
```

**Step 2: 在文件末尾（约1600行）添加检测方法**

```javascript
/**
 * 检查周期类型冲突
 * 月度/季度/自定义 互斥，年度独立
 */
async checkPeriodTypeConflict(newPeriodType) {
    // 年度周期独立存在，不参与互斥检查
    if (newPeriodType === 'yearly') {
        return { allowed: true };
    }
    
    // 获取所有非年度周期
    const periods = await PerformanceEvaluation.findAll({
        where: {
            period_type: ['monthly', 'quarterly', 'custom']
        },
        order: [['created_at', 'ASC']]
    });
    
    if (periods.length === 0) {
        return { allowed: true };
    }
    
    const existingType = periods[0].period_type;
    
    if (existingType !== newPeriodType) {
        return { 
            allowed: false, 
            message: `当前系统为${this.getPeriodTypeName(existingType)}模式，请先删除所有${this.getPeriodTypeName(existingType)}周期后再创建${this.getPeriodTypeName(newPeriodType)}`,
            existingType 
        };
    }
    
    return { allowed: true };
}

/**
 * 获取周期类型中文名称
 */
getPeriodTypeName(type) {
    const map = {
        'monthly': '月度',
        'quarterly': '季度',
        'yearly': '年度',
        'custom': '自定义'
    };
    return map[type] || type;
}
```

**Step 3: 验证代码可运行**

```bash
# 重启服务器测试
cd /Users/owen/ai项目/sqe
node server/index.js
```

---

### Task 2: 添加重置周期模式 API

**Files:**
- Modify: `server/routes/evaluations.js:1-50`
- Modify: `server/services/performance-evaluation-service.js:1600-1650`

**Step 1: 在 evaluations.js 中添加新路由**

在现有路由（约第20行）后添加：

```javascript
// 重置周期模式
router.post('/reset-mode', async (req, res) => {
    try {
        const { newType } = req.body;
        
        if (!newType || !['monthly', 'quarterly'].includes(newType)) {
            return res.json({ success: false, message: '无效的周期类型' });
        }
        
        const result = await performanceEvaluationService.resetPeriodMode(newType);
        return res.json(result);
    } catch (error) {
        logger.error('重置周期模式失败:', error);
        return res.json({ success: false, message: error.message });
    }
});
```

**Step 2: 在 performance-evaluation-service.js 中添加方法**

```javascript
/**
 * 重置周期模式
 * 删除所有非年度周期及评价详情
 */
async resetPeriodMode(newType) {
    const transaction = await sequelize.transaction();
    
    try {
        // 1. 获取所有非年度周期
        const periods = await PerformanceEvaluation.findAll({
            where: {
                period_type: ['monthly', 'quarterly', 'custom']
            },
            transaction
        });
        
        if (periods.length === 0) {
            await transaction.commit();
            return { success: true, message: '无需重置，当前无周期数据' };
        }
        
        const periodIds = periods.map(p => p.id);
        
        // 2. 删除关联的评价详情
        await PerformanceEvaluationDetail.destroy({
            where: {
                evaluation_id: periodIds
            },
            transaction
        });
        
        // 3. 删除周期
        await PerformanceEvaluation.destroy({
            where: {
                id: periodIds
            },
            transaction
        });
        
        await transaction.commit();
        
        logger.info(`重置周期模式成功，删除了 ${periods.length} 个周期`);
        
        return { 
            success: true, 
            message: `已删除 ${periods.length} 个周期数据` 
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}
```

**Step 3: 测试 API**

```bash
# 测试重置API
curl -X POST http://localhost:3000/api/evaluations/reset-mode \
  -H "Content-Type: application/json" \
  -d '{"newType":"quarterly"}'
```

---

### Task 3: 确认后端改动完成

**验证方式：**
1. 创建一个月度周期
2. 尝试创建一个季度周期，应被拒绝并提示错误
3. 查看服务器日志确认检测逻辑工作正常

---

## 阶段2：前端周期列表显示类型标签

### Task 4: 修改周期列表渲染，添加类型标签

**Files:**
- Modify: `public/js/modules/performance.js:266-310`

**Step 1: 找到 renderPeriodsList 方法**

在约270行，找到 `renderPeriodsList` 方法

**Step 2: 修改周期项 HTML，添加类型标签**

将原有的周期项结构：
```javascript
item.innerHTML = `
    <div class="performance__period-item-info">
        <h4>${evaluation.period_name}</h4>
        <p>${evaluation.start_date} 至 ${evaluation.end_date}</p>
    </div>
    <div class="performance__period-item-status">
        ...
    </div>
`;
```

修改为：
```javascript
// 获取类型标签内容和类名
const periodTypeMap = {
    'monthly': { name: '月度', class: 'performance__period-type-tag--monthly' },
    'quarterly': { name: '季度', class: 'performance__period-type-tag--quarterly' },
    'yearly': { name: '年度', class: 'performance__period-type-tag--yearly' },
    'custom': { name: '自定义', class: 'performance__period-type-tag--custom' }
};
const typeInfo = periodTypeMap[evaluation.period_type] || { name: evaluation.period_type, class: '' };

item.innerHTML = `
    <div class="performance__period-item-info">
        <h4>${evaluation.period_name}</h4>
        <p>${evaluation.start_date} 至 ${evaluation.end_date}</p>
    </div>
    <span class="performance__period-type-tag ${typeInfo.class}">${typeInfo.name}</span>
    <div class="performance__period-item-status">
        ...
    </div>
`;
```

---

### Task 5: 添加周期类型标签 CSS 样式

**Files:**
- Create: `public/css/modules/performance-period-type.css`

**Step 1: 创建 CSS 文件**

```css
/* 周期类型标签 */
.performance__period-type-tag {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    margin-left: 8px;
}

/* 月度 */
.performance__period-type-tag--monthly {
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    color: #1565c0;
    border: 1px solid #90caf9;
}

/* 季度 */
.performance__period-type-tag--quarterly {
    background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
    color: #e65100;
    border: 1px solid #ffcc80;
}

/* 年度 */
.performance__period-type-tag--yearly {
    background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
    color: #2e7d32;
    border: 1px solid #a5d6a7;
}

/* 自定义 */
.performance__period-type-tag--custom {
    background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
    color: #7b1fa2;
    border: 1px solid #ce93d8;
}
```

**Step 2: 在 index.html 中引入 CSS**

在 `<head>` 中找到现有的性能相关 CSS 引入位置，添加：

```html
<link rel="stylesheet" href="css/modules/performance-period-type.css">
```

---

### Task 6: 测试周期列表类型标签显示

**验证方式：**
1. 刷新页面
2. 创建不同类型的周期（、月度、季度、年度）
3. 确认每个周期项都显示了正确的类型标签

---

### Task 7: 确认阶段2完成

**检查清单：**
- [ ] 月度周期显示蓝色"月度"标签
- [ ] 季度周期显示橙色"季度"标签
- [ ] 年度周期显示绿色"年度"标签
- [ ] 自定义周期显示紫色"自定义"标签

---

## 阶段3：模式指示器 + 重置按钮

### Task 8: 添加模式指示器到热力图标题

**Files:**
- Modify: `public/index.html:990-1010`
- Modify: `public/js/modules/performance-dashboard.js:780-820`

**Step 1: 在 index.html 中添加模式指示器**

找到热力图标题区域（约990行），添加：

```html
<h3 class="performance__heatmap-title">
    <span class="performance__heatmap-title-text">月度绩效得分矩阵</span>
    <span class="performance__period-mode-indicator hidden" id="periodModeIndicator">
        <span class="performance__period-mode-indicator-icon">📅</span>
        <span class="performance__period-mode-indicator-text">当前：月度模式</span>
    </span>
</h3>
```

**Step 2: 在 performance-dashboard.js 中添加更新方法**

在文件末尾添加：

```javascript
/**
 * 更新周期模式指示器
 */
updatePeriodModeIndicator() {
    const indicator = document.getElementById('periodModeIndicator');
    const indicatorText = indicator?.querySelector('.performance__period-mode-indicator-text');
    
    if (!indicator || !indicatorText) return;
    
    // 从state获取当前周期模式
    const currentMode = state.currentEvaluation?.period_type || 'monthly';
    
    const modeNames = {
        'monthly': '月度模式',
        'quarterly': '季度模式',
        'yearly': '年度模式',
        'custom': '自定义模式'
    };
    
    indicator.classList.remove('hidden');
    indicatorText.textContent = `当前：${modeNames[currentMode] || '月度模式'}`;
}
```

**Step 3: 在加载数据时调用更新方法**

在 `loadHeatmapData` 或类似方法末尾添加调用：

```javascript
// 数据加载完成后更新指示器
this.updatePeriodModeIndicator();
```

---

### Task 9: 添加重置模式按钮和确认对话框

**Files:**
- Modify: `public/index.html:520-560`
- Modify: `public/js/modules/performance.js:120-150`

**Step 1: 在创建周期按钮旁边添加重置按钮**

找到创建周期按钮区域，添加：

```html
<div class="performance__period-actions">
    <button class="performance__create-period-btn" id="createEvaluationBtn">
        <i class="ph ph-plus"></i> 创建评价周期
    </button>
    <button class="performance__reset-mode-btn hidden" id="resetModeBtn">
        <i class="ph ph-arrow-counter-clockwise"></i> 切换周期模式
    </button>
</div>
```

**Step 2: 添加确认对话框 HTML**

在 `<body>` 末尾添加：

```html
<!-- 重置模式确认对话框 -->
<div class="performance__confirm-dialog hidden" id="resetModeDialog">
    <div class="performance__confirm-dialog-overlay"></div>
    <div class="performance__confirm-dialog-content">
        <div class="performance__confirm-dialog-header">
            <i class="ph ph-warning" style="font-size: 24px; color: #ff9800;"></i>
            <h4>确认切换周期模式？</h4>
        </div>
        <div class="performance__confirm-dialog-body">
            <p>当前模式：<span class="performance__current-mode" id="currentModeText">-</span></p>
            <p>切换后：<span class="performance__new-mode" id="newModeText">-</span></p>
            <div class="performance__confirm-dialog-warning">
                ⚠️ 警告：切换将删除所有现有周期数据（评价记录将被清除），此操作不可恢复！
            </div>
        </div>
        <div class="performance__confirm-dialog-actions">
            <button class="performance__confirm-dialog-cancel" id="resetCancelBtn">取消</button>
            <button class="performance__confirm-dialog-confirm" id="resetConfirmBtn">确认切换</button>
        </div>
    </div>
</div>
```

**Step 3: 添加重置按钮和对话框的 CSS 样式**

在 `performance-period-type.css` 中添加：

```css
/* 周期操作按钮组 */
.performance__period-actions {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
}

/* 重置模式按钮 */
.performance__reset-mode-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    color: #616161;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
}

.performance__reset-mode-btn:hover {
    background: #f5f5f5;
    border-color: #bdbdbd;
}

/* 确认对话框 */
.performance__confirm-dialog {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
}

.performance__confirm-dialog-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
}

.performance__confirm-dialog-content {
    position: relative;
    background: #fff;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.performance__confirm-dialog-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
}

.performance__confirm-dialog-header h4 {
    margin: 0;
    font-size: 18px;
    color: #212121;
}

.performance__confirm-dialog-body {
    margin-bottom: 20px;
}

.performance__confirm-dialog-body p {
    margin: 8px 0;
    color: #616161;
}

.performance__current-mode {
    font-weight: 600;
    color: #1976d2;
}

.performance__new-mode {
    font-weight: 600;
    color: #f57c00;
}

.performance__confirm-dialog-warning {
    margin-top: 16px;
    padding: 12px;
    background: #fff3e0;
    border: 1px solid #ffcc80;
    border-radius: 6px;
    color: #e65100;
    font-size: 13px;
}

.performance__confirm-dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

.performance__confirm-dialog-cancel {
    padding: 8px 20px;
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    color: #616161;
    cursor: pointer;
}

.performance__confirm-dialog-confirm {
    padding: 8px 20px;
    background: #f44336;
    border: none;
    border-radius: 6px;
    color: #fff;
    cursor: pointer;
}

.performance__confirm-dialog-confirm:hover {
    background: #d32f2f;
}
```

---

### Task 10: 添加重置模式 JavaScript 逻辑

**Files:**
- Modify: `public/js/modules/performance.js:1-50`（添加元素引用）
- Modify: `public/js/modules/performance.js:150-200`（添加事件绑定）

**Step 1: 在初始化时获取元素引用**

找到元素定义区域，添加：

```javascript
// 重置模式相关
els.resetModeBtn = document.getElementById('resetModeBtn');
els.resetModeDialog = document.getElementById('resetModeDialog');
els.resetCancelBtn = document.getElementById('resetCancelBtn');
els.resetConfirmBtn = document.getElementById('resetConfirmBtn');
els.currentModeText = document.getElementById('currentModeText');
els.newModeText = document.getElementById('newModeText');
```

**Step 2: 添加重置按钮点击事件**

在 `bindEvents` 方法中添加：

```javascript
// 重置模式按钮点击
if (els.resetModeBtn) {
    els.resetModeBtn.addEventListener('click', () => this.showResetModeDialog());
}

// 对话框取消按钮
if (els.resetCancelBtn) {
    els.resetCancelBtn.addEventListener('click', () => this.hideResetModeDialog());
}

// 对话框确认按钮
if (els.resetConfirmBtn) {
    els.resetConfirmBtn.addEventListener('click', () => this.handleResetModeConfirm());
}

// 点击遮罩关闭
if (els.resetModeDialog) {
    const overlay = els.resetModeDialog.querySelector('.performance__confirm-dialog-overlay');
    if (overlay) {
        overlay.addEventListener('click', () => this.hideResetModeDialog());
    }
}
```

**Step 3: 添加相关方法**

在 `performance.js` 末尾添加：

```javascript
// 显示重置模式对话框
showResetModeDialog() {
    if (!els.resetModeDialog || !els.currentModeText || !els.newModeText) return;
    
    // 获取当前模式
    const currentMode = this.getCurrentPeriodMode();
    const modeNames = {
        'monthly': '月度',
        'quarterly': '季度',
        'yearly': '年度',
        'custom': '自定义'
    };
    
    // 确定要切换到的新模式
    const newMode = currentMode === 'monthly' ? 'quarterly' : 'monthly';
    
    els.currentModeText.textContent = modeNames[currentMode] || '月度';
    els.newModeText.textContent = modeNames[newMode] || '季度';
    
    els.resetModeDialog.classList.remove('hidden');
}

// 隐藏重置模式对话框
hideResetModeDialog() {
    if (els.resetModeDialog) {
        els.resetModeDialog.classList.add('hidden');
    }
}

// 获取当前周期模式
getCurrentPeriodMode() {
    // 从state中获取或检测
    // 优先使用当前正在进行的周期类型
    if (state.entities && state.entities.length > 0) {
        const firstEntity = state.entities[0];
        // 需要从后端API获取周期类型
    }
    return 'monthly'; // 默认
}

// 处理重置确认
async handleResetModeConfirm() {
    const newMode = els.newModeText.textContent === '季度' ? 'quarterly' : 'monthly';
    
    try {
        const response = await this.authenticatedFetch('/api/evaluations/reset-mode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newType: newMode })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (window.App && window.App.Toast) {
                window.App.Toast.success('重置成功！请重新选择周期类型。');
            }
            
            this.hideResetModeDialog();
            
            // 刷新周期列表
            this.loadEvaluationPeriods();
            
            // 隐藏重置按钮，显示创建按钮
            if (els.resetModeBtn) {
                els.resetModeBtn.classList.add('hidden');
            }
            if (els.createEvaluationBtn) {
                els.createEvaluationBtn.classList.remove('hidden');
            }
        } else {
            if (window.App && window.App.Toast) {
                window.App.Toast.error('重置失败：' + result.message);
            }
        }
    } catch (error) {
        console.error('重置周期模式失败:', error);
        if (window.App && window.App.Toast) {
            window.App.Toast.error('重置失败');
        }
    }
}
```

---

## 阶段4：热力图数据获取逻辑

### Task 11: 修改热力图数据获取，支持周期类型区分

**Files:**
- Modify: `public/js/modules/performance-dashboard.js:600-700`

**Step 1: 找到 loadHeatmapData 或类似方法**

定位到数据加载方法

**Step 2: 根据周期类型确定时间轴**

在数据处理前添加：

```javascript
// 根据周期类型确定时间轴
const periodType = evaluation.period_type || 'monthly';

let timeAxis;
if (periodType === 'monthly') {
    timeAxis = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
} else if (periodType === 'quarterly') {
    timeAxis = ['Q1', 'Q2', 'Q3', 'Q4'];
} else if (periodType === 'yearly') {
    // 年度数据处理
    timeAxis = [evaluation.period_name];
} else {
    // 自定义
    timeAxis = ['自定义'];
}

// 将时间轴存入state
state.timeAxis = timeAxis;
state.periodType = periodType;
```

**Step 3: 更新模式指示器**

在数据加载完成后调用：

```javascript
// 更新周期模式指示器
this.updatePeriodModeIndicator();
```

---

### Task 12: 更新周期列表按钮显示逻辑

**Files:**
- Modify: `public/js/modules/performance.js:300-350`

**Step 1: 在 loadEvaluationPeriods 回调中添加按钮控制逻辑**

在周期列表渲染完成后，添加：

```javascript
// 根据现有周期类型显示/隐藏重置按钮
this.updatePeriodActionsVisibility(evaluations);
```

**Step 2: 添加 updatePeriodActionsVisibility 方法**

```javascript
// 更新周期操作按钮显示状态
updatePeriodActionsVisibility(evaluations) {
    if (!els.createEvaluationBtn || !els.resetModeBtn) return;
    
    // 检查是否存在非年度周期
    const nonYearlyPeriods = evaluations.filter(e => 
        e.period_type !== 'yearly'
    );
    
    if (nonYearlyPeriods.length > 0) {
        // 已有周期，显示重置按钮，隐藏创建按钮
        els.createEvaluationBtn.classList.add('hidden');
        els.resetModeBtn.classList.remove('hidden');
    } else {
        // 无周期，显示创建按钮，隐藏重置按钮
        els.createEvaluationBtn.classList.remove('hidden');
        els.resetModeBtn.classList.add('hidden');
    }
}
```

---

## 阶段5：测试验证

### Task 13: 全面测试验证

**验证场景：**

| # | 测试场景 | 预期结果 |
|---|----------|----------|
| 1 | 系统中无周期，创建月度周期 | ✅ 允许创建，显示蓝色"月度"标签 |
| 2 | 系统中无周期，创建季度周期 | ✅ 允许创建，显示橙色"季度"标签 |
| 3 | 已有1月周期，创建2月周期 | ✅ 允许创建（类型相同） |
| 4 | 已有1月周期，创建Q1周期 | ❌ 拒绝，提示"当前为月度模式" |
| 5 | 已有Q1周期，创建1月周期 | ❌ 拒绝，提示"当前为季度模式" |
| 6 | 已有Q1周期，创建Q2周期 | ✅ 允许创建（类型相同） |
| 7 | 已有年度周期，创建月度周期 | ✅ 允许（年度独立） |
| 8 | 查看热力图（已有月度数据） | 显示月度时间轴（1-12月） |
| 9 | 查看热力图（已有季度数据） | 显示季度时间轴（Q1-Q4） |
| 10 | 点击重置模式，删除所有周期 | ✅ 成功删除，可重新选择类型 |

---

## 实施完成

完成所有任务后，执行最终检查：

1. **后端**：
   - [ ] 创建周期时正确检测类型冲突
   - [ ] 重置API正常工作

2. **前端**：
   - [ ] 周期列表显示类型标签
   - [ ] 模式指示器正确显示当前模式
   - [ ] 重置按钮和对话框正常工作
   - [ ] 热力图根据周期类型显示正确时间轴

3. **体验**：
   - [ ] 用户能清楚看到当前是什么模式
   - [ ] 切换模式时有足够的提示和确认
   - [ ] 切换后数据被正确清空

---

## 提交记录

建议按以下节奏提交：

1. `feat: 添加后端周期类型冲突检测逻辑`
2. `feat: 添加重置周期模式API`
3. `feat: 前端周期列表显示类型标签`
4. `feat: 添加模式指示器和重置按钮`
5. `feat: 热力图支持周期类型区分`
6. `fix: 修复周期创建时的类型冲突提示`
