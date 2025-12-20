@echo off
echo 🛡️ CSS架构重构回滚脚本
echo ========================================
echo.
echo 此脚本将回滚Phase 4.3的所有更改
echo.

set BACKUP_DIR=D:\AI\SQE-Data-Analysis-Assistant-refactored\Claude-SQE-Data-Analysis-Assistant-refactored\backup\css-phase4-3-20251221-003030

echo 📋 回滚步骤：
echo 1. 恢复HTML文件
echo 2. 恢复CSS文件引用
echo.

pause

echo 🔄 开始回滚...

copy "%BACKUP_DIR%\index.html.backup" "D:\AI\SQE-Data-Analysis-Assistant-refactored\Claude-SQE-Data-Analysis-Assistant-refactored\public\index.html"

echo.
echo ✅ 回滚完成！
echo 所有更改已恢复到Phase 4.3执行前的状态
echo.
pause