# DungeonDelvers 前端 - AI 開發指南

## 專案概述
使用 React + TypeScript + Vite 構建的 Web3 遊戲前端，整合 wagmi v2 進行區塊鏈交互。

## 技術棧
- **框架**: React 18 + TypeScript
- **構建工具**: Vite
- **Web3**: wagmi v2 + viem
- **樣式**: Tailwind CSS
- **路由**: React Router v6
- **狀態管理**: Zustand
- **UI 組件**: 自定義組件庫

## 環境變數
```bash
# 必要的環境變數
VITE_WALLETCONNECT_PROJECT_ID=你的WalletConnect項目ID
VITE_ALCHEMY_KEY=你的Alchemy API金鑰（可選）
VITE_GRAPHQL_URL=https://api.studio.thegraph.com/query/88982/dungeondelvers/v0.0.19
VITE_SERVER_URL=https://dungeondelvers-backend.onrender.com
```

## 目錄結構
```
src/
├── components/      # 可重用組件
│   ├── ui/         # 基礎 UI 組件
│   ├── admin/      # 管理頁面組件
│   └── wallet/     # 錢包相關組件
├── pages/          # 頁面組件
├── hooks/          # 自定義 React hooks
├── stores/         # Zustand 狀態管理
├── utils/          # 工具函數
├── config/         # 配置文件
│   ├── contracts.ts # 合約地址和 ABI
│   └── constants.ts # 常量定義
└── api/            # API 相關邏輯
```

## 重要文件說明

### 合約配置 (src/config/contracts.ts)
- 包含所有合約的地址和 ABI
- 支援多鏈配置（目前僅 BSC）
- 有環境變數覆蓋機制

### 常用 Hooks
1. **useContractTransaction** - 處理合約交易的統一介面
2. **useVipStatus** - VIP 狀態管理
3. **useHeroStats** - 英雄數據管理
4. **useAppToast** - 通知提示管理

## 開發指令
```bash
# 安裝依賴
npm install

# 開發模式
npm run dev

# 構建生產版本
npm run build

# 預覽構建結果
npm run preview

# 類型檢查
npm run type-check

# 代碼檢查
npm run lint
```

## 常見開發任務

### 1. 更新合約地址
編輯 `src/config/contracts.ts`，更新對應網路的合約地址。

### 2. 添加新頁面
1. 在 `src/pages/` 創建新組件
2. 在 `src/App.tsx` 添加路由
3. 在導航組件中添加鏈接

### 3. 處理合約交互
```typescript
// 使用 useContractTransaction hook
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

### 4. SVG 生成器
- 位置：`src/utils/svgGenerators.ts`
- 用於生成英雄、聖物、隊伍、VIP 的 SVG 圖像
- 統一使用 400x400 正方形格式

## UI/UX 規範
1. **顏色主題**: 深色主題為主，使用灰色系配合品牌色
2. **響應式設計**: 支援手機、平板、桌面
3. **加載狀態**: 使用 LoadingSpinner 組件
4. **錯誤處理**: 使用 ErrorBoundary 和 toast 通知

## 部署流程

### Vercel 部署
1. 連接 GitHub 倉庫
2. 設定環境變數
3. 部署命令：`npm run build`
4. 輸出目錄：`dist`

### 本地預覽
```bash
npm run build
npm run preview
```

## 性能優化建議
1. 使用 React.lazy 進行代碼分割
2. 圖片使用 WebP 格式
3. 實現虛擬滾動處理大列表
4. 使用 React.memo 優化重渲染

## 調試技巧
1. 使用 `logger.ts` 記錄日誌
2. Chrome DevTools 的 Network 標籤查看請求
3. React Developer Tools 檢查組件狀態
4. 使用 `wagmi` 的調試模式

## 常見問題
1. **MIME type 錯誤**: 檢查 vercel.json 配置
2. **合約調用失敗**: 確認網路和地址正確
3. **圖片 404**: 檢查公共資源路徑
4. **狀態不同步**: 使用 refetch 函數更新

## 最近的重要更新
- 2025-01-14: 修復 unknown NFT 類型錯誤
- 2025-01-14: 改進 SVG 顯示為正方形格式
- 2025-01-14: 添加 VIP 冷卻期動態顯示
- 2025-01-14: 後台添加 BNB 提取和折疊功能