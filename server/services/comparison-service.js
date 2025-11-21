const ExcelParserService = require('../services/excel-parser');
const { convertExcelDate, isValidDate } = require('../utils/date-utils');
const { FILE_TYPE_CONSTANTS } = require('../constants');

class ComparisonService {
  // 自定义时间段比较分析
  static compareCustomPeriods(data, currentPeriodStart, currentPeriodEnd, previousPeriodStart, previousPeriodEnd) {
    try {
      // 检测文件类型
      const fileType = ExcelParserService.detectFileType(data);
      const indices = this.getColumnIndex(fileType);

      // 从第4行开始是实际数据（跳过前3行的表头信息）
      const actualData = Array.isArray(data[0]) ? data.slice(3) : data;

      // 将日期字符串转换为Date对象，确保处理各种可能的日期格式
      // 使用本地日期解析保持一致性
      const currentStart = new Date(currentPeriodStart);
      const currentEnd = new Date(currentPeriodEnd);
      // 确保设置时间为23:59:59.999确保包含整个结束日期
      currentEnd.setHours(23, 59, 59, 999);
      
      // 确保日期是有效的
      if (isNaN(currentStart.getTime()) || isNaN(currentEnd.getTime())) {
        throw new Error('无效的当前时间段日期');
      }

      const previousStart = new Date(previousPeriodStart);
      const previousEnd = new Date(previousPeriodEnd);
      // 确保设置时间为23:59:59.999确保包含整个结束日期
      previousEnd.setHours(23, 59, 59, 999);
      
      // 确保日期是有效的
      if (isNaN(previousStart.getTime()) || isNaN(previousEnd.getTime())) {
        throw new Error('无效的对比时间段日期');
      }

      console.log('Debug: 自定义时间段比较分析');
      console.log('Current Period (Request):', currentPeriodStart, 'to', currentPeriodEnd);
      console.log('Current Period (Parsed):', currentStart.toISOString().split('T')[0], 'to', currentEnd.toISOString().split('T')[0]);
      console.log('Previous Period (Request):', previousPeriodStart, 'to', previousPeriodEnd);
      console.log('Previous Period (Parsed):', previousStart.toISOString().split('T')[0], 'to', previousEnd.toISOString().split('T')[0]);

      // 筛选当前时间段数据
      const currentPeriodData = this.filterDataByDateRange(actualData, indices, currentStart, currentEnd);
      // 筛选对比时间段数据
      const previousPeriodData = this.filterDataByDateRange(actualData, indices, previousStart, previousEnd);

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

  // 根据日期范围筛选数据
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
    // 将日期转换为"YYYY-MM-DD"格式进行精确比较
    const startBoundaryStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
    const endBoundaryStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    console.log(`Debug: Filter date range - Start: ${startBoundaryStr}, End: ${endBoundaryStr}`);
    console.log(`Debug: Requested dates - Start: ${startDate.toISOString()}, End: ${endDate.toISOString()}`);

    return data
      .filter(row => {
        if (!row || !Array.isArray(row) || row.length <= maxIndex) {
          return false;
        }

        const timeValue = row[TIME_INDEX];
        // 检查时间和结果是否有效
        const isValid = timeValue && isValidDate(timeValue);
        if (!isValid) {
          return false;
        }

        // 将Excel日期转换为JS日期
        const convertedDate = convertExcelDate(timeValue);
        
        // 确保convertedDate是Date对象且有效
        if (!(convertedDate instanceof Date) || isNaN(convertedDate.getTime())) {
          return false;
        }

        // 将转换后的日期格式化为"YYYY-MM-DD"字符串进行比较
        const convertedDateStr = `${convertedDate.getFullYear()}-${String(convertedDate.getMonth() + 1).padStart(2, '0')}-${String(convertedDate.getDate()).padStart(2, '0')}`;

        // 直接比较字符串，确保在开始和结束日期之间（包含边界）
        const isInRange = convertedDateStr >= startBoundaryStr && convertedDateStr <= endBoundaryStr;
        
        if (isInRange) {
            console.log(`Debug: Date ${convertedDateStr} is in range (${startBoundaryStr} to ${endBoundaryStr})`);
        } else {
            console.log(`Debug: Date ${convertedDateStr} is NOT in range (${startBoundaryStr} to ${endBoundaryStr})`);
        }

        return isInRange;
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