const IQCData = require('../models/IQCData');
const logger = require('../utils/logger');

/**
 * QualityDataExtractionService
 *
 * 从IQCData表提取质量数据的服务
 */
class QualityDataExtractionService {
    /**
     * 提取指定周期的质量数据
     * @param {Date} startDate - 开始日期
     * @param {Date} endDate - 结束日期
     * @param {string} dataType - 数据类型：purchase-外购, external-外协
     * @returns {Promise<Object>} 质量数据映射（供应商名称 -> 质量数据）
     */
    async extractQualityData(startDate, endDate, dataType = 'purchase') {
        try {
            // 查询与指定时间范围有交集的IQC数据，并按dataType过滤
            // 条件：数据时间范围与评价周期有交集，且数据类型匹配
            const iqcDataList = await IQCData.findAll({
                where: {
                    dataType: dataType,  // 按数据类型过滤（外购/外协）
                    timeRangeStart: {
                        [require('sequelize').Op.lte]: endDate  // 数据开始时间 <= 评价周期结束时间
                    },
                    timeRangeEnd: {
                        [require('sequelize').Op.gte]: startDate  // 数据结束时间 >= 评价周期开始时间
                    }
                }
            });

            // 按供应商统计质量数据
            const qualityDataMap = {};

            for (const iqcData of iqcDataList) {
                // 解析summary字段
                const summary = iqcData.summary || {};

                // 如果summary中有按供应商统计的数据，直接使用
                if (summary.bySupplier) {
                    for (const [supplierName, data] of Object.entries(summary.bySupplier)) {
                        if (!qualityDataMap[supplierName]) {
                            qualityDataMap[supplierName] = {
                                totalBatches: 0,
                                okBatches: 0,
                                ngBatches: 0,
                                passRate: 0
                            };
                        }

                        qualityDataMap[supplierName].totalBatches += data.totalBatches || 0;
                        qualityDataMap[supplierName].okBatches += data.okBatches || 0;
                        qualityDataMap[supplierName].ngBatches += data.ngBatches || 0;
                    }
                } else {
                    // 如果没有按供应商统计的数据，需要从rawData中提取
                    const vendorQualityData = await this.extractFromRawData(iqcData, startDate, endDate);
                    for (const [supplierName, data] of Object.entries(vendorQualityData)) {
                        if (!qualityDataMap[supplierName]) {
                            qualityDataMap[supplierName] = {
                                totalBatches: 0,
                                okBatches: 0,
                                ngBatches: 0,
                                passRate: 0
                            };
                        }

                        qualityDataMap[supplierName].totalBatches += data.totalBatches;
                        qualityDataMap[supplierName].okBatches += data.okBatches;
                        qualityDataMap[supplierName].ngBatches += data.ngBatches;
                    }
                }
            }

            // 计算合格率
            for (const [supplierName, data] of Object.entries(qualityDataMap)) {
                if (data.totalBatches > 0) {
                    data.passRate = ((data.okBatches / data.totalBatches) * 100).toFixed(2);
                } else {
                    data.passRate = 0;
                }
            }

            logger.info(`提取质量数据成功，共 ${Object.keys(qualityDataMap).length} 家供应商`);
            return qualityDataMap;
        } catch (error) {
            logger.error('提取质量数据失败:', error);
            throw error;
        }
    }

    /**
     * 从rawData中提取质量数据
     * @param {Object} iqcData - IQC数据
     * @param {Date} startDate - 评价周期开始日期
     * @param {Date} endDate - 评价周期结束日期
     * @returns {Promise<Object>} 质量数据映射
     */
    async extractFromRawData(iqcData, startDate, endDate) {
        const qualityDataMap = {};

        try {
            const rawData = iqcData.rawData;

            if (!rawData || !Array.isArray(rawData)) {
                return qualityDataMap;
            }

            // 将日期字符串转换为Date对象进行比较
            const startDateTime = new Date(startDate).setHours(0, 0, 0, 0);
            const endDateTime = new Date(endDate).setHours(23, 59, 59, 999);

            // 遍历rawData，按供应商统计（只统计评价周期范围内的数据）
            for (const row of rawData) {
                // 使用实际的字段名（英文）
                const supplierName = row['supplier'];
                const result = row['result'];
                const time = row['time'];

                // 如果没有供应商名称，跳过
                if (!supplierName) {
                    continue;
                }

                // 检查时间是否在评价周期范围内
                if (time) {
                    const rowTime = new Date(time).getTime();
                    if (rowTime < startDateTime || rowTime > endDateTime) {
                        continue; // 跳过不在评价周期范围内的数据
                    }
                }

                if (!qualityDataMap[supplierName]) {
                    qualityDataMap[supplierName] = {
                        totalBatches: 0,
                        okBatches: 0,
                        ngBatches: 0,
                        passRate: 0
                    };
                }

                qualityDataMap[supplierName].totalBatches++;

                // 判断是否合格
                if (result === 'OK') {
                    qualityDataMap[supplierName].okBatches++;
                } else if (result === 'NG') {
                    qualityDataMap[supplierName].ngBatches++;
                }
            }
        } catch (error) {
            logger.error('从rawData提取质量数据失败:', error);
        }

        return qualityDataMap;
    }

    /**
     * 将合格率转换为质量分数
     * @param {number} passRate - 合格率（0-100）
     * @returns {number} 质量分数（0-100）
     */
    passRateToScore(passRate) {
        // 简单的线性转换：合格率 = 质量分数
        return parseFloat(passRate);
    }
}

module.exports = new QualityDataExtractionService();