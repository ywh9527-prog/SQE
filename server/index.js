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

// 路由
// 添加时间: 2025-12-01
// 说明: 新增suppliers路由以解决前端404错误
console.log('📦 开始加载路由模块...');
const uploadRoutes = require('./routes/upload');
console.log('✅ uploadRoutes 加载完成');
const supplierRoutes = require('./routes/supplier');
console.log('✅ supplierRoutes 加载完成');
const suppliersRoutes = require('./routes/suppliers'); // 新增供应商管理API
console.log('✅ suppliersRoutes 加载完成');
const comparisonRoutes = require('./routes/comparison');
console.log('✅ comparisonRoutes 加载完成');
const dataSourceRoutes = require('./routes/data-source');
console.log('✅ dataSourceRoutes 加载完成');
const supplierSearchRoutes = require('./routes/supplier-search');
console.log('✅ supplierSearchRoutes 加载完成');
const documentRoutes = require('./routes/documents');
console.log('✅ documentRoutes 加载完成');

console.log('🔧 开始注册API路由...');
app.use('/api', uploadRoutes);
console.log('✅ /api/* 路由已注册 (upload)');
app.use('/api', supplierRoutes);
console.log('✅ /api/* 路由已注册 (supplier)');
app.use('/api/suppliers', suppliersRoutes); // 注册供应商管理路由
console.log('✅ /api/suppliers/* 路由已注册 (suppliers)');

// 立即测试路由是否正确注册
console.log('🧪 测试suppliers路由层...');
console.log('🧪 suppliersRoutes stack length:', suppliersRoutes.stack ? suppliersRoutes.stack.length : 'undefined');
if (suppliersRoutes.stack) {
  suppliersRoutes.stack.forEach((layer, index) => {
    console.log(`🧪 路由 ${index}: ${layer.route?.path || layer.regexp || 'middleware'} - ${layer.route?.methods || 'N/A'}`);
  });
}
app.use('/api', comparisonRoutes);
console.log('✅ /api/* 路由已注册 (comparison)');
app.use('/api', dataSourceRoutes);
console.log('✅ /api/* 路由已注册 (data-source)');
app.use('/api', supplierSearchRoutes);
console.log('✅ /api/* 路由已注册 (supplier-search)');
app.use('/api/documents', documentRoutes);
console.log('✅ /api/documents/* 路由已注册 (documents)');

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