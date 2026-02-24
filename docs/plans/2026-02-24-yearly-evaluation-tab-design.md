# 年度绩效评价Tab设计方案

**日期**: 2026-02-24

## 1. 需求概述

开发年度绩效评价Tab，用于展示年度周期的绩效评价结果。该Tab独立于月度Tab，不影响月度Tab的现有功能。

## 2. 功能需求

### 2.1 年份选择
- 使用现有的年份选择器（与月度Tab共用）
- 选择年份后加载对应年份的年度评价数据

### 2.2 排行榜展示
展示列：
- 排名（1-3名显示特殊徽章，后面的显示数字）
- 供应商名称
- 年度总分（如：95.5分）
- 等级（优秀/合格/整改后合格/不合格）

### 2.3 详情弹窗
点击排行榜行后弹出详情弹窗，显示：
- 年度总分
- 等级（带颜色）
- 环保状态（ROHS/REACH等）
- 等级策略说明
- 各维度得分

### 2.4 数据来源
- API: `/api/evaluations/accumulated/:year?type=purchase&periodType=yearly`
- 数据字段: `annualRankings`

## 3. 不包含的内容

- ❌ 热力图
- ❌ 连续改进/恶化供应商模块
- ❌ 绩效趋势图

## 4. 技术方案

### 4.1 HTML结构
```html
<!-- Tab 2: 年度绩效评价 -->
<div id="tab-trend" class="performance__results-tab-content hidden">
    <div id="yearlyResultsContent">
        <!-- 年份选择器 -->
        <!-- 排行榜表格 -->
        <!-- 详情弹窗 -->
    </div>
</div>
```

### 4.2 隔离方案

- 年度Tab使用独立HTML容器：`#yearlyResultsContent`
- JS方法命名：`renderYearlyRanking()`, `showYearlyDetailModal()`
- CSS类名：使用现有的 `.performance__ranking-*` 类（已存在）

### 4.3 API调用流程

1. 用户点击年度Tab
2. 调用 `loadAccumulatedResults(year, type, 'yearly')`
3. API返回数据后调用 `renderYearlyRanking(data)`

## 5. 与月度Tab的隔离机制

| 方面 | 月度Tab | 年度Tab |
|------|---------|---------|
| HTML容器 | `#tab-heatmap` | `#tab-trend` |
| 数据加载 | periodType=monthly | periodType=yearly |
| 排行榜方法 | renderCharts() | renderYearlyRanking() |
| 详情弹窗 | showScoreDetailModal() | showYearlyDetailModal() |

## 6. 验收标准

1. ✅ 点击年度Tab显示排行榜，数据正确
2. ✅ 点击排行榜行显示详情弹窗
3. ✅ 切换回月度Tab，月度数据正常显示
4. ✅ 年度Tab不影响月度Tab的任何功能
