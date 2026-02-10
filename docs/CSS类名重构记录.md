# 绩效评价模块CSS类名重构记录

> 基于CLAUDE.md BEM命名规范，将类名统一使用 `performance__` 前缀
> 
> 创建日期：2026-02-10
> 
> 策略：分批小步快跑，每批验证后再进行下一批

---

## 📊 总体统计

| 项目 | 数量 |
|------|------|
| **BEM规范类名** (已使用performance__) | 14个 |
| **非BEM规范类名** (需修改) | 90+个 |
| **总类名数** | 104+个 |

---

## ✅ 第一批：布局容器类（已修改）

### 修改状态：待进行

| 原类名 | 新类名 | 文件位置 | 状态 |
|--------|--------|----------|------|
| `period-actions` | `performance__period-actions` | CSS/HTML | ⏳ 待修改 |
| `evaluation-header` | `performance__evaluation-header` | CSS/HTML | ⏳ 待修改 |
| `evaluation-info` | `performance__evaluation-info` | CSS/HTML | ⏳ 待修改 |
| `evaluation-content` | `performance__evaluation-content` | CSS/HTML | ⏳ 待修改 |
| `entity-section` | `performance__entity-section` | CSS/HTML | ⏳ 待修改 |
| `entity-section--no-material` | `performance__entity-section--no-material` | CSS/HTML | ⏳ 待修改 |
| `entity-section-header` | `performance__entity-section-header` | CSS/HTML | ⏳ 待修改 |
| `entity-section-count` | `performance__entity-section-count` | CSS/HTML | ⏳ 待修改 |

---

## ✅ 第二批：卡片组件类（待进行）

| 原类名 | 新类名 | 文件位置 | 状态 |
|--------|--------|----------|------|
| `entity-cards` | `performance__entity-cards` | CSS/HTML | ⏳ 待修改 |
| `vendor-cards` | `performance__vendor-cards` | CSS/HTML | ⏳ 待修改 |
| `entity-card` | `performance__entity-card` | CSS/HTML | ⏳ 待修改 |
| `entity-card--no-material` | `performance__entity-card--no-material` | CSS/HTML | ⏳ 待修改 |
| `entity-card-badge` | `performance__entity-card-badge` | CSS/HTML | ⏳ 待修改 |
| `entity-card-header` | `performance__entity-card-header` | CSS/HTML | ⏳ 待修改 |
| `entity-card-title` | `performance__entity-card-title` | CSS/HTML | ⏳ 待修改 |
| `entity-card-status` | `performance__entity-card-status` | CSS/HTML | ⏳ 待修改 |
| `entity-card-score` | `performance__entity-card-score` | CSS/HTML | ⏳ 待修改 |
| `entity-card-dimensions` | `performance__entity-card-dimensions` | CSS/HTML | ⏳ 待修改 |
| `entity-card-quality` | `performance__entity-card-quality` | CSS/HTML | ⏳ 待修改 |
| `entity-card-footer` | `performance__entity-card-footer` | CSS/HTML | ⏳ 待修改 |

---

## ✅ 第三批：模态框类（待进行）

| 原类名 | 新类名 | 文件位置 | 状态 |
|--------|--------|----------|------|
| `evaluation-modal` | `performance__evaluation-modal` | CSS/HTML | ⏳ 待修改 |
| `evaluation-modal-content` | `performance__evaluation-modal-content` | CSS/HTML | ⏳ 待修改 |
| `evaluation-modal-header` | `performance__evaluation-modal-header` | CSS/HTML | ⏳ 待修改 |
| `evaluation-modal-body` | `performance__evaluation-modal-body` | CSS/HTML | ⏳ 待修改 |
| `evaluation-modal-footer` | `performance__evaluation-modal-footer` | CSS/HTML | ⏳ 待修改 |
| `supplier-info-card` | `performance__supplier-info-card` | CSS/HTML | ⏳ 待修改 |
| `supplier-info-title` | `performance__supplier-info-title` | CSS/HTML | ⏳ 待修改 |
| `supplier-info-content` | `performance__supplier-info-content` | CSS/HTML | ⏳ 待修改 |
| `supplier-info-item` | `performance__supplier-info-item` | CSS/HTML | ⏳ 待修改 |
| `supplier-info-label` | `performance__supplier-info-label` | CSS/HTML | ⏳ 待修改 |
| `supplier-info-value` | `performance__supplier-info-value` | CSS/HTML | ⏳ 待修改 |

---

## ✅ 第四批：表单组件类（待进行）

| 原类名 | 新类名 | 文件位置 | 状态 |
|--------|--------|----------|------|
| `dimensions-grid` | `performance__dimensions-grid` | CSS/HTML | ⏳ 待修改 |
| `dimension-card` | `performance__dimension-card` | CSS/HTML | ⏳ 待修改 |
| `dimension-card-header` | `performance__dimension-card-header` | CSS/HTML | ⏳ 待修改 |
| `dimension-card-title` | `performance__dimension-card-title` | CSS/HTML | ⏳ 待修改 |
| `dimension-card-weight` | `performance__dimension-card-weight` | CSS/HTML | ⏳ 待修改 |
| `total-score-card` | `performance__total-score-card` | CSS/HTML | ⏳ 待修改 |
| `total-score-card-header` | `performance__total-score-card-header` | CSS/HTML | ⏳ 待修改 |
| `total-score-display` | `performance__total-score-display` | CSS/HTML | ⏳ 待修改 |
| `total-score-value` | `performance__total-score-value` | CSS/HTML | ⏳ 待修改 |
| `total-score-label` | `performance__total-score-label` | CSS/HTML | ⏳ 待修改 |
| `total-score-grade` | `performance__total-score-grade` | CSS/HTML | ⏳ 待修改 |
| `remarks-input` | `performance__remarks-input` | CSS/HTML | ⏳ 待修改 |

---

## ✅ 第五批：滑块组件类（待进行）

| 原类名 | 新类名 | 文件位置 | 状态 |
|--------|--------|----------|------|
| `dimension-slider-row` | `performance__dimension-slider-row` | CSS/HTML | ⏳ 待修改 |
| `dimension-slider-track` | `performance__dimension-slider-track` | CSS/HTML | ⏳ 待修改 |
| `dimension-slider-fill` | `performance__dimension-slider-fill` | CSS/HTML | ⏳ 待修改 |
| `dimension-slider-thumb` | `performance__dimension-slider-thumb` | CSS/HTML | ⏳ 待修改 |
| `dimension-slider-input` | `performance__dimension-slider-input` | CSS/HTML | ⏳ 待修改 |
| `dimension-number-box-wrapper` | `performance__dimension-number-box-wrapper` | CSS/HTML | ⏳ 待修改 |
| `dimension-number-box` | `performance__dimension-number-box` | CSS/HTML | ⏳ 待修改 |
| `dimension-spinner` | `performance__dimension-spinner` | CSS/HTML | ⏳ 待修改 |
| `auto-calc-info` | `performance__auto-calc-info` | CSS/HTML | ⏳ 待修改 |

---

## ✅ 第六批：状态徽章类（待进行）

| 原类名 | 新类名 | 文件位置 | 状态 |
|--------|--------|----------|------|
| `rank-badge` | `performance__rank-badge` | CSS/HTML | ⏳ 待修改 |
| `rank-1` | `performance__rank-1` | CSS/HTML | ⏳ 待修改 |
| `rank-2` | `performance__rank-2` | CSS/HTML | ⏳ 待修改 |
| `rank-3` | `performance__rank-3` | CSS/HTML | ⏳ 待修改 |
| `rank-other` | `performance__rank-other` | CSS/HTML | ⏳ 待修改 |
| `grade-badge` | `performance__grade-badge` | CSS/HTML | ⏳ 待修改 |
| `grade-excellent` | `performance__grade-excellent` | CSS/HTML | ⏳ 待修改 |
| `grade-good` | `performance__grade-good` | CSS/HTML | ⏳ 待修改 |
| `grade-improve` | `performance__grade-improve` | CSS/HTML | ⏳ 待修改 |
| `grade-poor` | `performance__grade-poor` | CSS/HTML | ⏳ 待修改 |
| `trend-up` | `performance__trend-up` | CSS/HTML | ⏳ 待修改 |
| `trend-down` | `performance__trend-down` | CSS/HTML | ⏳ 待修改 |
| `trend-flat` | `performance__trend-flat` | CSS/HTML | ⏳ 待修改 |

---

## ✅ 第七批：进度条类（待进行）

| 原类名 | 新类名 | 文件位置 | 状态 |
|--------|--------|----------|------|
| `progress-quality` | `performance__progress-quality` | CSS/HTML | ⏳ 待修改 |
| `progress-delivery` | `performance__progress-delivery` | CSS/HTML | ⏳ 待修改 |
| `progress-service` | `performance__progress-service` | CSS/HTML | ⏳ 待修改 |
| `progress-custom-1` | `performance__progress-custom-1` | CSS/HTML | ⏳ 待修改 |
| `progress-custom-2` | `performance__progress-custom-2` | CSS/HTML | ⏳ 待修改 |
| `progress-custom-3` | `performance__progress-custom-3` | CSS/HTML | ⏳ 待修改 |
| `progress-custom-4` | `performance__progress-custom-4` | CSS/HTML | ⏳ 待修改 |
| `progress-custom-5` | `performance__progress-custom-5` | CSS/HTML | ⏳ 待修改 |

---

## ✅ 第八批：结果界面类（待进行）

| 原类名 | 新类名 | 文件位置 | 状态 |
|--------|--------|----------|------|
| `results-header` | `performance__results-header` | CSS/HTML | ⏳ 待修改 |
| `results-info` | `performance__results-info` | CSS/HTML | ⏳ 待修改 |
| `results-actions` | `performance__results-actions` | CSS/HTML | ⏳ 待修改 |

---

## ✅ 第九批：其他组件类（待进行）

| 原类名 | 新类名 | 文件位置 | 状态 |
|--------|--------|----------|------|
| `quality-data-section` | `performance__quality-data-section` | CSS/HTML | ⏳ 待修改 |
| `quality-stats` | `performance__quality-stats` | CSS/HTML | ⏳ 待修改 |
| `period-item` | `performance__period-item` | CSS/HTML | ⏳ 待修改 |
| `period-item-info` | `performance__period-item-info` | CSS/HTML | ⏳ 待修改 |
| `period-item-status` | `performance__period-item-status` | CSS/HTML | ⏳ 待修改 |
| `period-item-actions` | `performance__period-item-actions` | CSS/HTML | ⏳ 待修改 |
| `period-type-grid` | `performance__period-type-grid` | CSS/HTML | ⏳ 待修改 |
| `period-type-card` | `performance__period-type-card` | CSS/HTML | ⏳ 待修改 |
| `date-selector` | `performance__date-selector` | CSS/HTML | ⏳ 待修改 |
| `period-preview` | `performance__period-preview` | CSS/HTML | ⏳ 待修改 |
| `preview-item` | `performance__preview-item` | CSS/HTML | ⏳ 待修改 |
| `preview-label` | `performance__preview-label` | CSS/HTML | ⏳ 待修改 |
| `preview-value` | `performance__preview-value` | CSS/HTML | ⏳ 待修改 |

---

## ✅ 第十批：模态框扩展类（待进行）

| 原类名 | 新类名 | 文件位置 | 状态 |
|--------|--------|----------|------|
| `performance-modal` | `performance__modal` | CSS/HTML | ⏳ 待修改 |
| `performance-modal-content` | `performance__modal-content` | CSS/HTML | ⏳ 待修改 |
| `performance-modal-header` | `performance__modal-header` | CSS/HTML | ⏳ 待修改 |
| `performance-modal-body` | `performance__modal-body` | CSS/HTML | ⏳ 待修改 |
| `create-step` | `performance__create-step` | CSS/HTML | ⏳ 待修改 |
| `confirm-dialog` | `performance__confirm-dialog` | CSS/HTML | ⏳ 待修改 |
| `confirm-dialog-content` | `performance__confirm-dialog-content` | CSS/HTML | ⏳ 待修改 |
| `confirm-dialog-icon` | `performance__confirm-dialog-icon` | CSS/HTML | ⏳ 待修改 |
| `confirm-dialog-title` | `performance__confirm-dialog-title` | CSS/HTML | ⏳ 待修改 |
| `confirm-dialog-message` | `performance__confirm-dialog-message` | CSS/HTML | ⏳ 待修改 |
| `confirm-dialog-actions` | `performance__confirm-dialog-actions` | CSS/HTML | ⏳ 待修改 |
| `quality-tooltip` | `performance__quality-tooltip` | CSS/HTML | ⏳ 待修改 |

---

## 📋 JS文件需同步修改

| 文件 | 需修改的类名引用 | 数量 | 状态 |
|------|------------------|------|------|
| `public/js/modules/performance.js` | entity-card, period-item, dimension-slider, confirm-dialog等 | 90+处 | ⏳ 待修改 |
| `public/js/modules/performance-dashboard.js` | rank-badge, grade-badge, heatmap-rank-badge, results-tab-btn等 | 50+处 | ⏳ 待修改 |
| `public/js/modules/performance-config.js` | 待分析 | - | ⏳ 待修改 |

---

## 🔍 JS文件中发现的类名引用

### performance.js 中的类名引用：

**DOM元素获取 (getElementById):**
- `createEvaluationBtn`, `configBtn`, `createEvaluationModal`
- `evaluationInterface`, `evaluationTitle`, `evaluationPeriod`
- `entityCardsList`, `entityCardsListWithMaterial`, `entityCardsListWithoutMaterial`
- `evaluationModal`, `modalEntityName`, `dimensionInputs`
- `evaluationForm`, `evaluationRemarks`, `periodsList`
- `resultsInterface`, `evaluationPeriodsList`, `showPeriodsBtn`
- `totalScorePreview`, `totalScoreGrade`, `submitEvaluationBtn`
- `confirmDialog`, `confirmDialogTitle`, `confirmDialogMessage`
- `createStep1`, `createStep2`, `monthlySelector`, `quarterlySelector`
- `yearlySelector`, `customSelector`, `periodPreview`
- `monthlyYear`, `monthlyMonth`, `quarterlyYear`, `quarterlyQuarter`
- `yearlyYear`, `customPeriodName`, `customStartDate`, `customEndDate`
- `previewName`, `previewStartDate`, `previewEndDate`
- `backToStep1`, `closeCreateModalBtn`, `createEvaluationForm`

**CSS类名选择 (querySelector/querySelectorAll):**
- `performance__type-card`, `performance__type-status`
- `period-type-card`, `period-item`, `period-item-info`
- `period-item-status`, `period-item-actions`, `date-selector`
- `dimension-slider-track`, `dimension-slider-input`, `dimension-slider-fill`
- `dimension-slider-thumb`, `dimension-number-box`, `dimension-card`
- `dimension-card-title`, `dimension-spinner`, `quality-tooltip`
- `entity-card`, `entity-card--no-material`, `evaluated`

### performance-dashboard.js 中的类名引用：

**CSS类名选择:**
- `results-tab-btn`, `results-tab-content`
- `rank-badge`, `rank-1`, `rank-2`, `rank-3`, `rank-other`
- `grade-badge`, `grade-excellent`, `grade-good`, `grade-improve`, `grade-poor`
- `heatmap-rank-badge`, `heatmap-score`
- `performance__type-card`, `performance__type-status`
- `heatmap-unevaluated-section`, `heatmap-unevaluated-header`
- `heatmap-unevaluated-body`, `toggle-icon`

---

## 🔧 修改说明

### 修改规则
1. CSS类名：`.原类名` → `.performance__原类名`
2. CSS修饰符：`.原类名--modifier` → `.performance__原类名--modifier`
3. HTML class属性：`class="原类名"` → `class="performance__原类名"`
4. JS选择器：`'.原类名'` → `'.performance__原类名'`

### 注意事项
- 修改后需同步更新HTML和JS文件
- 每批修改后需验证功能正常
- 保留原有样式不变，仅修改类名

---

## 📝 修改日志

| 日期 | 批次 | 修改内容 | 验证结果 |
|------|------|----------|----------|
| 2026-02-10 | - | 创建重构记录文档 | - |
