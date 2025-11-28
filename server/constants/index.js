const FILE_TYPE_CONSTANTS = {
  PURCHASE: 'purchase',    // 外购
  EXTERNAL: 'external',    // 外协
  UNKNOWN: 'unknown'       // 未知
};

// Excel列索引配置
const COLUMN_INDICES = {
  // 通用列（外购+外协共用）
  COMMON: {
    TIME: 6,      // 检验日期 (G列)
    SUPPLIER: 2   // 供应商名称 (C列)
  },

  // 外协专用列
  [FILE_TYPE_CONSTANTS.EXTERNAL]: {
    RESULT: 17,             // 最终判定 (R列)
    ACTION: 18,             // 处理方式 (S列)
    APPEARANCE_RATE: 10,    // 外观良率 (K列)
    DEFECT_DETAIL: 11,      // 缺陷详情 (L列)
    APPEARANCE_DEFECT: 12,  // 外观缺陷 (M列)
    DIMENSION_DEFECT: 14,   // 尺寸缺陷 (O列)
    PERFORMANCE_DEFECT: 16  // 性能缺陷 (Q列)
  },

  // 外购专用列
  [FILE_TYPE_CONSTANTS.PURCHASE]: {
    RESULT: 18,             // 最终判定 (S列)
    ACTION: 19,             // 处理方式 (T列)
    APPEARANCE_RATE: 11,    // 外观良率 (L列)
    DEFECT_DETAIL: 12,      // 缺陷详情 (M列)
    APPEARANCE_DEFECT: 13,  // 外观缺陷 (N列)
    DIMENSION_DEFECT: 15,   // 尺寸缺陷 (P列)
    PERFORMANCE_DEFECT: 17  // 性能缺陷 (R列)
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