/**
 * 清理测试数据脚本 - Phase 6 开始
 * 
 * 功能:
 * 1. 删除所有测试供应商和相关数据
 * 2. 清理上传的测试文件
 * 3. 重置数据库自增ID
 * 4. 为正式数据导入做准备
 * 
 * 执行方式: node server/migrations/cleanup-test-data.js
 */

const { sequelize } = require('../database/config');
const fs = require('fs');
const path = require('path');

async function cleanupTestData() {
    console.log('🧹 开始清理测试数据...');
    
    try {
        // 开始事务
        const transaction = await sequelize.transaction();
        
        let deletedDocs, deletedComponents, deletedMaterials, deletedSuppliers;
        
        try {
            console.log('📋 步骤 1: 查询要删除的数据');
            
            // 查询所有文档记录，用于后续删除文件
            const [documents] = await sequelize.query(
                'SELECT file_path FROM supplier_documents WHERE file_path IS NOT NULL',
                { transaction }
            );
            console.log(`📄 找到 ${documents.length} 个文档文件需要删除`);
            
            // 删除所有文档记录
            console.log('🗑️ 步骤 2: 删除文档记录');
            deletedDocs = await sequelize.query(
                'DELETE FROM supplier_documents',
                { transaction }
            );
            console.log(`✅ 删除了 ${deletedDocs[1]?.changes || 0} 个文档记录`);
            
            // 删除所有构成记录
            console.log('🗑️ 步骤 3: 删除构成记录');
            deletedComponents = await sequelize.query(
                'DELETE FROM material_components',
                { transaction }
            );
            console.log(`✅ 删除了 ${deletedComponents[1]?.changes || 0} 个构成记录`);
            
            // 删除所有物料记录
            console.log('🗑️ 步骤 4: 删除物料记录');
            deletedMaterials = await sequelize.query(
                'DELETE FROM materials',
                { transaction }
            );
            console.log(`✅ 删除了 ${deletedMaterials[1]?.changes || 0} 个物料记录`);
            
            // 删除所有供应商记录
            console.log('🗑️ 步骤 5: 删除供应商记录');
            deletedSuppliers = await sequelize.query(
                'DELETE FROM suppliers',
                { transaction }
            );
            console.log(`✅ 删除了 ${deletedSuppliers[1]?.changes || 0} 个供应商记录`);
            
            // 提交事务
            await transaction.commit();
            console.log('✅ 数据库清理完成');
            
        } catch (error) {
            // 回滚事务
            await transaction.rollback();
            throw error;
        }
        
        console.log('🗑️ 步骤 6: 删除上传的测试文件');
        
        let deletedFiles = 0;
        
        // 删除uploads目录下的所有文件
        const uploadsDir = path.join(__dirname, '../../uploads');
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            
            for (const file of files) {
                const filePath = path.join(uploadsDir, file);
                const stat = fs.statSync(filePath);
                
                if (stat.isFile()) {
                    try {
                        fs.unlinkSync(filePath);
                        deletedFiles++;
                    } catch (error) {
                        console.warn(`⚠️ 无法删除文件 ${file}:`, error.message);
                    }
                } else if (stat.isDirectory()) {
                    // 递归删除子目录
                    try {
                        deleteDirectory(filePath);
                        deletedFiles++;
                    } catch (error) {
                        console.warn(`⚠️ 无法删除目录 ${file}:`, error.message);
                    }
                }
            }
            
            console.log(`✅ 删除了 ${deletedFiles} 个上传文件`);
        }
        
        console.log('🔄 步骤 7: 重置数据库自增ID');
        
        // 重置自增ID
        await sequelize.query('DELETE FROM sqlite_sequence WHERE name IN ("suppliers", "materials", "material_components", "supplier_documents")');
        console.log('✅ 数据库自增ID已重置');
        
        console.log('\n🎉 测试数据清理完成！');
        console.log('📊 清理统计:');
        console.log(`   - 供应商记录: ${deletedSuppliers ? deletedSuppliers[1]?.changes || 0 : 0} 个`);
        console.log(`   - 物料记录: ${deletedMaterials ? deletedMaterials[1]?.changes || 0 : 0} 个`);
        console.log(`   - 构成记录: ${deletedComponents ? deletedComponents[1]?.changes || 0 : 0} 个`);
        console.log(`   - 文档记录: ${deletedDocs ? deletedDocs[1]?.changes || 0 : 0} 个`);
        console.log(`   - 上传文件: ${deletedFiles} 个`);
        console.log('\n✨ 系统已准备好导入正式供应商数据');
        
    } catch (error) {
        console.error('❌ 清理失败:', error);
        process.exit(1);
    }
}

/**
 * 递归删除目录
 */
function deleteDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory()) {
                deleteDirectory(filePath);
            } else {
                fs.unlinkSync(filePath);
            }
        }
        
        fs.rmdirSync(dirPath);
    }
}

// 执行清理
if (require.main === module) {
    cleanupTestData().then(() => {
        console.log('🏁 清理脚本执行完成');
        process.exit(0);
    }).catch(error => {
        console.error('💥 清理脚本执行失败:', error);
        process.exit(1);
    });
}

module.exports = { cleanupTestData };