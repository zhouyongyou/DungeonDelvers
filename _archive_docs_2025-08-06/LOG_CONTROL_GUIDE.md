# 📊 DungeonDelvers 日誌控制指南

## 🎯 問題解決

你剛才看到的大量日誌已經優化！現在只會在**真正需要時**顯示。

## 🔧 環境變數控制

在 `.env` 文件中控制日誌輸出：

```bash
# 基本 RPC 日誌（建議開啟）
VITE_ENABLE_RPC_LOGS=true

# 詳細 DEBUG 日誌（按需開啟）
# VITE_ENABLE_DEBUG=true
```

## 📝 日誌類型說明

### 🟢 **始終顯示**（無法關閉）
- ❌ **錯誤日誌**：紅色顯示，關鍵問題
- ⚠️ **警告日誌**：黃色顯示，需要注意
- 🔴 **RPC 錯誤**：連接失敗等重要問題

### 🟡 **可控制顯示**
- 🌐 **RPC 成功日誌**：`VITE_ENABLE_RPC_LOGS=true` 時顯示
- 🔍 **DEBUG 詳細日誌**：`VITE_ENABLE_DEBUG=true` 時顯示
- 📊 **性能監控日誌**：`VITE_ENABLE_DEBUG=true` 時顯示
- 🛠️ **診斷日誌**：`VITE_ENABLE_DEBUG=true` 時顯示

## 🎨 日誌顏色編碼

- 🟢 **[RPC]** - 成功的 RPC 請求
- 🔴 **[RPC ERROR]** - RPC 失敗
- 🟡 **[RPC WARN]** - RPC 警告
- 🔵 **[INFO]** - 一般信息
- 🟠 **[DEBUG]** - 詳細除錯信息

## 💡 建議配置

### 🚀 **日常開發**（推薦）
```bash
VITE_ENABLE_RPC_LOGS=true    # 能看到連接問題
# VITE_ENABLE_DEBUG=true     # 關閉詳細日誌
```

### 🔍 **深度除錯時**
```bash
VITE_ENABLE_RPC_LOGS=true
VITE_ENABLE_DEBUG=true       # 開啟所有詳細信息
```

### 🧹 **最乾淨模式**
```bash
# VITE_ENABLE_RPC_LOGS=true  # 註解掉所有可選日誌
# VITE_ENABLE_DEBUG=true
```

## 🛠️ 瀏覽器除錯技巧

### Chrome DevTools 過濾
```javascript
// 清空控制台
console.clear();

// 只顯示錯誤
// 在 Console Filter 輸入：ERROR

// 排除 RPC 日誌
// 在 Console Filter 輸入：-RPC

// 只顯示特定功能
// 在 Console Filter 輸入：MintPage
```

### 全域控制命令
在瀏覽器控制台執行：
```javascript
// 關閉性能警告
disablePerformanceWarnings();

// 開啟性能警告
enablePerformanceWarnings();

// 完全關閉性能監控
disablePerformanceMonitoring();
```

## 📊 優化結果

**優化前**：每次載入顯示 15+ 條日誌
**優化後**：
- 預設只顯示 **必要的錯誤和警告**
- 可選日誌需要明確開啟
- 重複日誌合併為單次顯示

## 🎯 最佳實踐

1. **開發時**：保持 `VITE_ENABLE_RPC_LOGS=true`
2. **除錯時**：臨時開啟 `VITE_ENABLE_DEBUG=true`
3. **生產環境**：所有可選日誌自動關閉
4. **遇到問題**：先檢查紅色錯誤日誌

現在你的控制台會乾淨很多，同時不會錯過重要問題！🎉