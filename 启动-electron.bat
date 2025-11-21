@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo    🚀 SQE现代化质量管理系统启动器
echo ========================================
echo.

echo 📁 当前目录: %CD%
echo.

REM 快速检查关键文件
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

if exist "preload.js" (
    echo.✅ 预加载脚本就绪
) else (
    echo.⚠️ 预加载脚本缺失（某些功能可能受限）
)

if exist "server\index.js" (
    echo.✅ 后端服务就绪
) else (
    echo.⚠️ 后端服务缺失（某些功能可能受限）
)

echo.
echo.🎨 现代化UI系统已就绪
echo.💡 新特性：Mocha Mousse主题、流畅动画、模块化设计
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

echo.🚀 启动现代化SQE质量管理系统...
echo.
echo.✨ 新版本特性：
echo.  🎨 Mocha Mousse 2025年度色设计
echo.  💎 流畅动画和微交互
echo.  📱 响应式现代化布局
echo.  🔧 专业数据可视化
echo.  📊 模块化架构 ^(IQC模块已独立^)
echo.

REM 尝试启动 Electron
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