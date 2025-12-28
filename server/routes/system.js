const express = require('express');
const router = express.Router();
const path = require('path');
const { spawn } = require('child_process');

// 认证中间件
const authenticateToken = (req, res, next) => {
    // 简化版认证，暂时允许所有请求
    next();
};

// 打开本地文件夹
router.post('/open-folder', authenticateToken, async (req, res) => {
    try {
        const { filePath } = req.body;
        
        if (!filePath) {
            return res.status(400).json({
                success: false,
                error: '缺少文件路径'
            });
        }

        console.log('📂 请求打开文件夹:', filePath);

        // 安全检查：确保路径在项目目录内
        const projectRoot = path.resolve(__dirname, '../..');

        // 如果是相对路径，则与项目根目录拼接
        let fullPath;
        if (path.isAbsolute(filePath)) {
            fullPath = path.resolve(filePath);
        } else {
            fullPath = path.resolve(projectRoot, filePath);
        }
        
        if (!fullPath.startsWith(projectRoot)) {
            return res.status(400).json({
                success: false,
                error: '只能打开项目目录内的文件夹'
            });
        }

        // 检查文件/文件夹是否存在
        const fs = require('fs');
        const fsExtra = require('fs-extra');

        // 使用原生fs模块和fs-extra双重检查，增强兼容性
        const existsNative = fs.existsSync(fullPath);
        const existsExtra = await fsExtra.pathExists(fullPath);

        console.log('🔍 文件存在性检查 (原生fs):', existsNative);
        console.log('🔍 文件存在性检查 (fs-extra):', existsExtra);

        if (!existsNative && !existsExtra) {
            console.log('❌ 文件确实不存在:', fullPath);
            return res.status(404).json({
                success: false,
                error: '文件或文件夹不存在'
            });
        }

        // 获取文件夹路径（如果是文件，获取其所在文件夹）
        let folderPath;
        try {
            folderPath = (await fsExtra.stat(fullPath)).isFile()
                ? path.dirname(fullPath)
                : fullPath;
        } catch (statError) {
            console.log('⚠️ 无法获取文件状态，假设为文件夹路径:', statError.message);
            folderPath = fullPath;
        }

        // 根据操作系统打开文件夹
        const platform = process.platform;
        let command;

        if (platform === 'win32') {
            // Windows: 使用 explorer
            command = spawn('explorer', [folderPath], { detached: true });
        } else if (platform === 'darwin') {
            // macOS: 使用 open
            command = spawn('open', [folderPath], { detached: true });
        } else {
            // Linux: 使用 xdg-open
            command = spawn('xdg-open', [folderPath], { detached: true });
        }

        command.unref();
        
        console.log(`✅ 文件夹已打开: ${folderPath}`);
        
        res.json({
            success: true,
            message: '文件夹已打开',
            path: folderPath
        });

    } catch (error) {
        console.error('打开文件夹失败:', error);
        res.status(500).json({
            success: false,
            error: '打开文件夹失败'
        });
    }
});

module.exports = router;