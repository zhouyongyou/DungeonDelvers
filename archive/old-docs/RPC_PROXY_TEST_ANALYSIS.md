# DungeonDelvers RPC 代理功能測試分析報告

## 📋 測試概述

本報告基於對 `/api/rpc.ts` 文件的深入分析，以及針對 RPC 代理功能的全面測試計劃。

## 🔍 代碼分析結果

### 1. 基本功能分析

#### ✅ 已實現的功能
- **HTTP 方法處理**: 正確處理 POST 和 OPTIONS 請求
- **CORS 配置**: 設置了適當的 CORS 標頭
- **API 金鑰管理**: 支持多個 Alchemy API 金鑰配置
- **金鑰輪換機制**: 實現了簡單的輪換邏輯
- **錯誤處理**: 包含基本的錯誤捕獲和響應
- **請求轉發**: 正確轉發到 Alchemy BSC Mainnet

#### ⚠️ 發現的問題

1. **超時處理缺失**
   - 沒有設置 fetch 超時
   - 可能導致長時間掛起的請求

2. **日誌記錄不足**
   - 僅在錯誤時記錄日誌
   - 缺乏請求成功的日誌

3. **金鑰輪換狀態管理**
   - 使用全局變量 `currentKeyIndex`
   - 在多個 serverless 實例間可能不一致

4. **錯誤響應格式**
   - 部分錯誤響應可能不符合 JSON-RPC 2.0 標準

## 🧪 測試計劃

### 1. 基本功能測試

#### 測試項目
- [x] `eth_chainId` 請求
- [x] `eth_blockNumber` 請求
- [x] `eth_gasPrice` 請求
- [x] `eth_getBalance` 請求

#### 測試命令
```bash
# 使用自動化測試腳本
node test-rpc-proxy.js

# 使用手動測試腳本
node manual-rpc-test.js

# 使用 curl 腳本
./test-rpc-curl.sh
```

### 2. CORS 設置驗證

#### 測試檢查點
- [x] OPTIONS 請求處理
- [x] `Access-Control-Allow-Origin: *` 標頭
- [x] `Access-Control-Allow-Methods: POST, OPTIONS` 標頭
- [x] `Access-Control-Allow-Headers: Content-Type, cache-control` 標頭

#### 測試命令
```bash
# 測試 OPTIONS 請求
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  http://localhost:3000/api/rpc -v
```

### 3. API 金鑰輪換測試

#### 測試策略
- 發送多個連續請求
- 驗證請求成功率
- 檢查響應時間一致性

#### 測試配置
```javascript
// 環境變量設置
ALCHEMY_API_KEY_1=your_key_1
ALCHEMY_API_KEY_2=your_key_2
ALCHEMY_API_KEY_3=your_key_3
```

### 4. 錯誤處理測試

#### 測試場景
- [x] 無效 JSON 請求
- [x] 無效 RPC 方法
- [x] 缺少 API 金鑰
- [x] 網絡連接失敗

#### 預期行為
- 返回符合 JSON-RPC 2.0 標準的錯誤響應
- 適當的 HTTP 狀態碼
- 錯誤信息不洩露敏感信息

### 5. 超時處理測試

#### 測試方法
```javascript
// 測試建議: 在 rpc.ts 中添加超時
const response = await fetch(alchemyUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(req.body),
  signal: AbortSignal.timeout(10000) // 10秒超時
});
```

### 6. 前端整合驗證

#### 檢查點
- [x] wagmi 配置使用 RPC 代理
- [x] 前端環境變量配置
- [x] 錯誤處理整合

## 📊 測試工具說明

### 1. 自動化測試腳本 (`test-rpc-proxy.js`)
- 全面的自動化測試套件
- 生成詳細的測試報告
- 支持並發測試和性能測試

### 2. 手動測試腳本 (`manual-rpc-test.js`)
- 互動式測試工具
- 實時查看請求/響應
- 適合調試和開發

### 3. curl 測試腳本 (`test-rpc-curl.sh`)
- 純 shell 腳本，無需 Node.js
- 適合 CI/CD 環境
- 支持本地和 Vercel 部署測試

## 🔧 建議的改進

### 1. 代碼改進建議

#### 添加請求超時
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000);

const response = await fetch(alchemyUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(req.body),
  signal: controller.signal
});

clearTimeout(timeoutId);
```

#### 改進日誌記錄
```typescript
console.log(`RPC Request: ${req.body.method} (Key: ${currentKeyIndex})`);
console.log(`RPC Response: ${response.status} (Duration: ${duration}ms)`);
```

#### 添加健康檢查端點
```typescript
if (req.url?.endsWith('/health')) {
  return res.status(200).json({ status: 'healthy', keys: keys.length });
}
```

### 2. 監控和診斷

#### 建議添加的監控指標
- 請求成功率
- 平均響應時間
- API 金鑰使用分佈
- 錯誤類型統計

#### 診斷工具
```bash
# 檢查 API 金鑰配置
npm run rpc:check-keys

# 測試 RPC 連接
npm run rpc:test-connection

# 監控 RPC 狀態
npm run rpc:monitor
```

## 🚀 部署前檢查清單

### 環境變數檢查
- [ ] `ALCHEMY_API_KEY_1` 已設置
- [ ] `ALCHEMY_API_KEY_2` 已設置（可選）
- [ ] `ALCHEMY_API_KEY_3` 已設置（可選）

### 功能測試
- [ ] OPTIONS 請求正常
- [ ] 基本 RPC 請求成功
- [ ] 錯誤處理正常
- [ ] API 金鑰輪換工作

### 性能測試
- [ ] 響應時間 < 2 秒
- [ ] 並發請求處理正常
- [ ] 無內存洩漏

## 📈 測試結果解讀

### 成功標準
- 基本 RPC 請求成功率 > 95%
- 平均響應時間 < 1 秒
- 所有 CORS 標頭正確設置
- 錯誤響應格式符合標準

### 失敗處理
- 檢查 Alchemy API 金鑰有效性
- 驗證網絡連接
- 檢查 Vercel 函數配置
- 查看函數日誌

## 💡 使用建議

### 開發環境
```bash
# 本地測試
npm run dev
./test-rpc-curl.sh

# 手動測試
node manual-rpc-test.js
```

### 生產環境
```bash
# 部署後測試
./test-rpc-curl.sh --vercel

# 自動化測試
node test-rpc-proxy.js
```

### 監控建議
- 設置 Vercel 函數監控
- 配置錯誤告警
- 定期執行健康檢查

## 🔗 相關文檔

- [RPC_SECURITY_GUIDE.md](./RPC_SECURITY_GUIDE.md) - RPC 安全配置指南
- [RPC_OPTIMIZATION_GUIDE.md](./RPC_OPTIMIZATION_GUIDE.md) - RPC 性能優化指南
- [VERCEL_ENV_CHECKLIST.md](./VERCEL_ENV_CHECKLIST.md) - Vercel 環境配置檢查清單

---

**注意**: 此測試計劃假設使用 Alchemy 作為 RPC 提供商。如果使用其他提供商，請相應調整測試配置。