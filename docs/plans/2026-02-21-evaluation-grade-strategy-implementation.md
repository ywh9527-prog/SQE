# 供应商评价等级策略功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 在评价配置中添加等级策略字段，并在评价详情弹窗中显示所有等级的策略

**Architecture:** 参照之前实现的"计算规则和评分标准"功能，使用相同的实现模式

**Tech Stack:** Node.js, JavaScript, SQLite

---

### Task 1: 修改默认配置，添加等级策略字段

**Files:**
- Modify: `server/services/evaluation-config-service.js`

**Step 1: 查看当前默认配置中 gradeRules 的定义**

读取文件 `server/services/evaluation-config-service.js`，找到 `gradeRules` 定义位置（约第28行）

**Step 2: 修改 gradeRules，添加 strategy 字段**

将现有的 gradeRules 修改为包含 strategy 字段：

```javascript
gradeRules: [
    { min: 95, max: 100, label: '优秀', strategy: '同等条件优先采购' },
    { min: 85, max: 95, label: '合格', strategy: '可保持正常采购，要求供应商自身内部改善' },
    { min: 70, max: 85, label: '整改后合格', strategy: '可保持正常采购，要求供应商提供8D改善报告，若连续发生重复性问题（≥2次）则列入不合格管理' },
    { min: 0, max: 70, label: '不合格', strategy: '暂停开发新产品，要求1周内提交改进计划，1个月内完成改进；若连续三个月不合格则暂停供货；6个月内未达到解除条件则剔除出合格供应商目录' }
],
```

**Step 3: 提交更改**

```bash
git add server/services/evaluation-config-service.js && git commit -m "feat: 默认配置添加等级策略字段"
```

---

### Task 2: 更新配置文件

**Files:**
- Modify: `data/evaluation-config.json`

**Step 1: 读取当前配置文件**

读取 `data/evaluation-config.json` 中的 `gradeRules` 部分

**Step 2: 更新 gradeRules，添加 strategy 字段**

为每个等级添加 strategy 字段，使用供应商考核表的默认值

**Step 3: 提交更改**

```bash
git add data/evaluation-config.json && git commit -m "feat: 配置文件添加等级策略"
```

---

### Task 3: 修改配置界面，添加等级策略输入框

**Files:**
- Modify: `public/js/modules/performance-config.js`

**Step 1: 查看 renderGradeRules 函数**

找到 `renderGradeRules` 函数（约第220行），查看当前等级规则的渲染逻辑

**Step 2: 修改 renderGradeRules，添加策略输入框**

在现有输入框后添加策略 textarea：

```javascript
<div class="form-group">
    <label>等级策略</label>
    <textarea class="form-control" rows="2" placeholder="输入等级策略说明"
        onchange="window.App.Modules.PerformanceConfig.updateGradeRule(${index}, 'strategy', this.value)">${rule.strategy || ''}</textarea>
</div>
```

**Step 3: 修改 addGradeRule 函数**

添加新等级规则时，包含 strategy 字段：

```javascript
const newRule = {
    min: 0,
    max: 60,
    label: '新等级',
    strategy: ''
};
```

**Step 4: 修改 updateGradeRule 函数**

确保 updateGradeRule 方法支持动态更新 strategy 字段（应该已支持，因为使用通用的 field 参数）

**Step 5: 提交更改**

```bash
git add public/js/modules/performance-config.js && git commit -m "feat: 配置界面添加等级策略输入框"
```

---

### Task 4: 修改评价详情弹窗，显示等级策略

**Files:**
- Modify: `public/js/modules/performance.js`

**Step 1: 查找评价详情弹窗的渲染函数**

搜索 `renderEvaluationDetail` 或类似的函数，找到显示等级的代码

**Step 2: 获取配置中的等级策略**

在渲染评价详情时，从配置中获取 gradeRules（含 strategy）

**Step 3: 在弹窗中显示等级策略**

在显示等级的下方，添加显示所有等级策略的 HTML：

```javascript
// 构建等级策略显示
let gradeStrategyHtml = '<div class="performance__grade-strategies">';
gradeStrategyHtml += '<div class="performance__grade-strategies-title">等级策略说明：</div>';
for (const rule of gradeRules) {
    const scoreRange = rule.max === 100 ? `≥${rule.min}分` : `${rule.min}-${rule.max}分`;
    gradeStrategyHtml += `<div class="performance__grade-strategy-item">`;
    gradeStrategyHtml += `<strong>${rule.label}(${scoreRange}):</strong> ${rule.strategy || '无'}`;
    gradeStrategyHtml += `</div>`;
}
gradeStrategyHtml += '</div>';
```

**Step 4: 添加对应的CSS样式**

在 `public/css/modules/performance-evaluation.css` 中添加样式：

```css
.performance__grade-strategies {
    margin-top: 16px;
    padding: 12px;
    background: var(--gray-50);
    border-radius: var(--border-radius-sm);
}

.performance__grade-strategies-title {
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--gray-700);
}

.performance__grade-strategy-item {
    font-size: 0.875rem;
    color: var(--gray-600);
    margin-bottom: 6px;
    line-height: 1.5;
}
```

**Step 5: 提交更改**

```bash
git add public/js/modules/performance.js public/css/modules/performance-evaluation.css && git commit -m "feat: 评价详情弹窗显示等级策略"
```

---

### Task 5: 重启服务器并测试

**Step 1: 检查服务器进程**

```bash
lsof -i :8888
```

**Step 2: 关闭旧服务器进程**

如果存在，kill 掉旧进程

**Step 3: 重启服务器**

```bash
cd /Users/owen/ai项目/sqe && node server/index.js
```

**Step 4: 验证功能**

1. 打开 http://localhost:8888
2. 进入绩效评价配置
3. 检查等级规则是否显示策略输入框
4. 保存配置
5. 打开评价详情弹窗，检查是否显示等级策略

---

## 验证检查点

- [ ] 配置界面中等级规则显示策略输入框
- [ ] 可以编辑和保存等级策略
- [ ] 评价详情弹窗中显示所有等级的策略
- [ ] 快照逻辑正确保存等级策略
