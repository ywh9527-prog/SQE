@echo off
REM Set code page to UTF-8 without BOM
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo    SQE Data Analysis Assistant
echo ========================================
echo.

REM Set portable Node.js path
set "NODE_PORTABLE=%~dp0nodejs-portable"
set "NODE_EXE=%NODE_PORTABLE%\node.exe"
set "NPM_CMD=%NODE_PORTABLE%\npm.cmd"

REM Check if port 8888 is in use
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8888"') do (
    set PID=%%a
    goto :found_port
)
goto :no_port

:found_port
echo [!] Port 8888 is already in use by process ID: %PID%
echo [+] Attempting to stop the process...
taskkill /PID %PID% /F >nul 2>&1
if errorlevel 1 (
    echo [x] Failed to stop the process. Please close it manually.
    pause
    exit /b 1
)
echo [OK] Process stopped successfully.
echo.
timeout /t 2 >nul

:no_port

REM Check for portable Node.js
if exist "%NODE_EXE%" (
    echo [OK] Found portable Node.js
    echo Path: %NODE_PORTABLE%

    REM Add portable Node.js to PATH temporarily
    set "PATH=%NODE_PORTABLE%;%PATH%"

    REM Display version
    "%NODE_EXE%" --version
    echo.
) else (
    echo [!] Portable Node.js not found, trying system Node.js...
    node --version >nul 2>&1
    if errorlevel 1 (
        echo.
        echo [x] ERROR: Node.js not found!
        echo.
        echo Please ensure one of the following:
        echo   1. Extract portable Node.js to: %NODE_PORTABLE%
        echo   2. Or install system Node.js: https://nodejs.org/
        echo.
        pause
        exit /b 1
    )
    echo [OK] Using system Node.js
    node --version
    echo.
)

REM Check and install dependencies
if not exist "node_modules" (
    echo [+] First run, installing dependencies...
    echo This may take a few minutes, please wait...
    echo.

    if exist "%NPM_CMD%" (
        "%NPM_CMD%" install
    ) else (
        npm install
    )

    if errorlevel 1 (
        echo.
        echo [x] Failed to install dependencies!
        pause
        exit /b 1
    )

    echo.
    echo [OK] Dependencies installed successfully!
    echo.
)

echo ========================================
echo [OK] Starting server...
echo.
echo Server URL: http://localhost:8888
echo.
echo Tip: Browser will open automatically
echo      Press Ctrl+C to stop the server
echo ========================================
echo.

REM Start server
if exist "%NODE_EXE%" (
    "%NODE_EXE%" server/index.js
) else (
    node server/index.js
)

echo.
echo ========================================
echo Server stopped
echo ========================================
pause
