# 前端檔案清理報告

## 🎯 清理目標
整理 Dungeon Delvers 前端專案，移除不必要的檔案，優化目錄結構，提高程式碼可維護性。

## ✅ 已完成的清理工作

### 1. 系統檔案清理
- **刪除 .DS_Store 檔案**: 26 個 macOS 系統檔案
- **清理範圍**: 專案根目錄、src/、public/、assets/、images/ 等所有目錄

### 2. 舊腳本清理
- **刪除診斷腳本**: 8 個舊的診斷和修復腳本
  - `diagnose_metadata.cjs`
  - `fix_all_issues.cjs`
  - `fix_vip_level.cjs`
  - `check_baseuri.cjs`
  - `diagnostic_script.js`
  - `fix_verification_script.js`
  - `consistency-check.js`
  - `subgraph_fix_summary.cjs`

### 3. 重複檔案清理
- **刪除重複 hooks**: `useContractEvents.ts` (保留優化版本)
- **刪除舊 IPFS 元資料**: `ipfs-metadata/` 目錄 (已被 `ipfs-metadata-reorganized/` 取代)
- **整理 vite 配置**: 保留優化版本的 `vite.config.ts`

### 4. 目錄重組
- **創建封存目錄結構**:
  ```
  archive/
  ├── docs/whitepaper/     (白皮書)
  ├── preview/             (SVG 預覽檔案)
  └── scripts/             (舊腳本)
  ```

- **移動檔案到封存目錄**:
  - SVG 預覽檔案: `SVG_Preview/` → `archive/preview/`
  - 白皮書: `dungeon-delvers-whitepaper/` → `archive/docs/whitepaper/`
  - 舊腳本: `scripts/` → `archive/scripts/`

## 📊 清理統計

| 項目 | 數量 | 說明 |
|------|------|------|
| 刪除 .DS_Store | 26 | macOS 系統檔案 |
| 刪除舊腳本 | 8 | 診斷和修復腳本 |
| 刪除重複檔案 | 2 | hooks 和 IPFS 元資料 |
| 移動檔案 | 8 | 到封存目錄 |
| 創建目錄 | 4 | 封存目錄結構 |

## 🔍 進一步優化建議

### 1. 可考慮封存的組件
- **Debug 組件**: `src/components/debug/CacheDebugPanel.tsx`
  - 目前未被使用
  - 建議移動到 `archive/components/` 或刪除

### 2. 可考慮合併的組件
- **Admin 組件**: 可以考慮將相關的 admin 組件合併或重構
  - `AdminSection.tsx` (443B) - 簡單的包裝組件
  - `SettingRow.tsx` (3.8KB) - 設定行組件
  - `AddressSettingRow.tsx` (3.5KB) - 地址設定組件
  - `ReadOnlyRow.tsx` (681B) - 唯讀行組件

### 3. 可考慮優化的檔案
- **大型檔案**: 檢查是否需要拆分
  - `src/api/nfts.ts` (25KB, 664 行)
  - `src/pages/AdminPage.tsx` (26KB, 530 行)
  - `src/pages/MyAssetsPage.tsx` (23KB, 494 行)

### 4. 可考慮移除的檔案
- **未使用的圖片**: 檢查 `assets/images/` 中的圖片是否在 `public/images/` 中已有
- **重複的配置**: 檢查是否有重複的 TypeScript 配置檔案

## 📁 當前目錄結構

```
DungeonDelvers/
├── src/
│   ├── components/
│   │   ├── admin/          (管理員組件)
│   │   ├── common/         (通用組件)
│   │   ├── core/           (核心組件)
│   │   ├── debug/          (調試組件) - 可考慮移除
│   │   ├── layout/         (佈局組件)
│   │   └── ui/             (UI 組件)
│   ├── pages/              (頁面組件)
│   ├── hooks/              (自定義 hooks)
│   ├── utils/              (工具函數)
│   ├── api/                (API 相關)
│   ├── cache/              (快取策略)
│   ├── config/             (配置檔案)
│   ├── contexts/           (React Context)
│   ├── stores/             (狀態管理)
│   ├── types/              (TypeScript 類型)
│   └── styles/             (樣式檔案)
├── public/                 (靜態資源)
├── archive/                (封存檔案)
│   ├── docs/whitepaper/    (白皮書)
│   ├── preview/            (SVG 預覽)
│   └── scripts/            (舊腳本)
└── contracts/              (智能合約)
```

## 🎉 清理效果

1. **減少檔案數量**: 刪除了 36 個不必要的檔案
2. **優化目錄結構**: 創建了清晰的封存目錄
3. **提高可維護性**: 移除了重複和過時的檔案
4. **改善開發體驗**: 清理了系統檔案和調試檔案

## 📝 後續建議

1. **定期清理**: 建議每季度執行一次類似的清理
2. **代碼審查**: 定期檢查未使用的組件和檔案
3. **文檔更新**: 更新 README 和開發文檔
4. **依賴檢查**: 定期檢查和更新 npm 依賴

---

*清理完成時間: $(date)*
*清理腳本: cleanup-frontend.cjs* 