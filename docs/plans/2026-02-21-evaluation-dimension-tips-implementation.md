# 评价维度提示功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在评价配置中添加"计算规则"和"评分标准"字段，在评价弹窗中显示，方便评价人员参考。

**Architecture:** 在 dimensions 数组中增加 calculationRule 和 scoringStandard 字段，配置界面增加输入框，评价弹窗显示提示文字。快照逻辑与现有配置快照完全一致。

**Tech Stack:** JavaScript (Node.js), SQLite, HTML/CSS

---

### Task 1: 修改默认配置，添加计算规则和评分标准

**Files:**
- Modify: `server/services/evaluation-config-service.js:12-23`

**Step 1: 修改默认配置代码**

修改 `this.defaultConfig.dimensions`，添加 calculationRule 和 scoringStandard 字段：

```javascript
this.defaultConfig = {
    dimensions: [
        { name: '质量', key: 'quality', weight: 0.4, calculationRule: '合格批次量 / 到货批次量 × 100%', scoringStandard: '当月合格批次/当月交付总批次×100%×权重' },
        { name: '使用情况', key: 'usage', weight: 0.3, calculationRule: '来料上线使用情况、下游客户端投诉', scoringStandard: '现场反馈性能/尺寸类-10分，外观类-5分，客诉一次-15分' },
        { name: '服务', key: 'service', weight: 0.15, calculationRule: '供应商评价期间业务、协作、共同提升、配合度考核', scoringStandard: '异常反馈等事项每次未及时响应扣4分；当月仅发生一次事项未及时响应扣10分，仅两次的每次扣5分' },
        { name: '交付', key: 'delivery', weight: 0.15, calculationRule: '按时按量到货批次量 / 到货批次量 × 100%', scoringStandard: '按时按量批次交付率低于100%每1%扣2分，不满1%按1%计算' }
    ],
    // ... rest unchanged
};
```

**Step 2: 提交**

```bash
git add server/services/evaluation-config-service.js
git commit -m "feat: 默认配置添加计算规则和评分标准字段"
```

---

### Task 2: 更新 data/evaluation-config.json 配置文件

**Files:**
- Modify: `data/evaluation-config.json`

**Step 1: 更新配置文件**

```json
{
  "dimensions": [
    {
      "name": "质量",
      "key": "quality",
      "weight": 0.4,
      "calculationRule": "合格批次量 / 到货批次量 × 100%",
      "scoringStandard": "当月合格批次/当月交付总批次×100%×权重"
    },
    {
      "name": "使用情况",
      "key": "usage",
      "weight": 0.3,
      "calculationRule": "来料上线使用情况、下游客户端投诉",
      "scoringStandard": "现场反馈性能/尺寸类-10分，外观类-5分，客诉一次-15分"
    },
    {
      "name": "服务",
      "key": "service",
      "weight": 0.15,
      "calculationRule": "供应商评价期间业务、协作、共同提升、配合度考核",
      "scoringStandard": "异常反馈等事项每次未及时响应扣4分；当月仅发生一次事项未及时响应扣10分，仅两次的每次扣5分"
    },
    {
      "name": "交付",
      "key": "delivery",
      "weight": 0.15,
      "calculationRule": "按时按量到货批次量 / 到货批次量 × 100%",
      "scoringStandard": "按时按量批次交付率低于100%每1%扣2分，不满1%按1%计算"
    }
  ],
  "gradeColors": ["#16a34a", "#2563eb", "#f59e0b", "#dc2626", "#6b7280", "#1f2937"],
  "gradeRules": [
    { "min": 95, "max": 100, "label": "优秀" },
    { "min": 85, "max": 95, "label": "合格" },
    { "min": 70, "max": 85, "label": "整改后合格" },
    { "min": 0, "max": 70, "label": "不合格" }
  ]
}
```

**Step 2: 提交**

```bash
git add data/evaluation-config.json
git commit -m "feat: 配置文件添加计算规则和评分标准"
```

---

### Task 3: 修改配置界面，添加计算规则和评分标准输入框

**Files:**
- Modify: `public/js/modules/performance-config.js:177-210`

**Step 1: 修改 renderDimensions 函数**

在现有三个输入框（名称、键值、权重）后添加两个新的输入框：

```javascript
// 找到这段代码（约第189-197行），在权重输入框后添加：
<div class="form-group">
    <label>计算规则</label>
    <textarea class="form-control" rows="2"
        onchange="window.App.Modules.PerformanceConfig.updateDimension(${index}, 'calculationRule', this.value)">${dimension.calculationRule || ''}</textarea>
</div>
<div class="form-group">
    <label>评分标准</label>
    <textarea class="form-control" rows="2"
        onchange="window.App.Modules.PerformanceConfig.updateDimension(${index}, 'scoringStandard', this.value)">${dimension.scoringStandard || ''}</textarea>
</div>
```

**Step 2: 提交**

```bash
git add public/js/modules/performance-config.js
git commit -m "feat: 配置界面添加计算规则和评分标准输入框"
```

---

### Task 4: 修改评价弹窗，显示计算规则和评分标准

**Files:**
- Modify: `public/js/modules/performance.js:1023-1070`

**Step 1: 修改 renderDimensionInputs 函数**

在维度卡片的 autoCalcInfo 后添加提示信息显示：

```javascript
// 在 autoCalcInfo 后面添加：
const tipsInfo = (dimension.calculationRule || dimension.scoringStandard) ? `
    <div class="performance__dimension-tips">
        ${dimension.calculationRule ? `<div class="performance__dimension-tip-item"><span class="tip-label">计算规则:</span> ${dimension.calculationRule}</div>` : ''}
        ${dimension.scoringStandard ? `<div class="performance__dimension-tip-item"><span class="tip-label">评分标准:</span> ${dimension.scoringStandard}</div>` : ''}
    </div>
` : '';
```

然后在 dimensionCard.innerHTML 中找到 `${autoCalcInfo}` 后面添加 `${tipsInfo}`。

**Step 2: 添加 CSS 样式**

在 `css/modules/performance-config.css` 末尾添加：

```css
.performance__dimension-tips {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #e5e7eb;
    font-size: 12px;
    color: #6b7280;
}

.performance__dimension-tip-item {
    margin-bottom: 4px;
}

.performance__dimension-tip-item .tip-label {
    font-weight: 600;
    color: #4b5563;
}
```

**Step 3: 提交**

```bash
git add public/js/modules/performance.js css/modules/performance-config.css
git commit -m "feat: 评价弹窗显示计算规则和评分标准"
```

---

### Task 5: 重启服务器并测试

**Step 1: 重启服务器**

```bash
# 停止现有服务器
lsof -ti:8888 | xargs kill -9 2>/dev/null

# 启动服务器
cd /Users/owen/ai项目/sqe && node server/index.js
```

**Step 2: 测试验证**

1. 打开浏览器访问 http://localhost:8888
2. 进入绩效评价系统
3. 点击"配置"按钮，检查维度配置中是否显示计算规则和评分标准输入框
4. 创建一个评价周期
5. 点击评价供应商，查看弹窗中是否显示计算规则和评分标准

**Step 3: 提交**

```bash
git add .
git commit -m "test: 验证评价维度提示功能"
```

---

## 完成

计划完成！所有任务已列出并可按顺序执行。

**两种执行方式：**

1. **Subagent-Driven（本会话）** - 我为每个任务派遣新的子代理，任务间进行代码审查，快速迭代
2. **Parallel Session（单独会话）** - 在新会话中使用 executing-plans，带检查点的批量执行

你想选择哪种方式喵？ 🐱
