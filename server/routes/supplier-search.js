const express = require('express');
const router = express.Router();
const { sequelize } = require('../database/config');
const IQCData = require('../models/IQCData');
const DataProcessor = require('../services/data-processor');
const logger = require('../utils/logger');

/**
 * 📋 [供应商搜索API] 基于最新数据的供应商搜索
 * 🎯 功能：避免重复上传，直接使用数据库中最新的数据
 * ⚡ 优势：性能更好，用户体验更佳
 * 📝 参数：{ supplierName?, dataType? }
 */
router.post('/search-supplier-latest', express.json(), async (req, res) => {
    try {
        const { supplierName, dataType } = req.body;
        
        // 获取最新数据记录
        const whereClause = dataType ? { dataType } : {};
        const latestRecord = await IQCData.findOne({
            where: whereClause,
            order: [['uploadTime', 'DESC']]
        });

        if (!latestRecord) {
            return res.status(404).json({ 
                error: '未找到数据，请先上传Excel文件',
                code: 'NO_DATA_FOUND'
            });
        }

        logger.info(`使用最新数据搜索供应商: ${supplierName || '全部'}, 文件ID: ${latestRecord.id}`);

        // 使用现有的DataProcessor处理数据
        const dataProcessor = new DataProcessor();
        const result = dataProcessor.recalculate(
            latestRecord.rawData, 
            supplierName || null, 
            null
        );

        // 添加元数据
        result.fileId = latestRecord.id;
        result.fileName = latestRecord.fileName;
        result.dataType = latestRecord.dataType;
        result.uploadTime = latestRecord.uploadTime;

        res.json(result);
    } catch (error) {
        logger.error('供应商搜索失败:', error);
        res.status(500).json({ 
            error: '搜索失败，请稍后重试',
            details: error.message 
        });
    }
});

/**
 * 📋 [数据信息API] 获取最新数据信息
 * 🎯 功能：返回当前数据库中的数据概览
 * 📝 参数：无
 */
router.get('/latest-supplier-data-info', async (req, res) => {
    try {
        // 获取外购和外协的最新数据
        const [purchaseLatest, externalLatest] = await Promise.all([
            IQCData.findOne({
                where: { dataType: 'purchase' },
                order: [['uploadTime', 'DESC']]
            }),
            IQCData.findOne({
                where: { dataType: 'external' },
                order: [['uploadTime', 'DESC']]
            })
        ]);

        const result = {
            purchase: purchaseLatest ? {
                fileId: purchaseLatest.id,
                fileName: purchaseLatest.fileName,
                uploadTime: purchaseLatest.uploadTime,
                recordCount: purchaseLatest.recordCount,
                timeRange: {
                    start: purchaseLatest.timeRangeStart,
                    end: purchaseLatest.timeRangeEnd
                }
            } : null,
            external: externalLatest ? {
                fileId: externalLatest.id,
                fileName: externalLatest.fileName,
                uploadTime: externalLatest.uploadTime,
                recordCount: externalLatest.recordCount,
                timeRange: {
                    start: externalLatest.timeRangeStart,
                    end: externalLatest.timeRangeEnd
                }
            } : null
        };

        res.json(result);
    } catch (error) {
        logger.error('获取数据信息失败:', error);
        res.status(500).json({ 
            error: '获取数据信息失败',
            details: error.message 
        });
    }
});

/**
 * 📋 [供应商建议API] 获取供应商名称建议
 * 🎯 功能：为前端输入框提供自动补全建议
 * 📝 参数：无
 */
router.get('/suppliers/suggestions', async (req, res) => {
    try {
        // 获取最新记录
        const latestRecord = await IQCData.findOne({
            order: [['uploadTime', 'DESC']]
        });

        if (!latestRecord) {
            return res.json({ suppliers: [] });
        }

        // 从原始数据中提取供应商名称
        const suppliers = new Set();
        if (latestRecord.rawData && Array.isArray(latestRecord.rawData)) {
            latestRecord.rawData.forEach(row => {
                if (row.supplier && row.supplier.trim()) {
                    suppliers.add(row.supplier.trim());
                }
            });
        }

        const supplierList = Array.from(suppliers).sort();
        res.json({ suppliers: supplierList });
    } catch (error) {
        logger.error('获取供应商建议失败:', error);
        res.status(500).json({ 
            error: '获取供应商建议失败',
            details: error.message 
        });
    }
});

module.exports = router;