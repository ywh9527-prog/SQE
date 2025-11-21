# Windows BAT 启动器编写指南

**文档版本**: v1.0  
**创建日期**: 2025-11-21  
**适用场景**: 为 Node.js 项目创建 Windows 批处理启动器

---

## 📌 用户偏好

### 1. 界面风格
- ✅ **使用 Emoji 图标** - 让界面更生动、易读
- ✅ **中文提示信息** - 用户偏好中文界面
- ✅ **清晰的分隔线** - 使用 `========================================`
- ✅ **状态标识** - 使用 ✅ ❌ ⚠️ 等 emoji 表示状态

### 2. 编码规范
- **必须**: 文件开头设置 UTF-8 编码 `chcp 65001 >nul`
- **必须**: 使用 `@echo off` 隐藏命令回显
- **必须**: 使用 `cd /d "%~dp0"` 切换到脚本所在目录

### 3. Echo 命令特殊规则 ⚠️ 重要！

**关键点**: 当 `echo` 后面跟 emoji 或中文时，必须在 `echo` 和内容之间加点号 (`.`)

**错误写法** ❌:
```batch
echo 🔍 检查系统文件...
echo ✅ 主程序文件就绪
```

**正确写法** ✅:
```batch
echo.🔍 检查系统文件...
echo.✅ 主程序文件就绪
```

**原因**: Windows batch 解析器会将 emoji 后的第一个字符误认为命令，导致错误：
```
'��系统文件...' is not recognized as an internal or external command
```

---

## 📋 标准模板结构

### 1. 文件头部（必需）

```batch
@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo    🚀 [项目名称]启动器
echo ========================================
echo.

echo.📁 当前目录: %CD%
echo.
```

### 2. 文件检查（推荐）

```batch
REM 快速检查关键文件
echo.🔍 检查系统文件...

if exist "主程序文件.js" (
    echo.✅ 主程序文件就绪
    set "MAIN_FILE=主程序文件.js"
) else if exist "备用文件.js" (
    echo.✅ 主程序文件就绪 ^(备用^)
    set "MAIN_FILE=备用文件.js"
) else (
    echo.❌ 主程序文件缺失
    pause
    exit /b 1
)

if exist "public\index.html" (
    echo.✅ 界面文件就绪
) else (
    echo.❌ 界面文件缺失
    pause
    exit /b 1
)

echo.
```

**注意**: 
- 括号内的特殊字符需要转义：`^(` 和 `^)`
- 使用 `set "变量名=值"` 设置变量

### 3. 环境检查（必需）

```batch
REM 检查 Node.js
echo.🛠️ 检查运行环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo.❌ Node.js 不可用
    echo.
    echo.请安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo.✅ Node.js 运行正常
)

echo.
```

### 4. 依赖检查（推荐）

```batch
REM 检查依赖
if not exist "node_modules" (
    echo.📦 首次运行，正在安装依赖...
    npm install
    if errorlevel 1 (
        echo.❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo.✅ 依赖安装完成
    echo.
)
```

### 5. 启动应用

```batch
echo.🚀 启动[项目名称]...
echo.
echo.✨ 新版本特性：
echo.  🎨 特性1
echo.  💎 特性2
echo.  📱 特性3
echo.

REM 启动命令
echo.正在启动应用...
npm start

REM 或者使用 npx
npx electron %MAIN_FILE%

if errorlevel 1 (
    echo.
    echo.⚠️ 启动失败，正在重试...
    REM 备用启动方式
)
```

### 6. 结束（必需）

```batch
echo.
echo ========================================
echo.🎉 感谢使用[项目名称]
echo ========================================
pause >nul
```

---

## 🎯 完整示例

### Web 服务器启动器

```batch
@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo    🚀 SQE数据分析助手启动器
echo ========================================
echo.

echo.📁 当前目录: %CD%
echo.

REM 检查文件
echo.🔍 检查系统文件...
if exist "server\index.js" (
    echo.✅ 服务器文件就绪
) else (
    echo.❌ 服务器文件缺失
    pause
    exit /b 1
)

if exist "public\index.html" (
    echo.✅ 界面文件就绪
) else (
    echo.❌ 界面文件缺失
    pause
    exit /b 1
)

echo.

REM 检查 Node.js
echo.🛠️ 检查运行环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo.❌ Node.js 不可用
    pause
    exit /b 1
) else (
    echo.✅ Node.js 运行正常
)

echo.

REM 检查依赖
if not exist "node_modules" (
    echo.📦 首次运行，正在安装依赖...
    npm install
    if errorlevel 1 (
        echo.❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo.✅ 依赖安装完成
    echo.
)

echo.🚀 启动服务器...
echo.
echo.服务器地址: http://localhost:3000
echo.提示: 浏览器将自动打开
echo.      按 Ctrl+C 停止服务器
echo.

npm start

echo.
echo ========================================
echo.服务器已停止
echo ========================================
pause
```

### Electron 桌面应用启动器

```batch
@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo    🚀 SQE质量管理系统启动器
echo ========================================
echo.

echo.📁 当前目录: %CD%
echo.

REM 检查文件
echo.🔍 检查系统文件...
if exist "electron-main.js" (
    echo.✅ 主程序文件就绪 ^(electron-main.js^)
    set "ELECTRON_MAIN=electron-main.js"
) else if exist "electron-main-simple.js" (
    echo.✅ 主程序文件就绪 ^(electron-main-simple.js^)
    set "ELECTRON_MAIN=electron-main-simple.js"
) else (
    echo.❌ 主程序文件缺失
    pause
    exit /b 1
)

if exist "public\index.html" (
    echo.✅ 界面文件就绪
) else (
    echo.❌ 界面文件缺失
    pause
    exit /b 1
)

echo.

REM 检查 Node.js
echo.🛠️ 检查运行环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo.❌ Node.js 不可用
    echo.
    echo.请安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo.✅ Node.js 运行正常
)

echo.

REM 检查依赖
if not exist "node_modules" (
    echo.📦 首次运行，正在安装依赖...
    npm install
    if errorlevel 1 (
        echo.❌ 依赖安装失败
        pause
        exit /b 1
    )
    echo.✅ 依赖安装完成
    echo.
)

echo.🚀 启动桌面应用...
echo.
echo.✨ 新版本特性：
echo.  🎨 Mocha Mousse 2025年度色设计
echo.  💎 流畅动画和微交互
echo.  📱 响应式现代化布局
echo.

echo.正在启动应用...
npx electron %ELECTRON_MAIN%

if errorlevel 1 (
    echo.
    echo.⚠️ 首次启动尝试失败，正在重试...
    
    if exist "node_modules\.bin\electron.cmd" (
        echo.使用备用方式启动...
        call node_modules\.bin\electron.cmd %ELECTRON_MAIN%
    ) else (
        echo.❌ 请检查依赖安装：npm install electron
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo.🎉 感谢使用SQE质量管理系统
echo ========================================
pause >nul
```

---

## ⚠️ 常见错误和解决方案

### 1. 中文乱码
**问题**: 中文显示为乱码或问号  
**解决**: 确保文件开头有 `chcp 65001 >nul`

### 2. Emoji 被当作命令
**问题**: 出现 `'��xxx' is not recognized as an internal or external command`  
**解决**: 在 `echo` 和内容之间加点号：`echo.✅ 内容`

### 3. 括号导致语法错误
**问题**: 括号内的内容无法正常显示  
**解决**: 使用 `^(` 和 `^)` 转义括号

### 4. 路径包含空格
**问题**: 路径中的空格导致命令失败  
**解决**: 使用双引号包裹路径：`"%~dp0"`

### 5. 变量未正确设置
**问题**: 变量值包含空格或特殊字符  
**解决**: 使用 `set "变量名=值"` 格式

---

## 📝 检查清单

创建 BAT 启动器时，请确保：

- [ ] 文件开头有 `@echo off` 和 `chcp 65001 >nul`
- [ ] 使用 `cd /d "%~dp0"` 切换到脚本目录
- [ ] 所有 `echo` 命令后跟 emoji/中文时都加了点号
- [ ] 检查了关键文件是否存在
- [ ] 检查了 Node.js 环境
- [ ] 处理了依赖安装（首次运行）
- [ ] 提供了清晰的错误提示
- [ ] 使用了 `pause` 或 `pause >nul` 防止窗口自动关闭
- [ ] 特殊字符（括号等）已正确转义

---

## 🎨 Emoji 使用建议

| 场景 | 推荐 Emoji |
|------|-----------|
| 成功/完成 | ✅ |
| 错误/失败 | ❌ |
| 警告/注意 | ⚠️ |
| 信息/提示 | 💡 |
| 文件/目录 | 📁 📄 |
| 检查/搜索 | 🔍 |
| 启动/运行 | 🚀 |
| 工具/设置 | 🛠️ ⚙️ |
| 包/依赖 | 📦 |
| 设计/界面 | 🎨 |
| 动画/效果 | 💎 |
| 移动/响应式 | 📱 |
| 数据/图表 | 📊 |
| 庆祝/完成 | 🎉 |

---

## 💡 最佳实践

1. **保持简洁**: 不要过度使用 emoji，每行最多 1-2 个
2. **统一风格**: 同类提示使用相同的 emoji
3. **清晰分组**: 使用空行和分隔线区分不同部分
4. **友好提示**: 错误时提供解决方案或帮助链接
5. **优雅退出**: 使用 `pause >nul` 让用户按任意键退出

---

**文档维护**: 本指南将随着项目经验持续更新  
**最后更新**: 2025-11-21
