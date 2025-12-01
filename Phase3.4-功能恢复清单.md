# Phase 3.4 功能恢复清单

## 🚨 删除的核心功能（需要恢复）

### 1. 上传功能修复
- 修复模态框显示问题，解决重复元素冲突
- 优化弹窗z-index，确保验证提示可见  
- 恢复永久有效复选框功能

### 2. 供应商数据集成
- 删除了70个真实供应商数据
- 移除了供应商同步功能
- 修复了供应商API路由问题

### 3. 数据库结构优化
- 数据库从根目录迁移至server/data/目录
- 删除了.gitignore和.env配置文件
- 优化了项目文件组织结构

### 4. 邮件系统完善
- 删除了完整邮件服务架构
- 移除了所有邮件模板（环境预警、过期通知、质量协议预警）
- 删除了预警功能和邮件配置

### 5. 用户体验提升
- 完善的表单验证和具体错误提示
- 优化的弹窗显示层级
- 改进的界面交互和视觉层次

## 📁 需要恢复的文件

### 新建文件
- `.env.example` - 环境配置模板
- `.gitignore` - Git忽略规则
- `server/data/README.md` - 数据库说明
- `server/routes/notifications.js` - 通知路由 (204行)
- `server/services/alertService.js` - 预警服务 (291行)
- `server/services/emailService.js` - 邮件服务 (117行)
- 4个邮件模板文件 (总计525行)
- `邮件配置指南.md`

### 修改文件
- `public/css/modules/documents.css` (+26行)
- `public/index.html` (+35行)
- `public/js/modules/supplier.js` (+421行)
- `server/index.js` (+111行)
- 其他小修改文件

## ⚡ 快速恢复步骤

### 第一步：核心功能（30分钟）
1. 恢复上传模态框z-index修复
2. 重新添加永久有效复选框功能
3. 修复表单验证提示

### 第二步：数据恢复（20分钟）
1. 恢复70个供应商数据
2. 重新实现供应商同步API
3. 迁移数据库到server/data/

### 第三步：邮件系统（60分钟）
1. 重新创建邮件服务架构
2. 恢复所有邮件模板
3. 配置邮件发送功能

### 第四步：配置文档（10分钟）
1. 恢复.env.example和.gitignore
2. 重新创建邮件配置指南

**总计预计时间：2小时**

## 🎯 关键代码备份

### 上传功能修复
```javascript
showUploadModal() {
  const modal = document.getElementById('uploadModal');
  modal.style.cssText = `
    display: block !important;
    position: fixed !important;
    z-index: 999999 !important;
  `;
}
```

### 供应商数据示例
```javascript
const tempSuppliers = [
  { id: 4, name: 'BKTECH', code: 'BKTECH', level: 'General', status: 'Active' },
  { id: 5, name: '一米新', code: '一米新', level: 'General', status: 'Active' },
  // ...总共70个供应商
];
```

这个清单可以帮助你在下一个窗口快速恢复所有删除的功能。