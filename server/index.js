const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const { sequelize, connectDB } = require('./database/config');

const app = express();
const PORT = process.env.PORT || 8888;

// 解析 JSON 和 URL-encoded 请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 设置静态文件目录（禁用缓存，用于开发环境）
app.use(express.static(path.join(__dirname, '..', 'public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

// 路由加载
console.log('📦 开始加载路由模块...');

// 旧路由 (保留兼容性)
const uploadRoutes = require('./routes/upload');
console.log('✅ uploadRoutes 加载完成');
const supplierRoutes = require('./routes/supplier');
console.log('✅ supplierRoutes 加载完成');
const suppliersRoutes = require('./routes/suppliers');
console.log('✅ suppliersRoutes 加载完成');
const comparisonRoutes = require('./routes/comparison');
console.log('✅ comparisonRoutes 加载完成');
const dataSourceRoutes = require('./routes/data-source');
console.log('✅ dataSourceRoutes 加载完成');
const supplierSearchRoutes = require('./routes/supplier-search');
console.log('✅ supplierSearchRoutes 加载完成');
const documentRoutes = require('./routes/documents');
console.log('✅ documentRoutes 加载完成');

// v3.0 新增路由
const suppliersTreeRoutes = require('./routes/suppliers-tree');
console.log('✅ suppliersTreeRoutes 加载完成');
const materialsRoutes = require('./routes/materials');
console.log('✅ materialsRoutes 加载完成');
const documentsUploadRoutes = require('./routes/documents-upload');
console.log('✅ documentsUploadRoutes 加载完成');
const suppliersSummaryRoutes = require('./routes/suppliers-summary');
console.log('✅ suppliersSummaryRoutes 加载完成');
const suppliersSyncRoutes = require('./routes/suppliers-sync');
console.log('✅ suppliersSyncRoutes 加载完成');

// 供应商配置中心路由
const vendorsRoutes = require('./routes/vendors');
console.log('✅ vendorsRoutes 加载完成');

// 文档类型设置功能路由
const documentTypesRoutes = require('./routes/document-types');
console.log('✅ documentTypesRoutes 加载完成');

// 系统功能路由
const systemRoutes = require('./routes/system');
console.log('✅ systemRoutes 加载完成');

// 供应商绩效评价路由
const evaluationsRoutes = require('./routes/evaluations');
console.log('✅ evaluationsRoutes 加载完成');
const evaluationConfigRoutes = require('./routes/evaluation-config');
console.log('✅ evaluationConfigRoutes 加载完成');

// 工作台路由
const dashboardRoutes = require('./routes/dashboard');
console.log('✅ dashboardRoutes 加载完成');

// 路由注册
console.log('🔧 开始注册API路由...');

// 旧路由注册
app.use('/api', uploadRoutes);
console.log('✅ /api/* 路由已注册 (upload)');
app.use('/api', supplierRoutes);
console.log('✅ /api/* 路由已注册 (supplier)');


app.use('/api', comparisonRoutes);
console.log('✅ /api/* 路由已注册 (comparison)');
app.use('/api', dataSourceRoutes);
console.log('✅ /api/* 路由已注册 (data-source)');
app.use('/api', supplierSearchRoutes);
console.log('✅ /api/* 路由已注册 (supplier-search)');
app.use('/api/documents', documentsUploadRoutes);
console.log('✅ /api/documents/upload 路由已注册 (documents-upload)');

// v3.0 新路由注册 (必须在 suppliersRoutes 之前，避免 /tree 被当作 /:id)
app.use('/api/suppliers', suppliersTreeRoutes);
console.log('✅ /api/suppliers/tree 路由已注册 (suppliers-tree)');
app.use('/api/suppliers', suppliersSummaryRoutes);
console.log('✅ /api/suppliers/summary 路由已注册 (suppliers-summary)');
app.use('/api/suppliers', suppliersSyncRoutes);
console.log('✅ /api/suppliers/sync-from-iqc 路由已注册 (suppliers-sync)');

// 供应商配置中心路由
app.use('/api/vendors', vendorsRoutes);
console.log('✅ /api/vendors/* 路由已注册 (vendors)');

// 旧的 suppliers 路由 (包含 /:id 参数路由，必须放在后面)
app.use('/api/suppliers', suppliersRoutes);
console.log('✅ /api/suppliers/* 路由已注册 (suppliers，包含 /:id)');

app.use('/api/materials', materialsRoutes);
console.log('✅ /api/materials/* 路由已注册 (materials)');
app.use('/api/documents', documentRoutes);
console.log('✅ /api/documents/* 路由已注册 (documents)');

// 文档类型设置功能路由
app.use('/api/document-types', documentTypesRoutes);
console.log('✅ /api/document-types/* 路由已注册 (document-types)');

// 系统功能路由
app.use('/api/system', systemRoutes);
console.log('✅ /api/system/* 路由已注册 (system)');

// 供应商绩效评价路由
app.use('/api/evaluation-config', evaluationConfigRoutes);
console.log('✅ /api/evaluation-config/* 路由已注册 (evaluation-config)');
app.use('/api/evaluations', evaluationsRoutes);
console.log('✅ /api/evaluations/* 路由已注册 (evaluations)');

// 工作台路由
app.use('/api/dashboard', dashboardRoutes);
console.log('✅ /api/dashboard/* 路由已注册 (dashboard)');

console.log('🎉 所有API路由注册完成');

// 添加路由调试中间件
app.use((req, res, next) => {
  console.log(`🌐 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 直接定义认证路由
app.post('/api/auth/init', async (req, res) => {
  try {
    const AuthService = require('./services/authService');
    const user = await AuthService.createDefaultUser();

    res.json({
      success: true,
      message: '默认用户创建成功',
      user: {
        username: user.username,
        fullName: user.fullName,
        email: user.email
      }
    });

  } catch (error) {
    const logger = require('./utils/logger');
    logger.error(`系统初始化错误: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const AuthService = require('./services/authService');
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: '用户名和密码不能为空'
      });
    }

    const result = await AuthService.login(username, password);
    res.json(result);

  } catch (error) {
    const logger = require('./utils/logger');
    logger.error(`登录接口错误: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '登录失败，请稍后重试'
    });
  }
});

app.get('/api/auth/verify', async (req, res) => {
  try {
    const AuthService = require('./services/authService');
    const token = req.headers.authorization?.replace('Bearer ', '');

    const result = await AuthService.verifyToken(token);
    res.json(result);

  } catch (error) {
    const logger = require('./utils/logger');
    logger.error(`令牌验证错误: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '令牌验证失败'
    });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const AuthService = require('./services/authService');
    const token = req.headers.authorization?.replace('Bearer ', '');

    const verifyResult = await AuthService.verifyToken(token);

    if (!verifyResult.success) {
      return res.status(401).json(verifyResult);
    }

    const result = await AuthService.getUserInfo(verifyResult.user.userId);
    res.json(result);

  } catch (error) {
    const logger = require('./utils/logger');
    logger.error(`获取用户信息错误: ${error.message}`);
    res.status(500).json({
      success: false,
      error: '获取用户信息失败'
    });
  }
});

// 启动服务器
const startServer = async () => {
  try {
    await connectDB();
    await sequelize.sync(); // 自动创建表
    console.log('数据库已同步');

    // 自动创建默认管理员用户（首次启动时）
    const AuthService = require('./services/authService');
    await AuthService.createDefaultUser();
    console.log('默认用户检查完成');

    app.listen(PORT, () => {
      console.log(`SQE数据分析助手服务器运行在端口 ${PORT}`);
      console.log(`访问 http://localhost:${PORT} 开始使用`);

      // 尝试自动打开浏览器
      const url = `http://localhost:${PORT}`;
      if (process.platform === 'win32') {
        exec(`start ${url}`);
      } else if (process.platform === 'darwin') {
        exec(`open ${url}`);
      } else {
        exec(`xdg-open ${url}`);
      }
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
  }
};

startServer();

module.exports = app;