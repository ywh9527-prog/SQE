# SQE 数据分析助手 - Antigravity 项目记忆

## ⚠️⚠️⚠️ 强制要求 - 代码编辑前必读 ⚠️⚠️⚠️

**每次修改任何文件前，必须先执行以下步骤：**

1. 用 `view_file` 查看本文件的"代码编辑铁律"部分（第5-80行）
2. 回顾所有规则
3. 用 `view_file` 查看要修改的文件的确切内容
4. 制定编辑计划（使用哪个工具、几个chunk、每个chunk多少行）
5. 每次修改会告诉用户正在使用gemini.md规则
6. 才能执行修改

**违反此流程将导致文件损坏！**

---

## 🚨 代码编辑铁律

### 核心问题：工具的"尽力而为"行为

Antigravity 的 `replace_file_content` 和 `multi_replace_file_content` 工具在 `TargetContent` 不精确匹配时，会"尽力而为"地应用修改。这常常导致：
- ✅ 目标行被正确修改
- ❌ 但周围大量代码被意外删除或移位

### 🎯 精确外科手术式修改原则

1. **永远不要贪婪匹配**
   - ❌ **错误示例**：TargetContent 包含 50 行代码只为改其中 1 行
   - ✅ **正确做法**：只匹配需要修改的 1-3 行，加最少的上下文（1-2行）
   - **原因**：大块 TargetContent 极易因空格/换行符不匹配而失败

2. **多处修改必须用 multi_replace_file_content**
   - ❌ **错误**：用 `replace_file_content` 替换第 10-100 行来改第 10 行和第 100 行
   - ✅ **正确**：用 `multi_replace_file_content`，两个独立的 ReplacementChunk
   - **原因**：中间的 90 行代码会被完整保留，不会被误删

3. **TargetContent 必须字符级精确匹配**
   - 必须包含所有空格、制表符、换行符
   - 使用 `view_file` 查看确切内容后再复制
   - Windows 文件是 `\r\n`，不是 `\n`
   - **工具行为**：不精确匹配时会"尽力而为"应用修改，常导致大量代码被删除

4. **小步迭代，频繁验证**
   - 每次只改一个小功能点
   - 改完立即用 `view_file` 验证
   - 发现问题立即 `git restore`

5. **死循环预防（3 次规则）**
   - 如果同一个文件被搞坏 3 次，**立即停止**
   - 不要继续尝试同样的方法
   - 改用其他策略或请用户手动修改

### 📋 编辑前必做检查清单

- [ ] 用 `view_file` 查看本文件回顾规则
- [ ] 用 `view_file` 查看目标文件的确切内容和行号
- [ ] TargetContent 精确复制（包括所有空格和换行）
- [ ] 优先使用 `multi_replace_file_content`
- [ ] 每个 chunk 尽可能小（不超过 10 行）
- [ ] 准备好 `git restore` 命令以防失败

### 🛠️ 工具选择决策树

```
需要修改文件？
├─ 只改 1 处且少于 10 行？
│  └─ 用 replace_file_content（TargetContent 尽量小）
└─ 改多处 OR 单处超过 10 行？
   └─ 用 multi_replace_file_content（每处一个独立 chunk）
```

### ⚠️ 危险信号（立即停止并回滚）

- 文件大小突然减少超过 10%
- diff 显示删除的行数远超预期
- 连续 2 次修改同一文件失败
- TargetContent 超过 20 行

### 🔧 失败后的恢复流程

1. **立即回滚**：`git restore <file>`
2. **分析原因**：通常是 TargetContent 不精确匹配
3. **改进策略**：
   - 使用更小的 chunk（每个不超过 5 行）
   - 用 `multi_replace_file_content` 替代 `replace_file_content`
   - 确保 TargetContent 字符级精确
4. **2 次规则**：如果 2 次仍失败，停止并请用户手动修改

---

## 项目特定信息

### 技术栈
- **后端**: Node.js + Express + SQLite (Sequelize ORM)
- **前端**: 原生 JavaScript (模块化架构)
- **数据处理**: Excel 解析 (xlsx 库)

### 关键文件
- `server/index.js` - 服务器入口，包含中间件配置
- `server/routes/upload.js` - 文件上传和数据处理路由
- `public/js/utils/api.js` - 前端 API 封装
- `public/js/modules/iqc.js` - IQC 模块主逻辑

### 重要约定
- 所有 API 路由前缀为 `/api`
- 数据库使用 `IQCData` 模型存储原始数据和分析结果
- 前端模块通过 `window.App.Modules` 暴露
- 使用 `fileId` 进行数据缓存和重用，避免重复上传
- 使用猫娘语气与用户对话
