const DataProcessorService = require('./server/services/data-processor');
const ExcelParserService = require('./server/services/excel-parser');
const { FILE_TYPE_CONSTANTS } = require('./server/constants');

// 模拟一个完整的数据分析流程
const mockExcelData = [
  // 表头（前3行）
  [],
  [],
  ['供应商', '其他列', '供应商', '其他列', '其他列', '其他列', '检验日期', '其他列', '其他列', '其他列', '其他列', '缺陷详情', '外观缺陷', '其他列', '尺寸缺陷', '其他列', '性能不良', '其他列', '结果', '处理方式'],
  // 数据行
  ['供应商A', null, '供应商A', null, null, null, '2025/11/07', null, null, null, null, '缺陷1', '外观不良', null, '尺寸不良', null, '性能不良', null, 'OK', '正常入库'],
  ['供应商B', null, '供应商B', null, null, null, '2025/11/07', null, null, null, null, '缺陷2', '外观不良', null, '尺寸不良', null, '性能不良', null, 'NG', '退货'],
  ['供应商C', null, '供应商C', null, null, null, '2025/11/08', null, null, null, null, '缺陷3', '外观不良', null, '尺寸不良', null, '性能不良', null, 'OK', '特采'],
  ['供应商D', null, '供应商D', null, null, null, '2025/11/09', null, null, null, null, '缺陷4', '外观不良', null, '尺寸不良', null, '性能不良', null, 'OK', '正常入库'],
  ['供应商E', null, '供应商E', null, null, null, '2025/11/10', null, null, null, null, '缺陷5', '外观不良', null, '尺寸不良', null, '性能不良', null, 'NG', '退货'],
  ['供应商F', null, '供应商F', null, null, null, '2025/11/11', null, null, null, null, '缺陷6', '外观不良', null, '尺寸不良', null, '性能不良', null, 'OK', '正常入库'],
  ['供应商G', null, '供应商G', null, null, null, '2025/11/12', null, null, null, null, '缺陷7', '外观不良', null, '尺寸不良', null, '性能不良', null, 'OK', '正常入库'],
  ['供应商H', null, '供应商H', null, null, null, '2025/11/13', null, null, null, null, '缺陷8', '外观不良', null, '尺寸不良', null, '性能不良', null, 'OK', '正常入库'],
  // 添加更多数据来验证统计
  ['供应商I', null, '供应商I', null, null, null, '2025/11/07', null, null, null, null, '缺陷9', '外观不良', null, '尺寸不良', null, '性能不良', null, 'OK', '正常入库'],
  ['供应商J', null, '供应商J', null, null, null, '2025/11/07', null, null, null, null, '缺陷10', '外观不良', null, '尺寸不良', null, '性能不良', null, 'NG', '退货'],
  ['供应商K', null, '供应商K', null, null, null, '2025/11/07', null, null, null, null, '缺陷11', '外观不良', null, '尺寸不良', null, '性能不良', null, 'OK', '特采'],
  ['供应商L', null, '供应商L', null, null, null, '2025/11/08', null, null, null, null, '缺陷12', '外观不良', null, '尺寸不良', null, '性能不良', null, 'OK', '正常入库'],
  ['供应商M', null, '供应商M', null, null, null, '2025/11/09', null, null, null, null, '缺陷13', '外观不良', null, '尺寸不良', null, '性能不良', null, 'NG', '退货'],
  ['供应商N', null, '供应商N', null, null, null, '2025/11/10', null, null, null, null, '缺陷14', '外观不良', null, '尺寸不良', null, '性能不良', null, 'OK', '正常入库'],
  ['供应商O', null, '供应商O', null, null, null, '2025/11/11', null, null, null, null, '缺陷15', '外观不良', null, '尺寸不良', null, '性能不良', null, 'OK', '正常入库'],
  ['供应商P', null, '供应商P', null, null, null, '2025/11/12', null, null, null, null, '缺陷16', '外观不良', null, '尺寸不良', null, '性能不良', null, 'OK', '正常入库'],
  ['供应商Q', null, '供应商Q', null, null, null, '2025/11/13', null, null, null, null, '缺陷17', '外观不良', null, '尺寸不良', null, '性能不良', null, 'NG', '退货'],
  ['供应商R', null, '供应商R', null, null, null, '2025/11/13', null, null, null, null, '缺陷18', '外观不良', null, '尺寸不良', null, '性能不良', null, 'OK', '正常入库'],
];

console.log('原始Excel数据:');
for (let i = 3; i < mockExcelData.length; i++) {
  const row = mockExcelData[i];
  console.log(`行 ${i}: 日期=${row[6]}, 结果=${row[17]}, 处理=${row[18]}`);
}
console.log(`总共 ${mockExcelData.length - 3} 条数据`);
console.log('');

// 创建数据处理器
const dataProcessor = new DataProcessorService();

try {
  // 获取列索引
  const indices = dataProcessor.getColumnIndex(FILE_TYPE_CONSTANTS.PURCHASE);
  console.log('列索引:', indices);
  
  // 手动转换和过滤数据
  const transformedData = dataProcessor.filterAndTransformData(mockExcelData, indices, null, null);
  console.log('转换后的数据:');
  for (let i = 0; i < transformedData.length; i++) {
    console.log(`数据 ${i+1}: 日期=${transformedData[i].time.toISOString().split('T')[0]}, 结果=${transformedData[i].result}, 处理=${transformedData[i].action}`);
  }
  console.log(`转换后数据总数: ${transformedData.length}`);
  console.log('');

  // 计算周度数据
  const weekComparison = dataProcessor.calculateWeekComparison(transformedData);
  
  console.log('周度比较结果:');
  console.log('Current Week:', weekComparison.currentWeek);
  console.log('Previous Week:', weekComparison.previousWeek);
  console.log('Current Week Range:', weekComparison.currentWeekStart, 'to', weekComparison.currentWeekEnd);
  console.log('Previous Week Range:', weekComparison.previousWeekStart, 'to', weekComparison.previousWeekEnd);
  
  // 验证上周范围内的数据
  console.log('');
  console.log('上周范围内的具体数据:');
  const prevStart = new Date(weekComparison.previousWeekStart);
  const prevEnd = new Date(weekComparison.previousWeekEnd);
  
  const prevWeekData = transformedData.filter(item => {
    return item.time >= prevStart && item.time <= prevEnd;
  });
  
  console.log(`上周范围 (${weekComparison.previousWeekStart} to ${weekComparison.previousWeekEnd}) 内的数据条数: ${prevWeekData.length}`);
  prevWeekData.forEach((item, idx) => {
    console.log(`  ${idx+1}. ${item.time.toISOString().split('T')[0]} - ${item.result} - ${item.action}`);
  });
  
} catch (error) {
  console.error('测试出错:', error.message);
  console.error(error.stack);
}