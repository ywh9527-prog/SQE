/**
 * 🧪 供应商搜索API测试脚本
 * 🎯 功能：验证新创建的供应商搜索接口
 * ⚡ 用法：node test-supplier-search.js
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
                    reject(error);
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

// 测试1：获取最新数据信息
async function testLatestDataInfo() {
    const response = await makeRequest(`${API_BASE}/latest-supplier-data-info`);
    
    if (response.statusCode !== 200) {
        throw new Error(`状态码错误: 期望200，实际${response.statusCode}`);
    }
    
    if (!response.data || typeof response.data !== 'object') {
        throw new Error('响应数据格式错误');
    }
    
    console.log(`   📊 数据状态: 外购=${response.data.purchase ? '有' : '无'}, 外协=${response.data.external ? '有' : '无'}`);
}

// 测试2：获取供应商建议
async function testSupplierSuggestions() {
    const response = await makeRequest(`${API_BASE}/suppliers/suggestions`);
    
    if (response.statusCode !== 200) {
        throw new Error(`状态码错误: 期望200，实际${response.statusCode}`);
    }
    
    if (!response.data || !Array.isArray(response.data.suppliers)) {
        throw new Error('供应商列表格式错误');
    }
    
    console.log(`   📝 找到${response.data.suppliers.length}个供应商`);
}

// 测试3：搜索供应商（无数据时的处理）
async function testSupplierSearchNoData() {
    const response = await makeRequest(`${API_BASE}/search-supplier-latest`, 'POST', {
        supplierName: '测试供应商'
    });
    
    // 可能是404（无数据）或200（有数据），都是正常的
    if (response.statusCode === 404) {
        console.log(`   ⚠️  数据库中暂无数据（正常情况）`);
    } else if (response.statusCode === 200) {
        if (!response.data || typeof response.data !== 'object') {
            throw new Error('搜索响应数据格式错误');
        }
        console.log(`   🎯 搜索成功，返回数据`);
    } else {
        throw new Error(`状态码错误: 期望200或404，实际${response.statusCode}`);
    }
}

// 测试4：搜索供应商（按数据类型）
async function testSupplierSearchByType() {
    const response = await makeRequest(`${API_BASE}/search-supplier-latest`, 'POST', {
        supplierName: '',
        dataType: 'purchase'
    });
    
    // 可能是404（无数据）或200（有数据），都是正常的
    if (response.statusCode === 404) {
        console.log(`   ⚠️  外购数据暂无（正常情况）`);
    } else if (response.statusCode === 200) {
        if (!response.data || typeof response.data !== 'object') {
            throw new Error('按类型搜索响应数据格式错误');
        }
        console.log(`   🎯 按类型搜索成功，数据类型=${response.data.dataType}`);
    } else {
        throw new Error(`状态码错误: 期望200或404，实际${response.statusCode}`);
    }
}

// 主测试函数
async function runAllTests() {
    console.log('🚀 开始供应商搜索API测试\n');
    console.log('📡 测试目标: http://localhost:8888');
    
    // 等待服务器启动
    console.log('⏳ 等待服务器响应...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 运行测试用例
    await runTest('获取最新数据信息', testLatestDataInfo);
    await runTest('获取供应商建议', testSupplierSuggestions);
    await runTest('搜索供应商（无数据处理）', testSupplierSearchNoData);
    await runTest('搜索供应商（按数据类型）', testSupplierSearchByType);
    
    // 输出测试结果
    console.log('\n📊 测试结果汇总:');
    console.log(`   总计: ${testResults.total}`);
    console.log(`   通过: ${testResults.passed}`);
    console.log(`   失败: ${testResults.failed}`);
    console.log(`   成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failed === 0) {
        console.log('\n🎉 所有测试通过！供应商搜索API工作正常。');
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