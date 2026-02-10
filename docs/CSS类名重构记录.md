# 供应商绩效评价模块CSS类名重构记录

## 概述
按照CLAUDE.md规范，将CSS类名统一使用 `performance__` 前缀进行BEM规范化。

## 文件清单
| 文件 | 行数 | 状态 |
|------|------|------|
| performance-evaluation.css | 2075 | ✅ 已完成 |
| performance-dashboard.css | 899 | ✅ 已完成 |
| performance-config.css | 263 | ✅ 已完成 |

## 重构进度

### 第一批：布局容器类 ✅ 已完成
- [x] CSS修改 (8个类名)
- [x] HTML/JS修改
- [x] 用户验证 ✅ 2026-02-10

### 第二批：卡片组件类 ✅ 已完成
- [x] CSS修改 (20+类名) - performance-evaluation.css
- [x] CSS修改 (14类名) - performance-dashboard.css
- [x] HTML/JS修改
- [x] 用户验证 ✅ 2026-02-10

### 第三批：表单元素类 ✅ 已完成
- [x] CSS修改 (30+类名)
- [x] HTML/JS修改
- [x] 用户验证 ✅ 2026-02-10

### 第四批：弹窗对话框类 ✅ 已完成
- [x] CSS修改
- [x] HTML/JS修改
- [x] 用户验证

### 第五批：Dashboard和Config样式修复 ✅ 已完成
- [x] CSS选择器与HTML类名不匹配问题修复
- [x] `.grade-card .count` → `.performance__grade-card .performance__count`
- [x] `.main-score .score-value` → `.performance__main-score .performance__score-value`
- [x] `.trend` 类名前缀修复
- [x] `collapsed/expanded/toggle-icon` BEM规范修复
- [x] 热力图动态生成类名添加前缀
- [x] 等级徽章颜色CSS选择器双重匹配修复
- [x] 用户验证 ✅ 2026-02-10

### 全部完成 🎉
所有CSS类名已按照BEM规范统一使用 `performance__` 前缀。

## 详细修改清单

### performance-evaluation.css 待修改类名
```
.period-actions → .performance__period-actions
.evaluation-header → .performance__evaluation-header ✅
.evaluation-info → .performance__evaluation-info ✅
.evaluation-content → .performance__evaluation-content ✅
.entity-section → .performance__entity-section ✅
.entity-section--no-material → .performance__entity-section--no-material ✅
.entity-section-header → .performance__entity-section-header ✅
.entity-section-count → .performance__entity-section-count ✅

// 第二批：卡片组件类 ✅ 已完成
.vendor-cards → .performance__vendor-cards ✅
.entity-card → .performance__entity-card ✅
.entity-card-badge → .performance__entity-card-badge ✅
.entity-card-header → .performance__entity-card-header ✅
.entity-card-title → .performance__entity-card-title ✅
.entity-card-status → .performance__entity-card-status ✅
.entity-card-score → .performance__entity-card-score ✅
.entity-card-dimensions → .performance__entity-card-dimensions ✅
.entity-card-quality → .performance__entity-card-quality ✅
.entity-card-footer → .performance__entity-card-footer ✅
.entity-card--no-material → .performance__entity-card--no-material ✅
.rank-badge → .rank-badge (通用类名，保持不变)

// performance-dashboard.css
.vendor-card → .performance__vendor-card ✅
.vendor-card-header → .performance__vendor-card-header ✅
.vendor-card-title → .performance__vendor-card-title ✅
.vendor-card-badge → .performance__vendor-card-badge ✅
.vendor-card-score → .performance__vendor-card-score ✅
.vendor-card-meta → .performance__vendor-card-meta ✅
.evaluation-modal → .performance__evaluation-modal
.evaluation-modal-content → .performance__evaluation-modal-content
.evaluation-modal-header → .performance__evaluation-modal-header
.evaluation-modal-body → .performance__evaluation-modal-body
.evaluation-modal-footer → .performance__evaluation-modal-footer
.supplier-info-card → .performance__supplier-info-card
.supplier-info-title → .performance__supplier-info-title
.supplier-info-content → .performance__supplier-info-content
.supplier-info-item → .performance__supplier-info-item
.supplier-info-label → .performance__supplier-info-label
.supplier-info-value → .performance__supplier-info-value
.dimension-card → .performance__dimension-card
.dimension-card-header → .performance__dimension-card-header
.dimension-card-title → .performance__dimension-card-title
.dimension-card-weight → .performance__dimension-card-weight
.dimension-slider-row → .performance__dimension-slider-row
.dimension-slider-track → .performance__dimension-slider-track
.dimension-slider-fill → .performance__dimension-slider-fill
.dimension-slider-thumb → .performance__dimension-slider-thumb
.dimension-slider-input → .performance__dimension-slider-input
.dimension-number-box → .performance__dimension-number-box
.dimension-spinner → .performance__dimension-spinner
.total-score-card → .performance__total-score-card
.total-score-card-header → .performance__total-score-card-header
.total-score-display → .performance__total-score-display
.total-score-value → .performance__total-score-value
.total-score-label → .performance__total-score-label
.total-score-grade → .performance__total-score-grade
.remarks-input → .performance__remarks-input
.quality-data-section → .performance__quality-data-section
.quality-stats → .performance__quality-stats
.evaluation-form → .performance__evaluation-form
.period-item → .performance__period-item
.period-item-info → .performance__period-item-info
.period-item-status → .performance__period-item-status
.period-item-actions → .performance__period-item-actions
.performance-modal → .performance__modal
.performance-modal-content → .performance__modal-content
.performance-modal-header → .performance__modal-header
.performance-modal-body → .performance__modal-body
.create-step → .performance__create-step
.period-type-grid → .performance__period-type-grid
.period-type-card → .performance__period-type-card
.date-selector → .performance__date-selector
.results-header → .performance__results-header
.results-info → .performance__results-info
.results-actions → .performance__results-actions
.period-preview → .performance__period-preview
.preview-item → .performance__preview-item
.form-actions → .performance__form-actions
.confirm-dialog → .performance__confirm-dialog
.confirm-dialog-content → .performance__confirm-dialog-content
.quality-tooltip → .performance__quality-tooltip
```

### performance-dashboard.css 待修改类名
```
.stats-section → .performance__stats-section
.stats-grid → .performance__stats-grid
.main-score → .performance__main-score
.grade-distribution → .performance__grade-distribution
.grade-card → .performance__grade-card
.key-metrics → .performance__key-metrics
.metric-item → .performance__metric-item
.trend-selector → .performance__trend-selector
.trend-list → .performance__trend-list
.trend-item → .performance__trend-item
.chart-card → .performance__chart-card
.chart-container → .performance__chart-container
.table-section → .performance__table-section
.table-card → .performance__table-card
.results-table → .performance__results-table
.rank-cell → .performance__rank-cell
.score-cell → .performance__score-cell
.grade-badge → .performance__grade-badge
.trend-cell → .performance__trend-cell
.dimensions-cell → .performance__dimensions-cell
.dimension-bar → .performance__dimension-bar
.dimension-fill → .performance__dimension-fill
.results-tabs → .performance__results-tabs
.results-tab-btn → .performance__results-tab-btn
.results-tab-content → .performance__results-tab-content
.heatmap-section → .performance__heatmap-section
.heatmap-container → .performance__heatmap-container
.heatmap-header → .performance__heatmap-header
.heatmap-legend → .performance__heatmap-legend
.legend-item → .performance__legend-item
.legend-color → .performance__legend-color
.heatmap-table-wrapper → .performance__heatmap-table-wrapper
.heatmap-table → .performance__heatmap-table
.heatmap-score → .performance__heatmap-score
.heatmap-rank-badge → .performance__heatmap-rank-badge
.heatmap-unevaluated-section → .performance__heatmap-unevaluated-section
.heatmap-unevaluated-header → .performance__heatmap-unevaluated-header
.heatmap-unevaluated-body → .performance__heatmap-unevaluated-body
.vendor-cards → .performance__vendor-cards
.vendor-card → .performance__vendor-card
.vendor-card-header → .performance__vendor-card-header
.vendor-card-title → .performance__vendor-card-title
.vendor-card-badge → .performance__vendor-card-badge
.vendor-card-score → .performance__vendor-card-score
.vendor-card-meta → .performance__vendor-card-meta
```

### performance-config.css 待修改类名
```
.config-warning-banner → .performance__config-warning-banner
.config-section → .performance__config-section
.config-section-header → .performance__config-section-header
.dimensions-list → .performance__dimensions-list
.dimension-item → .performance__dimension-item
.weight-summary → .performance__weight-summary
.grade-rules-list → .performance__grade-rules-list
.grade-rule-item → .performance__grade-rule-item
.config-actions → .performance__config-actions
```

---
*记录创建时间: 2026-02-10*