# Alchemy RPC 設置指南

## 步驟 1: 後端設置 (Render.com)

### 1.1 登入 Render Dashboard
1. 前往 https://dashboard.render.com/
2. 選擇你的後端服務 (dungeondelvers-backend)

### 1.2 添加環境變數
在 Environment 標籤中添加：
```
ALCHEMY_BSC_MAINNET_RPC_URL=https://bnb-mainnet.g.alchemy.com/v2/3lmTWjUVbFylAurhdU-rSUefTC-P4tKf
```

### 1.3 確保後端有 RPC 代理端點
確認後端代碼包含以下端點：

```javascript
// routes/api.js 或類似文件
app.post('/api/rpc', async (req, res) => {
  try {
    const response = await fetch(process.env.ALCHEMY_BSC_MAINNET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('RPC proxy error:', error);
    res.status(500).json({ error: 'RPC request failed' });
  }
});

app.get('/api/rpc/status', async (req, res) => {
  try {
    const response = await fetch(process.env.ALCHEMY_BSC_MAINNET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
    });
    
    const data = await response.json();
    res.json({
      status: data.result ? 'ok' : 'error',
      summary: { healthy: data.result ? 1 : 0 },
    });
  } catch (error) {
    res.status(500).json({ status: 'error' });
  }
});
```

### 1.4 重新部署
保存環境變數後，Render 會自動重新部署你的服務。

## 步驟 2: 前端設置

### 2.1 更新 .env 文件
確保你的 `.env` 文件包含：
```bash
# 後端服務 URL
VITE_SERVER_URL=https://dungeondelvers-backend.onrender.com
VITE_METADATA_SERVER_URL=https://dungeondelvers-backend.onrender.com

# 啟用 RPC 代理
VITE_USE_RPC_PROXY=true

# 注意：不要在前端設置 Alchemy key！
```

### 2.2 驗證配置
在瀏覽器控制台執行：
```javascript
// 檢查 RPC 代理狀態
fetch('https://dungeondelvers-backend.onrender.com/api/rpc/status')
  .then(res => res.json())
  .then(console.log);
```

應該看到：
```json
{
  "status": "ok",
  "summary": { "healthy": 1 }
}
```

## 步驟 3: 監控和驗證

### 3.1 檢查 RPC 使用
1. 打開瀏覽器開發者工具
2. 進入 Network 標籤
3. 過濾 "rpc" 請求
4. 確認請求發送到你的後端 URL，而不是直接到 Alchemy

### 3.2 查看監控數據
1. 訪問管理面板：http://localhost:5173/#/admin
2. 查看 "RPC 監控系統" 部分
3. 應該看到 "使用私人節點代理" 的日誌

### 3.3 檢查 Alchemy Dashboard
1. 登入 https://dashboard.alchemy.com/
2. 查看你的 BSC Mainnet 應用
3. 檢查請求量是否來自你的後端 IP

## 常見問題

### Q: 仍然看到 "使用公共節點" 的日誌？
A: 檢查：
1. `VITE_USE_RPC_PROXY=true` 是否正確設置
2. `VITE_METADATA_SERVER_URL` 是否指向正確的後端
3. 後端服務是否正常運行

### Q: 收到 CORS 錯誤？
A: 確保後端正確設置了 CORS：
```javascript
app.use(cors({
  origin: ['http://localhost:5173', 'https://dungeondelvers.xyz'],
  credentials: true
}));
```

### Q: RPC 代理返回 500 錯誤？
A: 檢查後端日誌，確認：
1. 環境變數正確設置
2. Alchemy URL 有效
3. 後端有網絡訪問權限

## 成本優化建議

1. **使用緩存**：前端已實施了全面的緩存策略，可減少 60-80% 的請求
2. **監控使用**：定期查看 RPC 監控面板，識別高消耗的功能
3. **批量請求**：盡可能使用 `useReadContracts` 批量請求
4. **優化輪詢**：減少不必要的自動刷新和輪詢

## 安全檢查清單

- [ ] 前端代碼中沒有 Alchemy API key
- [ ] `.env` 文件已添加到 `.gitignore`
- [ ] 後端環境變數安全設置
- [ ] RPC 代理端點正常工作
- [ ] 監控系統顯示使用私人節點