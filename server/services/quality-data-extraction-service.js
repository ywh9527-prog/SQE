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
     * @returns {Promise<Object>} 质量数据映射（供应商名称 -> 质量数据）
     */
    async extractQualityData(startDate, endDate) {
        try {
            // 查询指定时间范围内的IQC数据
            const iqcDataList = await IQCData.findAll({
                where: {
                    timeRangeStart: {
                        [require('sequelize').Op.gte]: startDate
                    },
                    timeRangeEnd: {
                        [require('sequelize').Op.lte]: endDate
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
                    const vendorQualityData = await this.extractFromRawData(iqcData);
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
     * @returns {Promise<Object>} 质量数据映射
     */
    async extractFromRawData(iqcData) {
        const qualityDataMap = {};

        try {
            const rawData = iqcData.rawData;

            if (!rawData || !Array.isArray(rawData)) {
                return qualityDataMap;
            }

            // 遍历rawData，按供应商统计
            for (const row of rawData) {
                // 假设rawData中包含供应商名称和检验结果
                // 这里需要根据实际的rawData结构进行调整
                const supplierName = row['供应商名称'] || row['供应商'] || row['Supplier'];
                const result = row['检验结果'] || row['结果'] || row['Result'];

                if (!supplierName) {
                    continue;
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
                if (result && (result.includes('合格') || result.includes('OK') || result.includes('PASS'))) {
                    qualityDataMap[supplierName].okBatches++;
                } else if (result && (result.includes('不合格') || result.includes('NG') || result.includes('FAIL'))) {
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