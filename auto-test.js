/**
 * 🤖 自动化测试脚本
 * 🎯 功能：自动关闭端口、启动服务器、运行所有测试
 * ⚡ 用法：node auto-test.js
 */

const { spawn, exec } = require('child_process');
const path = require('path');

// 配置
const PORT = 8888;
const SERVER_SCRIPT = 'server/index.js';
const TEST_SCRIPTS = ['test-supplier-search.js', 'test-iqc-apis.js'];
const STARTUP_DELAY = 3000; // 服务器启动等待时间（毫秒）

/**
 * 🔄 执行PowerShell命令
 */
function runPowerShell(command) {
    return new Promise((resolve, reject) => {
        exec(`powershell -Command "${command}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

/**
 * 🔪 安全关闭指定端口的进程
 */
async function killPortProcess(port) {
    console.log(`🔍 检查端口 ${port} 占用情况...`);
    
    try {
        const result = await runPowerShell(`Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object OwningProcess | ForEach-Object { $_.OwningProcess }`);
        
        if (result.trim()) {
            const processIds = result.trim().split('\n').filter(id => id.trim());
            console.log(`📋 发现占用端口 ${port} 的进程: ${processIds.join(', ')}`);
            
            for (const pid of processIds) {
                await runPowerShell(`Stop-Process -Id ${pid.trim()} -Force`);
                console.log(`🔫 已终止进程 PID: ${pid.trim()}`);
            }
            
            // 等待进程完全终止
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            console.log(`✅ 端口 ${port} 未被占用`);
        }
    } catch (error) {
        console.log(`⚠️  无法检查端口 ${port}，可能未被占用或权限不足`);
    }
}

/**
 * 🚀 启动服务器
 */
function startServer() {
    return new Promise((resolve, reject) => {
        console.log(`🚀 启动服务器: ${SERVER_SCRIPT}`);
        
        const serverProcess = spawn('node', [SERVER_SCRIPT], {
            cwd: __dirname,
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false
        });
        
        let serverOutput = '';
        let serverError = '';
        
        serverProcess.stdout.on('data', (data) => {
            serverOutput += data.toString();
            console.log(`📝 服务器输出: ${data.toString().trim()}`);
        });
        
        serverProcess.stderr.on('data', (data) => {
            serverError += data.toString();
            console.log(`⚠️  服务器错误: ${data.toString().trim()}`);
        });
        
        serverProcess.on('error', (error) => {
            console.error(`❌ 服务器启动失败: ${error.message}`);
            reject(error);
        });
        
        serverProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`❌ 服务器异常退出，代码: ${code}`);
                reject(new Error(`服务器退出代码: ${code}`));
            }
        });
        
        // 等待服务器启动
        setTimeout(() => {
            if (serverOutput.includes('SQE数据分析助手服务器运行')) {
                console.log(`✅ 服务器启动成功，端口: ${PORT}`);
                resolve(serverProcess);
            } else {
                reject(new Error('服务器启动超时或失败'));
            }
        }, STARTUP_DELAY);
    });
}

/**
 * 🧪 运行测试脚本
 */
function runTestScript(scriptName) {
    return new Promise((resolve, reject) => {
        console.log(`\n🧪 运行测试脚本: ${scriptName}`);
        
        const testProcess = spawn('node', [scriptName], {
            cwd: __dirname,
            stdio: 'inherit'
        });
        
        testProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${scriptName} 测试通过`);
                resolve();
            } else {
                console.log(`❌ ${scriptName} 测试失败，退出代码: ${code}`);
                reject(new Error(`${scriptName} 测试失败`));
            }
        });
        
        testProcess.on('error', (error) => {
            console.error(`❌ 运行 ${scriptName} 失败: ${error.message}`);
            reject(error);
        });
    });
}

/**
 * 🏁 主执行函数
 */
async function main() {
    console.log('🤖 开始自动化测试流程\n');
    
    let serverProcess = null;
    
    try {
        // 步骤1：关闭占用端口的进程
        await killPortProcess(PORT);
        
        // 步骤2：启动服务器
        serverProcess = await startServer();
        
        // 步骤3：运行所有测试脚本
        for (const script of TEST_SCRIPTS) {
            await runTestScript(script);
        }
        
        console.log('\n🎉 所有测试完成！系统运行正常。');
        
    } catch (error) {
        console.error(`\n❌ 自动化测试失败: ${error.message}`);
        process.exit(1);
    } finally {
        // 步骤4：清理服务器进程
        if (serverProcess) {
            console.log('\n🧹 清理服务器进程...');
            try {
                serverProcess.kill();
                await killPortProcess(PORT);
            } catch (error) {
                console.log(`⚠️  清理进程时出错: ${error.message}`);
            }
        }
    }
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\n👋 收到中断信号，正在清理...');
    killPortProcess(PORT).then(() => {
        process.exit(0);
    });
});

// 启动自动化测试
main();