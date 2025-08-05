# 技術債務記錄

本文件記錄專案中的技術債務，包括待修復的問題、優先級和建議的解決方案。

## 更新記錄
- 2025-08-04: 創建文件，記錄 V25 部署後的技術債務

---

## 1. getContract() 函數遷移

### 問題描述
- **影響範圍**: 前端約 52 處使用 `getContract()` 函數
- **問題類型**: API 過時警告
- **當前狀態**: 函數已標記為 `@deprecated`，調用時會在控制台顯示警告
- **功能影響**: 無，函數仍正常運作

### 詳細分析
```typescript
// 當前已棄用的寫法
const heroAddress = getContract('HERO');

// 推薦的新寫法
const heroContract = getContractWithABI('HERO');
const heroAddress = heroContract?.address;
```

### 受影響的文件
根據同步腳本檢查結果：
- `src/config/contractsWithABI-new.ts`: 13 處
- `src/config/contractsWithABI.ts`: 1 處
- `src/pages/AdminPageFixed.tsx`: 1 處
- `src/pages/DungeonPage.tsx`: 9 處
- `src/pages/archived/replaced-pages/DashboardPage.tsx`: 8 處
- `src/pages/archived/replaced-pages/ExplorerPage.tsx`: 15 處
- `src/pages/archived/replaced-pages/MyAssetsPage.tsx`: 3 處
- `src/pages/archived/replaced-pages/ProfilePage.tsx`: 1 處
- `src/pages/archived/test-pages/TestBatchRead.tsx`: 1 處

### 解決方案
**短期方案**（當前採用）：
- 保持現狀，不影響功能
- 新代碼使用 `getContractWithABI()`

**長期方案**：
- 採用機會性重構策略
- 修改相關代碼時順便更新
- 最終完全移除 `getContract()` 函數

### 優先級
**低** - 不影響功能，可延後處理

---

## 2. 直接訪問 CONTRACT_ADDRESSES

### 問題描述
- **影響範圍**: 2 個文件，5 處直接訪問
- **問題類型**: 代碼規範問題
- **當前狀態**: 直接訪問合約地址，繞過配置管理系統

### 受影響的文件
- `src/components/marketplace/CreateListingModal.tsx`: 3 處直接訪問 CONTRACT_ADDRESSES
- `src/hooks/useCommitReveal.ts`: 2 處直接訪問 CONTRACTS[56]

### 解決方案
使用統一的配置管理函數：
```typescript
// 不推薦
const address = CONTRACT_ADDRESSES.HERO;

// 推薦
const heroContract = getContractWithABI('HERO');
const address = heroContract?.address;
```

### 優先級
**中** - 可能導致配置不一致問題

---

## 3. 模組系統不一致（Marketplace 腳本）

### 問題描述
- **影響範圍**: Marketplace 相關腳本
- **問題類型**: ES6/CommonJS 混用
- **錯誤訊息**: `Cannot use import statement outside a module`

### 受影響的文件
- `scripts/active/marketplace-address-audit.js`
- `scripts/active/marketplace-sync.js`

### 解決方案
1. 統一使用 CommonJS（require）
2. 或將專案配置為 ES6 模組
3. 使用 TypeScript 編譯為 CommonJS

### 優先級
**低** - Marketplace 功能暫不上線

---

## 技術債務管理原則

### 1. 分類管理
- **關鍵性債務**: 影響功能或安全性，必須立即處理
- **改進性債務**: 影響開發體驗，可計劃處理
- **美化性債務**: 代碼整潔相關，機會性處理

### 2. 處理策略
- **立即修復**: 影響生產環境的問題
- **計劃修復**: 納入下個版本的改進項目
- **機會性修復**: 修改相關代碼時順便處理
- **接受共存**: 不影響功能且修復成本高的問題

### 3. 預防措施
- 新代碼遵循最新標準
- 定期審查和更新技術債務清單
- 在重構時優先處理相關債務