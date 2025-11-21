const DataProcessorService = require('./server/services/data-processor');

// 测试周度时间段计算
const dataProcessor = new DataProcessorService();
const weekRanges = dataProcessor.calculateWeekTimeRanges();

console.log('基于当前日期的周度时间段计算:');
console.log('本周范围 (上周五 to 本周四):', weekRanges.currentWeekStart, 'to', weekRanges.currentThursday);
console.log('上周范围 (上上周五 to 上周四):', weekRanges.previousWeekStart, 'to', weekRanges.previousWeekEnd);

// 计算天数差
const currentStart = new Date(weekRanges.currentWeekStart);
const currentEnd = new Date(weekRanges.currentWeekEnd);
const prevStart = new Date(weekRanges.previousWeekStart);
const prevEnd = new Date(weekRanges.previousWeekEnd);

console.log('');
console.log('本周时间跨度:', Math.ceil((currentEnd - currentStart) / (1000 * 60 * 60 * 24)) + 1, '天');
console.log('上周时间跨度:', Math.ceil((prevEnd - prevStart) / (1000 * 60 * 60 * 24)) + 1, '天');

// 验证是否是7天周期
console.log('');
console.log('验证周期长度:');
console.log('本周应为7天周期:', (currentEnd - currentStart) / (1000 * 60 * 60 * 24) + 1 === 7 ? '✓' : '✗');
console.log('上周应为7天周期:', (prevEnd - prevStart) / (1000 * 60 * 60 * 24) + 1 === 7 ? '✓' : '✗');