# 已替換的頁面檔案

此目錄包含已被新架構替換的舊頁面組件。

## 替換對照表

| 舊頁面 | 新頁面 | 替換日期 | 原因 |
|--------|--------|----------|------|
| DashboardPage.tsx | OverviewPage.tsx | 2025-01-29 | 整合 Dashboard + Profile 功能 |
| ProfilePage.tsx | OverviewPage.tsx | 2025-01-29 | 整合到總覽頁面 |
| ExplorerPage.tsx | MyAssetsPageEnhanced.tsx | 2025-01-29 | 整合到資產管理頁面的市場標籤 |
| MyAssetsPage.tsx | MyAssetsPageEnhanced.tsx | 2025-01-29 | 增強版包含市場瀏覽功能 |

## 保留原因

這些文件保留作為參考，以便：
1. 需要時可以回溯特定功能的實現
2. 理解代碼演進歷史
3. 在出現問題時可以快速還原

## 注意事項

- 這些文件不應在生產環境中使用
- 如果需要某個特定功能，請從新的整合頁面中提取
- 定期評估是否可以完全刪除這些文件