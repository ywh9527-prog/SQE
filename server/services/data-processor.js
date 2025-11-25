const { convertExcelDate, isValidDate } = require('../utils/date-utils');
const { FILE_TYPE_CONSTANTS, COLUMN_INDICES, STATUS_KEYWORDS } = require('../constants');
const logger = require('../utils/logger');

class DataProcessorService {
  constructor() {
    this.fileType = FILE_TYPE_CONSTANTS.PURCHASE;
  }

  // 处理IQC数据主函数
  processIQCData(data, supplierFilter = null, timeFilter = null, fileName = null) {
    try {
      logger.info(`开始处理文件: ${fileName || 'Unknown'}, 供应商筛选: ${supplierFilter || '无'}, 时间筛选: ${JSON.stringify(timeFilter) || '无'}`);

      // 检测文件类型
      this.fileType = this.detectFileType(data, fileName);
      logger.info(`检测到文件类型: ${this.fileType}`);

      // 获取列索引
      const indices = this.getColumnIndex(this.fileType);

      // 转换数据格式并过滤有效数据
      const validData = this.filterAndTransformData(data, indices, supplierFilter, timeFilter);

      // 计算统计结果
      const stats = this.calculateStatistics(validData, supplierFilter, timeFilter, fileName);

      logger.info(`数据处理完成，有效数据行数: ${validData.length}`);
      // 返回统计结果和原始有效数据（用于缓存）
      return { ...stats, rawData: validData };
    } catch (error) {
      logger.error(`数据处理失败: ${error.message}`);
      throw new Error(`数据处理失败: ${error.message}`);
    }
  }

  // 重新计算统计数据（基于已缓存的有效数据）
  recalculate(allData, supplierFilter = null, timeFilter = null) {
    try {
      // 1. 筛选数据
      const filteredData = allData.filter(row => {
        // 供应商筛选
        if (supplierFilter && supplierFilter.trim() !== '') {
          if (!row.supplier || !row.supplier.includes(supplierFilter)) {
            return false;
          }
        }

        // 时间筛选
        if (timeFilter) {
          if (!row.time) return false;
          
          let itemDate;
          try {
            // 如果已经是 Date 对象，直接使用
            if (row.time instanceof Date) {
              itemDate = row.time;
            } else {
              // 如果是字符串，转换为 Date
              itemDate = new Date(row.time);
            }
            
            // 检查日期是否有效
            if (isNaN(itemDate.getTime())) {
              console.warn('Invalid date format:', row.time);
              return false;
            }
          } catch (e) {
            console.warn('Date parsing error:', e.message, 'for value:', row.time);
            return false;
          }
          
          if (timeFilter.type === 'month' && timeFilter.value) {
            const [year, month] = timeFilter.value.split('-');
            if (itemDate.getFullYear() !== parseInt(year) ||
              itemDate.getMonth() !== parseInt(month) - 1) {
              return false;
            }
          } else if (timeFilter.type === 'year' && timeFilter.value) {
            if (itemDate.getFullYear() !== parseInt(timeFilter.value)) {
              return false;
            }
          }
        }
        return true;
      });

      // 2. 计算统计结果
      const stats = this.calculateStatistics(filteredData, supplierFilter, timeFilter);
      return stats;
    } catch (error) {
      logger.error(`重新计算失败: ${error.message}`);
      throw new Error(`重新计算失败: ${error.message}`);
    }
  }

  // 检测文件类型（外购/外协）
  detectFileType(data, fileName) {
    // 优先通过表头检测
    const headerType = this.detectByHeader(data);
    
    // 调试日志：记录文件类型检测结果
    const detectedType = headerType || 'purchase';
    console.log(`[FILE-TYPE] 文件: ${fileName}, 检测类型: ${detectedType}`);
    
    return detectedType;
    if (headerType !== FILE_TYPE_CONSTANTS.UNKNOWN) {
      return headerType;
    }

    // 通过文件名检测
    if (fileName) {
      if (fileName.includes('外协')) return FILE_TYPE_CONSTANTS.EXTERNAL;
      if (fileName.includes('外购')) return FILE_TYPE_CONSTANTS.PURCHASE;
    }

    return FILE_TYPE_CONSTANTS.PURCHASE;
  }

  // 通过表头检测文件类型
  detectByHeader(data) {
    if (!Array.isArray(data[2])) return FILE_TYPE_CONSTANTS.UNKNOWN;

    const headerRow = data[2];
    const R_COL = headerRow[17] ? String(headerRow[17]).toLowerCase() : '';
    const S_COL = headerRow[18] ? String(headerRow[18]).toLowerCase() : '';

    if (R_COL.includes('最终') || R_COL.includes('判定')) {
      if (S_COL.includes('处理') || S_COL.includes('方式')) {
        return FILE_TYPE_CONSTANTS.EXTERNAL;
      }
    }

    const T_COL = headerRow[19] ? String(headerRow[19]).toLowerCase() : '';
    if (S_COL.includes('最终') || S_COL.includes('判定')) {
      if (T_COL.includes('处理') || T_COL.includes('方式')) {
        return FILE_TYPE_CONSTANTS.PURCHASE;
      }
    }

    return FILE_TYPE_CONSTANTS.UNKNOWN;
  }

  // 获取列索引
  getColumnIndex(fileType) {
    const common = COLUMN_INDICES.COMMON;
    const specific = COLUMN_INDICES[fileType] || COLUMN_INDICES[FILE_TYPE_CONSTANTS.PURCHASE];

    return {
      TIME_INDEX: common.TIME,
      SUPPLIER_INDEX: common.SUPPLIER,
      RESULT_INDEX: specific.RESULT,
      ACTION_INDEX: specific.ACTION,
      APPEARANCE_RATE_INDEX: specific.APPEARANCE_RATE,
      DEFECT_DETAIL_INDEX: specific.DEFECT_DETAIL,
      APPEARANCE_DEFECT_INDEX: specific.APPEARANCE_DEFECT,
      DIMENSION_DEFECT_INDEX: specific.DIMENSION_DEFECT,
      PERFORMANCE_DEFECT_INDEX: specific.PERFORMANCE_DEFECT,
    };
  }

  // 辅助方法：检查文本是否包含指定类型的关键词
  checkStatus(text, type) {
    if (!text) return false;
    const keywords = STATUS_KEYWORDS[type];
    if (!keywords) return false;
    return keywords.some(keyword => text.includes(keyword));
  }

  // 过滤并转换数据
  filterAndTransformData(data, indices, supplierFilter, timeFilter) {
    const { TIME_INDEX, RESULT_INDEX, ACTION_INDEX, SUPPLIER_INDEX,
      APPEARANCE_RATE_INDEX, DEFECT_DETAIL_INDEX, APPEARANCE_DEFECT_INDEX,
      DIMENSION_DEFECT_INDEX, PERFORMANCE_DEFECT_INDEX } = indices;

    // 获取最大索引以进行安全检查
    const maxIndex = Math.max(
      TIME_INDEX, RESULT_INDEX, ACTION_INDEX, SUPPLIER_INDEX,
      APPEARANCE_RATE_INDEX, DEFECT_DETAIL_INDEX, APPEARANCE_DEFECT_INDEX,
      DIMENSION_DEFECT_INDEX, PERFORMANCE_DEFECT_INDEX
    );

    // 从第4行开始是实际数据（跳过前3行的表头信息）
    const actualData = Array.isArray(data[0]) ? data.slice(3) : data;

    // 记录调试信息
    let totalRows = actualData.length;
    let validDateRows = 0;
    let validResultRows = 0;
    let finalFilteredRows = 0;
    let dateParseFailures = [];

    const result = actualData
      .map((row, index) => {
        // 基本验证
        if (!row || !Array.isArray(row)) {
          // logger.debug(`Row ${index + 3} is not a valid array`);
          return null;
        }

        // 检查行长度是否足够
        if (row.length <= maxIndex) {
          // logger.debug(`Row ${index + 3} has insufficient length: ${row.length}, required: ${maxIndex + 1}`);
          return null;
        }

        const timeValue = row[TIME_INDEX];
        const resultValue = row[RESULT_INDEX];

        // 验证时间值
        if (!timeValue) {
          return null;
        }

        // 尝试验证日期
        if (!isValidDate(timeValue)) {
          dateParseFailures.push({ row: index + 3, date: timeValue });
          return null;
        }

        validDateRows++;

        // 验证结果值（允许空值，因为有些记录可能需要特殊处理）
        if (!resultValue) {
          // logger.warn(`Row ${index + 3} has no result value, but will still be processed`);
        } else {
          // 监控未知的判定结果
          const resultStr = String(resultValue).toUpperCase().trim();
          const isKnownStatus = this.checkStatus(resultStr, 'OK') || this.checkStatus(resultStr, 'NG');
          if (!isKnownStatus && resultStr.length > 0 && resultStr.length < 10) {
            logger.warn(`发现未知的判定结果: "${resultStr}" (行 ${index + 3})`);
          }
        }

        validResultRows++;

        return row;
      })
      .filter(row => row !== null) // 移除无效行
      .filter(row => {
        // 供应商筛选
        if (supplierFilter && supplierFilter.trim() !== '') {
          const supplierValue = row[SUPPLIER_INDEX];
          if (!supplierValue || !String(supplierValue).includes(supplierFilter)) {
            return false;
          }
        }

        // 时间筛选
        if (timeFilter) {
          const timeValue = row[TIME_INDEX];
          const convertedDate = convertExcelDate(timeValue);
          if (timeFilter.type === 'month' && timeFilter.value) {
            const [year, month] = timeFilter.value.split('-');
            if (convertedDate.getFullYear() !== parseInt(year) ||
              convertedDate.getMonth() !== parseInt(month) - 1) {
              return false;
            }
          } else if (timeFilter.type === 'year' && timeFilter.value) {
            if (convertedDate.getFullYear() !== parseInt(timeFilter.value)) {
              return false;
            }
          }
        }

        finalFilteredRows++;
        return true;
      })
      .map(row => {
        // 转换数据格式
        return {
          time: convertExcelDate(row[TIME_INDEX]),
          result: String(row[RESULT_INDEX] || '').toUpperCase().trim(), // 允许空值
          action: String(ACTION_INDEX < row.length ? row[ACTION_INDEX] || '' : '').toUpperCase().trim(),
          supplier: String(row[SUPPLIER_INDEX] || '').trim(),
          appearanceRate: APPEARANCE_RATE_INDEX >= 0 && APPEARANCE_RATE_INDEX < row.length ? (() => {
            const val = row[APPEARANCE_RATE_INDEX];
            if (!val || val === '') return '';
            const num = parseFloat(val);
            // 如果是小数(0-1之间),转换为百分比
            if (!isNaN(num)) {
              return num < 1 ? (num * 100).toFixed(2) : num.toFixed(2);
            }
            return String(val).trim();
          })() : '',
          defectDetail: DEFECT_DETAIL_INDEX >= 0 && DEFECT_DETAIL_INDEX < row.length ? String(row[DEFECT_DETAIL_INDEX] || '').trim() : '',
          appearanceDefect: APPEARANCE_DEFECT_INDEX >= 0 && APPEARANCE_DEFECT_INDEX < row.length ? String(row[APPEARANCE_DEFECT_INDEX] || '').trim() : '',
          dimensionDefect: DIMENSION_DEFECT_INDEX >= 0 && DIMENSION_DEFECT_INDEX < row.length ? String(row[DIMENSION_DEFECT_INDEX] || '').trim() : '',
          performanceDefect: PERFORMANCE_DEFECT_INDEX >= 0 && PERFORMANCE_DEFECT_INDEX < row.length ? String(row[PERFORMANCE_DEFECT_INDEX] || '').trim() : ''
        };
      });

    // 输出调试信息
    logger.info(`数据处理统计: 总行数=${totalRows}, 有效日期行=${validDateRows}, 有效结果行=${validResultRows}, 最终筛选行=${finalFilteredRows}`);

    if (dateParseFailures.length > 0) {
      logger.warn(`存在 ${dateParseFailures.length} 行日期解析失败，前5个: ${JSON.stringify(dateParseFailures.slice(0, 5))}`);
    }

    return result;
  }

  // 计算统计结果
  calculateStatistics(validData, supplierFilter = null, timeFilter = null, fileName = null) {
    // 按月统计数据
    const monthlyData = this.calculateMonthlyData(validData);

    // 计算周度数据对比
    const recentStats = this.calculateWeekComparison(validData);

    // 计算供应商排名
    const supplierRanking = this.calculateSupplierRanking(validData);

    // 计算缺陷分布
    const defectDistribution = this.calculateDefectDistribution(validData);

    // 计算汇总统计
    const summary = this.calculateSummary(validData);

    // 计算月度趋势
    const monthlyTrend = this.calculateMonthlyTrend(monthlyData);

    return {
      summary,
      monthlyData,
      recentTwoWeeks: recentStats,
      monthlyTrend,
      supplierRanking,
      defectDistribution,
      supplierDefectDistribution: [],
      supplierFilter: supplierFilter,
      timeFilter: timeFilter,
      fileName: fileName
    };
  }

  // 计算月度数据
  calculateMonthlyData(validData) {
    const monthlyData = {};

    validData.forEach(item => {
      const itemDate = item.time instanceof Date ? item.time : new Date(item.time);
      const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          total: 0,
          ok: 0,
          ng: 0,
          pass: 0,
          return: 0,
          special: 0
        };
      }

      monthlyData[monthKey].total++;
      if (this.checkStatus(item.result, 'OK')) {
        monthlyData[monthKey].ok++;
      } else if (this.checkStatus(item.result, 'NG')) {
        monthlyData[monthKey].ng++;
      }

      if (this.checkStatus(item.action, 'PASS')) {
        monthlyData[monthKey].pass++;
      } else if (this.checkStatus(item.action, 'RETURN')) {
        monthlyData[monthKey].return++;
      } else if (this.checkStatus(item.action, 'SPECIAL')) {
        monthlyData[monthKey].special++;
      }
    });

    return monthlyData;
  }

  // 计算周度数据对比
  calculateWeekComparison(validData) {
    // 如果没有有效数据，返回空统计
    if (!validData || validData.length === 0) {
      const { currentWeekStart, currentThursday, previousWeekStart, previousWeekEnd } = this.calculateWeekTimeRanges();
      return {
        currentWeek: { total: 0, ok: 0, ng: 0, pass: 0, return: 0, special: 0 },
        previousWeek: { total: 0, ok: 0, ng: 0, pass: 0, return: 0, special: 0 },
        currentWeekStart: this.formatDate(currentWeekStart),
        currentWeekEnd: this.formatDate(currentThursday),
        previousWeekStart: this.formatDate(previousWeekStart),
        previousWeekEnd: this.formatDate(previousWeekEnd)
      };
    }

    // 找到数据中的最大和最小日期，用于确定时间范围
    const allDates = validData.map(item => item.time);
    const minDate = new Date(Math.min.apply(null, allDates));
    const maxDate = new Date(Math.max.apply(null, allDates));

    // 计算周度时间段（基于当前日期）
    const { currentWeekStart, currentThursday, previousWeekStart, previousWeekEnd } = this.calculateWeekTimeRanges();

    // 创建日期边界，只比较日期部分（年月日），避免时间部分的影响
    const currentWeekStartBoundary = new Date(currentWeekStart.getFullYear(), currentWeekStart.getMonth(), currentWeekStart.getDate());
    const currentWeekEndBoundary = new Date(currentThursday.getFullYear(), currentThursday.getMonth(), currentThursday.getDate());
    const previousWeekStartBoundary = new Date(previousWeekStart.getFullYear(), previousWeekStart.getMonth(), previousWeekStart.getDate());
    const previousWeekEndBoundary = new Date(previousWeekEnd.getFullYear(), previousWeekEnd.getMonth(), previousWeekEnd.getDate());

    // 筛选本周和上周数据，只比较日期部分
    const currentWeekData = validData.filter(item => {
      const itemTime = item.time instanceof Date ? item.time : new Date(item.time);
      const itemDate = new Date(itemTime.getFullYear(), itemTime.getMonth(), itemTime.getDate());
      return itemDate >= currentWeekStartBoundary && itemDate <= currentWeekEndBoundary;
    });

    const previousWeekData = validData.filter(item => {
      const itemTime = item.time instanceof Date ? item.time : new Date(item.time);
      const itemDate = new Date(itemTime.getFullYear(), itemTime.getMonth(), itemTime.getDate());
      return itemDate >= previousWeekStartBoundary && itemDate <= previousWeekEndBoundary;
    });

    // 计算本周统计数据
    const currentWeekStats = this.calculateWeekStats(currentWeekData);
    // 计算上周统计数据
    const previousWeekStats = this.calculateWeekStats(previousWeekData);

    logger.info(`周度统计: 本周(${this.formatDate(currentWeekStart)}~${this.formatDate(currentThursday)}) 数据量=${currentWeekData.length}, 上周(${this.formatDate(previousWeekStart)}~${this.formatDate(previousWeekEnd)}) 数据量=${previousWeekData.length}`);

    const result = {
      currentWeek: currentWeekStats,
      previousWeek: previousWeekStats,
      currentWeekStart: this.formatDate(currentWeekStart),
      currentWeekEnd: this.formatDate(currentThursday),
      previousWeekStart: this.formatDate(previousWeekStart),
      previousWeekEnd: this.formatDate(previousWeekEnd)
    };

    return result;
  }

  // 计算周度时间段
  // 业务逻辑说明：
  // 制造业通常以"周"为单位汇报质量数据。
  // 统计周期定义：上周五 00:00 至 本周四 23:59 为一个统计周。
  // 例如：如果今天是周三，那么"本周"的数据范围是：上周五到本周四（虽然本周四还没到，但周期定义如此）。
  // 如果今天是周五，那么"本周"的数据范围是：本周五到下周四。
  calculateWeekTimeRanges() {
    const now = new Date();
    const today = new Date(now);

    // 计算今天是周几 (周日是0，周六是6)
    const dayOfWeek = today.getDay();

    // 计算本周周四的日期（一周从周五到下一个周四）
    const currentThursday = new Date(today);
    if (dayOfWeek >= 1 && dayOfWeek <= 4) { // 如果是周一到周四，本周四在本周内
      // 例如：周二(2) → 周四(4)，需要+2天
      currentThursday.setDate(today.getDate() + (4 - dayOfWeek));
    } else if (dayOfWeek === 0) { // 如果是周日(0)，本周四在本周内，需要-3天
      currentThursday.setDate(today.getDate() - 3); // 从周日到周四需要减3天
    } else { // 如果是周五到周六(5-6)，本周四在下周
      // 例如：周五(5) → 下周四(4)，需要+6天；周六(6) → 下周四(4)，需要+5天
      currentThursday.setDate(today.getDate() + (11 - dayOfWeek)); // (4 + 7 - dayOfWeek)
    }

    // 本周：上周五到本周四
    const currentWeekStart = new Date(currentThursday);
    currentWeekStart.setDate(currentThursday.getDate() - 6); // 前推6天得到上周五

    // 上周：上上周五到上周四
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(currentWeekStart.getDate() - 7); // 前推7天

    const previousWeekEnd = new Date(currentWeekStart);
    previousWeekEnd.setDate(currentWeekStart.getDate() - 1); // 前推1天到上周四

    return { currentWeekStart, currentThursday, previousWeekStart, previousWeekEnd };
  }

  // 计算周度统计
  calculateWeekStats(weekData) {
    return {
      total: weekData.length,
      ok: weekData.filter(item => this.checkStatus(item.result, 'OK')).length,
      ng: weekData.filter(item => this.checkStatus(item.result, 'NG')).length,
      pass: weekData.filter(item => this.checkStatus(item.action, 'PASS')).length,
      return: weekData.filter(item => this.checkStatus(item.action, 'RETURN')).length,
      special: weekData.filter(item => this.checkStatus(item.action, 'SPECIAL')).length
    };
  }

  // 计算供应商排名
  calculateSupplierRanking(validData) {
    const supplierYieldRate = {};

    // 提取所有供应商
    const suppliersInData = [...new Set(validData.map(item => item.supplier))];

    suppliersInData.forEach(supplier => {
      const supplierData = validData.filter(item => item.supplier === supplier);
      const total = supplierData.length;
      const okCount = supplierData.filter(item => this.checkStatus(item.result, 'OK')).length;
      const yieldRate = total > 0 ? (okCount / total) * 100 : 0;

      supplierYieldRate[supplier] = {
        total: total,
        okCount: okCount,
        yieldRate: parseFloat(yieldRate.toFixed(2))
      };
    });

    // 按良率降序排序
    return Object.entries(supplierYieldRate)
      .sort((a, b) => b[1].yieldRate - a[1].yieldRate)
      .map(([supplier, data], index) => ({
        rank: index + 1,
        supplier: supplier,
        total: data.total,
        okCount: data.okCount,
        yieldRate: data.yieldRate
      }));
  }

  // 计算缺陷分布
  calculateDefectDistribution(validData) {
    const defectTypeCount = {};

    for (const item of validData) {
      if (this.checkStatus(item.result, 'NG')) {
        // 统计三大类缺陷
        if (item.appearanceDefect && item.appearanceDefect.trim() !== '' && !this.checkStatus(item.appearanceDefect, 'OK')) {
          defectTypeCount['外观不良'] = (defectTypeCount['外观不良'] || 0) + 1;
        }

        if (item.dimensionDefect && item.dimensionDefect.trim() !== '' && !this.checkStatus(item.dimensionDefect, 'OK')) {
          defectTypeCount['尺寸不良'] = (defectTypeCount['尺寸不良'] || 0) + 1;
        }

        if (item.performanceDefect && item.performanceDefect.trim() !== '' && !this.checkStatus(item.performanceDefect, 'OK')) {
          defectTypeCount['性能不良'] = (defectTypeCount['性能不良'] || 0) + 1;
        }

        // 外协文件：从备注中提取缺陷信息
        if (!item.appearanceDefect && !item.dimensionDefect && !item.performanceDefect && item.action) {
          if (item.action.includes('退') || item.action.includes('退货')) {
            defectTypeCount['退货'] = (defectTypeCount['退货'] || 0) + 1;
          } else if (item.action.includes('特') || item.action.includes('让步') || item.action.includes('选')) {
            defectTypeCount['特采/选别'] = (defectTypeCount['特采/选别'] || 0) + 1;
          } else if (item.action.trim() !== '' && item.action.length < 20) {
            defectTypeCount[item.action] = (defectTypeCount[item.action] || 0) + 1;
          }
        }
      }
    }

    // 获取最常见的缺陷类型前10
    return Object.entries(defectTypeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([defect, count]) => ({
        defectType: defect,
        count: count
      }));
  }

  // 计算汇总统计
  calculateSummary(validData) {
    const totalBatches = validData.length;
    const okBatches = validData.filter(item => this.checkStatus(item.result, 'OK')).length;
    const ngBatches = validData.filter(item => this.checkStatus(item.result, 'NG')).length;
    const returnBatches = validData.filter(item => this.checkStatus(item.action, 'RETURN')).length;
    const specialBatches = validData.filter(item => this.checkStatus(item.action, 'SPECIAL')).length;
    const overallPassRate = totalBatches > 0 ? (okBatches / totalBatches) * 100 : 0;

    return {
      totalBatches,
      okBatches,
      ngBatches,
      passBatches: validData.filter(item => this.checkStatus(item.action, 'PASS')).length,
      returnBatches,
      specialBatches,
      overallPassRate: parseFloat(overallPassRate.toFixed(2))
    };
  }

  // 计算月度趋势
  calculateMonthlyTrend(monthlyData) {
    return Object.keys(monthlyData)
      .sort()
      .map(month => ({
        month: month,
        total: monthlyData[month].total,
        passRate: monthlyData[month].total > 0 ? (monthlyData[month].ok / monthlyData[month].total) * 100 : 0,
        returnCount: monthlyData[month].return,
        specialCount: monthlyData[month].special
      }));
  }

  // 格式化日期
  formatDate(date) {
    const d = new Date(date);
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    return year + '-' + month.padStart(2, '0') + '-' + day.padStart(2, '0');
  }
}

module.exports = DataProcessorService;