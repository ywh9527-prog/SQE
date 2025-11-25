const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/config');

const IQCData = sequelize.define('IQCData', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '原始文件名'
    },
    fileHash: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '文件内容哈希，用于去重'
    },
    uploadTime: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: '上传时间'
    },
    dataType: {
        type: DataTypes.ENUM('purchase', 'external'),
        allowNull: false,
        comment: '数据类型：purchase-外购, external-外协'
    },
    recordCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '记录条数'
    },
    timeRangeStart: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: '数据时间范围开始（基于G列检验时间）'
    },
    timeRangeEnd: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: '数据时间范围结束（基于G列检验时间）'
    },
    summary: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '汇总统计数据'
    },
    monthlyData: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '月度统计数据'
    },
    rawData: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: '原始解析数据'
    },
    sheetName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '分析的工作表名称'
    }
}, {
    tableName: 'iqc_data',
    comment: 'IQC 分析数据历史记录'
});

module.exports = IQCData;
