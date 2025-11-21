const ExcelParserService = require('../services/excel-parser');
const DataProcessorService = require('../services/data-processor');

class SupplierService {
  // 提取供应商列表
  static extractSuppliers(data) {
    try {
      ExcelParserService.validateExcelData(data);

      // 从第4行开始是实际数据（跳过前3行的表头信息）
      const originalData = Array.isArray(data[0]) ? data.slice(3) : data;

      // 提取所有供应商名称并去重
      const suppliersSet = new Set();

      originalData.forEach(row => {
        if (Array.isArray(row) && row.length > 2) {  // 使用固定的索引2作为供应商列
          const supplierValue = row[2];
          if (supplierValue && String(supplierValue).trim() !== '') {
            suppliersSet.add(String(supplierValue).trim());
          }
        } else if (!Array.isArray(row)) {
          const possibleSupplierColumns = ['C', '供应商', '供应商名称', '供方商名称', 'supplier', 'Supplier', 'SUPPLIER'];

          for (const col of Object.keys(row)) {
            if (possibleSupplierColumns.includes(col) || col.replace(/[^a-zA-Z]/g, '').toUpperCase() === 'C') {
              const supplierValue = row[col];
              if (supplierValue && String(supplierValue).trim() !== '') {
                suppliersSet.add(String(supplierValue).trim());
              }
              break;
            }
          }
        }
      });

      // 过滤掉空值并将结果转换为排序后的数组
      return Array.from(suppliersSet).filter(supplier => supplier.length > 0).sort();
    } catch (error) {
      throw new Error(`提取供应商列表失败: ${error.message}`);
    }
  }
}

module.exports = SupplierService;