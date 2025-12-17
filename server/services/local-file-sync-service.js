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
    // 🎯 修复：优先使用动态配置，支持自定义资料类型
    try {
      const fs = require('fs');
      const path = require('path');
      const documentTypesPath = path.join(__dirname, '../../data/document-types.json');

      if (fs.existsSync(documentTypesPath)) {
        const documentTypes = JSON.parse(fs.readFileSync(documentTypesPath, 'utf8'));

        // 如果传入的是ID，通过ID查找
        const docTypeById = documentTypes.find(dt => dt.id === documentType);
        if (docTypeById) {
          return docTypeById.category === 'common';
        }

        // 如果传入的是中文名称，通过名称查找
        const docTypeByName = documentTypes.find(dt => dt.name === documentType);
        if (docTypeByName) {
          return docTypeByName.category === 'common';
        }
      }
    } catch (error) {
      console.error('判断资料类型失败:', error);
    }

    // 🎯 删除硬编码列表，完全依赖动态配置
    // 如果动态配置中没有找到，默认作为检测报告处理
    return false;
  }

  /**
   * 生成标准文件名（基于v3.1架构）
   */
  generateFileName(fileData, supplierName, materialName, documentType, componentName, version = 1) {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const versionStr = `v${version}`; // 版本号字符串

    // 如果传入的documentType已经是中文名称，直接使用；否则尝试转换
    let documentTypeDisplayName = documentType;

    // 检查是否是中文（包含中文字符），如果不是中文，尝试作为ID转换
    if (!/[\u4e00-\u9fa5]/.test(documentType)) {
      documentTypeDisplayName = this.getDocumentTypeDisplayName(documentType);
    }

    if (this.isCommonDocument(documentType)) {
      // 通用资料命名格式：{供应商名称}_{证书类型}_v{版本号}_{日期}.{扩展名}
      // 🎯 修复：通用资料不包含物料名称和构成名称
      return `${supplierName}_${documentTypeDisplayName}_${versionStr}_${today}.${this.getFileExtension(fileData.originalname)}`;
    } else {
      // 检测报告命名格式：{供应商名称}_{物料名称}_{证书类型}_{构成名称}_v{版本号}_{日期}.{扩展名}
      // 构成信息在证书类型之后，版本号之前
      const componentNameClean = componentName ? componentName.replace(/[^\w\u4e00-\u9fa5]/g, '_') : '未知构成';
      return `${supplierName}_${materialName}_${documentTypeDisplayName}_${componentNameClean}_${versionStr}_${today}.${this.getFileExtension(fileData.originalname)}`;
    }
  }

  /**
   * 获取资料类型显示名称
   */
  getDocumentTypeDisplayName(documentType) {
    // 如果已经是中文名称，直接返回
    const commonTypes = ['质量协议', 'MSDS', '企业资质', 'ISO认证'];
    if (commonTypes.includes(documentType)) {
      return documentType;
    }

    // 如果是ID，从动态配置中查找对应的中文名称
    try {
      const fs = require('fs');
      const path = require('path');
      const documentTypesPath = path.join(__dirname, '../../data/document-types.json');

      if (fs.existsSync(documentTypesPath)) {
        const documentTypes = JSON.parse(fs.readFileSync(documentTypesPath, 'utf8'));
        const docType = documentTypes.find(dt => dt.id === documentType);
        if (docType) {
          console.log(`✅ LocalFileSyncService: ${documentType} -> ${docType.name}`);
          return docType.name;
        }
      }
    } catch (error) {
      console.error('获取资料类型显示名称失败:', error);
    }

    // 如果都找不到，返回原始值
    console.log(`⚠️ LocalFileSyncService: 无法找到类型名称，使用原始值: ${documentType}`);
    return documentType;
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
        const materialPath = path.join(supplierPath, '检测报告');

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
        // 检测报告路径：uploads/供应商A/检测报告/胶带/（文件直接放在构成文件夹下）
        const materialPath = path.join(supplierPath, '检测报告', materialName);

        await fs.ensureDir(materialPath);

        return {
            supplierPath,
            materialPath,
            documentPath: materialPath  // 检测报告的documentPath就是materialPath
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
    const commonPath = path.join(supplierPath, '通用资料');
    const materialPath = path.join(supplierPath, '检测报告');

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
      
      // 尝试移动文件，如果失败则尝试复制后删除
      try {
        // 先检查文件是否存在
        if (await fs.pathExists(fileInfo.filePath)) {
          await fs.move(fileInfo.filePath, backupPath);
          console.log(`✅ 文件已移动到备份目录`);
        } else {
          console.log(`⚠️ 源文件不存在: ${fileInfo.filePath}`);
        }
      } catch (moveError) {
        console.log(`⚠️ 移动失败，尝试复制后删除: ${moveError.message}`);
        try {
          // 如果移动失败，可能是文件被占用，尝试复制后删除
          if (await fs.pathExists(fileInfo.filePath)) {
            await fs.copy(fileInfo.filePath, backupPath);
            console.log(`✅ 文件已复制到备份目录`);
            
            // 多次尝试删除原文件
            const deleteAttempts = [1000, 2000, 3000]; // 1秒、2秒、3秒后尝试
            deleteAttempts.forEach((delay, index) => {
              setTimeout(async () => {
                try {
                  if (await fs.pathExists(fileInfo.filePath)) {
                    await fs.remove(fileInfo.filePath);
                    console.log(`✅ 原文件已删除 (第${index + 1}次尝试)`);
                  }
                } catch (deleteError) {
                  console.log(`⚠️ 原文件删除失败 (第${index + 1}次尝试): ${deleteError.message}`);
                  if (index === deleteAttempts.length - 1) {
                    console.log(`❌ 所有删除尝试都失败了，文件可能仍被占用: ${fileInfo.filePath}`);
                  }
                }
              }, delay);
            });
          }
        } catch (copyError) {
          console.log(`❌ 复制也失败了: ${copyError.message}`);
        }
      }
      
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