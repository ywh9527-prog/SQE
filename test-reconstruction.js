/**
 * Phase 2.1 重构验证脚本
 * 测试 formatDate() 方法重构是否成功
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 开始 Phase 2.1 formatDate() 重构验证...\n');

// 1. 检查服务层文件是否存在
const servicesPath = path.join(__dirname, 'public/js/modules/supplier/services/supplier-services.js');
if (fs.existsSync(servicesPath)) {
    console.log('✅ 服务层文件存在: supplier-services.js');

    // 读取服务层文件内容
    const servicesContent = fs.readFileSync(servicesPath, 'utf8');

    // 检查是否包含 formatDate 方法
    if (servicesContent.includes('formatDate(dateString)')) {
        console.log('✅ 服务层包含 formatDate() 方法');
    } else {
        console.log('❌ 服务层缺少 formatDate() 方法');
    }

    // 检查是否创建了全局实例
    if (servicesContent.includes('window.supplierServices = new SupplierServices()')) {
        console.log('✅ 服务层已创建全局实例 window.supplierServices');
    } else {
        console.log('❌ 服务层未创建全局实例');
    }
} else {
    console.log('❌ 服务层文件不存在');
}

// 2. 检查主文件是否已重构
const mainPath = path.join(__dirname, 'public/js/modules/supplier.js');
if (fs.existsSync(mainPath)) {
    console.log('\n✅ 主文件存在: supplier.js');

    // 读取主文件内容
    const mainContent = fs.readFileSync(mainPath, 'utf8');

    // 检查是否包含重构注释
    if (mainContent.includes('Phase 2.1: 重构到服务层')) {
        console.log('✅ 主文件包含重构注释');
    } else {
        console.log('❌ 主文件缺少重构注释');
    }

    // 检查是否调用服务层方法
    if (mainContent.includes('return window.supplierServices.formatDate(dateString)')) {
        console.log('✅ 主文件正确调用服务层方法');
    } else {
        console.log('❌ 主文件未正确调用服务层方法');
    }

    // 检查是否还包含原始实现
    if (!mainContent.includes('const date = new Date(dateString)')) {
        console.log('✅ 主文件已移除原始实现');
    } else {
        console.log('⚠️ 主文件仍包含原始实现（可能需要清理）');
    }
} else {
    console.log('❌ 主文件不存在');
}

// 3. 检查 HTML 文件是否已更新
const htmlPath = path.join(__dirname, 'public/index.html');
if (fs.existsSync(htmlPath)) {
    console.log('\n✅ HTML 文件存在: index.html');

    const htmlContent = fs.readFileSync(htmlPath, 'utf8');

    // 检查是否包含服务层脚本
    if (htmlContent.includes('supplier-services.js?v=3.2.1')) {
        console.log('✅ HTML 文件已包含服务层脚本引用');
    } else {
        console.log('❌ HTML 文件缺少服务层脚本引用');
    }

    // 检查脚本加载顺序
    const servicesIndex = htmlContent.indexOf('supplier-services.js');
    const mainIndex = htmlContent.indexOf('supplier.js');

    if (servicesIndex > 0 && mainIndex > servicesIndex) {
        console.log('✅ 脚本加载顺序正确（服务层 → 主文件）');
    } else {
        console.log('❌ 脚本加载顺序不正确');
    }
} else {
    console.log('❌ HTML 文件不存在');
}

// 4. 检查 getStatusIcon() 重构
console.log('\n🔍 检查 getStatusIcon() 重构...');

// 重新读取文件内容进行验证
const servicesUpdated = fs.readFileSync(servicesPath, 'utf8');
const mainUpdated = fs.readFileSync(mainPath, 'utf8');

if (servicesUpdated.includes('getStatusIcon(status)')) {
    console.log('✅ 服务层包含 getStatusIcon() 方法');
} else {
    console.log('❌ 服务层缺少 getStatusIcon() 方法');
}

if (mainUpdated.includes('return window.supplierServices.getStatusIcon(status)')) {
    console.log('✅ 主文件正确调用服务层 getStatusIcon() 方法');
} else {
    console.log('❌ 主文件未正确调用服务层 getStatusIcon() 方法');
}

// 检查是否还包含原始实现
if (!mainUpdated.includes("normal: '🟢'")) {
    console.log('✅ 主文件已移除 getStatusIcon() 原始实现');
} else {
    console.log('⚠️ 主文件仍包含 getStatusIcon() 原始实现');
}

console.log('\n🎉 Phase 2.1 formatDate() 和 getStatusIcon() 重构验证完成！');
console.log('📋 请手动在浏览器中测试功能以确保一切正常。');