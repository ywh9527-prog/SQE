const { Sequelize } = require('sequelize');
const path = require('path');
const logger = require('../utils/logger');

// 确定数据库文件路径
// 在开发环境中，存储在项目根目录
// 在生产环境(Electron)中，可能需要存储在用户数据目录
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../sqe_database.sqlite');

// 初始化 Sequelize 实例
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: (msg) => logger.debug(msg), // 使用自定义 logger 记录 SQL 查询
    define: {
        timestamps: true, // 自动管理 createdAt 和 updatedAt
        underscored: true, // 使用下划线命名法 (created_at 而非 createdAt)
    }
});

// 测试连接函数
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        logger.info('数据库连接成功 (SQLite)');
        logger.info(`数据库路径: ${dbPath}`);

        // 同步模型 (仅在开发阶段使用 alter: true，生产环境建议使用迁移脚本)
        // await sequelize.sync({ alter: true });
        // logger.info('数据库模型同步完成');

    } catch (error) {
        logger.error('无法连接到数据库:', error);
        process.exit(1); // 连接失败则退出进程
    }
};

module.exports = {
    sequelize,
    connectDB
};
