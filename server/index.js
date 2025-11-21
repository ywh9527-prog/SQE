const express = require('express');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// 设置静态文件目录
app.use(express.static(path.join(__dirname, '..', 'public')));

// 路由
const uploadRoutes = require('./routes/upload');
const supplierRoutes = require('./routes/supplier');
const comparisonRoutes = require('./routes/comparison');

app.use('/api', uploadRoutes);
app.use('/api', supplierRoutes);
app.use('/api', comparisonRoutes);

// 启动服务器
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

module.exports = app;