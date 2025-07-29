# 📋 剩餘待辦事項清單

## 🚨 緊急修復（已完成）
- ✅ 修復 App.tsx 中的 ProfilePage 引用錯誤
- ✅ 修復 App.tsx 中的 ExplorerPage 引用錯誤

## 🔧 需要更新的文件

### 1. StableApp.tsx
**問題**：這個文件似乎是舊版本的 App.tsx，包含所有已被替換的頁面引用
**建議**：
- 考慮刪除此文件（如果不再使用）
- 或更新為最新的頁面引用
- 或重命名為 `App.backup.tsx` 明確標示為備份

### 2. RouteManager.tsx
**位置**：`src/components/core/RouteManager.tsx`
**問題**：包含舊的 ProfilePage 引用
**需要更新**：
```typescript
// 舊的
profile: lazy(() => import('../../pages/ProfilePage')),
// 新的
profile: lazy(() => import('../../pages/OverviewPage')),
```

## 📝 代碼中的 TODO 註釋

### 1. App.tsx 第85行
```typescript
// TODO: 優化事件監聽邏輯，只在需要的頁面啟用
```
**優先級**：低
**建議**：這是性能優化，可在未來處理

### 2. useAdminData.ts
- 第10行：`// TODO: 暫時禁用 GraphQL 查詢，先實施 RPC 部分`
- 第137行：`// TODO: 實施單個參數的 RPC 驗證`
- 第146行：`// TODO: 實施完整的 RPC 數據載入`
- 第149行：`// TODO: 同時刷新子圖數據`

**優先級**：中
**建議**：這些是功能實現相關，需要根據業務需求決定

## 🎯 優化建議

### 1. 路由清理
**現況**：
- `validPages` 包含許多已廢棄的路由（如 'explorer', 'profile'）
- 'debug' 路由應該只在開發環境出現

**建議實施**：
```typescript
const basePages: Page[] = ['dashboard', 'myAssets', 'mint', 'altar', 'dungeon', 'vip', 'referral', 'admin'];
const devPages: Page[] = import.meta.env.DEV ? ['debug', 'priceDebug'] : [];
const validPages = [...basePages, ...devPages];
```

### 2. 文件組織
**問題**：多個備份/測試文件混在生產代碼中
**建議**：
- 創建 `__backup__` 目錄存放備份文件
- 將測試相關文件移至 `__test__` 目錄
- 清理 `archived` 中的多個 Admin 頁面版本

### 3. 依賴清理
**檢查項目**：
- Apollo Client（如果不再使用 GraphQL）
- 未使用的 UI 組件庫
- 重複功能的工具庫

## 📊 優先級排序

### 立即處理（影響功能）
1. ✅ App.tsx 引用修復（已完成）
2. ⚠️ RouteManager.tsx 更新
3. ⚠️ 決定 StableApp.tsx 的去留

### 短期處理（代碼質量）
1. 統一路由定義
2. 清理測試/備份文件
3. 處理 TODO 註釋

### 長期處理（架構優化）
1. 配置文件統一
2. 目錄結構重組
3. 依賴優化

## 🚦 下一步行動

```bash
# 1. 快速修復 RouteManager
# 2. 決定是否保留 StableApp.tsx
# 3. 更新路由類型定義
```

---

*最後更新：2025-01-29*