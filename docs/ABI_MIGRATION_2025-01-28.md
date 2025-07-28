# ABI 系統遷移記錄

## 日期：2025-01-28

## 問題背景

Vercel 部署失敗，錯誤訊息：
```
error during build:
Could not resolve "../utils/contractLegacy" from "src/pages/PriceDebugPage.tsx"
```

## 根本原因

1. 專案正在從手動維護的 `abis.ts` 遷移到自動化的 JSON ABI 管理系統
2. `PriceDebugPage.tsx` 引用了不存在的 `../utils/contractLegacy` 路徑
3. 正確的函數 `getContractLegacy` 實際上在 `../config/contractsWithABI` 中

## 修復方案

### 1. 立即修復（已完成）
```typescript
// 錯誤的引用
import { getContractLegacy } from '../utils/contractLegacy';

// 正確的引用
import { getContractLegacy } from '../config/contractsWithABI';
```

### 2. 完整的 ABI 系統遷移（已完成）

#### 舊系統問題：
- 手動維護 `src/config/abis.ts` 檔案
- 容易出現 ABI 不同步
- 部署後需要手動更新多個地方

#### 新系統優勢：
- 使用 `v25-sync-all.js` 自動同步 ABI
- 直接從 JSON 檔案載入 ABI
- 減少人為錯誤

## 遷移步驟總結

1. **更新所有引用**：
   - `contractsWithABI.ts` - ✅ 已更新使用 JSON
   - `contractChecker.ts` - ✅ 已更新使用 JSON
   - `AltarPage.tsx` - ✅ 已更新使用 JSON
   - `PriceDebugPage.tsx` - ✅ 修復引用路徑

2. **執行 ABI 同步**：
   ```bash
   cd /Users/sotadic/Documents/DungeonDelversContracts
   node scripts/active/v25-sync-all.js
   ```

3. **封存舊檔案**：
   - 將 `abis.ts` 移至 `src/config/archived/`
   - 保留備份以供參考

## 影響範圍

### 受影響的檔案：
1. `src/config/contractsWithABI.ts` - 主要的合約配置檔案
2. `src/utils/contractChecker.ts` - 合約檢查工具
3. `src/pages/AltarPage.tsx` - 祭壇頁面
4. `src/pages/PriceDebugPage.tsx` - 價格調試頁面

### 不受影響：
- 所有其他頁面和組件（它們使用 `contractsWithABI.ts` 的導出）

## 驗證步驟

1. **本地構建測試**：
   ```bash
   npm run build
   ```
   結果：✅ 成功

2. **Vercel 部署**：
   - 推送到 GitHub
   - Vercel 自動部署
   - 預期結果：成功

## 長期維護建議

1. **使用 v25-sync-all.js**：
   - 部署新合約後立即執行同步
   - 確保所有專案的 ABI 保持一致

2. **避免手動編輯 ABI**：
   - 不要直接編輯 JSON 檔案
   - 透過合約編譯自動生成

3. **定期檢查**：
   - 確認沒有新檔案引用舊的 `abis.ts`
   - 使用 TypeScript 編譯器檢查引用錯誤

## 相關檔案位置

- 封存的舊檔案：`/src/config/archived/`
- 新的 ABI 目錄：`/src/abis/`
- 同步腳本：`/Users/sotadic/Documents/DungeonDelversContracts/scripts/active/v25-sync-all.js`

## 結論

此次遷移成功解決了：
1. Vercel 部署錯誤
2. ABI 管理的長期維護問題
3. 減少了手動更新的錯誤風險

系統現在更加健壯和易於維護。