const { sequelize } = require('../database/config.js');
const logger = require('../utils/logger');

/**
 * 数据库迁移：为 performance_evaluation_details 表添加 data_type 字段
 */
async function up() {
    try {
        await sequelize.authenticate();
        logger.info('开始迁移：添加 data_type 字段到 performance_evaluation_details 表');

        // 检查字段是否已存在
        const [columns] = await sequelize.query("PRAGMA table_info(performance_evaluation_details)");
        const hasDataType = columns.some(col => col.name === 'data_type');

        if (hasDataType) {
            logger.info('data_type 字段已存在，跳过迁移');
            return;
        }

        // 添加 data_type 字段
        await sequelize.query(`
            ALTER TABLE performance_evaluation_details
            ADD COLUMN data_type VARCHAR(20) DEFAULT 'purchase'
        `);

        logger.info('✓ data_type 字段添加成功');

        // 为现有的评价详情填充 data_type（根据供应商配置中心的设置）
        const updateResult = await sequelize.query(`
            UPDATE performance_evaluation_details
            SET data_type = 'purchase'
            WHERE data_type IS NULL OR data_type = ''
        `);

        logger.info(`✓ 更新了 ${updateResult[0]?.changes || 0} 条记录的 data_type`);

        // 验证迁移结果
        const [updatedRows] = await sequelize.query(`
            SELECT id, evaluation_entity_name, data_type
            FROM performance_evaluation_details
            LIMIT 5
        `);

        logger.info('迁移后的数据示例:');
        updatedRows.forEach(row => {
            logger.info(`  ID: ${row.id}, 实体: ${row.evaluation_entity_name}, 类型: ${row.data_type}`);
        });

        logger.info('✓ 迁移完成');

    } catch (error) {
        logger.error('✗ 迁移失败:', error);
        throw error;
    }
}

/**
 * 回滚迁移
 */
async function down() {
    try {
        await sequelize.authenticate();
        logger.info('开始回滚：移除 data_type 字段');

        // SQLite 不支持直接删除列，需要重建表
        await sequelize.query(`
            CREATE TABLE performance_evaluation_details_backup AS
            SELECT id, evaluation_id, evaluation_entity_name, scores, total_score, grade, remarks, quality_data_snapshot, created_at, updated_at
            FROM performance_evaluation_details
        `);

        await sequelize.query('DROP TABLE performance_evaluation_details');

        await sequelize.query(`
            CREATE TABLE performance_evaluation_details (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                evaluation_id INTEGER NOT NULL,
                evaluation_entity_name VARCHAR(255) NOT NULL,
                scores TEXT NOT NULL,
                total_score DECIMAL(10, 2),
                grade VARCHAR(50),
                remarks TEXT,
                quality_data_snapshot TEXT,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (evaluation_id) REFERENCES performance_evaluations (id) ON DELETE CASCADE
            )
        `);

        await sequelize.query(`
            INSERT INTO performance_evaluation_details
            (id, evaluation_id, evaluation_entity_name, scores, total_score, grade, remarks, quality_data_snapshot, created_at, updated_at)
            SELECT id, evaluation_id, evaluation_entity_name, scores, total_score, grade, remarks, quality_data_snapshot, created_at, updated_at
            FROM performance_evaluation_details_backup
        `);

        await sequelize.query('DROP TABLE performance_evaluation_details_backup');

        logger.info('✓ 回滚完成');

    } catch (error) {
        logger.error('✗ 回滚失败:', error);
        throw error;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const operation = process.argv[2];

    (async () => {
        try {
            if (operation === 'down') {
                await down();
                console.log('回滚成功');
            } else {
                await up();
                console.log('迁移成功');
            }
            await sequelize.close();
        } catch (error) {
            console.error('操作失败:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = { up, down };