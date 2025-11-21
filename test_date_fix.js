const ComparisonService = require('./server/services/comparison-service');
const { convertExcelDate } = require('./server/utils/date-utils');

// 创建测试数据
const mockData = [
  // 表头行（跳过）
  [],
  [],
  [],
  // 实际数据行
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/10/29', // G列 (索引6) - 使用字符串日期格式
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/10/30', // G列 (索引6) - 使用字符串日期格式
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/10/31', // G列 (索引6) - 使用字符串日期格式
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/11/01', // G列 (索引6) - 使用字符串日期格式
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/11/02', // G列 (索引6) - 使用字符串日期格式
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/11/03', // G列 (索引6) - 使用字符串日期格式
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/11/04', // G列 (索引6) - 使用字符串日期格式
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/11/05', // G列 (索引6) - 使用字符串日期格式
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/11/06', // G列 (索引6) - 使用字符串日期格式
    null, null, null, null, null, null, null, null,
    'OK', // S列 (索引18)
    '正常入库', // T列 (索引19)
    null, null, null, null, null, null
  ],
  [
    '供应商A', // C列 (索引2)
    null, null, null, null, null,
    '2025/11/07', // G列 (索引6) - 使用字符串日期格式
    null, null, null, null, null, null, null, null,
    'NG', // S列 (索引18)
    '退货', // T列 (索引19)
    null, null, null, null, null, null
  ]
];

console.log('测试数据:');
for (let i = 3; i < mockData.length; i++) {
  const date = convertExcelDate(mockData[i][6]);
  console.log(`行 ${i}: 日期=${date.toISOString().split('T')[0]}`);
}
console.log('');

// 测试日期范围 2025-10-31 到 2025-11-06
const currentPeriodStart = '2025-10-31';
const currentPeriodEnd = '2025-11-06';
const previousPeriodStart = '2025-11-07';
const previousPeriodEnd = '2025-11-13';

console.log(`测试日期范围: ${currentPeriodStart} 到 ${currentPeriodEnd}`);
console.log('');

try {
  const result = ComparisonService.compareCustomPeriods(mockData, currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd);
  
  console.log('比较结果:');
  console.log(`当前时间段 (${result.currentPeriod.startDate} 至 ${result.currentPeriod.endDate}):`);
  console.log(`  总批次数: ${result.currentPeriod.stats.total}`);
  console.log(`  合格批次数: ${result.currentPeriod.stats.ok}`);
  console.log(`  退货批次数: ${result.currentPeriod.stats.return}`);
  console.log(`  特采批次数: ${result.currentPeriod.stats.special}`);
  console.log(`  合格率: ${result.currentPeriod.passRate}%`);
  console.log('');
  
  console.log(`对比时间段 (${result.previousPeriod.startDate} 至 ${result.previousPeriod.endDate}):`);
  console.log(`  总批次数: ${result.previousPeriod.stats.total}`);
  console.log(`  合格批次数: ${result.previousPeriod.stats.ok}`);
  console.log(`  退货批次数: ${result.previousPeriod.stats.return}`);
  console.log(`  特采批次数: ${result.previousPeriod.stats.special}`);
  console.log(`  合格率: ${result.previousPeriod.passRate}%`);
  console.log('');
  
  // 验证结果是否正确
  if (result.currentPeriod.stats.total === 7) { // 应该包含10/31到11/06共7天的数据
    console.log('✅ 测试通过！当前时间段数据量正确');
  } else {
    console.log(`❌ 测试失败！期望7条数据（10/31到11/06），实际${result.currentPeriod.stats.total}条数据`);
  }
  
} catch (error) {
  console.error('测试出错:', error.message);
}