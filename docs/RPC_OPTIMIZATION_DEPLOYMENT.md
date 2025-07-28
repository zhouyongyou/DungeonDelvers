# RPC 優化版本部署指南

## 📋 部署前檢查清單

### 1. 環境變數配置
```bash
# Vercel 環境變數設置
VITE_USE_RPC_PROXY=true          # 啟用 RPC 代理
ALCHEMY_API_KEY_1=xxx            # 第一個 API Key
ALCHEMY_API_KEY_2=xxx            # 第二個 API Key
ALCHEMY_API_KEY_3=xxx            # 第三個 API Key
# ... 最多 10 個
```

### 2. 代碼準備
- [x] `api/rpc-optimized.ts` - 優化版 RPC 代理實現
- [x] `api/rpc-config.ts` - RPC 配置管理
- [x] `src/utils/rpcOptimizedMigration.ts` - 流量遷移控制
- [x] `vercel.json` - 添加新端點配置
- [x] `src/config/smartRpcTransport.ts` - 支援新端點

## 🚀 部署步驟

### 第一階段：金絲雀部署（10% 流量）

1. **部署到 Vercel**
   ```bash
   git add .
   git commit -m "feat: add optimized RPC proxy with caching and rate limiting"
   git push
   ```

2. **設置環境變數**
   - 在 Vercel Dashboard 中設置上述環境變數
   - 確保 `VITE_USE_RPC_PROXY=true`

3. **驗證部署**
   - 訪問健康檢查端點：`https://your-domain.vercel.app/api/rpc-optimized/health`
   - 檢查返回的統計數據

4. **監控初始流量**
   - 10% 的用戶會自動使用新版本
   - 監控錯誤率和性能指標

### 第二階段：擴大測試（50% 流量）

1. **更新流量配置**
   ```typescript
   // src/utils/rpcOptimizedMigration.ts
   export const RPC_MIGRATION_CONFIG = {
     trafficPercentage: 50, // 增加到 50%
     ...
   }
   ```

2. **部署更新**
   ```bash
   git commit -m "chore: increase RPC optimization traffic to 50%"
   git push
   ```

3. **性能對比**
   - 比較新舊版本的響應時間
   - 檢查緩存命中率
   - 監控 API Key 使用情況

### 第三階段：全面部署（100% 流量）

1. **最終切換**
   ```typescript
   export const RPC_MIGRATION_CONFIG = {
     trafficPercentage: 100, // 全部流量
     ...
   }
   ```

2. **移除舊版本（可選）**
   - 確認新版本穩定運行一週後
   - 可以考慮移除 `/api/rpc` 端點

## 🧪 測試計劃

### 功能測試

1. **基本 RPC 調用**
   ```bash
   curl -X POST https://your-domain.vercel.app/api/rpc-optimized \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
   ```

2. **批量請求**
   ```bash
   curl -X POST https://your-domain.vercel.app/api/rpc-optimized \
     -H "Content-Type: application/json" \
     -d '[
       {"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1},
       {"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":2}
     ]'
   ```

3. **健康檢查**
   ```bash
   curl https://your-domain.vercel.app/api/rpc-optimized/health
   ```

### 性能測試

1. **緩存效果**
   - 重複調用相同請求
   - 檢查 `X-Cache` 標頭（HIT/MISS）
   - 驗證響應時間改善

2. **速率限制**
   - 發送超過 100 個請求/分鐘
   - 驗證返回 429 錯誤

3. **並發測試**
   ```bash
   # 使用 Apache Bench
   ab -n 100 -c 10 -p request.json -T application/json \
     https://your-domain.vercel.app/api/rpc-optimized
   ```

### 監控指標

1. **關鍵指標**
   - 平均響應時間
   - 緩存命中率
   - 錯誤率
   - API Key 使用分布

2. **警報設置**
   - 錯誤率 > 5%
   - 響應時間 > 500ms
   - 單個 API Key 錯誤率 > 50%

## 🔄 回滾計劃

如果出現問題，可以快速回滾：

### 方法 1：調整流量
```typescript
// 立即將流量切回舊版本
export const RPC_MIGRATION_CONFIG = {
  trafficPercentage: 0, // 所有流量使用舊版本
  ...
}
```

### 方法 2：強制版本
```typescript
export const RPC_MIGRATION_CONFIG = {
  forceVersion: 'legacy', // 強制所有用戶使用舊版本
  ...
}
```

### 方法 3：環境變數
```bash
# 在 Vercel 中設置
VITE_USE_RPC_PROXY=false  # 完全禁用代理，使用直接連接
```

## 📊 預期效果

### 性能提升
- 緩存命中的請求：< 10ms（原 200-500ms）
- 平均響應時間：50-200ms（原 200-500ms）
- 吞吐量：~5000 req/min（原 ~1000 req/min）

### 成本節省
- RPC 調用次數減少 60-80%（通過緩存）
- API 費用降低約 50%

### 可靠性提升
- 錯誤率：< 1%（原 ~5%）
- 自動重試和故障轉移
- 智能 API Key 管理

## 🐛 故障排除

### 常見問題

1. **所有請求都返回 500 錯誤**
   - 檢查是否設置了 API Keys
   - 驗證環境變數名稱是否正確

2. **緩存不生效**
   - 確認請求方法是否在可緩存列表中
   - 檢查緩存統計數據

3. **速率限制太嚴格**
   - 可以調整 `RATE_LIMIT.maxRequests`
   - 考慮基於 API Key 的限制

4. **某些用戶一直使用舊版本**
   - 清除 localStorage
   - 使用 `clearRpcMigrationGroup()` 函數

## 📝 監控腳本

創建一個簡單的監控腳本：

```javascript
// monitor-rpc.js
async function monitorRpc() {
  const response = await fetch('https://your-domain.vercel.app/api/rpc-optimized/health');
  const data = await response.json();
  
  console.log('=== RPC 優化版本健康狀態 ===');
  console.log(`緩存命中率: ${data.stats.cache.hitRate}`);
  console.log(`活躍客戶端: ${data.stats.rateLimiter.activeClients}`);
  console.log(`可用 API Keys: ${data.stats.keyManager.totalKeys}`);
  
  // 檢查每個 Key 的狀態
  data.stats.keyManager.keys.forEach(key => {
    console.log(`Key ${key.index}: ${key.requests} 請求, ${key.errorRate} 錯誤率`);
  });
}

// 每分鐘執行一次
setInterval(monitorRpc, 60000);
```

## ✅ 完成標準

部署成功的標準：
1. 健康檢查端點正常響應
2. 錯誤率 < 1%
3. 緩存命中率 > 30%
4. 所有 API Keys 正常工作
5. 用戶無感知切換