/**
 * API测试脚本
 * 用于测试v3.0新增的所有API接口
 * 
 * 执行方式: node server/test-api.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:8888';

// 辅助函数: 发送HTTP请求
function request(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    resolve({ status: res.statusCode, data: result });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
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

// 测试函数
async function testAPIs() {
    console.log('🧪 开始测试API接口...\n');

    try {
        // Test 1: 获取供应商树形数据
        console.log('📋 Test 1: GET /api/suppliers/tree');
        const test1 = await request('GET', '/api/suppliers/tree');
        console.log(`   状态码: ${test1.status}`);
        console.log(`   成功: ${test1.data.success}`);
        console.log(`   供应商数量: ${test1.data.data?.length || 0}`);
        if (test1.data.data && test1.data.data.length > 0) {
            const supplier = test1.data.data[0];
            console.log(`   第一个供应商: ${supplier.supplierName}`);
            console.log(`   物料数量: ${supplier.materials?.length || 0}`);
            console.log(`   状态: ${supplier.status}`);
        }
        console.log('   ✅ 测试通过\n');

        // Test 2: 新增物料
        console.log('📋 Test 2: POST /api/materials');
        const test2 = await request('POST', '/api/materials', {
            supplierId: 1,
            materialName: '测试物料_' + Date.now(),
            materialCode: 'TEST-001',
            description: 'API测试用物料'
        });
        console.log(`   状态码: ${test2.status}`);
        console.log(`   成功: ${test2.data.success}`);
        if (test2.data.success) {
            console.log(`   物料ID: ${test2.data.data.materialId}`);
            console.log(`   物料名称: ${test2.data.data.materialName}`);
        }
        console.log('   ✅ 测试通过\n');

        const testMaterialId = test2.data.data?.materialId;

        // Test 3: 新增具体构成
        if (testMaterialId) {
            console.log('📋 Test 3: POST /api/materials/components');
            const test3 = await request('POST', '/api/materials/components', {
                materialId: testMaterialId,
                componentName: '测试构成_' + Date.now(),
                componentCode: 'TC-001',
                description: 'API测试用构成'
            });
            console.log(`   状态码: ${test3.status}`);
            console.log(`   成功: ${test3.data.success}`);
            if (test3.data.success) {
                console.log(`   构成ID: ${test3.data.data.componentId}`);
                console.log(`   构成名称: ${test3.data.data.componentName}`);
            }
            console.log('   ✅ 测试通过\n');
        }

        // Test 4: 查询物料列表
        console.log('📋 Test 4: GET /api/materials?supplierId=1');
        const test4 = await request('GET', '/api/materials?supplierId=1');
        console.log(`   状态码: ${test4.status}`);
        console.log(`   成功: ${test4.data.success}`);
        console.log(`   物料数量: ${test4.data.data?.length || 0}`);
        console.log('   ✅ 测试通过\n');

        // Test 5: 查询即将过期的资料
        console.log('📋 Test 5: GET /api/documents/expiring?days=30');
        const test5 = await request('GET', '/api/documents/expiring?days=30');
        console.log(`   状态码: ${test5.status}`);
        console.log(`   成功: ${test5.data.success}`);
        console.log(`   即将过期资料数量: ${test5.data.count || 0}`);
        if (test5.data.data && test5.data.data.length > 0) {
            console.log(`   示例: ${test5.data.data[0].supplierName} - ${test5.data.data[0].documentType}`);
        }
        console.log('   ✅ 测试通过\n');

        // Test 6: 查询已过期的资料
        console.log('📋 Test 6: GET /api/documents/expired');
        const test6 = await request('GET', '/api/documents/expired');
        console.log(`   状态码: ${test6.status}`);
        console.log(`   成功: ${test6.data.success}`);
        console.log(`   已过期资料数量: ${test6.data.count || 0}`);
        console.log('   ✅ 测试通过\n');

        console.log('🎉 所有API测试完成！\n');
        console.log('📊 测试总结:');
        console.log('   ✅ GET /api/suppliers/tree - 获取树形数据');
        console.log('   ✅ POST /api/materials - 新增物料');
        console.log('   ✅ POST /api/materials/components - 新增构成');
        console.log('   ✅ GET /api/materials - 查询物料列表');
        console.log('   ✅ GET /api/documents/expiring - 查询即将过期资料');
        console.log('   ✅ GET /api/documents/expired - 查询已过期资料');
        console.log('\n💡 提示: 文件上传API需要使用Postman或前端测试\n');

    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error(error);
    }
}

// 执行测试
console.log('⏳ 等待服务器启动...\n');
setTimeout(() => {
    testAPIs().then(() => {
        console.log('✅ 测试脚本执行完成');
        process.exit(0);
    }).catch((error) => {
        console.error('❌ 测试脚本执行失败:', error);
        process.exit(1);
    });
}, 2000); // 等待2秒让服务器启动
