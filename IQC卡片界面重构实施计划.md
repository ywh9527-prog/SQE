# IQC 卡片界面重构实施计划（更新版）

**创建时间**: 2025-11-25  
**更新时间**: 2025-11-25  
**目标**: 将上传区域改造为外购/外协数据卡片，实现数据状态可视化和快速分析

---

## 🎯 **为什么这么做（产品目标）**

### **用户痛点**
1. 当前只能上传文件，无法直接查看数据库中已有的外购/外协数据状态
2. 重复上传相同类型数据，无法直观看到数据增量
3. 缺乏数据更新提醒，可能因数据滞后影响决策
4. 外购/外协数据混在一起，无法快速切换分析

### **产品价值**
1. **一目了然**: 卡片式展示让用户快速掌握两类数据状态
2. **操作便捷**: 一键分析，无需重复上传
3. **数据驱动**: 清晰的时间范围和更新提醒
4. **专业体验**: 现代化的界面设计

---

## 📋 **现有架构深度分析**

### **数据流架构**
```
用户上传Excel → ExcelParserService解析 → DataProcessorService处理 → IQCData模型存储 → 前端展示
```

### **关键组件分析**

#### **1. 数据类型检测（现有逻辑）**
**文件**: `server/services/excel-parser.js`
```javascript
// 现有的文件类型检测逻辑
static detectFileType(data) {
  const headerRow = data[2];
  const extIndices = COLUMN_INDICES[FILE_TYPE_CONSTANTS.EXTERNAL];
  const purIndices = COLUMN_INDICES[FILE_TYPE_CONSTANTS.PURCHASE];
  
  // 基于表头特征检测外购/外协
  // 外协：R列包含"最终"或"判定"，S列包含"处理"或"方式"
  // 外购：S列包含"最终"或"判定"，T列包含"处理"或"方式"
}
```

#### **2. 前端状态管理（现有逻辑）**
**文件**: `public/js/modules/iqc.js`
```javascript
const state = {
  uploadedFile: null,        // 当前上传的文件对象
  selectedSheetName: null,   // 选择的工作表名称
  fileId: null,             // 数据库记录ID
  isInitialized: false      // 模块初始化状态
};
```

#### **3. 现有API接口**
- `POST /api/get-sheets` - 获取工作表信息
- `POST /api/upload` - 上传并分析文件
- `POST /api/filter-data` - 基于fileId筛选数据
- `GET /api/latest-data` - 获取最新数据
- `GET /api/history` - 获取历史记录

---

## 📋 **具体实施计划（与现有架构深度集成）**

### **Phase 1: 数据层改造** (预计1天)

#### **任务1.1: 扩展 IQCData 模型**
**文件**: `server/models/IQCData.js`

**需要添加的字段**:
```javascript
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
}
```

**实现方式**: 由于是开发环境，使用 `sequelize.sync({ force: true })` 重置数据库

#### **任务1.2: 修改上传逻辑**
**文件**: `server/routes/upload.js`

**核心逻辑修改**:
```javascript
// 在 upload 路由中，利用现有的文件类型检测
const parseResult = ExcelParserService.parseExcelFileWithSheets(req.file.path);
const jsonData = parseResult.data;

// 使用现有的检测逻辑确定数据类型
const dataType = ExcelParserService.detectFileType(jsonData);

// 计算统计信息（利用现有的处理逻辑）
const dataProcessor = new DataProcessorService();
const result = dataProcessor.processIQCData(jsonData, null, null, req.file.originalname);

// 计算时间范围和记录数
const timeRange = calculateTimeRange(jsonData);
const recordCount = jsonData.length;

// 保存时包含新字段
const record = await IQCData.create({
  fileName: req.file.originalname,
  fileHash: fileHash,
  dataType: dataType,  // 新增：数据类型
  recordCount: recordCount,  // 新增：记录条数
  timeRangeStart: timeRange.start,  // 新增：时间范围开始
  timeRangeEnd: timeRange.end,      // 新增：时间范围结束
  summary: result.summary,
  monthlyData: result.monthlyData,
  rawData: result.rawData,
  sheetName: parseResult.selectedSheet
});

// 新增：计算时间范围的辅助函数
function calculateTimeRange(data) {
  if (!data || data.length === 0) {
    return { start: null, end: null };
  }
  
  const dates = data
    .map(row => row.time)
    .filter(date => date && !isNaN(new Date(date).getTime()))
    .map(dateStr => new Date(dateStr));
    
  if (dates.length === 0) {
    return { start: null, end: null };
  }
  
  dates.sort((a, b) => a - b);
  return {
    start: dates[0].toISOString().split('T')[0],  // YYYY-MM-DD格式
    end: dates[dates.length - 1].toISOString().split('T')[0]
  };
}
```

---

### **Phase 2: 后端API开发** (预计1天)

#### **任务2.1: 数据源统计接口**
**文件**: 新建 `server/routes/data-source.js`

**接口设计**:
```
GET /api/data-source-stats
```

**实现逻辑**:
```javascript
router.get('/data-source-stats', async (req, res) => {
  try {
    // 分别获取外购和外协的最新记录
    const [latestPurchase, latestExternal] = await Promise.all([
      IQCData.findOne({
        where: { dataType: 'purchase' },
        order: [['uploadTime', 'DESC']]
      }),
      IQCData.findOne({
        where: { dataType: 'external' },
        order: [['uploadTime', 'DESC']]
      })
    ]);

    // 自定义更新提醒时间：7天
    const UPDATE_WARNING_DAYS = 7;
    const now = new Date();

    const formatStats = (record) => {
      if (!record) {
        return {
          totalCount: 0,
          lastUpdate: null,
          timeRange: { start: null, end: null },
          recentCount: 0,
          needsUpdate: true,
          hasData: false
        };
      }

      const daysSinceUpdate = Math.floor((now - record.uploadTime) / (1000 * 60 * 60 * 24));
      
      return {
        totalCount: record.recordCount || 0,
        lastUpdate: record.uploadTime,
        timeRange: {
          start: record.timeRangeStart,
          end: record.timeRangeEnd
        },
        recentCount: record.recordCount || 0,
        needsUpdate: daysSinceUpdate > UPDATE_WARNING_DAYS,
        hasData: true,
        fileId: record.id,
        fileName: record.fileName
      };
    };

    res.json({
      purchase: formatStats(latestPurchase),
      external: formatStats(latestExternal),
      settings: {
        updateWarningDays: UPDATE_WARNING_DAYS
      }
    });
  } catch (error) {
    console.error('Error fetching data source stats:', error);
    res.status(500).json({ error: '获取数据源统计失败' });
  }
});
```

#### **任务2.2: 扩展现有分析接口**
**文件**: 修改 `server/routes/upload.js`

**修改现有的 `filter-data` 接口**:
```javascript
// 在现有的 filter-data 路由中添加数据类型筛选
router.post('/filter-data', express.json(), async (req, res) => {
  const { fileId, supplierName, timeFilterType, timeFilterValue, dataType } = req.body;

  if (!fileId) {
    return res.status(400).json({ error: 'File ID is required.' });
  }

  try {
    const record = await IQCData.findByPk(fileId);
    if (!record) {
      return res.status(404).json({ error: '记录不存在或已过期' });
    }

    // 新增：如果指定了dataType，验证匹配
    if (dataType && record.dataType !== dataType) {
      return res.status(400).json({ error: `数据类型不匹配，期望: ${dataType}, 实际: ${record.dataType}` });
    }

    const dataProcessor = new DataProcessorService();
    const timeFilter = timeFilterType && timeFilterValue ? { type: timeFilterType, value: timeFilterValue } : null;

    const result = dataProcessor.recalculate(record.rawData, supplierName, timeFilter);

    // 保持现有字段，新增dataType信息
    result.fileId = record.id;
    result.fileName = record.fileName;
    result.dataType = record.dataType;  // 新增

    res.json(result);
  } catch (error) {
    console.error('Error filtering data:', error);
    res.status(500).json({ error: `筛选失败: ${error.message}` });
  }
});
```

---

### **Phase 3: 前端界面重构** (预计2天)

#### **任务3.1: HTML结构改造**
**文件**: `public/index.html`

**精确定位修改区域**:
```html
<!-- 找到现有的 section.iqc-upload-section（约在第100行左右） -->
<section class="iqc-upload-section">
  <div class="upload-area">
    <form id="uploadForm">
      <div class="file-input-wrapper">
        <input type="file" id="excelFile" accept=".xlsx,.xls" required>
        <label for="excelFile">
          <i class="ph ph-upload-simple"></i>
          <span>选择或拖拽 Excel 文件到此处</span>
          <small>支持 .xlsx 和 .xls 格式</small>
        </label>
      </div>
      <button type="button" id="uploadBtn" class="btn-primary">
        <i class="ph ph-play"></i>
        上传并分析
      </button>
    </form>
  </div>
</section>

<!-- 替换为新的数据源卡片区域 -->
<section class="iqc-data-source-section">
  <div class="data-source-cards">
    <!-- 外购数据卡片 -->
    <div class="data-card" data-type="purchase">
      <div class="card-header">
        <h4>📦 外购数据</h4>
        <div class="update-status" id="purchase-update-status">
          <span class="status-loading">加载中...</span>
        </div>
      </div>
      <div class="card-stats">
        <div class="stat-item">
          <span class="label">总数据</span>
          <span class="value" id="purchase-total-count">-</span>
        </div>
        <div class="stat-item">
          <span class="label">本次新增</span>
          <span class="value" id="purchase-recent-count">-</span>
        </div>
      </div>
      <div class="card-time-range">
        <span class="time-range-label">数据时间范围：</span>
        <span id="purchase-time-range">-</span>
      </div>
      <div class="card-actions">
        <button class="btn-secondary update-btn" data-type="purchase">
          <i class="ph ph-arrow-clockwise"></i>
          更新数据
        </button>
      </div>
    </div>

    <!-- 外协数据卡片 -->
    <div class="data-card" data-type="external">
      <div class="card-header">
        <h4>🏭 外协数据</h4>
        <div class="update-status" id="external-update-status">
          <span class="status-loading">加载中...</span>
        </div>
      </div>
      <div class="card-stats">
        <div class="stat-item">
          <span class="label">总数据</span>
          <span class="value" id="external-total-count">-</span>
        </div>
        <div class="stat-item">
          <span class="label">本次新增</span>
          <span class="value" id="external-recent-count">-</span>
        </div>
      </div>
      <div class="card-time-range">
        <span class="time-range-label">数据时间范围：</span>
        <span id="external-time-range">-</span>
      </div>
      <div class="card-actions">
        <button class="btn-secondary update-btn" data-type="external">
          <i class="ph ph-arrow-clockwise"></i>
          更新数据
        </button>
      </div>
    </div>
  </div>
</section>
```

#### **任务3.2: 前端逻辑深度集成**
**文件**: `public/js/modules/iqc.js`

**扩展现有状态管理**:
```javascript
// 在现有的 state 对象中添加
const state = {
  uploadedFile: null,
  selectedSheetName: null,
  fileId: null,
  isInitialized: false,
  // 新增：数据源状态
  dataSourceStats: {
    purchase: null,
    external: null
  },
  currentDataType: null  // 当前分析的数据类型
};

// 扩展现有的 cacheElements 方法
cacheElements() {
  // 保留现有的元素缓存
  els = {
    // ... 现有的所有元素
    uploadForm: document.getElementById('uploadForm'),
    fileInput: document.getElementById('excelFile'),
    uploadBtn: document.getElementById('uploadBtn'),
    // ... 其他现有元素
    
    // 新增：数据源卡片相关元素
    dataSourceSection: document.querySelector('.iqc-data-source-section'),
    purchaseCard: document.querySelector('.data-card[data-type="purchase"]'),
    externalCard: document.querySelector('.data-card[data-type="external"]'),
    purchaseUpdateStatus: document.getElementById('purchase-update-status'),
    externalUpdateStatus: document.getElementById('external-update-status'),
    purchaseTotalCount: document.getElementById('purchase-total-count'),
    externalTotalCount: document.getElementById('external-total-count'),
    purchaseRecentCount: document.getElementById('purchase-recent-count'),
    externalRecentCount: document.getElementById('external-recent-count'),
    purchaseTimeRange: document.getElementById('purchase-time-range'),
    externalTimeRange: document.getElementById('external-time-range')
  };
},

// 扩展现有的 bindEvents 方法
bindEvents() {
  // 保留现有的所有事件绑定
  // ... 现有的事件绑定代码
  
  // 新增：数据源卡片点击事件（直接切换数据）
  if (els.purchaseCard && els.externalCard) {
    els.purchaseCard.addEventListener('click', () => this.handleCardClick('purchase'));
    els.externalCard.addEventListener('click', () => this.handleCardClick('external'));
    
    // 更新按钮事件
    const updateBtns = document.querySelectorAll('.update-btn');
    updateBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止触发卡片点击事件
        const dataType = e.currentTarget.dataset.type;
        this.handleUpdateData(dataType);
      });
    });
  }
},

// 新增：加载数据源统计
async loadDataSourceStats() {
  try {
    const stats = await window.App.API.getDataSourceStats();
    state.dataSourceStats = stats;
    this.updateDataCards(stats);
    
    // 自动选中最新数据（如果当前没有选中任何类型）
    if (!state.currentDataType) {
      const latestType = this.getLatestDataType(stats);
      if (latestType && stats[latestType].hasData) {
        await this.handleCardClick(latestType, false); // false表示不显示toast
      }
    }
  } catch (error) {
    console.error('Failed to load data source stats:', error);
    this.showToast('加载数据状态失败', 'error');
  }
},

// 新增：获取最新数据类型
getLatestDataType(stats) {
  if (!stats.purchase.hasData && !stats.external.hasData) return null;
  if (!stats.purchase.hasData) return 'external';
  if (!stats.external.hasData) return 'purchase';
  
  // 比较更新时间，返回最新的
  const purchaseTime = new Date(stats.purchase.lastUpdate);
  const externalTime = new Date(stats.external.lastUpdate);
  return purchaseTime > externalTime ? 'purchase' : 'external';
},

// 新增：更新数据卡片显示
updateDataCards(stats) {
  this.updateCard('purchase', stats.purchase);
  this.updateCard('external', stats.external);
},

// 新增：更新单个卡片
updateCard(type, data) {
  if (!data.hasData) {
    // 无数据时的显示
    document.getElementById(`${type}-total-count`).textContent = '0';
    document.getElementById(`${type}-recent-count`).textContent = '0';
    document.getElementById(`${type}-time-range`).textContent = '暂无数据';
    
    const statusEl = document.getElementById(`${type}-update-status`);
    statusEl.className = 'update-status none';
    statusEl.innerHTML = '<span class="status-none">📭 暂无数据</span>';
    return;
  }
  
  // 更新统计数据
  document.getElementById(`${type}-total-count`).textContent = data.totalCount;
  document.getElementById(`${type}-recent-count`).textContent = data.recentCount;
  
  // 更新时间范围
  if (data.timeRange.start && data.timeRange.end) {
    document.getElementById(`${type}-time-range`).textContent = 
      `${data.timeRange.start} 至 ${data.timeRange.end}`;
  } else {
    document.getElementById(`${type}-time-range`).textContent = '时间范围未知';
  }
  
  // 更新状态指示
  const statusEl = document.getElementById(`${type}-update-status`);
  if (data.needsUpdate) {
    statusEl.className = 'update-status warning';
    statusEl.innerHTML = '<span class="status-warning">⚠️ 需要更新</span>';
  } else {
    const daysSinceUpdate = Math.floor((new Date() - new Date(data.lastUpdate)) / (1000 * 60 * 60 * 24));
    statusEl.className = 'update-status ok';
    statusEl.innerHTML = `<span class="status-ok">✅ ${daysSinceUpdate}天前更新</span>`;
  }
  
  // 更新当前选中状态
  const cardEl = document.querySelector(`.data-card[data-type="${type}"]`);
  if (state.currentDataType === type && state.fileId === data.fileId) {
    cardEl.classList.add('active');
  } else {
    cardEl.classList.remove('active');
  }
},

// 新增：卡片点击切换数据类型
async handleCardClick(dataType, showToast = true) {
  const stats = state.dataSourceStats[dataType];
  if (!stats || !stats.hasData) {
    if (showToast) {
      this.showToast(`${dataType === 'purchase' ? '外购' : '外协'}数据暂无记录，请先上传数据`, 'warning');
    }
    return;
  }
  
  // 如果点击的是当前已选中的类型，不做任何操作
  if (state.currentDataType === dataType && state.fileId === stats.fileId) {
    if (showToast) {
      this.showToast('当前已是此类型数据', 'info');
    }
    return;
  }
  
  this.showLoading(true);
  state.currentDataType = dataType;
  state.fileId = stats.fileId;
  state.uploadedFile = null;
  
  try {
    const data = await window.App.API.filterData({ 
      fileId: stats.fileId,
      dataType: dataType
    });
    
    this.processAnalysisResult(data, false);
    
    // 更新卡片选中状态
    document.querySelectorAll('.data-card').forEach(card => card.classList.remove('active'));
    document.querySelector(`.data-card[data-type="${dataType}"]`).classList.add('active');
    
    if (showToast) {
      this.showToast(`已切换到${dataType === 'purchase' ? '外购' : '外协'}数据`, 'success');
    }
  } catch (error) {
    this.showError(error.message);
  }
},

// 新增：更新数据（触发文件上传）
handleUpdateData(dataType) {
  // 创建一个临时的文件输入，用于特定数据类型的上传
  const tempInput = document.createElement('input');
  tempInput.type = 'file';
  tempInput.accept = '.xlsx,.xls';
  tempInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      // 验证文件名是否包含对应的数据类型标识
      const expectedKeyword = dataType === 'purchase' ? '外购' : '外协';
      if (!file.name.includes(expectedKeyword)) {
        this.showToast(`请上传包含"${expectedKeyword}"的文件`, 'warning');
        return;
      }
      
      // 使用现有的上传逻辑
      state.currentDataType = dataType;
      this.handleDirectUpload(file);
    }
  });
  tempInput.click();
},

// 修改现有的 init 方法
init() {
  if (state.isInitialized) return;

  console.log('IQC Module: Initializing...');
  this.cacheElements();
  this.bindEvents();
  this.loadHistory();
  this.loadLatestData();
  this.loadDataSourceStats();  // 新增：加载数据源统计
  state.isInitialized = true;
  console.log('IQC Module: Initialization complete');
}
```

#### **任务3.3: API模块扩展**
**文件**: `public/js/utils/api.js`

**新增API方法**:
```javascript
// 在现有的 API 对象中添加
// 获取数据源统计
async getDataSourceStats() {
  const response = await fetch('/api/data-source-stats');
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || '获取数据源统计失败');
  }
  return await response.json();
},
```

---

### **Phase 4: 样式和交互** (预计1天)

#### **任务4.1: 卡片样式**
**文件**: `public/css/modules/iqc_v2.css`

**新增样式**:
```css
/* 数据源卡片区域 */
.iqc-data-source-section {
  margin-bottom: 2rem;
}

.data-source-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.data-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border: 2px solid transparent;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.data-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--primary-500), var(--primary-300));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.data-card:hover::before {
  opacity: 1;
}

.data-card:hover {
  border-color: var(--primary-500);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.card-header h4 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--gray-800);
}

.update-status {
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
}

.update-status.none .status-none {
  color: #6b7280;
}

.update-status.ok .status-ok {
  color: #10b981;
}

.update-status.warning .status-warning {
  color: #f59e0b;
}

.update-status.loading .status-loading {
  color: #3b82f6;
}

.card-stats {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-item .label {
  font-size: 0.85rem;
  color: var(--gray-600);
}

.stat-item .value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--gray-900);
}

.card-time-range {
  margin-bottom: 1.5rem;
  padding: 0.75rem;
  background: var(--gray-50);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--gray-700);
}

.time-range-label {
  font-weight: 500;
  margin-right: 0.5rem;
}

.card-actions {
  display: flex;
  justify-content: center;
}

.card-actions .btn-secondary {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
  background: white;
  color: var(--gray-700);
  border: 1px solid var(--gray-300);
}

.card-actions .btn-secondary:hover {
  background: var(--gray-50);
  border-color: var(--gray-400);
}

/* 卡片选中状态 */
.data-card.active {
  border-color: var(--primary-500);
  background: var(--primary-50);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.data-card {
  cursor: pointer;
  position: relative;
}

.data-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255,255,255,0.1);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.data-card:hover::after {
  opacity: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .data-source-cards {
    grid-template-columns: 1fr;
  }
  
  .card-stats {
    gap: 1rem;
  }
  
  .card-actions {
    flex-direction: column;
  }
}

/* 加载状态动画 */
.status-loading::after {
  content: '';
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-left: 8px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

---

## ⚠️ **关键注意事项**

### **与现有架构的集成要点**

1. **保持现有数据流**: 新功能完全基于现有的 `ExcelParserService` 和 `DataProcessorService`
2. **复用现有API**: 新的统计功能不影响现有的 `/upload`、`/filter-data` 等接口
3. **状态管理兼容**: 新增的状态字段不影响现有的 `fileId`、`uploadedFile` 等逻辑
4. **UI组件复用**: 继续使用现有的 `loading`、`results`、`error` 等UI元素

### **数据类型检测优化**
```javascript
// 改进的检测逻辑，结合文件名和数据内容
const detectDataType = (fileName, data) => {
  // 1. 优先基于文件名
  if (fileName.includes('外协')) return 'external';
  if (fileName.includes('外购')) return 'purchase';
  
  // 2. 基于现有的表头检测逻辑
  return ExcelParserService.detectFileType(data);
};
```

### **自定义更新提醒设置**
```javascript
// 可配置的更新提醒天数
const UPDATE_WARNING_DAYS = 7;  // 可根据需要调整

// 在前端显示中明确标注
statusEl.innerHTML = `<span class="status-ok">✅ ${daysSinceUpdate}天前更新</span>`;
```

---

## 🚀 **实施顺序建议**

1. **Phase 1**: 先修改数据模型和上传逻辑，确保新字段正确保存
2. **Phase 2**: 开发统计API，验证数据查询逻辑
3. **Phase 3**: 重构前端界面，与现有IQC模块深度集成
4. **Phase 4**: 优化样式和交互体验

---

## 📝 **明天开始的具体步骤**

1. **启动项目**: 运行 `启动助手.bat`
2. **备份现有代码**: 确保可以快速回滚
3. **开始Phase 1**: 
   - 修改 `server/models/IQCData.js`
   - 重启服务器让数据库重新同步
   - 修改 `server/routes/upload.js` 添加新字段保存逻辑
   - 测试上传功能确保新字段正确保存
4. **验证数据**: 检查数据库中是否正确保存了 `dataType`、`recordCount` 等新字段
5. **继续推进**: 完成一个阶段测试通过后再进入下一阶段

---

## 🎉 **预期成果**

完成后用户将看到：
- 两个精美的数据卡片，分别显示外购和外协数据状态
- 点击卡片即可快速切换数据类型，无需额外操作
- 清晰的数据统计和自定义的7天更新提醒
- 当前查看的数据类型有明显的视觉高亮显示
- 与现有功能完全兼容，不影响任何现有操作
- 现代化的界面体验，保持项目的整体风格一致性

### **优化后的用户体验**

1. **进入页面**: 自动加载数据源统计，并自动选中最新数据类型
2. **查看卡片**: 清晰显示两类数据的状态和统计，当前查看的卡片有高亮显示
3. **快速切换**: 点击任意卡片 → 立即切换到对应数据类型，无需额外操作
4. **状态反馈**: 当前查看的卡片有明显的视觉指示（边框高亮、背景色变化）
5. **数据更新**: 只在需要上传新数据时才点击"更新数据"按钮
6. **智能选择**: 系统自动选择最新更新的数据类型作为默认显示

**重点**: 所有新功能都与现有架构深度集成，确保代码的一致性和可维护性！ 💪