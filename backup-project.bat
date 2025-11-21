@echo off
echo ====================================
echo    SQE Project Backup Tool
echo ====================================
echo.

set BACKUP_DIR=D:\AI\backups
set PROJECT_DIR=D:\AI\SQE-Data-Analysis-Assistant-refactored
set TIMESTAMP=%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

set BACKUP_NAME=SQE-backup-%TIMESTAMP%

echo Creating backup...
echo Backup Directory: %BACKUP_DIR%\%BACKUP_NAME%
echo.

if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
    echo Created backup directory: %BACKUP_DIR%
)

REM Use robocopy to copy project (more powerful than xcopy)
robocopy "%PROJECT_DIR%" "%BACKUP_DIR%\%BACKUP_NAME%" /E /XD node_modules uploads .git

echo.
echo ====================================
echo    Backup Completed!
echo ====================================
echo.
echo Backup Location: %BACKUP_DIR%\%BACKUP_NAME%
echo.
echo Press any key to exit...
pause >nul
