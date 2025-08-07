# 🎨 DungeonDelvers 前端 - 專案指南

> 📖 **請先閱讀**: `~/MASTER-CLAUDE.md` 了解整體架構，此文檔專注於前端開發細節

## 🚨 重要編碼規則

### 程式碼修改檢查流程
**每次修改程式碼後，必須執行以下步驟：**
```bash
# 1. 檢查語法錯誤（括號、逗號、分號等）
npm run type-check

# 2. 檢查程式碼規範
npm run lint

# 3. 確認無錯誤後再繼續
```

### 常見語法錯誤提醒
- **編輯時特別注意**：`}` `]` `)` `,` `;` 的配對和位置
- **使用 MultiEdit 時**：確保每個編輯的語法完整性
- **修改對象或數組時**：檢查最後一項是否多餘逗號

## 🗂️ 快速導航
```bash
# 當前專案
/Users/sotadic/Documents/GitHub/DungeonDelvers/     # React 前端

# 其他專案
/Users/sotadic/Documents/DungeonDelversContracts/                    # 智能合約
/Users/sotadic/Documents/GitHub/DungeonDelvers/DDgraphql/dungeon-delvers/  # 子圖
/Users/sotadic/Documents/dungeon-delvers-metadata-server/                  # 後端 API
```

## 📍 重要文檔索引

### 頁面路由對照表
**📄 [PAGE_ROUTES.md](./PAGE_ROUTES.md)** - 完整的頁面路由對照表
- 所有頁面的路由路徑和對應組件
- 絕對路徑範例（生產環境和本地開發）
- 頁面權限要求（是否需要連接錢包）
- 查詢參數支援說明
- 快速找到任何頁面的實現檔案

### 錢包連接狀態頁面對照表
**📄 [WALLET_CONNECTION_PAGES.md](./WALLET_CONNECTION_PAGES.md)** - 未連接錢包時的頁面顯示對照
- 每個頁面在未連接錢包時的具體行為
- 預覽組件和空狀態組件的對應關係
- 問題頁面識別和改進建議
- 技術實現細節和檢查模式說明

### 其他重要文檔
- **[docs/REACT_HOOKS_RULES.md](./docs/REACT_HOOKS_RULES.md)** - React Hooks 使用規則
- **[docs/RPC_MONITORING.md](./docs/RPC_MONITORING.md)** - RPC 監控系統說明
- **[src/components/mobile/README.md](./src/components/mobile/README.md)** - 手機優化組件使用指南

## 技術棧
- **框架**: React 18 + TypeScript + Vite
- **Web3**: wagmi v2 + viem
- **樣式**: Tailwind CSS
- **狀態管理**: Zustand

## 開發指令
```bash
npm install      # 安裝依賴
npm run dev      # 開發模式
npm run build    # 構建生產版本
npm run preview  # 預覽構建結果
npm run type-check  # 類型檢查
npm run lint     # 代碼檢查
```

## 🪝 React Hooks 規則

### 核心規則
1. **只在最頂層調用 Hook** - 不要在條件、循環或嵌套函數中調用
2. **只在 React 函數中調用 Hook** - 僅在組件或自定義 Hook 中使用

### 快速檢查
```bash
# 檢查條件性 Hook 錯誤
npm run lint 2>&1 | grep "React Hook.*is called conditionally"
```

詳細指南：[📖 React Hooks 規則指南](./docs/REACT_HOOKS_RULES.md)

## 常見開發任務

### 處理合約交互
```typescript
const { executeTransaction } = useContractTransaction();

await executeTransaction({
  contractCall: {
    address: contractAddress,
    abi: contractAbi,
    functionName: 'functionName',
    args: [arg1, arg2]
  },
  description: '操作描述',
  successMessage: '成功提示',
  errorMessage: '錯誤提示'
});
```

### 合約配置
- 文件：`src/config/contracts.ts`
- 支援環境變數覆蓋
- 自動從 CDN 載入配置

## 🔄 統一配置管理系統

### 🎯 重要：前端配置由合約項目統一管理
前端**不應該**直接編輯配置文件，所有配置由合約項目自動同步。

### 📍 配置文件位置
- **主配置來源**：`/Users/sotadic/Documents/DungeonDelversContracts/.env.v25`
- **前端配置文件**：`/Users/sotadic/Documents/GitHub/DungeonDelvers/.env.local` （自動生成）

### 🚀 配置同步流程

#### 當需要更新合約地址時：
```bash
# ❌ 錯誤：不要直接編輯前端配置
# vim /Users/sotadic/Documents/GitHub/DungeonDelvers/.env.local

# ✅ 正確：編輯主配置文件
vim /Users/sotadic/Documents/DungeonDelversContracts/.env.v25

# ✅ 然後執行同步
cd /Users/sotadic/Documents/DungeonDelversContracts
node scripts/ultimate-config-system.js sync
```

#### 同步後重啟開發服務器：
```bash
# 在前端項目根目錄
cd /Users/sotadic/Documents/GitHub/DungeonDelvers
npm run dev
```

### 📋 自動同步的配置內容
- ✅ **合約地址**：所有 VITE_ 前綴的合約地址變數
- ✅ **網路配置**：鏈 ID、RPC URL、瀏覽器 URL
- ✅ **VRF 配置**：Coordinator、訂閱 ID、Gas 限制
- ✅ **服務端點**：子圖 URL、後端 API URL
- ✅ **ABI 文件**：自動從合約項目同步到 `src/contracts/abi/`

### 🔍 驗證配置正確性
```bash
# 檢查前端配置是否與主配置一致
cd /Users/sotadic/Documents/DungeonDelversContracts
node scripts/ultimate-config-system.js validate
```

### 🛠️ 前端專用開發配置
以下配置**不會**被自動同步，可以自由編輯：
```bash
# .env.local 中的前端專用配置（添加到文件末尾）
VITE_ENABLE_DEV_TOOLS=true     # 開發工具
VITE_MOCK_MODE=false           # 模擬模式
VITE_DEBUG_MODE=true           # 調試模式
```

### ⚡ 動態配置載入
前端使用以下機制載入配置：
- **環境變數讀取**：`src/config/env-contracts.ts` 自動讀取 VITE_ 變數
- **ABI 自動載入**：`src/contracts/abi/` 目錄中的 ABI 文件
- **類型安全**：TypeScript 類型檢查確保配置正確性

### 🚨 關鍵提醒
1. **永遠不要**手動編輯 `.env.local` 中的合約地址
2. **配置變更後**必須重啟 `npm run dev` 服務器
3. **部署前**確保 `npm run build` 成功
4. **ABI 更新後**重新運行 `npm run type-check`

## 📱 手機版開發原則

### 使用手機優化組件
當需要手機版優化時，優先使用 `src/components/mobile/` 目錄中的組件：
- `MobileAddress` - 地址顯示與複製
- `MobileDataCard` - 替代表格的卡片佈局
- `MobileActionMenu` - 整合多個操作按鈕
- `MobileStatsCard` - 統計數據展示
- `MobileTabs` - 可滾動標籤導航

### 觸控體驗優化
1. **最小觸控區域**: 44x44px
2. **防止雙擊縮放**: `touch-action: manipulation`
3. **響應式佈局**: 使用 `md:hidden` 和 `hidden md:block`

## ⚡ 性能優化原則

### RPC 請求管理
- 避免在循環中單獨請求，使用批次處理
- 事件監聽器應該節流或防抖
- 優先使用 multicall 合約

### 組件性能
- 長列表使用虛擬滾動
- 圖片實現懶加載
- 適當使用 React.memo 和 useMemo

## 🛡️ 避免常見錯誤

### React.lazy 載入錯誤
- **錯誤**: `Cannot convert object to primitive value`
- **原因**: 組件缺少 default export
- **解決**: 確保懶加載的組件有 `export default`

### ESLint 維護
- 定期執行 `npm run lint` 檢查
- 避免累積大量 lint 錯誤
- 修改代碼後立即修復相關 lint 問題

## 常見問題
1. **MIME type 錯誤**: 檢查 vercel.json 配置
2. **合約調用失敗**: 確認網路和地址正確
3. **圖片 404**: 檢查公共資源路徑
4. **狀態不同步**: 使用 refetch 函數更新
5. **React.lazy 錯誤**: 確保組件有 default export

## 詳細文檔
- [RPC 監控系統](./docs/RPC_MONITORING.md)
- [React Hooks 規則](./docs/REACT_HOOKS_RULES.md)
- [手機優化組件](./src/components/mobile/README.md)

## 最近的重要更新
- 2025-08-02: 創建完整手機優化組件庫，修復 React.lazy import 錯誤
- 2025-08-02: 修復所有 React Hooks 條件調用錯誤，優化 CLAUDE.md
- 2025-01-15: 實施完整的 RPC 監控和統計系統
- 2025-01-14: 修復 unknown NFT 類型錯誤
- 2025-01-14: 改進 SVG 顯示為正方形格式