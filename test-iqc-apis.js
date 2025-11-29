/**
 * 🧪 IQC核心API测试脚本
 * 🎯 功能：验证现有IQC功能不受影响
 * ⚡ 用法：node test-iqc-apis.js
 */

const http = require('http');

// 测试配置
const BASE_URL = 'http://localhost:8888';
const API_BASE = '/api';

// 测试结果统计
let testResults = {
    passed: 0,
    failed: 0,
    total: 0
};

// 辅助函数：发送HTTP请求
function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8888,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const result = {
                        statusCode: res.statusCode,
                        data: body ? JSON.parse(body) : null
                    };
                    resolve(result);
                } catch (error) {
                    // 如果JSON解析失败，返回原始文本
                    resolve({
                        statusCode: res.statusCode,
                        data: body
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

// 测试用例执行器
async function runTest(testName, testFunction) {
    testResults.total++;
    console.log(`\n🧪 运行测试: ${testName}`);
    
    try {
        await testFunction();
        testResults.passed++;
        console.log(`✅ ${testName} - 通过`);
    } catch (error) {
        testResults.failed++;
        console.log(`❌ ${testName} - 失败: ${error.message}`);
    }
}

// 测试1：数据源统计接口
async function testDataSourceStats() {
    const response = await makeRequest(`${API_BASE}/data-source-stats`);
    
    if (response.statusCode !== 200) {
        throw new Error(`状态码错误: 期望200，实际${response.statusCode}`);
    }
    
    if (!response.data || typeof response.data !== 'object') {
        throw new Error('响应数据格式错误');
    }
    
    console.log(`   📊 数据源统计: 外购=${response.data.purchase ? '有' : '无'}, 外协=${response.data.external ? '有' : '无'}`);
}

// 测试2：筛选数据接口（无文件ID）
async function testFilterDataNoFile() {
    const response = await makeRequest(`${API_BASE}/filter-data`, 'POST', {});
    
    // 期望返回400错误（缺少fileId）
    if (response.statusCode !== 400) {
        throw new Error(`状态码错误: 期望400，实际${response.statusCode}`);
    }
    
    console.log(`   ⚠️  正确返回400错误（缺少fileId）`);
}

// 测试3：获取月度详情接口（无文件ID）
async function testGetMonthDetailsNoFile() {
    const response = await makeRequest(`${API_BASE}/get-month-details`, 'POST', {});
    
    // 期望返回400错误（缺少fileId）
    if (response.statusCode !== 400) {
        throw new Error(`状态码错误: 期望400，实际${response.statusCode}`);
    }
    
    console.log(`   ⚠️  正确返回400错误（缺少fileId）`);
}

// 测试4：服务器根路径
async function testRootPath() {
    const response = await makeRequest('/');
    
    // 期望返回HTML页面（状态码200）
    if (response.statusCode !== 200) {
        throw new Error(`状态码错误: 期望200，实际${response.statusCode}`);
    }
    
    if (!response.data || typeof response.data !== 'string') {
        throw new Error('根路径应该返回HTML页面');
    }
    
    console.log(`   🏠 根路径正常，返回HTML页面`);
}

// 测试5：无效API路径
async function testInvalidAPI() {
    const response = await makeRequest(`${API_BASE}/invalid-endpoint`);
    
    // 期望返回404错误
    if (response.statusCode !== 404) {
        throw new Error(`状态码错误: 期望404，实际${response.statusCode}`);
    }
    
    console.log(`   🔍 正确返回404错误（无效API路径）`);
}

// 主测试函数
async function runAllTests() {
    console.log('🚀 开始IQC核心API测试\n');
    console.log('📡 测试目标: http://localhost:8888');
    
    // 等待服务器启动
    console.log('⏳ 等待服务器响应...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 运行测试用例
    await runTest('数据源统计接口', testDataSourceStats);
    await runTest('筛选数据接口（无文件ID）', testFilterDataNoFile);
    await runTest('获取月度详情接口（无文件ID）', testGetMonthDetailsNoFile);
    await runTest('服务器根路径', testRootPath);
    await runTest('无效API路径', testInvalidAPI);
    
    // 输出测试结果
    console.log('\n📊 测试结果汇总:');
    console.log(`   总计: ${testResults.total}`);
    console.log(`   通过: ${testResults.passed}`);
    console.log(`   失败: ${testResults.failed}`);
    console.log(`   成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failed === 0) {
        console.log('\n🎉 所有测试通过！IQC核心功能正常。');
        process.exit(0);
    } else {
        console.log('\n⚠️  部分测试失败，请检查服务器状态。');
        process.exit(1);
    }
}

// 错误处理
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的Promise拒绝:', reason);
    process.exit(1);
});

// 启动测试
runAllTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
});