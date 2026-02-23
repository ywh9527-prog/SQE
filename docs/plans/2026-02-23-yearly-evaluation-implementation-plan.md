# 年度绩效评价配置系统实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为供应商绩效评价系统新增年度评价功能，包括独立配置文件、Tab切换界面、自动/手动评分维度支持

**Architecture:** 
- 新增 `yearly-evaluation-config.json` 配置文件（与月度/季度配置隔离）
- 配置界面增加Tab切换（月度/季度 vs 年度）
- 评价周期表增加 `type` 字段区分周期类型
- 评价模态框根据周期类型显示不同UI（自动计算 vs 手动输入）

**Tech Stack:** Node.js + Express, SQLite, Vanilla JavaScript

---

## Phase 1: 配置系统 (配置界面Tab切换)

### Task 1: 创建年度评价配置文件

**Files:**
- Create: `/Users/owen/ai项目/sqe/data/yearly-evaluation-config.json`

**Step 1: 创建配置文件**

```json
{
  "dimensions": [
    {
      "name": "来料质量",
      "key": "quality",
      "weight": 0.30,
      "type": "auto",
      "calculationRule": "取全年各月质量维度平均分",
      "scoringStandard": "根据月度评价记录自动计算"
    },
    {
      "name": "使用情况",
      "key": "usage",
      "weight": 0.20,
      "type": "auto",
      "calculationRule": "取全年各月使用情况维度平均分",
      "scoringStandard": "根据月度评价记录自动计算"
    },
    {
      "name": "服务态度",
      "key": "service",
      "weight": 0.10,
      "type": "auto",
      "calculationRule": "取全年各月服务态度维度平均分",
      "scoringStandard": "根据月度评价记录自动计算"
    },
    {
      "name": "交货时效及达成",
      "key": "delivery",
      "weight": 0.15,
      "type": "auto",
      "calculationRule": "取全年各月交货时效维度平均分",
      "scoringStandard": "根据月度评价记录自动计算"
    },
    {
      "name": "持续改进能力",
      "key": "improvement",
      "weight": 0.15,
      "type": "manual",
      "calculationRule": "评估供应商持续改进能力",
      "scoringStandard": "滑块评分（0-100分）"
    },
    {
      "name": "价格水平",
      "key": "price",
      "weight": 0.10,
      "type": "manual",
      "calculationRule": "评估供应商价格竞争力",
      "scoringStandard": "滑块评分（0-100分）"
    },
    {
      "name": "绿色环保",
      "key": "environmental",
      "weight": 0,
      "type": "green",
      "calculationRule": "ROHS、REACH等环保合规",
      "scoringStandard": "合格/不合格（不合格一票否决）"
    }
  ],
  "gradeRules": [
    { "min": 95, "max": 100, "label": "优秀", "color": "#16a34a", "strategy": "同等条件优先采购" },
    { "min": 85, "max": 95, "label": "良好", "color": "#2563eb", "strategy": "可保持正常采购" },
    { "min": 70, "max": 85, "label": "合格", "color": "#f59e0b", "strategy": "要求供应商内部改善" },
    { "min": 0, "max": 70, "label": "不合格", "color": "#dc2626", "strategy": "暂停供货或剔除供应商目录" }
  ]
}
```

**Step 2: 提交**

```bash
git add data/yearly-evaluation-config.json
git commit -m "feat: 创建年度评价默认配置文件"
```

---

### Task 2: 后端 - 年度评价配置API

**Files:**
- Create: `/Users/owen/ai项目/sqe/server/services/yearly-evaluation-config-service.js`
- Modify: `/Users/owen/ai项目/sqe/server/routes/evaluation-config.js`

**Step 1: 创建年度配置服务**

```javascript
// server/services/yearly-evaluation-config-service.js
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class YearlyEvaluationConfigService {
    constructor() {
        this.configFilePath = path.join(__dirname, '../../data/yearly-evaluation-config.json');
    }

    async getConfig() {
        try {
            await fs.access(this.configFilePath);
            const data = await fs.readFile(this.configFilePath, 'utf-8');
            return JSON.parse(data);
        } catch {
            // 返回默认配置
            return this.getDefaultConfig();
        }
    }

    async saveConfig(config) {
        await fs.writeFile(this.configFilePath, JSON.stringify(config, null, 2), 'utf-8');
        return config;
    }

    getDefaultConfig() {
        return {
            dimensions: [
                { name: "来料质量", key: "quality", weight: 0.30, type: "auto", calculationRule: "取全年各月质量维度平均分", scoringStandard: "根据月度评价记录自动计算" },
                { name: "使用情况", key: "usage", weight: 0.20, type: "auto", calculationRule: "取全年各月使用情况维度平均分", scoringStandard: "根据月度评价记录自动计算" },
                { name: "服务态度", key: "service", weight: 0.10, type: "auto", calculationRule: "取全年各月服务态度维度平均分", scoringStandard: "根据月度评价记录自动计算" },
                { name: "交货时效及达成", key: "delivery", weight: 0.15, type: "auto", calculationRule: "取全年各月交货时效维度平均分", scoringStandard: "根据月度评价记录自动计算" },
                { name: "持续改进能力", key: "improvement", weight: 0.15, type: "manual", calculationRule: "评估供应商持续改进能力", scoringStandard: "滑块评分（0-100分）" },
                { name: "价格水平", key: "price", weight: 0.10, type: "manual", calculationRule: "评估供应商价格竞争力", scoringStandard: "滑块评分（0-100分）" },
                { name: "绿色环保", key: "environmental", weight: 0, type: "green", calculationRule: "ROHS、REACH等环保合规", scoringStandard: "合格/不合格（不合格一票否决）" }
            ],
            gradeRules: [
                { min: 95, max: 100, label: "优秀", color: "#16a34a", strategy: "同等条件优先采购" },
                { min: 85, max: 95, label: "良好", color: "#2563eb", strategy: "可保持正常采购" },
                { min: 70, max: 85, label: "合格", color: "#f59e0b", strategy: "要求供应商内部改善" },
                { min: 0, max: 70, label: "不合格", color: "#dc2626", strategy: "暂停供货或剔除供应商目录" }
            ]
        };
    }
}

module.exports = new YearlyEvaluationConfigService();
```

**Step 2: 添加API路由**

在 `server/routes/evaluation-config.js` 末尾添加：

```javascript
/**
 * 获取年度评价配置
 * GET /api/yearly-evaluation-config
 */
router.get('/yearly', authenticateToken, async (req, res) => {
    try {
        const config = await require('../services/yearly-evaluation-config-service').getConfig();
        res.json({ success: true, data: config });
    } catch (error) {
        logger.error('获取年度评价配置失败:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 更新年度评价配置
 * PUT /api/yearly-evaluation-config
 */
router.put('/yearly', authenticateToken, async (req, res) => {
    try {
        const config = req.body;
        const updated = await require('../services/yearly-evaluation-config-service').saveConfig(config);
        res.json({ success: true, data: updated });
    } catch (error) {
        logger.error('更新年度评价配置失败:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * 重置年度评价配置
 * POST /api/yearly-evaluation-config/reset
 */
router.post('/yearly/reset', authenticateToken, async (req, res) => {
    try {
        const service = require('../services/yearly-evaluation-config-service');
        const defaultConfig = service.getDefaultConfig();
        const saved = await service.saveConfig(defaultConfig);
        res.json({ success: true, data: saved });
    } catch (error) {
        logger.error('重置年度评价配置失败:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
```

**Step 3: 提交**

```bash
git add server/services/yearly-evaluation-config-service.js server/routes/evaluation-config.js
git commit -m "feat: 添加年度评价配置API"
```

---

### Task 3: 前端 - Tab切换UI

**Files:**
- Modify: `/Users/owen/ai项目/sqe/public/index.html:655-720`

**Step 1: 在配置模态框添加Tab导航**

在 `<div class="performance__performance-modal-body">` 开头添加：

```html
<!-- Tab导航 -->
<div class="performance__config-tabs">
    <button class="performance__config-tab active" data-tab="monthly">月度/季度</button>
    <button class="performance__config-tab" data-tab="yearly">年度</button>
</div>

<!-- 月度/季度配置内容 -->
<div id="monthlyConfigContent" class="performance__config-tab-content">
    <!-- 原有的维度配置和等级规则 -->
</div>

<!-- 年度配置内容 -->
<div id="yearlyConfigContent" class="performance__config-tab-content hidden">
    <!-- 年度维度配置和等级规则 -->
</div>
```

**Step 2: 添加CSS样式**

在 `css/modules/performance-config.css` 添加：

```css
.performance__config-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    border-bottom: 2px solid var(--gray-200);
}

.performance__config-tab {
    padding: 10px 20px;
    border: none;
    background: transparent;
    color: var(--gray-500);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all 0.2s;
}

.performance__config-tab:hover {
    color: var(--gray-700);
}

.performance__config-tab.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
}

.performance__config-tab-content.hidden {
    display: none;
}
```

**Step 3: 提交**

```bash
git add public/index.html
git commit -m "feat: 配置界面添加Tab切换UI"
```

---

### Task 4: 前端 - 年度配置表单

**Files:**
- Modify: `/Users/owen/ai项目/sqe/public/js/modules/performance-config.js`

**Step 1: 添加Tab切换逻辑**

在 `PerformanceConfigModule` 中添加：

```javascript
// Tab切换
handleTabSwitch(tabName) {
    const tabs = document.querySelectorAll('.performance__config-tab');
    const monthlyContent = document.getElementById('monthlyConfigContent');
    const yearlyContent = document.getElementById('yearlyConfigContent');
    
    tabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    if (monthlyContent && yearlyContent) {
        monthlyContent.classList.toggle('hidden', tabName !== 'monthly');
        yearlyContent.classList.toggle('hidden', tabName !== 'yearly');
    }
    
    state.currentTab = tabName;
    
    // 加载对应的配置
    if (tabName === 'yearly') {
        this.loadYearlyConfig();
    }
}

// 加载年度配置
async loadYearlyConfig() {
    try {
        const response = await this.authenticatedFetch('/api/yearly-evaluation-config');
        const result = await response.json();
        if (result.success) {
            state.yearlyConfig = JSON.parse(JSON.stringify(result.data));
            state.originalYearlyConfig = JSON.parse(JSON.stringify(result.data));
            this.renderYearlyDimensions();
            this.renderYearlyGradeRules();
        }
    } catch (error) {
        console.error('加载年度配置失败:', error);
    }
}
```

**Step 2: 添加年度维度渲染方法**

添加 `renderYearlyDimensions()` 和 `renderYearlyGradeRules()` 方法（类似现有方法，但包含 `type` 字段显示）

**Step 3: 添加Tab切换事件绑定**

在 `bindEvents()` 中添加：

```javascript
document.querySelectorAll('.performance__config-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        this.handleTabSwitch(e.target.dataset.tab);
    });
});
```

**Step 4: 提交**

```bash
git add public/js/modules/performance-config.js
git commit -m "feat: 添加年度配置Tab切换逻辑"
```

---

## Phase 2: 评价功能

### Task 5: 周期管理 - 支持年度周期

**Files:**
- Modify: `/Users/owen/ai项目/sqe/server/models/PerformanceEvaluation.js`
- Modify: `/Users/owen/ai项目/sqe/public/js/modules/performance.js`

**Step 1: 数据库迁移 - 添加type字段**

```javascript
// 在 PerformanceEvaluation 模型中添加 type 字段
type: {
    type: Sequelize.ENUM('monthly', 'quarterly', 'yearly'),
    defaultValue: 'monthly',
    comment: '评价类型'
}
```

**Step 2: 修改创建周期表单**

在周期创建模态框中添加类型选择：

```html
<div class="form-group">
    <label>评价类型</label>
    <select id="evaluationType" class="form-control">
        <option value="monthly">月度</option>
        <option value="quarterly">季度</option>
        <option value="yearly">年度</option>
    </select>
</div>
```

**Step 3: 提交**

```bash
git add server/models/PerformanceEvaluation.js public/js/modules/performance.js
git commit -m "feat: 周期管理支持年度类型"
```

---

### Task 6: 年度评价计算逻辑

**Files:**
- Modify: `/Users/owen/ai项目/sqe/server/services/performance-evaluation-service.js`

**Step 1: 添加自动计算方法**

```javascript
/**
 * 获取供应商年度自动维度平均分
 * @param {string} vendorName - 供应商名称
 * @param {number} year - 年份
 * @param {string} dataSource - 数据源 (purchase/external)
 * @param {Array} dimensionKeys - 维度key数组
 * @returns {Object} 各维度平均分
 */
async getYearlyAverageScores(vendorName, year, dataSource, dimensionKeys) {
    const { sequelize } = require('../database/config');
    const PerformanceEvaluation = require('../models/PerformanceEvaluation');
    const PerformanceEvaluationDetail = require('../models/PerformanceEvaluationDetail');
    
    // 获取该年度所有月度评价周期
    const evaluations = await PerformanceEvaluation.findAll({
        where: {
            period_name: { [sequelize.Op.like]: `${year}%` },
            data_source: dataSource,
            status: 'completed'
        },
        order: [['start_date', 'ASC']]
    });
    
    const result = {};
    dimensionKeys.forEach(key => result[key] = []);
    
    for (const eval of evaluations) {
        const detail = await PerformanceEvaluationDetail.findOne({
            where: {
                evaluation_id: eval.id,
                vendor_name: vendorName
            }
        });
        
        if (detail && detail.scores) {
            dimensionKeys.forEach(key => {
                if (detail.scores[key] !== undefined) {
                    result[key].push(detail.scores[key]);
                }
            });
        }
    }
    
    // 计算平均分
    const averages = {};
    dimensionKeys.forEach(key => {
        const scores = result[key];
        if (scores && scores.length > 0) {
            averages[key] = scores.reduce((a, b) => a + b, 0) / scores.length;
        } else {
            averages[key] = 0;
        }
    });
    
    return averages;
}
```

**Step 2: 提交**

```bash
git add server/services/performance-evaluation-service.js
git commit -m "feat: 添加年度自动维度平均分计算方法"
```

---

### Task 7: 年度评价模态框

**Files:**
- Modify: `/Users/owen/ai项目/sqe/public/index.html`
- Modify: `/Users/owen/ai项目/sqe/public/js/modules/performance.js`

**Step 1: 添加年度评价模态框内容**

在评价模态框中添加年度评价专用区域：

```html
<!-- 年度评价专用：自动计算维度展示 -->
<div id="yearlyAutoDimensions" class="hidden">
    <h4>自动计算维度（取全年月度平均）</h4>
    <div id="yearlyAutoScores"></div>
</div>

<!-- 年度评价专用：手动评分维度 -->
<div id="yearlyManualDimensions" class="hidden">
    <h4>手动评价维度</h4>
    <div class="form-group">
        <label>持续改进能力</label>
        <input type="range" id="yearlyImprovementScore" min="0" max="100" value="80">
        <span id="yearlyImprovementValue">80</span>
    </div>
    <div class="form-group">
        <label>价格水平</label>
        <input type="range" id="yearlyPriceScore" min="0" max="100" value="80">
        <span id="yearlyPriceValue">80</span>
    </div>
</div>

<!-- 年度评价专用：绿色环保 -->
<div id="yearlyGreenEnv" class="hidden">
    <h4>绿色环保</h4>
    <div class="form-group">
        <label>
            <input type="checkbox" id="yearlyEnvironmentalPass">
            环保合格（不合格将导致年度评价为不合格）
        </label>
    </div>
</div>
```

**Step 2: 提交**

```bash
git add public/index.html public/js/modules/performance.js
git commit -m "feat: 添加年度评价模态框UI"
```

---

### Task 8: 年度总分计算

**Files:**
- Modify: `/Users/owen/ai项目/sqe/server/services/performance-evaluation-service.js`

**Step 1: 添加年度总分计算方法**

```javascript
/**
 * 计算年度评价总分
 * @param {Object} scores - 各维度分数
 * @param {Object} config - 年度配置
 * @param {boolean} environmentalPass - 绿色环保是否合格
 * @returns {Object} 总分和等级
 */
calculateYearlyScoreAndGrade(scores, config, environmentalPass = true) {
    // 如果环保不合格，一票否决
    if (!environmentalPass) {
        return {
            totalScore: 0,
            grade: '不合格',
            vetoed: true,
            vetoReason: '绿色环保不合格'
        };
    }
    
    let totalScore = 0;
    for (const dim of config.dimensions) {
        if (dim.type !== 'green') {
            const score = scores[dim.key] || 0;
            totalScore += score * dim.weight;
        }
    }
    
    // 计算等级
    let grade = '不合格';
    for (const rule of config.gradeRules) {
        const isLast = config.gradeRules.indexOf(rule) === config.gradeRules.length - 1;
        if (isLast) {
            if (totalScore >= rule.min && totalScore <= rule.max) {
                grade = rule.label;
                break;
            }
        } else {
            if (totalScore >= rule.min && totalScore < rule.max) {
                grade = rule.label;
                break;
            }
        }
    }
    
    return {
        totalScore: parseFloat(totalScore.toFixed(2)),
        grade,
        vetoed: false
    };
}
```

**Step 2: 提交**

```bash
git add server/services/performance-evaluation-service.js
git commit -m "feat: 添加年度总分计算和一票否决逻辑"
```

---

## Phase 3: 数据展示

### Task 9: 年度评价列表

**Files:**
- Modify: `/Users/owen/ai项目/sqe/public/js/modules/performance-dashboard.js`

**Step 1: 修改周期列表显示**

根据周期类型显示不同图标和颜色

**Step 2: 提交**

```bash
git add public/js/modules/performance-dashboard.js
git commit -m "feat: 年度周期列表展示优化"
```

---

### Task 10: 测试验证

**Step 1: 启动服务器测试**

```bash
cd /Users/owen/ai项目/sqe
node server/index.js
```

**Step 2: 验证功能**
1. 打开配置页面，测试Tab切换
2. 创建年度周期
3. 进行年度评价测试
4. 验证总分计算正确性

**Step 3: 提交**

```bash
git add .
git commit -m "test: 年度评价功能测试验证"
```

---

## 实施顺序

1. Task 1 → 2 → 3 → 4 (Phase 1: 配置系统)
2. Task 5 → 6 → 7 → 8 (Phase 2: 评价功能)
3. Task 9 → 10 (Phase 3: 数据展示)
