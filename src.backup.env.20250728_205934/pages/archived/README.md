# 📦 封存頁面說明

此資料夾包含已經不再使用但可能有參考價值的頁面組件。

## 封存內容

### 管理頁面變體
- **AdminPageOptimized.tsx** - 包含進階優化功能的管理頁面（實驗性）
- **AdminPageV2.tsx** - 重構版管理後台，簡化了架構
- **AdminPageSimple.tsx** - 極簡版管理頁面，用於維護模式

### 測試與範例頁面
- **ExplorerPageExample.tsx** - GraphQL 端點使用範例
- **WebSocketTestPage.tsx** - WebSocket 即時訂閱測試
- **TestBatchRead.tsx** - 批次讀取合約數據測試
- **RpcStatsPage.tsx** - RPC 監控頁面（功能已移除）

### 其他
- **StableApp.tsx** - 穩定版 App 配置（備用）
- **CodexPage.tsx** - 圖鑑功能（未完成）

## 封存原因

這些頁面被封存的主要原因：
1. 功能重複或被更好的實現取代
2. 實驗性功能未被採用
3. 測試工具不適合放在生產環境
4. 功能已被廢棄或整合到其他地方

## 注意事項

- 這些頁面可能包含過時的 API 調用或配置
- 如需重新啟用，請先更新依賴和配置
- 部分頁面可能需要修改才能與當前系統兼容

封存日期：2025-01-27