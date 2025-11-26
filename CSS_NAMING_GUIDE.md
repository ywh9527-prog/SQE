# CSS 命名规范指南 (BEM 方法论)

**创建日期**: 2025-11-22  
**适用范围**: SQE 供应商管理系统 v2.0

---

## 📌 什么是 BEM?

**BEM** = **B**lock（块） + **E**lement（元素） + **M**odifier（修饰符）

这是一种 CSS 命名方法论，旨在：
- ✅ 避免样式冲突
- ✅ 提高代码可读性
- ✅ 便于维护和扩展

---

## 🎯 命名规则

### 基本格式

```css
.block {}                    /* 块 */
.block__element {}           /* 块中的元素 */
.block--modifier {}          /* 块的修饰符 */
.block__element--modifier {} /* 元素的修饰符 */
```

### 命名约定

1. **使用小写字母和连字符**
   - ✅ `.stat-card`
   - ❌ `.StatCard` 或 `.stat_card`

2. **双下划线 `__` 表示元素**
   - ✅ `.stat-card__title`
   - ❌ `.stat-card-title`

3. **双连字符 `--` 表示修饰符**
   - ✅ `.stat-card--primary`
   - ❌ `.stat-card-primary`

---

## 🛡️ 模块命名空间

为避免跨模块冲突，每个模块的样式应添加**模块前缀**：

| 模块 | 前缀 | 示例 |
|------|------|------|
| **IQC 模块** | `iqc-` | `.iqc-upload-section` |
| **供应商模块** | `supplier-` | `.supplier-card` |
| **证书模块** | `cert-` | `.cert-list` |
| **绩效模块** | `perf-` | `.perf-chart` |
| **通用组件** | 无前缀 | `.btn`, `.card` |

---

## ✅ 正确示例

### 示例 1：IQC 统计卡片

```html
<div class="iqc-stat-card iqc-stat-card--success">
    <div class="iqc-stat-card__icon">✓</div>
    <div class="iqc-stat-card__label">合格批次数</div>
    <div class="iqc-stat-card__value">150</div>
</div>
```

```css
/* 块 */
.iqc-stat-card {
    padding: 20px;
    border-radius: 8px;
    background: #fff;
}

/* 元素 */
.iqc-stat-card__icon {
    font-size: 24px;
}

.iqc-stat-card__label {
    font-size: 14px;
    color: #666;
}

.iqc-stat-card__value {
    font-size: 32px;
    font-weight: bold;
}

/* 修饰符 */
.iqc-stat-card--success {
    border-left: 4px solid #10b981;
}

.iqc-stat-card--danger {
    border-left: 4px solid #ef4444;
}
```

### 示例 2：供应商列表

```html
<div class="supplier-list">
    <div class="supplier-list__item supplier-list__item--active">
        <div class="supplier-list__name">供应商A</div>
        <div class="supplier-list__status supplier-list__status--excellent">优秀</div>
    </div>
</div>
```

```css
.supplier-list {}
.supplier-list__item {}
.supplier-list__item--active {
    background: #f0f9ff;
}
.supplier-list__name {}
.supplier-list__status {}
.supplier-list__status--excellent {
    color: #10b981;
}
```

---

## ❌ 错误示例

### 错误 1：缺少模块前缀

```css
/* ❌ 错误：通用名称，容易冲突 */
.stat-card {}
.chart {}

/* ✅ 正确：添加模块前缀 */
.iqc-stat-card {}
.iqc-chart {}
```

### 错误 2：使用单下划线或单连字符

```css
/* ❌ 错误 */
.stat-card_title {}
.stat-card-primary {}

/* ✅ 正确 */
.stat-card__title {}
.stat-card--primary {}
```

### 错误 3：嵌套过深

```css
/* ❌ 错误：嵌套层级过深 */
.iqc-section__content__card__header__title {}

/* ✅ 正确：扁平化命名 */
.iqc-card-header__title {}
```

---

## 🎨 通用组件命名

以下是系统级通用组件，**不需要模块前缀**：

### 按钮

```css
.btn {}                    /* 基础按钮 */
.btn--primary {}           /* 主按钮 */
.btn--secondary {}         /* 次按钮 */
.btn--outline {}           /* 轮廓按钮 */
.btn--small {}             /* 小按钮 */
.btn--large {}             /* 大按钮 */
```

### 卡片

```css
.card {}                   /* 基础卡片 */
.card__header {}           /* 卡片头部 */
.card__body {}             /* 卡片主体 */
.card__footer {}           /* 卡片底部 */
.card--shadow {}           /* 带阴影的卡片 */
```

### 表单

```css
.form-input {}             /* 输入框 */
.form-label {}             /* 标签 */
.form-group {}             /* 表单组 */
.form-error {}             /* 错误提示 */
```

---

## 🔧 重构计划

### 当前需要重构的样式

| 当前类名 | 建议改为 | 优先级 |
|---------|---------|--------|
| `.stat-card` | `.iqc-stat-card` | 🔴 高 |
| `.stat-card-mini` | `.iqc-stat-card--mini` | 🔴 高 |
| `.chart-card` | `.iqc-chart-card` | 🟡 中 |
| `.upload-section` | `.iqc-upload-section` | 🟡 中 |
| `.comparison-section` | `.iqc-comparison-section` | 🟡 中 |

### 重构步骤

1. **创建新样式**：在 `iqc_v2.css` 中添加符合 BEM 的新类名
2. **双轨运行**：保留旧类名，同时添加新类名
3. **更新 HTML**：逐步替换 HTML 中的类名
4. **删除旧样式**：确认无引用后删除旧类名

---

## 📖 参考资源

- [BEM 官方文档](https://en.bem.info/)
- [CSS Guidelines](https://cssguidelin.es/)
- [Airbnb CSS / Sass Styleguide](https://github.com/airbnb/css)

---

## 🔍 检查清单

在编写新样式时，请确认：

- [ ] 类名使用小写字母和连字符
- [ ] 元素使用双下划线 `__`
- [ ] 修饰符使用双连字符 `--`
- [ ] 模块样式添加了模块前缀
- [ ] 避免嵌套超过 3 层
- [ ] 通用组件不添加模块前缀

---

**维护者**: Gemini AI  
**最后更新**: 2025-11-22
