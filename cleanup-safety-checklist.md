# 🛡️ 清理安全檢查清單

## 執行前檢查

### 1. Git 狀態
```bash
# 確保所有更改已提交
git status

# 創建清理前的標籤
git tag pre-cleanup-2025-01-29

# 創建備份分支
git checkout -b backup/pre-cleanup
git checkout main
```

### 2. 快速回滾方案
```bash
# 如果出錯，立即回滾
git reset --hard pre-cleanup-2025-01-29
```

## 階段式清理計劃

### 🟢 階段 1：低風險移動（測試/調試文件）
```bash
# 創建開發目錄
mkdir -p src/__dev__

# 移動調試頁面（這些不影響生產）
mv src/pages/DebugContractPage.tsx src/__dev__/
mv src/pages/PriceDebugPage.tsx src/__dev__/

# 測試應用
npm run dev
```

**回滾命令**：
```bash
mv src/__dev__/DebugContractPage.tsx src/pages/
mv src/__dev__/PriceDebugPage.tsx src/pages/
```

### 🟡 階段 2：中風險整理（統一配置）
僅在階段 1 成功後執行

### 🔴 階段 3：高風險操作（路由精簡）
需要完整測試後才執行

## 測試檢查點

每個階段後必須通過：
- [ ] 應用能正常啟動 `npm run dev`
- [ ] 主要頁面能訪問（總覽、資產、鑄造、地城）
- [ ] 錢包連接正常
- [ ] 管理頁面正常（開發者專用）

## 緊急聯絡

如果遇到無法解決的問題：
1. 立即執行 `git reset --hard pre-cleanup-2025-01-29`
2. 記錄錯誤信息
3. 逐步調試問題來源