@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
echo 正在查找占用端口 3000 的进程...

set "PID="
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    set "PID=%%a"
    goto :found
)

:found
if defined PID (
    echo 发现进程 ID: !PID!
    echo 正在终止进程...
    taskkill /F /PID !PID!
    if !errorlevel! equ 0 (
        echo 服务器已成功停止。
    ) else (
        echo 无法终止进程。请尝试以管理员身份运行。
    )
) else (
    echo 未找到占用端口 3000 的进程。服务器可能未运行。
)

pause
