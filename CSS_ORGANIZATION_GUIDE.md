# SQE系统CSS组织指南

**创建日期**: 2025-12-06
**版本**: v1.0 (基于现有代码现实)
**适用范围**: SQE供应商管理系统

---

## 🎯 核心原则

### 1. **实用主义优先**
- 基于现有代码结构，不强制理想化规范
- 新功能按新规范，旧代码保持稳定
- 避免为了规范而规范

### 2. **渐进式改进**
- 允许历史代码存在
- 新增功能按组织规范执行
- 逐步优化，不强求一步到位

### 3. **模块化组织**
- 按功能模块组织CSS文件
- 明确文件职责边界
- 便于维护和扩展

---

## 📁 推荐的文件结构

```
public/css/
├── base/                           # 基础样式层
│   ├── reset.css                  # 样式重置 (如需要)
│   └── variables.css              # CSS变量定义 (如需要)
├── components/                     # 通用组件层
│   ├── buttons.css                # 按钮样式 (.btn, .btn-primary等)
│   ├── modals.css                 # 模态框样式 (.modal, .modal-content等)
│   ├── forms.css                  # 表单样式 (.form-group, .form-input等)
│   └── loading.css                # 加载样式 (已存在)
├── modules/                        # 业务模块层
│   ├── supplier/                  # 供应商模块
│   │   ├── supplier-table.css     # 供应商表格样式 (已存在)
│   │   └── supplier-modal.css     # 供应商模态框样式 (已存在)
│   ├── iqc/                       # IQC模块
│   │   ├── iqc.css                # IQC主样式 (已存在)
│   │   ├── iqc_cards_enhanced.css # IQC卡片增强样式 (已存在)
│   │   └── iqc_history.css        # IQC历史样式 (已存在)
│   └── documents/                 # 文档模块
│       └── documents.css          # 文档样式 (已存在)
├── utils/                          # 工具样式层
│   ├── progress.css               # 进度条样式 (已存在)
│   ├── toast.css                  # 提示消息样式 (已存在)
│   └── ui-utils.css               # UI工具层样式 (待创建)
└── pages/                          # 页面特定样式
    ├── style_v2.css               # 主页面样式 (已存在)
    └── modal-fix.css              # 模态框修复 (已存在)
```

---

## 🏷️ 命名约定

### 1. **模块前缀规范** (推荐但非强制)

**新功能推荐使用模块前缀：**
```css
/* 供应商模块新功能 */
.supplier-upload-zone { }
.supplier-filter-controls { }

/* IQC模块新功能 */
.iqc-chart-container { }
.iqc-data-table { }
```

**历史代码保持现状：**
```css
/* 这些已存在的类名继续有效，无需强制修改 */
.doc-cell { }
.document-item { }
.toggle-details-btn { }
```

### 2. **通用组件命名** (保持简单)

```css
/* 按钮 - 无需前缀 */
.btn { }
.btn-primary { }
.btn-secondary { }
.btn-success { }

/* 模态框 - 无需前缀 */
.modal { }
.modal-content { }
.modal-header { }

/* 表单 - 无需前缀 */
.form-group { }
.form-input { }
.form-label { }
```

### 3. **UI工具层命名** (新增规范)

```css
/* UI工具层样式，使用ui-前缀 */
.ui-alert { }
.ui-alert--success { }
.ui-alert--error { }
.ui-loading { }
.ui-loading__spinner { }
.ui-tooltip { }
```

---

## 📋 开发指导

### **添加新功能时的CSS组织**

#### 场景1：为现有模块添加新功能
```css
/* 在对应模块CSS文件中添加 */
/* supplier-table.css 或 supplier-modal.css */

/* 推荐：使用模块前缀 */
.supplier-new-feature { }

/* 可接受：继续现有模式 */
.new-feature-class { }
```

#### 场景2：创建全新模块
```css
/* 创建新的模块CSS文件 */
/* public/css/modules/newmodule/newmodule.css */

.newmodule-container { }
.newmodule-header { }
.newmodule-content { }
```

#### 场景3：添加UI工具组件
```css
/* 在 ui-utils.css 中添加 */
.ui-new-component { }
.ui-new-component--variant { }
```

### **CSS文件加载顺序**

```html
<!-- 推荐的加载顺序 -->
<!-- 1. 基础样式层 -->
<link rel="stylesheet" href="css/base/variables.css">
<link rel="stylesheet" href="css/base/reset.css">

<!-- 2. 通用组件层 -->
<link rel="stylesheet" href="css/components/buttons.css">
<link rel="stylesheet" href="css/components/modals.css">
<link rel="stylesheet" href="css/components/forms.css">

<!-- 3. 工具样式层 -->
<link rel="stylesheet" href="css/utils/progress.css">
<link rel="stylesheet" href="css/utils/toast.css">
<link rel="stylesheet" href="css/utils/ui-utils.css">

<!-- 4. 业务模块层 -->
<link rel="stylesheet" href="css/modules/supplier/supplier-table.css">
<link rel="stylesheet" href="css/modules/supplier/supplier-modal.css">
<link rel="stylesheet" href="css/modules/iqc/iqc.css">

<!-- 5. 页面特定样式 -->
<link rel="stylesheet" href="css/pages/style_v2.css">
```

---

## 🔧 实际案例分析

### **当前代码中的优秀实践**

```css
/* supplier-table.css - 好的模块化示例 */
.supplier-table-container { }    /* ✅ 有模块前缀 */
.supplier-table { }              /* ✅ 有模块前缀 */
.supplier-name { }               /* ✅ 有模块前缀 */

/* 通用组件样式 - 合理的简单命名 */
.btn-success { }                 /* ✅ 通用组件，无需前缀 */
.form-group { }                  /* ✅ 通用组件，无需前缀 */
```

### **需要改进的地方**

```css
/* 混合了模块通用和具体功能 */
.doc-cell { }                    /* ⚠️ 可考虑改为 .supplier-doc-cell */
.document-item { }               /* ⚠️ 可考虑改为 .supplier-document-item */
.toggle-details-btn { }          /* ⚠️ 可考虑改为 .supplier-toggle-btn */
```

**注意：** 上述改进建议仅供参考，不强制要求修改现有代码。

---

## ✅ 检查清单

在编写新样式时，请确认：

- [ ] 样式文件放在了正确的目录层级
- [ ] 新模块功能考虑使用模块前缀
- [ ] 通用组件保持简单命名
- [ ] UI工具组件使用 `ui-` 前缀
- [ ] 遵循推荐的CSS加载顺序
- [ ] 避免过度嵌套（建议不超过3层）
- [ ] 使用语义化的类名

---

## 📈 优化计划

### **短期计划**
1. 创建 `ui-utils.css` 文件，统一管理UI工具层样式
2. 整理散落的样式，按功能重新组织
3. 完善CSS文件加载顺序

### **长期计划**
1. 逐步为历史代码添加模块前缀（可选）
2. 建立CSS变量体系，提高可维护性
3. 考虑引入CSS预处理器（如需要）

---

## 📖 参考资源

- [CSS Architecture](https://css-tricks.com/css-architecture/)
- [Maintainable CSS](https://maintainablecss.com/)

---

**维护者**: Claude Code AI
**最后更新**: 2025-12-06
**版本历史**:
- v1.0: 基于现有代码现实创建务实指南