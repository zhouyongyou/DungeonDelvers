# RPC 代理生產環境部署指南

## 概述
本指南說明如何安全地部署 RPC 代理到生產環境，確保 API key 不會在前端暴露。

## 環境變數配置

### 前端環境變數 (.env.production)
```bash
# 後端 API 服務器地址
VITE_SERVER_URL=https://dungeondelvers-backend.onrender.com
VITE_METADATA_SERVER_URL=https://dungeondelvers-backend.onrender.com

# 啟用 RPC 代理模式
VITE_USE_RPC_PROXY=true

# GraphQL 端點
VITE_GRAPHQL_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.2

# 其他必要配置
VITE_WALLETCONNECT_PROJECT_ID=你的WalletConnect項目ID
```

### 後端環境變數（在 Render.com 設置）
```bash
# Alchemy RPC URL (包含 API key)
ALCHEMY_BSC_MAINNET_RPC_URL=https://bnb-mainnet.g.alchemy.com/v2/3lmTWjUVbFylAurhdU-rSUefTC-P4tKf

# 其他後端配置
PORT=3000
NODE_ENV=production
```

## 部署步驟

### 1. 更新後端代碼
確保後端有 RPC 代理端點：

```javascript
// backend/routes/rpc.js
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
    res.status(500).json({ error: 'RPC request failed' });
  }
});

// RPC 狀態檢查端點
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
      status: 'ok',
      summary: { healthy: data.result ? 1 : 0 },
    });
  } catch (error) {
    res.status(500).json({ status: 'error' });
  }
});
```

### 2. 在 Render.com 設置環境變數

1. 登入 [Render Dashboard](https://dashboard.render.com/)
2. 選擇你的後端服務
3. 進入 "Environment" 標籤
4. 添加環境變數：
   - `ALCHEMY_BSC_MAINNET_RPC_URL`: 你的 Alchemy RPC URL
   - `NODE_ENV`: production
5. 保存並重新部署

### 3. 更新前端配置

1. 創建 `.env.production` 文件（如上所示）
2. 確保 `.gitignore` 包含 `.env.production`
3. 在 Vercel/Netlify 設置相應的環境變數

### 4. 部署前端

#### Vercel 部署
```bash
# 使用 Vercel CLI
vercel --prod

# 或通過 GitHub 自動部署
```

在 Vercel Dashboard 設置環境變數：
- `VITE_USE_RPC_PROXY`: true
- `VITE_SERVER_URL`: https://dungeondelvers-backend.onrender.com
- 其他必要的環境變數

## 驗證部署

### 1. 檢查 RPC 代理是否工作
```javascript
// 在瀏覽器控制台執行
fetch('https://dungeondelvers-backend.onrender.com/api/rpc/status')
  .then(res => res.json())
  .then(console.log);
```

### 2. 檢查前端是否使用代理
- 打開瀏覽器開發者工具
- 查看 Network 標籤
- 確認 RPC 請求發送到後端代理而不是直接到 Alchemy

### 3. 檢查控制台日誌
應該看到：
```
🔄 使用後端 RPC 代理: https://dungeondelvers-backend.onrender.com
```

## 安全檢查清單

- [ ] 前端代碼中沒有 Alchemy API key
- [ ] 環境變數文件未提交到 Git
- [ ] 後端正確配置了 CORS
- [ ] RPC 代理端點有 rate limiting
- [ ] 監控 RPC 使用量

## 監控和優化

### 1. 監控 RPC 使用
- 使用內建的 RPC 監控系統
- 在管理面板查看統計數據
- 定期檢查 Alchemy Dashboard

### 2. 性能優化
- 確保緩存策略正確實施
- 監控響應時間
- 根據需要調整重試策略

## 故障排除

### 問題：RPC 代理返回 500 錯誤
- 檢查後端環境變數是否正確設置
- 確認 Alchemy RPC URL 有效
- 查看後端日誌

### 問題：前端仍使用公共 RPC
- 確認 `VITE_USE_RPC_PROXY=true`
- 檢查 `VITE_SERVER_URL` 是否正確
- 清除瀏覽器緩存並重新加載

### 問題：CORS 錯誤
- 確保後端配置了正確的 CORS 策略
- 添加前端域名到允許列表

## 成本控制

使用 RPC 監控系統來：
1. 追踪每日/每月請求量
2. 識別高消耗的功能
3. 優化緩存策略以減少請求

## 更新維護

定期：
1. 檢查 Alchemy 使用統計
2. 更新 RPC 節點列表
3. 優化緩存配置
4. 檢查安全更新