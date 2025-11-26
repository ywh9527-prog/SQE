const FILE_TYPE_CONSTANTS = {
  PURCHASE: 'purchase',    // 外购
  EXTERNAL: 'external',    // 外协
  UNKNOWN: 'unknown'       // 未知
};

// Excel列索引配置
const COLUMN_INDICES = {
  COMMON: {
    TIME: 6,      // 检验日期 (G列)
    SUPPLIER: 2   // 供应商名称 (C列)
  },
  [FILE_TYPE_CONSTANTS.EXTERNAL]: {
    RESULT: 17,             // R列
    ACTION: 18,             // S列
    APPEARANCE_RATE: 10,    // K列 - 外观良率
    DEFECT_DETAIL: 11,      // L列
    APPEARANCE_DEFECT: 12,  // M列
    DIMENSION_DEFECT: 14,   // O列
    PERFORMANCE_DEFECT: 16  // Q列
  },
  [FILE_TYPE_CONSTANTS.PURCHASE]: {
    RESULT: 18,             // S列
    ACTION: 19,             // T列
    APPEARANCE_RATE: 10,    // K列 - 外观良率
    DEFECT_DETAIL: 12,      // M列 - 不良描述
    APPEARANCE_DEFECT: 11,  // L列
    DIMENSION_DEFECT: 14,   // N列
    PERFORMANCE_DEFECT: 16  // P列
  }
};

// 状态关键词配置
const STATUS_KEYWORDS = {
  OK: ['OK', '合格'],
  NG: ['NG', '不合格', '不良'],
  PASS: ['正常入库', '合格', 'PASS', '入'],
  RETURN: ['退货', 'RETURN', '退'],
  SPECIAL: ['特采', 'SPECIAL', '特许', '让步', '生产领用']
};

// 年份优先级配置 (数字越大优先级越高)
const YEAR_PRIORITY = {
  '2025': 5,
  '2024': 4,
  '2023': 3,
  '2022': 2,
  '2021': 1
};

module.exports = {
  FILE_TYPE_CONSTANTS,
  COLUMN_INDICES,
  STATUS_KEYWORDS,
  YEAR_PRIORITY
};