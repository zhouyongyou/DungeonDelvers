# 🌐 RPC 完整指南

## 📋 目錄

1. [安全配置](#安全配置)
2. [優化策略](#優化策略)
3. [故障排除](#故障排除)
4. [生產環境部署](#生產環境部署)
5. [測試指南](#測試指南)

---

## 🔐 安全配置

### RPC 代理服務器設置

為了保護 RPC API 密鑰，我們使用代理服務器：

```javascript
// rpc-proxy.js
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

app.post('/rpc', async (req, res) => {
  const response = await fetch(process.env.RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });
  
  const data = await response.json();
  res.json(data);
});
```

### 環境變數配置

```env
# .env.local
VITE_RPC_PROXY_URL=http://localhost:3001/rpc
VITE_ENABLE_RPC_PROXY=true

# .env.production
VITE_RPC_PROXY_URL=https://your-proxy-server.com/rpc
VITE_ENABLE_RPC_PROXY=true
```

---

## ⚡ 優化策略

### 1. 請求批次處理

```typescript
// 使用 multicall 減少 RPC 請求
const multicallContract = getContract({
  address: MULTICALL_ADDRESS,
  abi: multicallAbi,
  client: publicClient,
});

const results = await multicallContract.read.aggregate([calls]);
```

### 2. 緩存策略

```typescript
// React Query 配置
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 分鐘
      cacheTime: 30 * 60 * 1000, // 30 分鐘
      refetchInterval: 30 * 1000, // 30 秒
    },
  },
});
```

### 3. RPC 端點管理

```typescript
const RPC_ENDPOINTS = {
  primary: 'https://bsc-dataseed1.bnbchain.org',
  backup: [
    'https://bsc-dataseed2.bnbchain.org',
    'https://bsc-dataseed3.bnbchain.org',
  ],
};
```

---

## 🔧 故障排除

### 常見問題

1. **CORS 錯誤**
   - 確保代理服務器正確配置 CORS
   - 檢查環境變數是否正確設置

2. **429 Too Many Requests**
   - 實施請求限流
   - 增加緩存時間
   - 使用多個 RPC 端點輪詢

3. **連接超時**
   - 設置合理的超時時間（建議 30 秒）
   - 實施重試機制

### 調試工具

```javascript
// RPC 請求監控
window.DEBUG_RPC = true; // 開啟調試模式

// 檢查 RPC 狀態
async function checkRpcStatus() {
  try {
    const blockNumber = await publicClient.getBlockNumber();
    console.log('RPC 正常，當前區塊：', blockNumber);
  } catch (error) {
    console.error('RPC 錯誤：', error);
  }
}
```

---

## 🚀 生產環境部署

### Vercel 部署配置

1. **環境變數設置**
   ```
   VITE_RPC_PROXY_URL=https://your-proxy.vercel.app/api/rpc
   VITE_ENABLE_RPC_PROXY=true
   ```

2. **API 路由配置**
   ```javascript
   // api/rpc.js
   export default async function handler(req, res) {
     // 代理邏輯
   }
   ```

3. **安全標頭**
   ```json
   // vercel.json
   {
     "headers": [
       {
         "source": "/api/(.*)",
         "headers": [
           { "key": "X-Content-Type-Options", "value": "nosniff" },
           { "key": "X-Frame-Options", "value": "DENY" }
         ]
       }
     ]
   }
   ```

---

## 🧪 測試指南

### 單元測試

```javascript
// test-rpc-connection.js
describe('RPC Connection', () => {
  it('should connect to RPC proxy', async () => {
    const client = createPublicClient({
      transport: http(process.env.VITE_RPC_PROXY_URL),
    });
    
    const chainId = await client.getChainId();
    expect(chainId).toBe(56); // BSC mainnet
  });
});
```

### 負載測試

```bash
# 使用 artillery 進行負載測試
artillery quick --count 100 --num 10 https://your-proxy/rpc
```

### 監控建議

1. **設置告警**
   - RPC 錯誤率 > 5%
   - 響應時間 > 3 秒
   - 請求失敗率持續上升

2. **日誌記錄**
   - 記錄所有 RPC 請求和響應時間
   - 追蹤錯誤類型和頻率

---

## 📊 性能指標

### 建議的閾值

- **平均響應時間**: < 500ms
- **P95 響應時間**: < 2s
- **錯誤率**: < 1%
- **可用性**: > 99.9%

### 優化檢查清單

- [ ] 實施請求批次處理
- [ ] 配置適當的緩存策略
- [ ] 設置請求重試機制
- [ ] 使用多個 RPC 端點
- [ ] 監控 RPC 使用情況
- [ ] 定期審查和優化

---

## 🔄 更新記錄

- **2025-01-20**: 整合所有 RPC 相關文檔
- **2025-01-15**: 新增 RPC 監控系統
- **2025-01-14**: 實施代理服務器

---

## 📚 相關資源

- [Viem 文檔](https://viem.sh/)
- [BSC RPC 端點列表](https://docs.bnbchain.org/docs/rpc)
- [Web3 安全最佳實踐](https://consensys.github.io/smart-contract-best-practices/)