const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// 保持对 window 对象的全局引用，避免被 GC
let mainWindow;
let serverProcess;

function createWindow() {
    // 创建浏览器窗口
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        title: 'SQE 质量管理平台',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // 允许在渲染进程中使用 Node.js (仅用于开发调试)
        },
        autoHideMenuBar: true // 隐藏菜单栏，看起来更像原生应用
    });

    // 加载应用
    // 这里我们等待服务器启动后再加载，或者直接加载静态文件
    // 为了保持与 Web 端一致的逻辑（API 调用），我们还是通过 localhost 访问
    // 但为了确保服务器已启动，我们可以先加载一个 loading 页面，或者简单的重试逻辑

    const loadApp = () => {
        mainWindow.loadURL('http://localhost:3000');
    };

    // 改进的重试逻辑：每秒尝试一次，打印状态，直到服务器返回 200
    const tryLoad = () => {
        const http = require('http');
        http.get('http://localhost:3000', (res) => {
            console.log(`[Electron] 服务器响应状态码: ${res.statusCode}`);
            if (res.statusCode === 200) {
                console.log('[Electron] 服务器已就绪，加载 UI');
                loadApp();
            } else {
                console.warn(`[Electron] 服务器返回 ${res.statusCode}，1 秒后重试`);
                setTimeout(tryLoad, 1000);
            }
        }).on('error', (err) => {
            console.warn('[Electron] 请求服务器失败，1 秒后重试', err.message);
            setTimeout(tryLoad, 1000);
        });
    };

    console.log('[Electron] 开始轮询服务器...');
    tryLoad();

    // 打开开发者工具 (可选)
    mainWindow.webContents.openDevTools();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// 启动 Express 服务器
function startServer() {
    const serverPath = path.join(__dirname, 'server', 'index.js');
    serverProcess = spawn('node', [serverPath], {
        stdio: 'inherit', // 让服务器日志输出到主进程控制台
        shell: true
    });

    serverProcess.on('error', (err) => {
        console.error('无法启动服务器:', err);
    });
}

app.on('ready', () => {
    startServer();
    createWindow();
});

app.on('window-all-closed', () => {
    // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
    // 否则绝大部分应用及其菜单栏会保持激活。
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // 在 macOS 上，当点击 dock 图标并且没有其他窗口打开时，
    // 通常在应用程序中重建一个窗口。
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('will-quit', () => {
    // 退出时杀死服务器进程
    if (serverProcess) {
        if (process.platform === 'win32') {
            spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
        } else {
            serverProcess.kill();
        }
    }
});
