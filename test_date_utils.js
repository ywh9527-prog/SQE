const { isValidDate, convertExcelDate } = require('./server/utils/date-utils');

console.log('测试日期验证函数:');

const testDates = [
  '2025/11/07',
  '2025/11/08', 
  '2025/11/09',
  '2025-11-07',
  45100, // Excel序列号
  '20251107', // YYYYMMDD格式
  null,
  undefined,
  ''
];

testDates.forEach(date => {
  const isValid = isValidDate(date);
  const converted = convertExcelDate(date);
  console.log(`日期: ${date} | isValid: ${isValid} | converted: ${converted ? converted.toString() : 'null'}`);
});

console.log('');
console.log('特别测试我们的数据格式:');
const specificDate = '2025/11/07';
console.log(`测试 ${specificDate}:`);
console.log(`  isValidDate: ${isValidDate(specificDate)}`);
console.log(`  new Date result: ${new Date(specificDate)}`);
console.log(`  isNaN check: ${isNaN(new Date(specificDate).getTime())}`);