const XLSX = require('xlsx');
const { isValidDate, convertExcelDate } = require('../utils/date-utils');
const { FILE_TYPE_CONSTANTS, COLUMN_INDICES, YEAR_PRIORITY } = require('../constants');

class ExcelParserService {
  // 检测文件类型（外购/外协）
  static detectFileType(data) {
    if (!Array.isArray(data[2])) return FILE_TYPE_CONSTANTS.PURCHASE;

    const headerRow = data[2];
    // 使用常量定义的列索引
    const extIndices = COLUMN_INDICES[FILE_TYPE_CONSTANTS.EXTERNAL];
    const purIndices = COLUMN_INDICES[FILE_TYPE_CONSTANTS.PURCHASE];

    const R_COL = headerRow[extIndices.RESULT] ? String(headerRow[extIndices.RESULT]).toLowerCase() : '';
    const S_COL = headerRow[extIndices.ACTION] ? String(headerRow[extIndices.ACTION]).toLowerCase() : '';

    // 检查外协格式特征
    if (R_COL.includes('最终') || R_COL.includes('判定')) {
      if (S_COL.includes('处理') || S_COL.includes('方式')) {
        return FILE_TYPE_CONSTANTS.EXTERNAL;
      }
    }

    // 检查外购格式特征
    const T_COL = headerRow[purIndices.ACTION] ? String(headerRow[purIndices.ACTION]).toLowerCase() : '';
    // 注意：外购的S列是RESULT，T列是ACTION
    const purS_COL = headerRow[purIndices.RESULT] ? String(headerRow[purIndices.RESULT]).toLowerCase() : '';

    if (purS_COL.includes('最终') || purS_COL.includes('判定')) {
      if (T_COL.includes('处理') || T_COL.includes('方式')) {
        return FILE_TYPE_CONSTANTS.PURCHASE;
      }
    }

    return FILE_TYPE_CONSTANTS.PURCHASE;
  }

  // 解析Excel文件并获取所有工作表信息
  static parseExcelFileWithSheets(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;

      // 找到包含最新年份的工作表
      const latestSheetName = this.findLatestYearSheet(sheetNames);

      // 如果找到了最新的年份工作表，则使用它，否则使用第一个工作表
      const sheetNameToUse = latestSheetName || sheetNames[0];
      const worksheet = workbook.Sheets[sheetNameToUse];

      return {
        data: XLSX.utils.sheet_to_json(worksheet, { header: 1 }),
        sheetName: sheetNameToUse,
        allSheets: sheetNames,
        selectedSheet: sheetNameToUse
      };
    } catch (error) {
      throw new Error(`Excel文件解析失败: ${error.message}`);
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