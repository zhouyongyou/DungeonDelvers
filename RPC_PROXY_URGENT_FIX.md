# 🚨 RPC 代理緊急修復指南

## 問題描述
前端仍在使用公共 RPC 節點，因為後端的 RPC 代理端點尚未實現。

## 當前狀態
- ✅ 前端已配置使用 RPC 代理 (`VITE_USE_RPC_PROXY=true`)
- ✅ 前端代碼已準備好使用代理
- ❌ 後端缺少 `/api/rpc` 端點
- ❌ 後端缺少 `/api/rpc/status` 端點

## 緊急修復方案

### 方案 A：快速回退到公共節點（立即可用）
1. 修改 `.env` 文件：
```bash
VITE_USE_RPC_PROXY=false
```

2. 重啟開發服務器：
```bash
npm run dev
```

### 方案 B：實現後端 RPC 代理（推薦）

在 `dungeon-delvers-metadata-server` 後端添加以下代碼：

```javascript
// 在 server.js 或 app.js 中添加

// RPC 代理端點
app.post('/api/rpc', async (req, res) => {
  try {
    const alchemyUrl = process.env.ALCHEMY_BSC_MAINNET_RPC_URL;
    
    if (!alchemyUrl) {
      return res.status(500).json({ 
        error: 'RPC URL not configured' 
      });
    }
    
    // 轉發請求到 Alchemy
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    
    const data = await response.json();
    res.json(data);
    
  } catch (error) {
    console.error('RPC proxy error:', error);
    res.status(500).json({ 
      error: 'RPC proxy failed' 
    });
  }
});

// RPC 狀態檢查端點
app.get('/api/rpc/status', async (req, res) => {
  try {
    const alchemyUrl = process.env.ALCHEMY_BSC_MAINNET_RPC_URL;
    
    if (!alchemyUrl) {
      return res.json({ 
        status: 'error',
        message: 'RPC URL not configured'
      });
    }
    
    // 測試 RPC 連接
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
    });
    
    if (response.ok) {
      res.json({ 
        status: 'ok',
        summary: { healthy: 1 }
      });
    } else {
      res.json({ 
        status: 'error',
        message: 'RPC health check failed'
      });
    }
    
  } catch (error) {
    res.json({ 
      status: 'error',
      message: error.message
    });
  }
});
```

### 方案 C：使用現有的生產環境配置（如果後端已部署）

檢查後端是否已經部署了 RPC 代理功能：

1. 測試代理端點：
```bash
curl https://dungeondelvers-backend.onrender.com/api/rpc/status
```

2. 如果返回 404，需要更新後端代碼並重新部署

## 後端環境變數配置（Render.com）

確保在 Render.com 設置了以下環境變數：
```
ALCHEMY_BSC_MAINNET_RPC_URL=https://bnb-mainnet.g.alchemy.com/v2/你的API密鑰
```

## 驗證步驟

1. 檢查瀏覽器控制台日誌
2. 查看是否顯示 "🔐 RPC 請求: xxx 使用私人節點代理"
3. 確認沒有顯示 "使用節點: https://bsc-dataseed1.binance.org/"

## 監控

使用管理頁面的 RPC 監控面板查看：
- 請求來源（應該顯示代理 URL）
- 成功率
- 響應時間