const XLSX = require('xlsx');
const { isValidDate, convertExcelDate } = require('../utils/date-utils');
const { FILE_TYPE_CONSTANTS, COLUMN_INDICES, YEAR_PRIORITY } = require('../constants');

class ExcelParserService {
  // 检测文件类型（外购/外协）
  // 由于外协和外购列索引统一，改为根据文件名判断类型
  static detectFileType(data, fileName = '') {
    // 优先根据文件名判断
    if (fileName) {
      const lowerFileName = fileName.toLowerCase();
      if (lowerFileName.includes('外协')) {
        return FILE_TYPE_CONSTANTS.EXTERNAL;
      }
      if (lowerFileName.includes('外购')) {
        return FILE_TYPE_CONSTANTS.PURCHASE;
      }
    }

    // 如果文件名无法判断，检查表头特征
    if (!Array.isArray(data[2])) return FILE_TYPE_CONSTANTS.PURCHASE;

    const headerRow = data[2];
    const indices = COLUMN_INDICES[FILE_TYPE_CONSTANTS.PURCHASE];

    // 检查S列是否包含"最终"/"判定"，T列是否包含"处理"/"方式"
    const S_COL = headerRow[indices.RESULT] ? String(headerRow[indices.RESULT]).toLowerCase() : '';
    const T_COL = headerRow[indices.ACTION] ? String(headerRow[indices.ACTION]).toLowerCase() : '';

    if (S_COL.includes('最终') || S_COL.includes('判定')) {
      if (T_COL.includes('处理') || T_COL.includes('方式')) {
        return FILE_TYPE_CONSTANTS.PURCHASE;
      }
    }

    return FILE_TYPE_CONSTANTS.PURCHASE;
  }

  // 解析Excel文件（支持指定工作表）
  static parseExcelFileWithSheets(filePath, selectedSheet = null) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;

      // 使用用户指定的工作表，如果没有则使用第一个工作表
      const sheetNameToUse = selectedSheet && sheetNames.includes(selectedSheet) 
        ? selectedSheet 
        : sheetNames[0];
      const worksheet = workbook.Sheets[sheetNameToUse];

      return {
        data: XLSX.utils.sheet_to_json(worksheet, { header: 1 }),
        sheetName: sheetNameToUse,
        allSheets: sheetNames,
        selectedSheet: sheetNameToUse
      };
    } catch (error) {
      throw new Error(`解析Excel文件失败: ${error.message}`);
    }
  }

  // 解析Excel文件（保持向后兼容）
  static parseExcelFile(filePath) {
    try {
      const result = this.parseExcelFileWithSheets(filePath);
      return result.data;
    } catch (error) {
      throw new Error(`Excel文件解析失败: ${error.message}`);
    }
  }

  // 找到包含最新年份的工作表
  static findLatestYearSheet(sheetNames) {
    // 使用配置文件中的年份优先级
    const yearPriority = YEAR_PRIORITY;

    let latestYearSheet = null;
    let highestPriority = -1;

    for (const sheetName of sheetNames) {
      // 检查工作表名称中是否包含年份
      for (const [year, priority] of Object.entries(yearPriority)) {
        if (sheetName.includes(year) && priority > highestPriority) {
          highestPriority = priority;
          latestYearSheet = sheetName;
        }
      }
    }

    return latestYearSheet;
  }

  // 获取所有工作表名称
  static getAllSheetNames(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      return workbook.SheetNames;
    } catch (error) {
      throw new Error(`获取Excel工作表名称失败: ${error.message}`);
    }
  }

  // 根据指定的工作表解析Excel文件
  static parseExcelFileBySheetName(filePath, sheetName) {
    try {
      const workbook = XLSX.readFile(filePath);

      if (!workbook.Sheets[sheetName]) {
        throw new Error(`工作表 "${sheetName}" 不存在`);
      }

      const worksheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    } catch (error) {
      throw new Error(`Excel文件解析失败: ${error.message}`);
    }
  }

  // 验证Excel数据格式
  static validateExcelData(data) {
    if (!data || data.length === 0) {
      throw new Error('Excel文件中没有数据');
    }

    // 检查是否包含必要的列（G列时间、S/T列结果）
    const hasRequiredColumns = this.checkRequiredColumns(data);
    if (!hasRequiredColumns) {
      throw new Error('Excel文件格式不正确，缺少必要的列（G列检验时间、S/T列检验结果）');
    }

    return true;
  }

  // 检查必需列是否存在
  static checkRequiredColumns(data) {
    // 简单检查前几行是否包含有效的日期或结果数据
    const sampleRows = data.slice(0, 5); // 检查前5行

    for (const row of sampleRows) {
      if (Array.isArray(row) && row.length >= 7) { // G列索引为6
        const timeValue = row[6]; // G列
        if (timeValue && isValidDate(timeValue)) {
          return true; // 找到有效时间列
        }
      }
    }

    return false;
  }
}

module.exports = ExcelParserService;