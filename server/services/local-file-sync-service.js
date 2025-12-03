/**
 * 本地文件同步服务
 * 基于供应商资料管理v3.1架构
 * 负责系统与本地文件系统的同步
 */

const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');

class LocalFileSyncService {
  constructor() {
    this.basePath = path.join(__dirname, '../../资料档案');
    this.backupPath = path.join(this.basePath, '_backup');
  }

  /**
   * 判断是否为通用资料
   */
  isCommonDocument(documentType) {
    const commonTypes = ['质量协议', 'MSDS', '企业资质', 'ISO认证'];
    return commonTypes.includes(documentType);
  }

  /**
   * 生成标准文件名（基于v3.1架构）
   */
  generateFileName(fileData, supplierName, materialName, documentType, componentName, version = 1) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const versionStr = `v${version}`; // 版本号字符串
    
    if (this.isCommonDocument(documentType)) {
      // 通用资料命名格式：{供应商名称}_{证书类型}_v{版本号}_{日期}.{扩展名}
      return `${supplierName}_${documentType}_${versionStr}_${today}.${this.getFileExtension(fileData.originalname)}`;
    } else {
      // 物料资料命名格式：{供应商名称}_{物料名称}_{证书类型}_v{版本号}_{日期}.{扩展名}
      // 构成信息通过文件夹结构体现，文件名中不再包含构成名称
      return `${supplierName}_${materialName}_${documentType}_${versionStr}_${today}.${this.getFileExtension(fileData.originalname)}`;
    }
  }

  /**
   * 获取文件扩展名
   */
  getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  // 创建文件夹结构（基于v3.1架构）
  async createFolderStructureV31(supplierName, materialName, documentType, componentName) {
    const basePath = path.join(__dirname, '../../资料档案');
    const supplierPath = path.join(basePath, supplierName);
    
    // 如果materialName为空，只创建基础文件夹结构
    if (!materialName) {
        const commonPath = path.join(supplierPath, '通用资料');
        const materialPath = path.join(supplierPath, '物料资料');
        
        await fs.ensureDir(commonPath);
        await fs.ensureDir(materialPath);
        
        return {
            supplierPath,
            commonPath,
            materialPath,
            documentPath: commonPath // 默认返回通用资料路径
        };
    }
    
    // 根据资料类型确定路径
    if (this.isCommonDocument(documentType)) {
        // 通用资料路径：uploads/供应商A/通用资料/质量协议/
        const commonPath = path.join(supplierPath, '通用资料');
        const documentPath = path.join(commonPath, documentType);
        
        await fs.ensureDir(documentPath);
        
        return {
            supplierPath,
            commonPath,
            documentPath
        };
    } else {
        // 物料资料路径：uploads/供应商A/物料资料/胶带/（文件直接放在构成文件夹下）
        const materialPath = path.join(supplierPath, '物料资料', materialName);
        
        await fs.ensureDir(materialPath);
        
        return {
            supplierPath,
            materialPath,
            documentPath: materialPath  // 物料资料的documentPath就是materialPath
        };
    }
}

  /**
   * 为供应商创建基础文件夹结构
   */
  async createSupplierFolderStructure(supplierName) {
    const basePath = path.join(__dirname, '../../资料档案');
    const supplierPath = path.join(basePath, supplierName);
    
    // 创建基础文件夹结构
    await fs.ensureDir(commonPath);
    await fs.ensureDir(materialPath);
    
    return {
      supplierPath,
      commonPath,
      materialPath
    };
  }

  // 生成统一备份路径
  generateBackupPath(fileInfo) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const backupDir = path.join(this.backupPath, today);
    const fileName = path.basename(fileInfo.filePath);
    return path.join(backupDir, fileName);
  }

  /**
   * 记录中文备份日志
   */
  async logBackupOperation(fileInfo, backupPath) {
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.backupPath, today, `backup_log_${today}.txt`);
    const timestamp = new Date().toLocaleString('zh-CN');
    
    const originalDir = path.dirname(fileInfo.filePath);
    const logEntry = `[${timestamp}] 文件备份: "${path.basename(fileInfo.filePath)}" 从 "${originalDir}" 移动到 "${backupPath}"\n`;
    
    await fs.appendFile(logFile, logEntry, 'utf8');
  }

  /**
   * 批量备份物料下的所有文件
   */
  async backupMaterialFiles(materialId, materialName) {
    const today = new Date().toISOString().split('T')[0];
    const backupDir = path.join(this.backupPath, today);
    await fs.ensureDir(backupDir);
    
    const logFile = path.join(backupDir, `backup_log_${today}.txt`);
    const timestamp = new Date().toLocaleString('zh-CN');
    
    // 获取物料下的所有文件
    const materialFiles = await this.getMaterialFiles(materialId);
    
    for (const file of materialFiles) {
      const backupPath = path.join(backupDir, path.basename(file.filePath));
      await fs.move(file.filePath, backupPath);
      
      const logEntry = `[${timestamp}] 批量备份: "${path.basename(file.filePath)}" 从 "${file.originalPath}" 移动到 "${backupPath}" (物料: ${materialName})\n`;
      await fs.appendFile(logFile, logEntry, 'utf8');
    }
  }

  /**
   * 获取物料下的所有文件（需要实现）
   */
  async getMaterialFiles(materialId) {
    // TODO: 从数据库获取物料下的所有文件
    // 这里需要查询 supplier_documents 表
    return [];
  }

  /**
   * 上传文件同步
   */
  async syncUpload(fileData, supplierInfo, materialInfo, documentType, componentInfo, version = 1) {
    try {
      // 1. 创建文件夹结构（基于v3.1架构）
      const folderStructure = await this.createFolderStructureV31(
        supplierInfo.supplierName,
        materialInfo?.materialName,
        documentType,
        componentInfo?.componentName
      );
      
      // 2. 生成标准文件名（基于v3.1命名规范）
      const fileName = this.generateFileName(
        fileData,
        supplierInfo.supplierName,
        materialInfo?.materialName,
        documentType,
        componentInfo?.componentName,
        version
      );
      
      // 3. 保存文件到本地
      const filePath = path.join(folderStructure.documentPath, fileName);
      
      // 如果目标文件已存在，先删除
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
      }
      
      await fs.move(fileData.tempFilePath, filePath);
      
      // 4. 返回文件信息
      return {
        success: true,
        finalPath: filePath,
        fileName: fileName,
        originalPath: folderStructure.documentPath
      };
      
    } catch (error) {
      logger.error('文件上传同步失败:', error);
      throw error;
    }
  }

  /**
   * 删除文件同步
   */
  async syncDelete(fileInfo) {
    try {
      console.log(`🗑️ LocalFileSyncService.syncDelete 开始执行:`, {
        id: fileInfo.id,
        filePath: fileInfo.filePath,
        documentType: fileInfo.documentType,
        supplierId: fileInfo.supplierId,
        materialId: fileInfo.materialId
      });

      // 1. 检查源文件是否存在
      const sourceFileExists = await fs.pathExists(fileInfo.filePath);
      console.log(`📁 源文件是否存在: ${sourceFileExists} - ${fileInfo.filePath}`);
      
      if (!sourceFileExists) {
        console.error(`❌ 源文件不存在，跳过备份: ${fileInfo.filePath}`);
        return {
          success: false,
          error: 'Source file not found',
          filePath: fileInfo.filePath
        };
      }

      // 2. 移动文件到备份文件夹
      const backupPath = this.generateBackupPath(fileInfo);
      console.log(`📂 备份路径: ${backupPath}`);
      
      await fs.ensureDir(path.dirname(backupPath));
      await fs.move(fileInfo.filePath, backupPath);
      console.log(`✅ 文件已移动到备份目录`);
      
      // 3. 记录中文备份日志
      await this.logBackupOperation(fileInfo, backupPath);
      console.log(`✅ 备份日志已记录`);
      
      // 4. 清理空文件夹
      const originalDir = path.dirname(fileInfo.filePath);
      await this.cleanEmptyFolders(originalDir);
      console.log(`✅ 空文件夹清理完成`);
      
      return {
        success: true,
        backupPath: backupPath
      };
      
    } catch (error) {
      console.error(`❌ 文件删除同步失败:`, error);
      logger.error('文件删除同步失败:', error);
      throw error;
    }
  }

  /**
   * 清理空文件夹
   */
  async cleanEmptyFolders(folderPath) {
    try {
      const isEmpty = await this.isFolderEmpty(folderPath);
      if (isEmpty) {
        await fs.remove(folderPath);
        // 递归清理上级空文件夹
        const parentPath = path.dirname(folderPath);
        if (parentPath !== this.basePath) {
          await this.cleanEmptyFolders(parentPath);
        }
      }
    } catch (error) {
      logger.warn('清理空文件夹失败:', error);
    }
  }

  /**
   * 检查文件夹是否为空
   */
  async isFolderEmpty(folderPath) {
    try {
      const files = await fs.readdir(folderPath);
      return files.length === 0;
    } catch (error) {
      return false;
    }
  }
}

module.exports = LocalFileSyncService;