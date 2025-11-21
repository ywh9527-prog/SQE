const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/config');
const Supplier = require('./Supplier');

const Certificate = sequelize.define('Certificate', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: Supplier,
            key: 'id'
        },
        comment: '关联的供应商ID'
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '证书类型 (如 ISO9001, IATF16949)'
    },
    certificate_number: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '证书编号'
    },
    issue_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: '发证日期'
    },
    expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: '过期日期'
    },
    file_path: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '证书文件存储路径'
    },
    status: {
        type: DataTypes.VIRTUAL,
        get() {
            const now = new Date();
            const expiry = new Date(this.expiry_date);
            const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

            if (daysUntilExpiry < 0) return 'Expired';
            if (daysUntilExpiry <= 30) return 'Critical'; // 30天内过期
            if (daysUntilExpiry <= 90) return 'Warning';  // 90天内过期
            return 'Valid';
        },
        comment: '证书状态 (虚拟字段)'
    }
}, {
    tableName: 'certificates',
    comment: '供应商资质证书表'
});

// 建立关联关系
Supplier.hasMany(Certificate, { foreignKey: 'supplier_id', as: 'certificates' });
Certificate.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

module.exports = Certificate;
