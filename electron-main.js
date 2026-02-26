/**
 * SQE质量管理系统 - Electron主进程
 * 用于打包成桌面应用
 */

const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let serverProcess;
const PORT = 8888;

// 判断是否是打包后的环境
const isPackaged = app.isPackaged;
const appPath = isPackaged ? path.dirname(app.getPath('exe')) : __dirname;

// 用户数据目录（用于存储数据库和上传文件）
const userDataPath = path.join(app.getPath('userData'), 'data');

/**
 * 确保用户数据目录存在
 */
function ensureUserDataDir() {
    if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
        console.log('创建用户数据目录:', userDataPath);
    }
}

/**
 * 初始化数据库目录
 */
function initDatabaseDir() {
    const dbPath = path.join(userDataPath, 'database');
    if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath, { recursive: true });
        
        // 如果是首次运行，检查是否有默认数据库需要复制
        const defaultDbPath = path.join(appPath, 'server', 'database', 'sqe_database.sqlite');
        if (fs.existsSync(defaultDbPath)) {
            const targetDbPath = path.join(dbPath, 'sqe_database.sqlite');
            fs.copyFileSync(defaultDbPath, targetDbPath);
            console.log('复制默认数据库到用户数据目录');
        }
    }
}

/**
 * 启动后端服务器
 */
function startServer() {
    return new Promise((resolve, reject) => {
        const serverPath = isPackaged 
            ? path.join(appPath, 'server', 'index.js')
            : path.join(__dirname, 'server', 'index.js');
        
        console.log('启动服务器:', serverPath);
        console.log('用户数据目录:', userDataPath);

        // 设置环境变量，让服务器知道数据目录
        const env = {
            ...process.env,
            USER_DATA_PATH: userDataPath,
            PORT: PORT.toString()
        };

        serverProcess = spawn('node', [serverPath], {
            cwd: appPath,
            env: env,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        serverProcess.stdout.on('data', (data) => {
            console.log(`[Server] ${data}`);
        });

        serverProcess.stderr.on('data', (data) => {
            console.error(`[Server Error] ${data}`);
        });

        serverProcess.on('error', (err) => {
            console.error('服务器启动失败:', err);
            reject(err);
        });

        // 等待服务器启动
        setTimeout(() => {
            resolve();
        }, 2000);
    });
}

/**
 * 创建主窗口
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        title: 'SQE质量管理系统',
        icon: path.join(__dirname, 'public', 'favicon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webSecurity: true
        },
        show: false // 先隐藏，加载完成后显示
    });

    // 加载应用
    const url = `http://localhost:${PORT}`;
    mainWindow.loadURL(url);

    // 窗口准备好后显示
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // 开发模式下打开DevTools
    if (!isPackaged) {
        mainWindow.webContents.openDevTools();
    }

    // 处理外部链接
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

/**
 * 创建菜单
 */
function createMenu() {
    const template = [
        {
            label: '文件',
            submenu: [
                { role: 'quit', label: '退出' }
            ]
        },
        {
            label: '视图',
            submenu: [
                { role: 'reload', label: '刷新' },
                { role: 'togglefullscreen', label: '全屏' },
                { type: 'separator' },
                { role: 'zoomin', label: '放大' },
                { role: 'zoomout', label: '缩小' },
                { role: 'resetzoom', label: '重置缩放' }
            ]
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '关于',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '关于',
                            message: 'SQE质量管理系统',
                            detail: `版本: ${app.getVersion()}\n\n供应商质量评价管理系统`
                        });
                    }
                },
                {
                    label: '打开数据目录',
                    click: () => {
                        shell.openPath(userDataPath);
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

/**
 * 应用启动
 */
app.whenReady().then(async () => {
    try {
        // 确保数据目录存在
        ensureUserDataDir();
        initDatabaseDir();

        // 启动服务器
        console.log('正在启动服务器...');
        await startServer();
        console.log('服务器启动成功');

        // 创建窗口
        createWindow();
        createMenu();

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    } catch (error) {
        console.error('应用启动失败:', error);
        dialog.showErrorBox('启动失败', `应用启动失败: ${error.message}`);
        app.quit();
    }
});

/**
 * 关闭应用时清理
 */
app.on('window-all-closed', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
    app.quit();
});

app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

/**
 * 处理未捕获的异常
 */
process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    dialog.showErrorBox('错误', `发生未知错误: ${error.message}`);
});
