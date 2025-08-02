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