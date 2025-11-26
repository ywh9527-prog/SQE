const ExcelParserService = require('../services/excel-parser');
const { convertExcelDate, isValidDate } = require('../utils/date-utils');
const { FILE_TYPE_CONSTANTS } = require('../constants');

class ComparisonService {
  /**
   * 自定义时间段比较分析
   * 支持两种数据格式:
   * 1. 原始Excel格式: 二维数组 [[row1], [row2], ...]
   * 2. 标准格式: 对象数组 [{time, result, action, ...}, ...]
   */
  static compareCustomPeriods(data, currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd) {
    try {
      // 将日期字符串转换为Date对象
      const currentStart = new Date(currentPeriodStart);
      const currentEnd = new Date(currentPeriodEnd);
      currentEnd.setHours(23, 59, 59, 999); // 确保包含整个结束日期

      const previousStart = new Date(previousPeriodStart);
      const previousEnd = new Date(previousPeriodEnd);
      previousEnd.setHours(23, 59, 59, 999);

      // 验证日期有效性
      if (isNaN(currentStart.getTime()) || isNaN(currentEnd.getTime())) {
        throw new Error('无效的当前时间段日期');
      }
      if (isNaN(previousStart.getTime()) || isNaN(previousEnd.getTime())) {
        throw new Error('无效的对比时间段日期');
      }

      console.log('Debug: 自定义时间段比较分析');
      console.log('Current Period:', currentStart.toISOString().split('T')[0], 'to', currentEnd.toISOString().split('T')[0]);
      console.log('Previous Period:', previousStart.toISOString().split('T')[0], 'to', previousEnd.toISOString().split('T')[0]);

      let currentPeriodData, previousPeriodData;

      // 检测数据格式
      if (Array.isArray(data[0])) {
        // 原始Excel格式 (二维数组)
        console.log('Debug: 检测到原始Excel格式数据');
        const fileType = ExcelParserService.detectFileType(data);
        const indices = this.getColumnIndex(fileType);
        const actualData = data.slice(3); // 跳过前3行表头

        currentPeriodData = this.filterDataByDateRange(actualData, indices, currentStart, currentEnd);
        previousPeriodData = this.filterDataByDateRange(actualData, indices, previousStart, previousEnd);
      } else {
        // 标准格式 (对象数组)
        console.log('Debug: 检测到标准格式数据');
        currentPeriodData = this.filterStandardDataByDateRange(data, currentStart, currentEnd);
        previousPeriodData = this.filterStandardDataByDateRange(data, previousStart, previousEnd);
      }

      console.log('Current Period Data Count:', currentPeriodData.length);
      console.log('Previous Period Data Count:', previousPeriodData.length);

      // 计算统计数据
      const currentPeriodStats = this.calculatePeriodStats(currentPeriodData);
      const previousPeriodStats = this.calculatePeriodStats(previousPeriodData);

      // 计算合格率
      const currentPassRate = currentPeriodStats.total > 0 ? (currentPeriodStats.ok / currentPeriodStats.total * 100) : 0;
      const previousPassRate = previousPeriodStats.total > 0 ? (previousPeriodStats.ok / previousPeriodStats.total * 100) : 0;

      return {
        currentPeriod: {
          startDate: currentStart,
          endDate: currentEnd,
          stats: currentPeriodStats,
          passRate: parseFloat(currentPassRate.toFixed(2))
        },
        previousPeriod: {
          startDate: previousStart,
          endDate: previousEnd,
          stats: previousPeriodStats,
          passRate: parseFloat(previousPassRate.toFixed(2))
        }
      };
    } catch (error) {
      throw new Error(`自定义时间段比较分析失败: ${error.message}`);
    }
  }

  // 根据日期范围筛选数据(原始Excel格式)
  static filterDataByDateRange(data, indices, startDate, endDate) {
    const { TIME_INDEX, RESULT_INDEX, ACTION_INDEX, SUPPLIER_INDEX,
      DEFECT_DETAIL_INDEX, APPEARANCE_DEFECT_INDEX,
      DIMENSION_DEFECT_INDEX, PERFORMANCE_DEFECT_INDEX } = indices;

    // 获取最大索引以进行安全检查
    const maxIndex = Math.max(
      TIME_INDEX, RESULT_INDEX, ACTION_INDEX, SUPPLIER_INDEX,
      DEFECT_DETAIL_INDEX, APPEARANCE_DEFECT_INDEX,
      DIMENSION_DEFECT_INDEX, PERFORMANCE_DEFECT_INDEX
    );

    // 创建开始和结束日期边界，使用字符串格式避免时区问题
    const startBoundaryStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
    const endBoundaryStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    console.log(`Debug: Filter date range - Start: ${startBoundaryStr}, End: ${endBoundaryStr}`);

    return data
      .filter(row => {
        if (!row || !Array.isArray(row) || row.length <= maxIndex) {
          return false;
        }

        const timeValue = row[TIME_INDEX];
        const isValid = timeValue && isValidDate(timeValue);
        if (!isValid) {
          return false;
        }

        const convertedDate = convertExcelDate(timeValue);
        if (!(convertedDate instanceof Date) || isNaN(convertedDate.getTime())) {
          return false;
        }

        const convertedDateStr = `${convertedDate.getFullYear()}-${String(convertedDate.getMonth() + 1).padStart(2, '0')}-${String(convertedDate.getDate()).padStart(2, '0')}`;
        return convertedDateStr >= startBoundaryStr && convertedDateStr <= endBoundaryStr;
      })
      .map(row => ({
        time: convertExcelDate(row[TIME_INDEX]),
        result: String(row[RESULT_INDEX]).toUpperCase().trim(),
        action: String(ACTION_INDEX < row.length ? row[ACTION_INDEX] || '' : '').toUpperCase().trim(),
        supplier: String(row[SUPPLIER_INDEX] || '').trim(),
        defectDetail: DEFECT_DETAIL_INDEX >= 0 && DEFECT_DETAIL_INDEX < row.length ? String(row[DEFECT_DETAIL_INDEX] || '').trim() : '',
        appearanceDefect: APPEARANCE_DEFECT_INDEX >= 0 && APPEARANCE_DEFECT_INDEX < row.length ? String(row[APPEARANCE_DEFECT_INDEX] || '').trim() : '',
        dimensionDefect: DIMENSION_DEFECT_INDEX >= 0 && DIMENSION_DEFECT_INDEX < row.length ? String(row[DIMENSION_DEFECT_INDEX] || '').trim() : '',
        performanceDefect: PERFORMANCE_DEFECT_INDEX >= 0 && PERFORMANCE_DEFECT_INDEX < row.length ? String(row[PERFORMANCE_DEFECT_INDEX] || '').trim() : ''
      }));
  }

  /**
   * 筛选标准格式数据(对象数组)按日期范围
   * 用于处理从数据库读取的已处理数据
   */
  static filterStandardDataByDateRange(data, startDate, endDate) {
    const startBoundaryStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
    const endBoundaryStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    return data.filter(item => {
      if (!item || !item.time) return false;

      const itemDate = item.time instanceof Date ? item.time : new Date(item.time);
      if (isNaN(itemDate.getTime())) return false;

      const itemDateStr = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}-${String(itemDate.getDate()).padStart(2, '0')}`;
      return itemDateStr >= startBoundaryStr && itemDateStr <= endBoundaryStr;
    });
  }

  // 计算时间段统计数据
  static calculatePeriodStats(periodData) {
    const stats = {
      total: periodData.length,
      ok: periodData.filter(item => item.result.includes('OK') || item.result.includes('合格')).length,
      return: periodData.filter(item => item.action.includes('退货') || item.action.includes('RETURN') || item.action.includes('退')).length,
      special: periodData.filter(item => item.action.includes('特采') || item.action.includes('SPECIAL') || item.action.includes('特许') || item.action.includes('让步') || item.action.includes('生产领用')).length
    };

    return stats;
  }

  // 获取列索引
  static getColumnIndex(fileType) {
    return {
      TIME_INDEX: 6,   // 检验日期都是G列(6)
      RESULT_INDEX: fileType === FILE_TYPE_CONSTANTS.EXTERNAL ? 17 : 18, // 外协文件R列(17)，外购文件S列(18)
      ACTION_INDEX: fileType === FILE_TYPE_CONSTANTS.EXTERNAL ? 18 : 19, // 外协文件S列(18)，外购文件T列(19)
      SUPPLIER_INDEX: 2, // 供应商名称都是C列(2)
      DEFECT_DETAIL_INDEX: fileType === FILE_TYPE_CONSTANTS.EXTERNAL ? 11 : 12, // 外协文件L列(11)，外购文件M列(12)
      APPEARANCE_DEFECT_INDEX: fileType === FILE_TYPE_CONSTANTS.EXTERNAL ? 12 : 13, // 外协文件M列(12)，外购文件N列(13)
      DIMENSION_DEFECT_INDEX: fileType === FILE_TYPE_CONSTANTS.EXTERNAL ? 14 : 15, // 外协文件O列(14)，外购文件P列(15)
      PERFORMANCE_DEFECT_INDEX: fileType === FILE_TYPE_CONSTANTS.EXTERNAL ? 16 : 17, // 外协文件Q列(16)，外购文件R列(17)
    };
  }
}

module.exports = ComparisonService;