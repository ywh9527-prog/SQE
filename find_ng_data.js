const sqlite3 = require('sqlite3');

const db = new sqlite3.Database('./sqe_database.sqlite');

// 查找所有外购数据中的NG缺陷
db.all('SELECT raw_data FROM iqc_data WHERE data_type = "purchase"', (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    
    console.log(`检查 ${rows.length} 条外购数据中的NG缺陷...`);
    
    let ngRecords = [];
    
    rows.forEach((row, index) => {
        const rawData = JSON.parse(row.raw_data);
        
        rawData.forEach((cell, cellIndex) => {
            if (cell && typeof cell === 'object') {
                const defects = {
                    appearanceDefect: cell.appearanceDefect,
                    dimensionDefect: cell.dimensionDefect,
                    performanceDefect: cell.performanceDefect,
                    result: cell.result,
                    supplier: cell.supplier
                };
                
                if (defects.appearanceDefect === 'NG' || defects.dimensionDefect === 'NG' || defects.performanceDefect === 'NG') {
                    ngRecords.push({
                        recordIndex: index,
                        cellIndex: cellIndex,
                        defects: defects
                    });
                }
            }
        });
    });
    
    console.log(`\n发现 ${ngRecords.length} 条包含NG缺陷的记录:`);
    ngRecords.slice(0, 5).forEach((record, i) => {
        console.log(`\n记录 ${i + 1}:`);
        console.log(`  供应商: ${record.defects.supplier}`);
        console.log(`  结果: ${record.defects.result}`);
        console.log(`  外观缺陷: ${record.defects.appearanceDefect}`);
        console.log(`  尺寸缺陷: ${record.defects.dimensionDefect}`);
        console.log(`  性能缺陷: ${record.defects.performanceDefect}`);
    });
    
    if (ngRecords.length === 0) {
        console.log('\n外购数据中确实没有NG缺陷标记。');
        console.log('所有缺陷字段值都是: 空字符串、数字、或"/"');
    }
    
    db.close();
});