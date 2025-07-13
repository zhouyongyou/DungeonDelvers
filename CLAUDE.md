# CLAUDE.md - DungeonDelvers 專案助手指南

## 專案概述

DungeonDelvers 是一個基於 BNB Smart Chain 的 Web3 NFT 遊戲平台。本文檔幫助 Claude 或其他 AI 助手快速理解專案結構和開發需求。

## 快速導航

### 核心技術棧
- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **Web3**: Wagmi + Viem + WalletConnect
- **區塊鏈**: BNB Smart Chain (BSC)
- **智能合約**: Solidity 0.8.20

### 重要目錄結構
```
/src
  /components - UI 組件
  /pages - 頁面組件
  /hooks - 自定義 React Hooks
  /config - 配置文件（合約地址、ABI等）
  /utils - 工具函數
  /api - API 接口
  /types - TypeScript 類型定義
/contracts - Solidity 智能合約
/DDgraphql - The Graph 子圖
/public - 靜態資源
```

## 常見開發任務

### 1. 添加新的 NFT 類型
```typescript
// 1. 在 types/nft.ts 添加類型定義
export interface NewNFT extends BaseNft {
  // 特定屬性
}

// 2. 在 config/contracts.ts 添加合約配置
export const newNftContract = {
  address: '0x...',
  abi: [...],
}

// 3. 創建對應的頁面和組件
```

### 2. 合約交互模式
```typescript
// 讀取數據
const { data } = useContractRead({
  ...contractConfig,
  functionName: 'functionName',
  args: [arg1, arg2],
});

// 寫入數據
const { writeContractAsync } = useWriteContract();
const hash = await writeContractAsync({
  ...contractConfig,
  functionName: 'functionName',
  args: [arg1, arg2],
  value: BigInt(0), // 如果需要發送 BNB
});
```

### 3. 添加新頁面
1. 在 `/src/pages` 創建新組件
2. 在 `App.tsx` 添加路由
3. 在 `Header.tsx` 添加導航連結
4. 更新國際化文件 `/public/locales`

## 關鍵配置文件

### 環境變量 (.env)
```
VITE_ALCHEMY_BSC_MAINNET_RPC_URL=
VITE_MAINNET_URL=https://dungeondelvers.xyz
VITE_METADATA_SERVER_URL=
VITE_THE_GRAPH_STUDIO_API_URL=
VITE_DEVELOPER_ADDRESS=
```

### 合約地址
所有合約地址都在 `/src/config/contracts.ts` 中管理。

## 常見問題解決

### 1. 類型錯誤
- 檢查 `tsconfig.json` 配置
- 使用 `npm run type-check` 驗證
- 避免使用 `any` 類型

### 2. 合約調用失敗
- 確認網絡正確（BSC Mainnet）
- 檢查用戶餘額
- 驗證合約 ABI 匹配

### 3. 構建問題
- 清除快取: `rm -rf node_modules .cache dist`
- 重新安裝: `npm install`
- 檢查環境變量

## 代碼規範

### 命名規則
- 組件: PascalCase (如 `HeroCard.tsx`)
- 函數: camelCase (如 `fetchHeroData`)
- 常量: UPPER_SNAKE_CASE (如 `MAX_HEROES`)
- 文件: kebab-case (如 `use-hero-data.ts`)

### 提交規範
```
feat: 新功能
fix: 修復問題
docs: 文檔更新
style: 代碼格式
refactor: 重構
test: 測試相關
chore: 其他更改
```

## 測試指南

### 本地測試
1. 啟動開發服務器: `npm run dev`
2. 連接 MetaMask 到 BSC 測試網
3. 使用測試幣進行交互

### 單元測試
```bash
npm run test
```

### E2E 測試
```bash
npm run test:e2e
```

## 部署流程

### 前端部署
1. 構建: `npm run build`
2. 預覽: `npm run preview`
3. 部署到 Vercel/Netlify

### 合約部署
1. 編譯: `npx hardhat compile`
2. 測試: `npx hardhat test`
3. 部署: `npx hardhat run scripts/deploy.js`

## 調試技巧

### 1. 使用 Logger
```typescript
import { logger } from '@/utils/logger';
logger.debug('Debug info', data);
```

### 2. Chrome DevTools
- Network 標籤查看 API 請求
- Console 查看日誌
- Application 查看 LocalStorage

### 3. React DevTools
- 檢查組件狀態
- 分析性能問題

## 性能優化建議

1. **使用 React.memo** 避免不必要的重渲染
2. **使用 useMemo/useCallback** 優化計算和函數
3. **懶加載** 大型組件和路由
4. **優化圖片** 使用 WebP 格式和適當尺寸
5. **使用快取** 減少重複的 API 請求

## 安全注意事項

1. **永不暴露私鑰** 在代碼中
2. **驗證用戶輸入** 防止注入攻擊
3. **使用環境變量** 管理敏感配置
4. **定期更新依賴** 修復安全漏洞
5. **審計智能合約** 確保資金安全

## 需要幫助？

### 查看文檔
- [專案分析報告](./COMPREHENSIVE_PROJECT_ANALYSIS.md)
- [部署指南](./BASEURI-MANAGEMENT.md)
- [白皮書](./dungeon-delvers-whitepaper/)

### 相關資源
- [React 文檔](https://react.dev)
- [Wagmi 文檔](https://wagmi.sh)
- [Viem 文檔](https://viem.sh)
- [Tailwind CSS](https://tailwindcss.com)

## 快速命令參考

```bash
# 開發
npm run dev              # 啟動開發服務器
npm run build           # 構建生產版本
npm run preview         # 預覽構建結果

# 測試
npm run test            # 運行測試
npm run lint            # 代碼檢查
npm run type-check      # 類型檢查

# 部署
npm run deploy          # 部署到生產環境
npm run set-baseuri:api # 設置 API BaseURI
npm run set-baseuri:ipfs # 設置 IPFS BaseURI

# 工具
npm run analyze         # 分析包大小
npm run clean           # 清理緩存和構建文件
```

---

**提示**: 使用此文檔作為快速參考，詳細信息請查看具體的源代碼和文檔。