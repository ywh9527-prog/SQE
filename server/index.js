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
const uploadRoutes = require('./routes/upload');
const supplierRoutes = require('./routes/supplier');
const comparisonRoutes = require('./routes/comparison');

app.use('/api', uploadRoutes);
app.use('/api', supplierRoutes);
app.use('/api', comparisonRoutes);

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