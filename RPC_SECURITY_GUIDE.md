# 🔐 RPC 安全配置指南

## 📋 概述

本指南說明如何安全地配置 Alchemy 等私人 RPC 節點，避免在前端暴露 API Key。

## 🚨 安全問題

### ❌ **錯誤做法**
```bash
# 前端環境變數 (.env) - 絕對不要這樣做！
VITE_BSC_MAINNET_RPC_URL="https://bnb-mainnet.g.alchemy.com/v2/3lmTWjUVbFylAurhdU-rSUefTC-P4tKf"
```

**問題**：
- API Key 會被暴露在前端代碼中
- 任何人都可以查看和盜用你的 API Key
- 可能導致 API 配額被惡意消耗

### ✅ **正確做法**
```bash
# 後端環境變數 (metadata-server/.env) - 正確做法
BSC_MAINNET_RPC_URL="https://bnb-mainnet.g.alchemy.com/v2/3lmTWjUVbFylAurhdU-rSUefTC-P4tKf"

# 前端環境變數 (.env) - 啟用代理
VITE_USE_RPC_PROXY=true
VITE_METADATA_SERVER_URL=https://dungeon-delvers-metadata-server.onrender.com
```

## 解決方案

### 方案一：使用後端 RPC 代理（強烈推薦）

#### 1. 建立後端 RPC 代理服務

在你的後端服務器（如 metadata-server）添加 RPC 代理端點：

```javascript
// backend/routes/rpc-proxy.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// 私有的 Alchemy Key 只存在後端
const ALCHEMY_URL = `https://bnb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;

// RPC 代理端點
router.post('/rpc', async (req, res) => {
  try {
    // 可選：添加請求限流
    // 可選：驗證請求來源
    
    // 轉發 RPC 請求到 Alchemy
    const response = await axios.post(ALCHEMY_URL, req.body, {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('RPC proxy error:', error);
    res.status(500).json({ 
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal error' },
      id: req.body.id 
    });
  }
});

module.exports = router;
```

#### 2. 更新前端配置

```typescript
// src/config/wagmi.ts
import { http, createConfig } from 'wagmi';
import { bsc } from 'wagmi/chains';

// 使用你的後端 RPC 代理
const RPC_PROXY_URL = import.meta.env.VITE_METADATA_SERVER_URL 
  ? `${import.meta.env.VITE_METADATA_SERVER_URL}/api/rpc`
  : 'https://bsc-dataseed1.binance.org/'; // 公共備用

export const config = createConfig({
  chains: [bsc],
  transports: {
    [bsc.id]: http(RPC_PROXY_URL),
  },
});
```

### 方案二：使用公共 RPC + 請求優化

如果暫時無法實施後端代理，可以：

#### 1. 使用公共 RPC 節點

```typescript
// src/config/rpc.ts
export const BSC_PUBLIC_RPCS = [
  'https://bsc-dataseed1.binance.org/',
  'https://bsc-dataseed2.binance.org/',
  'https://bsc-dataseed3.binance.org/',
  'https://bsc-dataseed4.binance.org/',
  'https://bsc.publicnode.com',
  'https://binance.llamarpc.com',
];

// 輪詢使用不同的公共 RPC
let currentRpcIndex = 0;
export function getNextRpc() {
  const rpc = BSC_PUBLIC_RPCS[currentRpcIndex];
  currentRpcIndex = (currentRpcIndex + 1) % BSC_PUBLIC_RPCS.length;
  return rpc;
}
```

#### 2. 實施請求優化

```typescript
// src/hooks/useOptimizedContract.ts
import { useQueryClient } from '@tanstack/react-query';

export function useOptimizedContract() {
  const queryClient = useQueryClient();
  
  // 使用更長的快取時間減少 RPC 請求
  const defaultOptions = {
    staleTime: 1000 * 60 * 5, // 5 分鐘
    gcTime: 1000 * 60 * 30,   // 30 分鐘
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  };
  
  return { defaultOptions };
}
```

### 方案三：使用 WalletConnect 的 RPC（臨時方案）

WalletConnect 提供免費的公共 RPC：

```typescript
// src/config/wagmi.ts
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

export const config = createConfig({
  chains: [bsc],
  transports: {
    [bsc.id]: http(`https://rpc.walletconnect.com/v1/?chainId=56&projectId=${walletConnectProjectId}`),
  },
});
```

## 實施步驟

### 第一階段（立即執行）
1. 從 `.env` 中移除 `VITE_ALCHEMY_BSC_MAINNET_RPC_URL`
2. 改用公共 RPC 節點
3. 實施請求優化策略

### 第二階段（短期目標）
1. 在後端實施 RPC 代理
2. 添加請求限流和監控
3. 實施請求來源驗證

### 第三階段（長期優化）
1. 實施智能 RPC 路由（根據請求類型選擇不同節點）
2. 添加請求快取層
3. 實施 WebSocket 代理（如需要）

## 安全檢查清單

- [ ] 確認所有 `.env` 文件中沒有敏感 API Key
- [ ] 確認 `.env.example` 中沒有真實的 Key
- [ ] 檢查 Git 歷史中是否曾提交過 Key（如有，需要重新生成）
- [ ] 實施後端 RPC 代理
- [ ] 添加請求限流保護
- [ ] 監控 API 使用情況

## 其他安全建議

1. **API Key 輪換**：定期更換 Alchemy/Infura 的 API Key
2. **IP 白名單**：在 Alchemy 設置中只允許你的後端服務器 IP
3. **使用環境變量管理工具**：如 AWS Secrets Manager、Vercel 環境變量等
4. **監控異常使用**：設置 API 使用量警報

## 緊急情況處理

如果 API Key 已經洩露：
1. 立即在 Alchemy/Infura 控制台重新生成新 Key
2. 更新後端環境變量
3. 檢查 API 使用記錄是否有異常
4. 考慮實施 IP 白名單限制

---

記住：**任何帶有 VITE_ 前綴的環境變量都會暴露在前端代碼中！**