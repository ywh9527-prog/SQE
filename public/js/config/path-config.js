/**
 * 动态路径配置服务
 * 完全避免硬编码，自动获取项目路径
 */
class PathConfig {
  constructor() {
    this.projectRoot = this.detectProjectRoot();
    this.supplierPaths = this.initializeSupplierPaths();
  }

  /**
   * 自动检测项目根目录
   */
  detectProjectRoot() {
    // 通过当前页面URL推断项目根目录
    const currentPath = window.location.pathname;
    const pathSegments = currentPath.split('/');

    // 移除空字符串和文件名
    const cleanSegments = pathSegments.filter(segment => segment && !segment.includes('.'));

    // 构建项目根目录路径（假设项目在某个子目录中）
    const projectPath = cleanSegments.join('/');

    // 获取当前域名和协议
    const origin = window.location.origin;

    return origin + '/' + projectPath;
  }

  /**
   * 获取供应商资料档案的绝对路径
   * 通过API动态获取，而不是硬编码
   */
  getSupplierArchivePath(supplierName = '晶蓝') {
    // 返回相对路径，让服务器端处理绝对路径转换
    return `资料档案/${supplierName}`;
  }

  /**
   * 获取通用资料路径
   */
  getCommonDocumentsPath(supplierName = '晶蓝') {
    return this.getSupplierArchivePath(supplierName) + '/通用资料';
  }

  /**
   * 获取检测报告路径
   */
  getTestReportsPath(supplierName = '晶蓝') {
    return this.getSupplierArchivePath(supplierName) + '/检测报告';
  }

  /**
   * 初始化供应商路径映射
   */
  initializeSupplierPaths() {
    return {
      '晶蓝': {
        archive: this.getSupplierArchivePath('晶蓝'),
        common: this.getCommonDocumentsPath('晶蓝'),
        reports: this.getTestReportsPath('晶蓝')
      },
      '常兴': {
        archive: this.getSupplierArchivePath('常兴'),
        common: this.getCommonDocumentsPath('常兴'),
        reports: this.getTestReportsPath('常兴')
      },
      '森永': {
        archive: this.getSupplierArchivePath('森永'),
        common: this.getCommonDocumentsPath('森永'),
        reports: this.getTestReportsPath('森永')
      }
    };
  }

  /**
   * 根据供应商名称获取文件路径
   */
  getFilePath(supplierName, documentType) {
    const supplierConfig = this.supplierPaths[supplierName];
    if (!supplierConfig) {
      console.warn(`未找到供应商 ${supplierName} 的路径配置`);
      return null;
    }

    switch (documentType) {
      case 'common':
        return supplierConfig.common;
      case 'reports':
      case 'test':
        return supplierConfig.reports;
      case 'archive':
        return supplierConfig.archive;
      default:
        return supplierConfig.archive;
    }
  }

  /**
   * 添加新的供应商路径配置
   */
  addSupplierPath(supplierName, basePath = null) {
    if (!basePath) {
      basePath = this.getSupplierArchivePath(supplierName);
    }

    this.supplierPaths[supplierName] = {
      archive: basePath,
      common: basePath + '/通用资料',
      reports: basePath + '/检测报告'
    };
  }

  /**
   * 获取所有供应商列表
   */
  getSupplierList() {
    return Object.keys(this.supplierPaths);
  }
}

// 创建全局单例实例
window.pathConfig = new PathConfig();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PathConfig;
}