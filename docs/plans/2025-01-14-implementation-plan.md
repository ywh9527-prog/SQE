# 供应商月度评价系统 - 详细实施计划

## 阶段一：数据库和后端基础

### 1.1 创建数据模型

#### 任务1.1.1：创建PerformanceEvaluation模型
**文件**：`server/models/PerformanceEvaluation.js`

**内容**：
```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/config');

const PerformanceEvaluation = sequelize.define('PerformanceEvaluation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    period_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '周期名称'
    },
    period_type: {
        type: DataTypes.ENUM('monthly', 'quarterly', 'yearly', 'custom'),
        allowNull: false,
        comment: '周期类型'
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: '开始日期'
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: '结束日期'
    },
    status: {
        type: DataTypes.ENUM('draft', 'in_progress', 'completed'),
        defaultValue: 'draft',
        comment: '评价状态'
    },
    config_snapshot: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '评价配置快照'
    }
});

module.exports = PerformanceEvaluation;
```

#### 任务1.1.2：创建PerformanceEvaluationDetail模型
**文件**：`server/models/PerformanceEvaluationDetail.js`

**内容**：
```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/config');

const PerformanceEvaluationDetail = sequelize.define('PerformanceEvaluationDetail', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    evaluation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '评价周期ID'
    },
    vendor_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '供应商名称'
    },
    scores: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '各维度分数'
    },
    total_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        comment: '总分'
    },
    grade: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: '等级'
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '评价备注'
    },
    quality_data_snapshot: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '质量数据快照'
    }
});

module.exports = PerformanceEvaluationDetail;
```

#### 任务1.1.3：更新数据库配置
**文件**：`server/database/config.js`

**修改**：在loadModels函数中添加新模型
```javascript
models.PerformanceEvaluation = require('../models/PerformanceEvaluation');
models.PerformanceEvaluationDetail = require('../models/PerformanceEvaluationDetail');
```

#### 任务1.1.4：建立模型关联
**文件**：`server/models/PerformanceEvaluationDetail.js`

**添加**：
```javascript
PerformanceEvaluationDetail.associate = (models) => {
    PerformanceEvaluationDetail.belongsTo(models.PerformanceEvaluation, {
        foreignKey: 'evaluation_id',
        as: 'evaluation'
    });
};
```

### 1.2 创建服务层

#### 任务1.2.1：创建PerformanceEvaluationService
**文件**：`server/services/performance-evaluation-service.js`

**功能**：
- 创建评价周期
- 获取评价周期列表
- 获取评价周期详情
- 开始评价（加载供应商列表）
- 保存单个供应商评价
- 提交评价
- 删除评价周期

#### 任务1.2.2：创建QualityDataExtractionService
**文件**：`server/services/quality-data-extraction-service.js`

**功能**：
- 从IQCData表提取指定周期的质量数据
- 按供应商统计总批次、合格批次、合格率
- 将合格率转换为质量分数（0-100）
- 预计算并缓存质量数据

#### 任务1.2.3：创建EvaluationConfigService
**文件**：`server/services/evaluation-config-service.js`

**功能**：
- 获取当前评价配置（维度、权重、等级规则）
- 更新评价配置
- 计算总分和等级

### 1.3 创建API路由

#### 任务1.3.1：创建评价路由
**文件**：`server/routes/evaluations.js`

**路由**：
- POST /api/evaluations - 创建评价周期
- GET /api/evaluations - 获取所有评价周期列表
- GET /api/evaluations/:id - 获取指定评价周期的详细信息
- DELETE /api/evaluations/:id - 删除评价周期
- POST /api/evaluations/:id/start - 开始评价
- GET /api/evaluations/:id/vendors - 获取供应商列表
- PUT /api/evaluations/:id/vendors/:vendorName - 保存单个供应商评价
- PUT /api/evaluations/:id/submit - 提交评价
- GET /api/evaluations/:id/results - 获取评价结果
- GET /api/evaluations/:id/results/trend - 获取趋势数据

#### 任务1.3.2：创建配置路由
**文件**：`server/routes/evaluation-config.js`

**路由**：
- GET /api/evaluations/config - 获取评价配置
- PUT /api/evaluations/config - 更新评价配置

#### 任务1.3.3：注册路由
**文件**：`server/index.js`

**添加**：
```javascript
const evaluationsRouter = require('./routes/evaluations');
const evaluationConfigRouter = require('./routes/evaluation-config');
app.use('/api/evaluations', evaluationsRouter);
app.use('/api/evaluation-config', evaluationConfigRouter);
```

## 阶段二：评价功能实现

### 2.1 创建评价界面HTML

#### 任务2.1.1：创建评价界面容器
**文件**：`public/index.html`

**添加**：在module-performance区域添加评价界面HTML结构
```html
<div id="module-performance" class="module-view hidden">
    <!-- 评价周期选择区 -->
    <div class="performance__period-selector">
        <h3>评价周期</h3>
        <div class="period-actions">
            <button class="btn btn-primary" id="createEvaluationBtn">
                <i class="ph ph-plus"></i> 创建评价周期
            </button>
            <button class="btn btn-secondary" id="configBtn">
                <i class="ph ph-gear"></i> 配置
            </button>
        </div>
    </div>

    <!-- 评价界面 -->
    <div id="evaluationInterface" class="performance__evaluation-interface hidden">
        <!-- 顶部信息 -->
        <div class="evaluation-header">
            <h2 id="evaluationTitle">2025年1月评价</h2>
            <div class="evaluation-info">
                <span class="info-item">
                    <i class="ph ph-calendar"></i>
                    <span id="evaluationPeriod">2025-01-01 至 2025-01-31</span>
                </span>
                <span class="info-item">
                    <i class="ph ph-users"></i>
                    <span id="evaluationVendorCount">0</span> 家供应商
                </span>
            </div>
            <button class="btn btn-secondary" id="exitEvaluationBtn">
                <i class="ph ph-x"></i> 退出
            </button>
        </div>

        <!-- 主内容区 -->
        <div class="evaluation-content">
            <!-- 供应商卡片列表 -->
            <div class="vendor-cards">
                <div id="vendorCardsList"></div>
            </div>

            <!-- 评价侧边栏 -->
            <div id="evaluationSidebar" class="evaluation-sidebar hidden">
                <div class="sidebar-header">
                    <h3 id="sidebarVendorName">供应商名称</h3>
                    <button class="btn-icon" id="closeSidebarBtn">
                        <i class="ph ph-x"></i>
                    </button>
                </div>

                <!-- 质量数据展示 -->
                <div class="quality-data-section">
                    <h4>质量数据</h4>
                    <div class="quality-stats">
                        <div class="stat-item">
                            <label>总批次</label>
                            <span id="qualityTotalBatches">-</span>
                        </div>
                        <div class="stat-item">
                            <label>合格批次</label>
                            <span id="qualityOkBatches">-</span>
                        </div>
                        <div class="stat-item">
                            <label>合格率</label>
                            <span id="qualityPassRate">-</span>
                        </div>
                    </div>
                </div>

                <!-- 评价表单 -->
                <div class="evaluation-form">
                    <h4>评价分数</h4>
                    <form id="evaluationForm">
                        <div id="dimensionInputs"></div>
                        <div class="form-group">
                            <label>评价备注</label>
                            <textarea id="evaluationRemarks" rows="3"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="ph ph-check"></i> 保存
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- 评价周期列表 -->
    <div id="evaluationPeriodsList" class="performance__periods-list">
        <h3>历史评价周期</h3>
        <div id="periodsList"></div>
    </div>
</div>
```

### 2.2 创建评价界面CSS

#### 任务2.2.1：创建评价界面样式
**文件**：`public/css/modules/performance-evaluation.css`

**内容**：基于方案A的设计，实现卡片式一览表和侧边栏评价的样式

### 2.3 实现评价功能JavaScript

#### 任务2.3.1：创建评价模块JavaScript
**文件**：`public/js/modules/performance.js`

**功能**：
- 加载评价周期列表
- 创建评价周期
- 开始评价
- 加载供应商列表
- 显示评价侧边栏
- 保存评价
- 提交评价

#### 任务2.3.2：注册评价模块
**文件**：`public/js/app.js`

**添加**：
```javascript
window.App.Router.register('performance', () => {
    console.log('月度绩效评价模块已激活');
    if (window.App.Modules && window.App.Modules.Performance) {
        window.App.Modules.Performance.init();
    }
});
```

## 阶段三：主界面展示

### 3.1 创建主界面HTML

#### 任务3.1.1：创建主界面容器
**文件**：`public/index.html`

**添加**：在module-performance区域添加主界面HTML结构（基于方案一的设计）

### 3.2 创建主界面CSS

#### 任务3.2.1：创建主界面样式
**文件**：`public/css/modules/performance-dashboard.css`

**内容**：基于方案一的设计，实现分层式仪表盘布局的样式

### 3.3 实现主界面功能JavaScript

#### 任务3.3.1：实现主界面数据加载
**文件**：`public/js/modules/performance.js`

**功能**：
- 加载最新评价周期数据
- 加载指定周期的评价结果
- 渲染统计卡片
- 渲染图表（趋势图、分布图、雷达图）
- 渲染排名表格
- 周期选择器功能

## 阶段四：配置管理

### 4.1 创建配置管理界面HTML

#### 任务4.1.1：创建配置管理界面容器
**文件**：`public/index.html`

**添加**：配置管理界面HTML结构

### 4.2 创建配置管理界面CSS

#### 任务4.2.1：创建配置管理界面样式
**文件**：`public/css/modules/performance-config.css`

### 4.3 实现配置管理功能JavaScript

#### 任务4.3.1：实现配置管理功能
**文件**：`public/js/modules/performance.js`

**功能**：
- 加载当前配置
- 添加维度
- 删除维度
- 修改维度权重
- 设置等级规则
- 保存配置
- 重置配置

## 测试与验证

### 测试任务
1. 数据库模型创建和迁移测试
2. API接口功能测试
3. 评价流程端到端测试
4. 主界面数据展示测试
5. 配置管理功能测试
6. 跨浏览器兼容性测试

### 验收标准
1. 能够创建评价周期
2. 能够从IQCData提取质量数据
3. 能够逐个评价供应商
4. 能够中途保存和提交评价
5. 主界面能够正确展示评价结果
6. 能够配置评价维度和等级规则
7. 所有功能正常运行，无严重bug

## 部署与上线

### 部署任务
1. 代码审查
2. 数据库迁移
3. 前端资源优化
4. 性能测试
5. 上线部署

### 上线后监控
1. 功能使用情况监控
2. 性能监控
3. 错误日志监控
4. 用户反馈收集

## 后续优化

1. 添加评价数据导出功能
2. 添加评价历史对比功能
3. 添加评价趋势分析功能
4. 优化图表展示效果
5. 添加批量评价功能
6. 添加评价审核流程