#!/bin/bash
# SQE质量管理系统 - 创建更新包脚本
# 用于创建分发给用户的更新包

# 配置
VERSION=$(grep '"currentVersion"' version.json | cut -d'"' -f4)
OUTPUT_DIR="release/update_package_v${VERSION}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "============================================"
echo "  SQE质量管理系统 - 创建更新包"
echo "============================================"
echo ""
echo "当前版本: $VERSION"
echo "输出目录: $OUTPUT_DIR"
echo ""

# 创建输出目录
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# 复制需要更新的文件
echo "正在复制文件..."

# 公共文件
cp -r public "$OUTPUT_DIR/"
echo "  ✓ public/"

# 服务器文件
mkdir -p "$OUTPUT_DIR/server"
cp -r server/routes "$OUTPUT_DIR/server/"
cp -r server/services "$OUTPUT_DIR/server/"
cp -r server/models "$OUTPUT_DIR/server/"
cp -r server/utils "$OUTPUT_DIR/server/"
cp -r server/middleware "$OUTPUT_DIR/server/"
cp -r server/constants "$OUTPUT_DIR/server/"
cp server/index.js "$OUTPUT_DIR/server/"
cp -r server/database "$OUTPUT_DIR/server/"
echo "  ✓ server/"

# Electron 主进程
cp electron-main.js "$OUTPUT_DIR/"
echo "  ✓ electron-main.js"

# 版本信息
cp version.json "$OUTPUT_DIR/"
echo "  ✓ version.json"

# 复制更新脚本到输出目录
cp update.bat "$OUTPUT_DIR/"
echo "  ✓ update.bat"

# 创建更新说明文件
cat > "$OUTPUT_DIR/更新说明.txt" << EOF
============================================
  SQE质量管理系统 更新包 v${VERSION}
============================================

更新日期: $(date +%Y-%m-%d)

【更新内容】
$(grep -A 100 '"changes"' version.json | grep '"' | sed 's/.*"\(.*\)".*/  • \1/' | head -20)

【安装方法】
1. 关闭正在运行的 SQE质量管理系统
2. 将此更新包内的所有文件复制到程序安装目录
   或运行 update.bat 自动更新
3. 等待更新完成
4. 重新启动系统

【注意事项】
• 更新前请确保程序已关闭
• 更新程序会自动备份用户数据
• 如遇问题可从 backup 目录恢复数据

【数据安全】
用户数据（数据库、上传文件）不会被覆盖

============================================
EOF
echo "  ✓ 更新说明.txt"

# 创建压缩包
echo ""
echo "正在创建压缩包..."
cd release
zip -r "SQE更新包_v${VERSION}.zip" "update_package_v${VERSION}" > /dev/null
cd ..

echo ""
echo "============================================"
echo "  更新包创建完成！"
echo "============================================"
echo ""
echo "更新包位置:"
echo "  文件夹: $OUTPUT_DIR"
echo "  压缩包: release/SQE更新包_v${VERSION}.zip"
echo ""
echo "请将压缩包发送给用户"
echo ""
