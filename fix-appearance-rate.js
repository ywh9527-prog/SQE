const fs = require('fs');

const filePath = 'server/services/data-processor.js';
let content = fs.readFileSync(filePath, 'utf8');

// 查找并替换appearanceRate的处理逻辑
const oldCode = `appearanceRate: APPEARANCE_RATE_INDEX >= 0 && APPEARANCE_RATE_INDEX < row.length ? String(row[APPEARANCE_RATE_INDEX] || '').trim() : '',`;

const newCode = `appearanceRate: APPEARANCE_RATE_INDEX >= 0 && APPEARANCE_RATE_INDEX < row.length ? (() => {
            const val = row[APPEARANCE_RATE_INDEX];
            if (!val || val === '') return '';
            const num = parseFloat(val);
            // 如果是小数(0-1之间),转换为百分比
            if (!isNaN(num)) {
              return num < 1 ? (num * 100).toFixed(2) : num.toFixed(2);
            }
            return String(val).trim();
          })() : '',`;

content = content.replace(oldCode, newCode);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ 修改成功!');
