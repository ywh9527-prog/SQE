const DataProcessorService = require('./server/services/data-processor');
const { convertExcelDate } = require('./server/utils/date-utils');

// 创建测试数据，包含一些历史数据
const mockData = [
  // 表头行（跳过）
  [],
  [],
  [],
  // 实际数据行
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/10/25', // G列 (索引6) - 假设是周六
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/10/26', // G列 (索引6) - 假设是周日
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/10/27', // G列 (索引6) - 假设是周一
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/10/28', // G列 (索引6) - 假设是周二
    null, null, null, null, null, null, null, null,
    'NG', // S列 (索引18)
    '退货', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/10/29', // G列 (索引6) - 假设是周三
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/10/30', // G列 (索引6) - 假设是周四
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/10/31', // G列 (索引6) - 假设是周五
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/11/01', // G列 (索引6) - 假设是周六
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/11/02', // G列 (索引6) - 假设是周日
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/11/03', // G列 (索引6) - 假设是周一
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/11/04', // G列 (索引6) - 假设是周二
    null, null, null, null, null, null, null, null,
    'NG', // S列 (索引18)
    '退货', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/11/05', // G列 (索引6) - 假设是周三
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/11/06', // G列 (索引6) - 假设是周四
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ]
];

console.log('测试数据:');
for (let i = 3; i < mockData.length; i++) {
  const date = convertExcelDate(mockData[i][6]);
  console.log(`行 ${i}: 日期=${date.toISOString().split('T')[0]} (${date.toLocaleDateString('zh-CN', {weekday: 'long'})})`);
}
console.log('');

// 创建数据处理器并测试周度数据计算
const dataProcessor = new DataProcessorService();

try {
  // 处理数据并获取结果
  const processedData = dataProcessor.filterAndTransformData(mockData, dataProcessor.getColumnIndex('PURCHASE'), null, null);
  console.log('Processed data:', processedData.length);
  
  // 计算周度数据
  const weekComparison = dataProcessor.calculateWeekComparison(processedData);
  
  console.log('');
  console.log('周度比较结果:');
  console.log('Current Week:', weekComparison.currentWeek);
  console.log('Previous Week:', weekComparison.previousWeek);
  console.log('Current Week Range:', weekComparison.currentWeekStart, 'to', weekComparison.currentWeekEnd);
  console.log('Previous Week Range:', weekComparison.previousWeekStart, 'to', weekComparison.previousWeekEnd);
  
} catch (error) {
  console.error('测试出错:', error.message);
  console.error(error.stack);
}