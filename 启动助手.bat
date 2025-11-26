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

REM Check if port 8888 is in use and identify the process
set "FOUND_SQE_PROCESS=0"
set "PORT_CLEANUP_NEEDED=0"

echo [+] Checking for processes using port 8888...

REM Get all processes using port 8888
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8888" ^| findstr "LISTENING"') do (
    if "%%a" NEQ "0" (
        echo [!] Port 8888 is in use by process ID: %%a
        
        REM Check if this is our SQE server by examining the command line
        wmic process where "ProcessId=%%a" get CommandLine /value 2>nul | findstr /i "server.index.js" >nul
        if not errorlevel 1 (
            echo [+] Found our SQE server process %%a
            set "FOUND_SQE_PROCESS=1"
            set "PORT_CLEANUP_NEEDED=1"
        ) else (
            REM Additional check: look for SQE in the process path or command line
            wmic process where "ProcessId=%%a" get CommandLine,ExecutablePath /value 2>nul | findstr /i "SQE\|sqe\|IFLOW-SQE" >nul
            if not errorlevel 1 (
                echo [+] Found SQE-related process %%a
                set "FOUND_SQE_PROCESS=1"
                set "PORT_CLEANUP_NEEDED=1"
            ) else (
                REM Check if the process is running from our project directory
                wmic process where "ProcessId=%%a" get CommandLine /value 2>nul | findstr /i "%~dp0" >nul
                if not errorlevel 1 (
                    echo [+] Found project-related process %%a
                    set "FOUND_SQE_PROCESS=1"
                    set "PORT_CLEANUP_NEEDED=1"
                ) else (
                    echo [!] Process %%a is not SQE-related, showing details:
                    wmic process where "ProcessId=%%a" get Name,CommandLine /value 2>nul
                    echo.
                    echo [!] This process will NOT be terminated to avoid disrupting other services
                    echo [!] You may need to manually close this application if SQE fails to start
                    echo.
                )
            )
        )
    )
)

if %PORT_CLEANUP_NEEDED%==1 (
    echo.
    echo [+] Cleaning up SQE processes on port 8888...
    
    REM Terminate SQE processes safely
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8888" ^| findstr "LISTENING"') do (
        if "%%a" NEQ "0" (
            REM Double-check it's SQE-related before terminating
            wmic process where "ProcessId=%%a" get CommandLine /value 2>nul | findstr /i "server.index.js" >nul
            if not errorlevel 1 (
                echo [+] Stopping SQE server process %%a...
                taskkill /PID %%a /F >nul 2>&1
                if errorlevel 1 (
                    echo [x] Failed to stop SQE process %%a
                ) else (
                    echo [OK] SQE process %%a stopped successfully
                )
            ) else (
                REM Check for SQE-related keywords
                wmic process where "ProcessId=%%a" get CommandLine,ExecutablePath /value 2>nul | findstr /i "SQE\|sqe\|IFLOW-SQE" >nul
                if not errorlevel 1 (
                    echo [+] Stopping SQE-related process %%a...
                    taskkill /PID %%a /F >nul 2>&1
                    if errorlevel 1 (
                        echo [x] Failed to stop SQE process %%a
                    ) else (
                        echo [OK] SQE process %%a stopped successfully
                    )
                ) else (
                    REM Check for project path in command line
                    wmic process where "ProcessId=%%a" get CommandLine /value 2>nul | findstr /i "%~dp0" >nul
                    if not errorlevel 1 (
                        echo [+] Stopping project-related process %%a...
                        taskkill /PID %%a /F >nul 2>&1
                        if errorlevel 1 (
                            echo [x] Failed to stop project process %%a
                        ) else (
                            echo [OK] Project process %%a stopped successfully
                        )
                    )
                )
            )
        )
    )
    
    echo.
    echo [OK] Waiting for ports to release...
    timeout /t 3 >nul
) else (
    echo.
    echo [!] No SQE processes found on port 8888
    if %FOUND_SQE_PROCESS%==0 (
        echo [!] Port 8888 is in use by non-SQE processes
        echo [!] SQE server may fail to start
    )
    echo.
)

if %FOUND_SQE_PROCESS%==1 (
    echo.
    echo [OK] SQE processes cleaned up, waiting for ports to release...
    timeout /t 3 >nul
) else (
    echo.
    echo [!] No SQE processes were terminated. If port 8888 is still in use by another application:
    echo [!] - The SQE server may fail to start
    echo [!] - You may need to manually close the other application using port 8888
    echo.
)

REM Final check if port is still in use
netstat -ano | findstr ":8888" >nul 2>&1
if errorlevel 1 (
    echo [OK] Port 8888 is now available
) else (
    echo [!] Port 8888 is still in use by another process
    echo [!] SQE server will attempt to start anyway...
)
echo.

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
