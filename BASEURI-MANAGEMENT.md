# BaseURI 管理指南

這個指南說明如何使用新的腳本來管理合約的 BaseURI 設定。

## 🎯 概述

你現在有兩種方式來管理 NFT 合約的 BaseURI：
- **API 端點**: 使用後端服務器提供動態元數據
- **IPFS**: 使用去中心化儲存提供靜態元數據

## 📋 當前狀態

根據你之前的更新，所有合約現在都使用 API 端點：
- Hero: `http://localhost:3001/api/hero/`
- Relic: `http://localhost:3001/api/relic/`
- Party: `http://localhost:3001/api/party/`
- VIP: `http://localhost:3001/api/vip/`
- Profile: `http://localhost:3001/api/profile/`

## 🛠️ 使用方法

### 1. 安裝依賴項

首先安裝新的依賴項：

```bash
npm install
```

### 2. 設定環境變數

在你的 `.env` 文件中添加你的私鑰：

```bash
PRIVATE_KEY=your_private_key_here
```

### 3. 使用 npm 腳本

#### 切換到 API 端點 (推薦)
```bash
npm run baseuri:api
```

#### 切換到 IPFS 儲存
```bash
npm run baseuri:ipfs
```

#### 檢查服務狀態
```bash
npm run status
```

#### 啟動所有服務
```bash
npm start
```

## 📊 兩種模式比較

### API 端點模式 (當前使用)
✅ **優點:**
- 動態元數據更新
- 市場數據整合
- 自動快取優化
- 即時更新能力

⚠️ **注意事項:**
- 需要後端服務器運行
- 依賴外部服務

### IPFS 模式
✅ **優點:**
- 完全去中心化
- 永久儲存
- 不依賴外部服務
- 更符合 Web3 精神

⚠️ **注意事項:**
- 靜態元數據
- 更新需要重新部署
- 載入速度可能較慢

## 🔧 腳本說明

### `set-baseuri-simple.ts`
- 簡化版本，可從前端項目直接運行
- 自動從 `shared-config.json` 讀取合約地址
- 支援開發和生產環境
- 包含錯誤處理和狀態檢查

### 使用範例

```bash
# 切換到 API 端點 (開發環境)
NODE_ENV=development npm run baseuri:api

# 切換到 API 端點 (生產環境)
NODE_ENV=production npm run baseuri:api

# 切換到 IPFS
npm run baseuri:ipfs
```

## 🧪 測試建議

更新 BaseURI 後，建議進行以下測試：

1. **檢查元數據載入**
   ```bash
   # 測試 API 端點
   curl http://localhost:3001/api/hero/1
   ```

2. **測試前端顯示**
   - 訪問 NFT 頁面
   - 檢查圖片和元數據是否正確顯示

3. **驗證市場顯示**
   - 在 OpenSea 或其他市場檢查 NFT 顯示

## 🚨 故障排除

### 常見問題

1. **私鑰錯誤**
   ```
   ❌ 請設定 PRIVATE_KEY 環境變數
   ```
   **解決方案**: 在 `.env` 文件中設定正確的私鑰

2. **網路連接錯誤**
   ```
   ❌ 無法連接到 BSC 網路
   ```
   **解決方案**: 檢查網路連接和 RPC 端點

3. **權限錯誤**
   ```
   ❌ 沒有權限更新合約
   ```
   **解決方案**: 確保使用的錢包是合約的 owner

## 📈 最佳實踐

1. **開發環境**: 使用 API 端點進行快速開發和測試
2. **生產環境**: 考慮使用 IPFS 提供更好的去中心化
3. **備份**: 在切換 BaseURI 前記錄當前設定
4. **測試**: 每次更新後進行完整測試

## 🔄 自動化

你也可以將 BaseURI 管理整合到部署流程中：

```bash
# 部署後自動設定 API 端點
npm run deploy && npm run baseuri:api
```

## 📞 支援

如果遇到問題，請檢查：
1. 環境變數是否正確設定
2. 網路連接是否正常
3. 合約地址是否正確
4. 私鑰權限是否足夠 