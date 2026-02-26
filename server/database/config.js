const { Sequelize, Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// 确定数据库文件路径
// 优先使用 Electron 用户数据目录（打包环境）
// 否则使用项目目录（开发环境）
let dbPath;
let uploadsPath;

if (process.env.USER_DATA_PATH) {
    // Electron 打包环境
    const userDataDir = process.env.USER_DATA_PATH;
    dbPath = path.join(userDataDir, 'database', 'sqe_database.sqlite');
    uploadsPath = path.join(userDataDir, 'uploads');
    
    // 确保目录存在
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(uploadsPath)) {
        fs.mkdirSync(uploadsPath, { recursive: true });
    }
    
    logger.info(`使用用户数据目录: ${userDataDir}`);
} else if (process.env.DB_PATH) {
    // 自定义数据库路径
    dbPath = process.env.DB_PATH;
    uploadsPath = path.join(path.dirname(dbPath), '..', 'uploads');
} else {
    // 开发环境：使用项目目录
    dbPath = path.join(__dirname, '../data/sqe_database.sqlite');
    uploadsPath = path.join(__dirname, '../../uploads');
}

// 导出上传路径供其他模块使用
global.UPLOADS_PATH = uploadsPath;

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

// 延迟导入模型以避免循环依赖
let models = {};
const loadModels = () => {
    if (Object.keys(models).length === 0) {
        // 加载所有模型
        models.User = require('../models/User');
        models.Supplier = require('../models/Supplier');
        models.Material = require('../models/Material');
        models.MaterialComponent = require('../models/MaterialComponent');
        models.SupplierDocument = require('../models/SupplierDocument');
        models.IQCData = require('../models/IQCData');
        models.EmailNotification = require('../models/EmailNotification');
        models.SystemLog = require('../models/SystemLog');
        models.Certificate = require('../models/Certificate');
        models.VendorConfig = require('../models/VendorConfig');
        models.PerformanceEvaluation = require('../models/PerformanceEvaluation');
        models.PerformanceEvaluationDetail = require('../models/PerformanceEvaluationDetail');

        // 建立模型关联
        Object.values(models).forEach(model => {
            if (typeof model.associate === 'function') {
                model.associate(models);
            }
        });
    }
    return models;
};

// 测试连接函数
const connectDB = async () => {
    try {
        await sequelize.authenticate();
        logger.info('数据库连接成功 (SQLite)');
        logger.info(`数据库路径: ${dbPath}`);
        
        // 在控制台也输出数据库路径
        console.log(`🗄️ 数据库连接成功，使用路径: ${dbPath}`);

        // 加载模型并同步
        loadModels();
        await sequelize.sync();
        logger.info('数据库模型已同步');

    } catch (error) {
        logger.error('无法连接到数据库:', error);
        process.exit(1); // 连接失败则退出进程
    }
};

module.exports = {
    sequelize,
    Op,
    connectDB,
    getModels: loadModels,
    getUploadsPath: () => uploadsPath
};