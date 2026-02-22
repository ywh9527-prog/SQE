# 季度绩效支持设计文档

## 概述

为供应商绩效评价模块增加季度（Quarterly）周期类型支持，实现月度与季度严格互斥的逻辑，避免数据混乱。

## 背景

### 现状
- 数据库已支持 `period_type` 字段（monthly/quarterly/yearly/custom）
- 创建评价周期时可以选择周期类型
- 但"月度绩效概览"Tab 未区分月度/季度数据显示

### 需求
- A 公司：每月做一次评价 → 使用月度模式
- B 公司：每季度做一次评价 → 使用季度模式
- 两种模式**严格互斥**，不能同时存在
- 年度评价保持独立，不受月度/季度互斥影响

## 设计方案

### 1. 核心规则

| 关系 | 规则 |
|------|------|
| 月度 ↔ 季度 | 严格互斥，只能二选一 |
| 年度 | 独立存在，与月度/季度互不影响 |
| 自定义 | 可选择，但同样受互斥规则约束 |

### 2. 周期模式检测逻辑

```
创建新周期时：
  1. 获取系统中所有非年度周期
  2. 如果存在且数量 > 0：
     2.1 获取第一个周期的 period_type
     2.2 如果新周期类型 ≠ 已有类型 → 拒绝创建，提示用户先重置
  3. 如果不存在 → 允许创建，将第一个周期类型设为当前模式
```

### 3. 周期模式状态管理

#### 3.1 周期模式存储
- 使用 `performance_period_mode` 键存储当前模式
- 值：`monthly` | `quarterly`
- 存储位置：后端配置或前端 state

#### 3.2 周期列表显示
在每个周期项中添加类型标签：

```html
<!-- 周期项结构 -->
<div class="performance__period-item">
    <div class="performance__period-item-info">
        <h4>2025年1月</h4>
        <p>2025-01-01 至 2025-01-31</p>
    </div>
    <!-- 新增：类型标签 -->
    <span class="performance__period-type-tag">月度</span>
    ...
</div>
```

**BEM 命名：**
- `performance__period-type-tag` - 周期类型标签
- `performance__period-type-tag--monthly` - 月度标签
- `performance__period-type-tag--quarterly` - 季度标签

### 4. 前端界面改动

#### 4.1 Tab 显示逻辑

"月度绩效概览"Tab 根据当前模式动态显示：

| 当前模式 | Tab 显示内容 |
|----------|--------------|
| monthly | 1月、2月、3月...（月度数据） |
| quarterly | Q1、Q2、Q3、Q4（季度数据） |
| yearly | 年度评价（独立 Tab） |

**BEM 命名：**
- `performance__results-tab-btn--monthly` - 月度 Tab 按钮
- `performance__results-tab-btn--quarterly` - 季度 Tab 按钮

#### 4.2 模式指示器

在"月度绩效概览"标题旁添加当前模式指示：

```html
<h3 class="performance__heatmap-title">
    月度绩效得分矩阵
    <span class="performance__period-mode-indicator">当前：月度模式</span>
</h3>
```

**BEM 命名：**
- `performance__period-mode-indicator` - 周期模式指示器

#### 4.3 重置模式按钮

位置：创建评价周期按钮旁边

```html
<div class="performance__period-actions">
    <button class="performance__create-period-btn">创建评价周期</button>
    <button class="performance__reset-mode-btn">切换周期模式</button>
</div>
```

**BEM 命名：**
- `performance__period-actions` - 周期操作按钮组
- `performance__reset-mode-btn` - 重置模式按钮

#### 4.4 确认对话框

```html
<div class="performance__confirm-dialog hidden">
    <div class="performance__confirm-dialog-overlay"></div>
    <div class="performance__confirm-dialog-content">
        <h4>⚠️ 确认切换周期模式？</h4>
        <p>当前模式：<span class="performance__current-mode">月度</span></p>
        <p>切换后：<span class="performance__new-mode">季度</span></p>
        <div class="performance__confirm-dialog-warning">
            警告：切换将删除所有现有周期数据（评价记录将被清除），此操作不可恢复！
        </div>
        <div class="performance__confirm-dialog-actions">
            <button class="performance__confirm-dialog-cancel">取消</button>
            <button class="performance__confirm-dialog-confirm">确认切换</button>
        </div>
    </div>
</div>
```

**BEM 命名：**
- `performance__confirm-dialog` - 确认对话框
- `performance__confirm-dialog-overlay` - 对话框遮罩
- `performance__confirm-dialog-content` - 对话框内容
- `performance__confirm-dialog-warning` - 警告信息
- `performance__confirm-dialog-actions` - 操作按钮组
- `performance__confirm-dialog-cancel` - 取消按钮
- `performance__confirm-dialog-confirm` - 确认按钮
- `performance__current-mode` - 当前模式文本
- `performance__new-mode` - 新模式文本

### 5. 后端改动

#### 5.1 创建周期时的类型检测

**文件：** `server/services/performance-evaluation-service.js`

```javascript
// 新增方法：检测周期模式冲突
async checkPeriodTypeConflict(newPeriodType) {
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

#### 5.2 重置周期模式 API

```javascript
// 新增接口：重置周期模式
// POST /api/evaluations/reset-mode
async resetPeriodMode(req, res) {
    const { newType } = req.body;
    
    try {
        // 删除所有非年度周期
        await PerformanceEvaluation.destroy({
            where: {
                period_type: ['monthly', 'quarterly', 'custom']
            }
        });
        
        // 删除相关评价详情
        await PerformanceEvaluationDetail.destroy({
            where: {
                // 需要通过关联查询删除
            }
        });
        
        return res.json({ success: true });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
}
```

### 6. 热力图数据获取逻辑

**文件：** `performance-dashboard.js`

```javascript
// 获取热力图数据时，根据周期类型筛选
async loadHeatmapData(evaluationId) {
    // 先获取周期的 period_type
    const evaluation = await this.getEvaluation(evaluationId);
    const periodType = evaluation.period_type;
    
    // 根据类型确定时间轴
    let timeAxis;
    if (periodType === 'monthly') {
        timeAxis = ['1月', '2月', '3月', ..., '12月'];
    } else if (periodType === 'quarterly') {
        timeAxis = ['Q1', 'Q2', 'Q3', 'Q4'];
    } else if (periodType === 'yearly') {
        timeAxis = ['2024年', '2025年'];
    }
    
    // 获取对应数据...
}
```

## 数据结构

### 周期模式状态

| 字段 | 类型 | 说明 |
|------|------|------|
| period_type | ENUM | monthly/quarterly/yearly/custom |
| status | ENUM | draft/in_progress/completed |
| created_at | DATETIME | 创建时间 |

## BEM 命名规范（CSS）

### 核心块

- `performance__period` - 周期相关
- `performance__period-item` - 周期项
- `performance__period-type` - 周期类型
- `performance__period-mode` - 周期模式
- `performance__period-actions` - 周期操作

### 修饰符

- `--monthly` - 月度
- `--quarterly` - 季度
- `--yearly` - 年度
- `--custom` - 自定义
- `--active` - 激活状态
- `--disabled` - 禁用状态

### 示例

```css
.performance__period-type-tag {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
}

.performance__period-type-tag--monthly {
    background: #e3f2fd;
    color: #1976d2;
}

.performance__period-type-tag--quarterly {
    background: #fff3e0;
    color: #f57c00;
}
```

## 测试用例

| 场景 | 预期结果 |
|------|----------|
| 系统中无周期，创建月度周期 | ✅ 允许创建 |
| 系统中无周期，创建季度周期 | ✅ 允许创建 |
| 已有1月周期，创建2月周期 | ✅ 允许创建（类型相同） |
| 已有1月周期，创建Q1周期 | ❌ 拒绝，提示"当前为月度模式" |
| 已有Q1周期，创建1月周期 | ❌ 拒绝，提示"当前为季度模式" |
| 已有Q1周期，创建Q2周期 | ✅ 允许创建（类型相同） |
| 已有月度周期，查看热力图 | 显示月度数据（1-12月） |
| 已有季度周期，查看热力图 | 显示季度数据（Q1-Q4） |
| 已有年度周期，创建月度周期 | ✅ 允许（年度独立） |

## 实施顺序

1. 后端：添加周期类型检测逻辑
2. 后端：添加重置模式 API
3. 前端：添加周期类型标签显示
4. 前端：添加模式指示器
5. 前端：添加重置模式功能
6. 前端：修改热力图数据获取逻辑
7. 测试：验证所有场景
