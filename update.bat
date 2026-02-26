@echo off
chcp 65001 >nul
title SQE质量管理系统 - 更新程序
color 0A

echo ============================================
echo    SQE质量管理系统 - 自动更新程序
echo ============================================
echo.

:: 设置路径
set "APP_DIR=%~dp0"
set "DATA_DIR=%APPDATA%\sqe-quality-management-system\data"
set "BACKUP_DIR=%APP_DIR%backup_%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%"
set "BACKUP_DIR=%BACKUP_DIR: =0%"

:: 检查是否存在更新包
if not exist "%APP_DIR%update_package" (
    echo [错误] 未找到更新包！
    echo.
    echo 请确保 update_package 文件夹存在，包含以下内容：
    echo   - public/
    echo   - server/
    echo   - electron-main.js
    echo   - version.json
    echo.
    pause
    exit /b 1
)

echo [步骤 1/5] 检查系统状态...
echo.

:: 检查程序是否正在运行
tasklist /FI "IMAGENAME eq SQE质量管理系统.exe" 2>NUL | find /I /N "SQE质量管理系统.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [警告] 检测到程序正在运行！
    echo 请先关闭 SQE质量管理系统，然后重新运行此更新程序。
    echo.
    pause
    exit /b 1
)

echo [步骤 2/5] 备份用户数据...
echo.

:: 创建备份目录
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: 备份数据库
if exist "%DATA_DIR%\database" (
    echo 正在备份数据库...
    xcopy "%DATA_DIR%\database" "%BACKUP_DIR%\database" /E /I /Y >nul
    echo 数据库备份完成
)

:: 备份上传文件
if exist "%DATA_DIR%\uploads" (
    echo 正在备份上传文件...
    xcopy "%DATA_DIR%\uploads" "%BACKUP_DIR%\uploads" /E /I /Y >nul
    echo 上传文件备份完成
)

echo 备份位置: %BACKUP_DIR%
echo.

echo [步骤 3/5] 更新程序文件...
echo.

:: 更新程序文件
if exist "%APP_DIR%update_package\public" (
    echo 更新 public 目录...
    xcopy "%APP_DIR%update_package\public" "%APP_DIR%public" /E /Y >nul
)

if exist "%APP_DIR%update_package\server" (
    echo 更新 server 目录...
    xcopy "%APP_DIR%update_package\server" "%APP_DIR%server" /E /Y >nul
)

if exist "%APP_DIR%update_package\electron-main.js" (
    echo 更新 electron-main.js...
    copy /Y "%APP_DIR%update_package\electron-main.js" "%APP_DIR%" >nul
)

if exist "%APP_DIR%update_package\version.json" (
    echo 更新版本信息...
    copy /Y "%APP_DIR%update_package\version.json" "%APP_DIR%" >nul
)

echo 程序文件更新完成
echo.

echo [步骤 4/5] 验证更新...
echo.

:: 检查关键文件
if not exist "%APP_DIR%public\index.html" (
    echo [错误] 更新验证失败：缺少 index.html
    goto :rollback
)

if not exist "%APP_DIR%server\index.js" (
    echo [错误] 更新验证失败：缺少 server/index.js
    goto :rollback
)

echo 更新验证通过
echo.

echo [步骤 5/5] 更新完成！
echo.
echo ============================================
echo    更新成功完成！
echo ============================================
echo.
echo 备份数据已保存在: %BACKUP_DIR%
echo 如遇问题可以从备份恢复数据
echo.
echo 现在可以启动 SQE质量管理系统 了
echo.
pause
exit /b 0

:rollback
echo.
echo [错误] 更新失败，正在回滚...
echo.

:: 从备份恢复
if exist "%BACKUP_DIR%\database" (
    xcopy "%BACKUP_DIR%\database" "%DATA_DIR%\database" /E /Y >nul
)
if exist "%BACKUP_DIR%\uploads" (
    xcopy "%BACKUP_DIR%\uploads" "%DATA_DIR%\uploads" /E /Y >nul
)

echo 已回滚到更新前的状态
echo 请联系技术支持获取帮助
echo.
pause
exit /b 1
