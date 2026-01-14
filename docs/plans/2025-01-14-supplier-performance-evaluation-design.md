# 供应商月度评价系统设计文档

## 概述

基于现有SQE供应商管理系统，开发供应商月度评价功能，实现质量、交付、服务多维度综合评价，支持自定义评价维度、权重和等级规则。

## 一、系统架构设计

### 三层架构

**数据层**：
- `PerformanceEvaluation`：主表，存储评价周期信息
- `PerformanceEvaluationDetail`：从表，存储每个供应商的评价详情

**服务层**：
- `PerformanceEvaluationService`：评价业务逻辑
- `QualityDataExtractionService`：从IQCData提取质量数据
- `EvaluationConfigService`：评价配置管理

**表现层**：
- 主界面：分层式仪表盘布局
- 评价界面：卡片式一览表 + 侧边栏评价
- 配置管理界面：维度和等级规则配置

## 二、数据库设计

### PerformanceEvaluation表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键，自增 |
| period_name | VARCHAR(255) | 周期名称（如"2025年1月"） |
| period_type | VARCHAR(20) | 周期类型（monthly/quarterly/yearly/custom） |
| start_date | DATE | 开始日期 |
| end_date | DATE | 结束日期 |
| status | VARCHAR(20) | 评价状态（draft/in_progress/completed） |
| config_snapshot | JSON | 评价配置快照（维度、权重、等级规则） |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

### PerformanceEvaluationDetail表

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | INTEGER | 主键，自增 |
| evaluation_id | INTEGER | 外键，关联PerformanceEvaluation |
| vendor_name | VARCHAR(255) | 供应商名称 |
| scores | JSON | 所有维度的分数（支持自定义维度） |
| total_score | DECIMAL(5,2) | 总分（0-100） |
| grade | VARCHAR(20) | 等级（优秀/合格/整改后合格/不合格） |
| remarks | TEXT | 评价备注（可选） |
| quality_data_snapshot | JSON | 质量数据快照 |
| created_at | DATETIME | 创建时间 |
| updated_at | DATETIME | 更新时间 |

## 三、API设计

### 评价周期管理
- `POST /api/evaluations` - 创建评价周期
- `GET /api/evaluations` - 获取所有评价周期列表
- `GET /api/evaluations/:id` - 获取指定评价周期的详细信息
- `DELETE /api/evaluations/:id` - 删除评价周期

### 评价操作
- `POST /api/evaluations/:id/start` - 开始评价
- `GET /api/evaluations/:id/vendors` - 获取供应商列表
- `PUT /api/evaluations/:id/vendors/:vendorName` - 保存单个供应商评价
- `PUT /api/evaluations/:id/submit` - 提交评价

### 评价配置
- `GET /api/evaluations/config` - 获取评价配置
- `PUT /api/evaluations/config` - 更新评价配置

### 数据查询
- `GET /api/evaluations/:id/results` - 获取评价结果
- `GET /api/evaluations/:id/results/trend` - 获取趋势数据

## 四、前端设计

### 主界面（分层式仪表盘布局）
- 顶部统计区：平均总分、等级分布、关键指标
- 中部图表区：趋势图、分布图、雷达图
- 底部表格区：供应商排名表格
- 周期选择器：切换历史周期

### 评价界面（卡片式一览表 + 侧边栏评价）
- 主区域：供应商卡片列表
- 侧边栏：评价表单（各维度评分、备注）
- 顶部操作区：周期信息、配置按钮

### 配置管理界面
- 维度管理：添加/删除/修改评价维度
- 等级规则：设置分数范围和标签

## 五、实施计划

### 阶段一：数据库和后端基础
1. 创建 PerformanceEvaluation 和 PerformanceEvaluationDetail 模型
2. 创建 PerformanceEvaluationService 服务
3. 创建 QualityDataExtractionService 服务
4. 创建 EvaluationConfigService 服务
5. 创建评价相关API路由

### 阶段二：评价功能实现
1. 实现评价界面的HTML和CSS（基于方案A）
2. 实现创建评价周期功能
3. 实现开始评价功能
4. 实现逐个评价功能
5. 实现中途保存功能
6. 实现提交评价功能

### 阶段三：主界面展示
1. 实现主界面的HTML和CSS（基于方案一）
2. 实现评价结果数据加载
3. 实现图表展示
4. 实现周期选择器功能

### 阶段四：配置管理
1. 实现配置管理界面
2. 实现维度管理功能
3. 实现等级规则配置
4. 实现配置保存和读取

## 六、关键技术和注意事项

### 数据一致性
- 评价结果保存时使用事务
- 总分和等级计算在服务层完成
- 配置快照在创建评价周期时保存

### 性能优化
- 质量数据预计算缓存
- 主界面查询使用索引优化
- 图表数据聚合在服务层完成

### 用户体验
- 支持中途保存
- 加载状态提示
- 表单验证
- 操作确认

### 扩展性
- JSON字段存储自定义维度和分数
- 配置管理独立
- API遵循RESTful规范

## 七、设计决策

1. **实施策略**：快速迭代，先实现核心功能
2. **质量数据提取**：预计算缓存，避免重复计算
3. **评价配置**：完整配置管理，支持维度和等级自定义
4. **数据存储**：多表关联，支持灵活查询和统计
5. **评价周期**：系统预设标准周期（月度/季度/年度）
6. **评价流程**：单次评价 + 中途保存
7. **主界面展示**：混合模式，默认显示最新，支持周期切换