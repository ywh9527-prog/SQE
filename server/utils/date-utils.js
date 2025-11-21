// 将Excel日期数字转换为JavaScript日期对象
function convertExcelDate(excelDate) {
  if (typeof excelDate === 'number') {
    // 检查日期格式：如果数字是YYYYMMDD格式（8位数）
    const dateStr = String(Math.round(excelDate));
    if (dateStr.length === 8) { // 如：20230103
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return new Date(`${year}-${month}-${day}`);
    } else {
      // 假设是Excel序列日期格式
      // 但在JavaScript中，时间戳是从1970/1/1开始的毫秒数
      // Excel错误地认为1900年是闰年，所以要加上1
      return new Date(Math.round((excelDate - 25569 - 1) * 86400 * 1000));
    }
  } else if (typeof excelDate === 'string') {
    // 如果是字符串格式的日期
    return new Date(excelDate);
  } else {
    // 如果已经是日期对象
    return excelDate;
  }
}

// 验证日期的函数
function isValidDate(date) {
  if (date == null) {
    return false;
  }
  
  let convertedDate;
  if (typeof date === 'number') {
    // 检查日期格式：如果数字是YYYYMMDD格式（8位数）
    const dateStr = String(Math.round(date));
    if (dateStr.length === 8) { // 如：20230103
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      convertedDate = new Date(`${year}-${month}-${day}`);
    } else {
      // 假设是Excel序列日期格式
      convertedDate = new Date(Math.round((date - 25569 - 1) * 86400 * 1000));
    }
  } else if (typeof date === 'string') {
    // 处理多种字符串日期格式
    let dateString = date.toString().trim();
    
    // 如果是 "YYYY/MM/DD" 格式，转换为 "YYYY-MM-DD" 格式
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateString)) {
      dateString = dateString.replace(/\//g, '-');
    }
    // 如果是 "YYYY.M.D" 或 "YYYY-MM-DD" 格式，直接使用
    // 其他格式也尝试直接解析
    
    convertedDate = new Date(dateString);
  } else {
    convertedDate = new Date(date);
  }
  
  return convertedDate instanceof Date && !isNaN(convertedDate.getTime());
}

module.exports = {
  convertExcelDate,
  isValidDate
};