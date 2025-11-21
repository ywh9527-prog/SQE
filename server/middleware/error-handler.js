// 统一的错误处理中间件
const handleError = (error, req, res) => {
  console.error('Error:', error.message);
  
  if (error.message.includes('Excel')) {
    return res.status(400).json({ error: `Excel文件错误: ${error.message}` });
  }
  
  if (error.message.includes('No file')) {
    return res.status(400).json({ error: '请上传一个Excel文件' });
  }
  
  return res.status(500).json({ error: `处理失败: ${error.message}` });
};

module.exports = {
  handleError
};
