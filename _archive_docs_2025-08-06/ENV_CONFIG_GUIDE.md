# 環境變數配置指南

## 前端配置 (DungeonDelvers)

### 本地開發環境 (.env)
```bash
# BSC RPC (公共節點，僅作為備份)
VITE_BSC_RPC=https://bsc-dataseed1.binance.org/

# The Graph Settings
VITE_THEGRAPH_API_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.2
VITE_THE_GRAPH_API_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.2
VITE_THE_GRAPH_STUDIO_API_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.2
VITE_GRAPHQL_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.2

# Mainnet URL
VITE_MAINNET_URL=https://dungeondelvers.xyz

# Developer Settings
VITE_DEVELOPER_ADDRESS=0x10925A7138649C7E1794CE646182eeb5BF8ba647

# 合約地址
VITE_MAINNET_ORACLE_ADDRESS=0xFa2255D806C62a68e8b2F4a7e20f3E8aE9a15c06
VITE_MAINNET_DUNGEONSTORAGE_ADDRESS=0x40D0DFA394707e26247a1EFfAe0f9C1b248Fff10
VITE_MAINNET_PLAYERVAULT_ADDRESS=0x294Fb94d5a543cd77c9932fD34282462a74bFf1A
VITE_MAINNET_ALTAROFASCENSION_ADDRESS=0xD26444ec19e567B872824fe0B9c104e45A3a3341
VITE_MAINNET_DUNGEONMASTER_ADDRESS=0x4424BAE8E132DC83A2F39c76Bc2d9dD44E4A47B0
VITE_MAINNET_HERO_ADDRESS=0x929a4187a462314fCC480ff547019fA122A283f0
VITE_MAINNET_RELIC_ADDRESS=0x1067295025D21f59C8AcB5E777E42F3866a6D2fF
VITE_MAINNET_PARTY_ADDRESS=0xE0272e1D76de1F789ce0996F3226bCf54a8c7735
VITE_MAINNET_VIPSTAKING_ADDRESS=0x7aBEA5b90528a19580A0a2A83e4CF9AD4871880F
VITE_MAINNET_PLAYERPROFILE_ADDRESS=0xBba4fE0b9Ac0b16786986aF0F39535B37D09Ff1F
VITE_MAINNET_DUNGEONCORE_ADDRESS=0x3dCcbcbf81911A635E2b21e2e49925F6441B08B6
VITE_MAINNET_SOUL_SHARD_TOKEN_ADDRESS=0xc88dAD283Ac209D77Bfe452807d378615AB8B94a
VITE_MAINNET_USD_TOKEN_ADDRESS=0x7C67Af4EBC6651c95dF78De11cfe325660d935FE
VITE_MAINNET_POOL_ADDRESS=0x737c5b0430d5aeb104680460179aaa38608b6169

# 後端服務 URL
VITE_METADATA_SERVER_URL=https://dungeondelvers-backend.onrender.com
VITE_SERVER_URL=https://dungeondelvers-backend.onrender.com

# RPC 代理配置 (重要！)
VITE_USE_RPC_PROXY=true

# WalletConnect
VITE_WALLET_CONNECT_PROJECT_ID=d02f4199d4862ab0a12a3d0424fb567b

# ⚠️ 重要：以下變數不應該出現在前端
# ❌ VITE_ALCHEMY_KEY
# ❌ VITE_ALCHEMY_BSC_MAINNET_RPC_URL
```

### Vercel 環境變數設置
在 Vercel Dashboard > Settings > Environment Variables 中添加：

```bash
# 必須設置的變數
VITE_GRAPHQL_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.2
VITE_SERVER_URL=https://dungeondelvers-backend.onrender.com
VITE_METADATA_SERVER_URL=https://dungeondelvers-backend.onrender.com
VITE_USE_RPC_PROXY=true
VITE_WALLET_CONNECT_PROJECT_ID=d02f4199d4862ab0a12a3d0424fb567b

# 合約地址（同上）
VITE_MAINNET_ORACLE_ADDRESS=0xFa2255D806C62a68e8b2F4a7e20f3E8aE9a15c06
VITE_MAINNET_DUNGEONCORE_ADDRESS=0x3dCcbcbf81911A635E2b21e2e49925F6441B08B6
# ... 其他合約地址同上

# 開發者地址
VITE_DEVELOPER_ADDRESS=0x10925A7138649C7E1794CE646182eeb5BF8ba647

# 主網 URL
VITE_MAINNET_URL=https://dungeondelvers.xyz
```

## 後端配置 (Metadata Server)

### 本地開發環境 (.env)
```bash
# 服務器配置
PORT=3000
NODE_ENV=development

# 數據庫配置（如果有）
DATABASE_URL=你的數據庫連接字符串

# CORS 設置
CORS_ORIGIN=http://localhost:5173,https://dungeondelvers.xyz

# Alchemy RPC (私鑰，僅在後端使用)
ALCHEMY_BSC_MAINNET_RPC_URL=https://bnb-mainnet.g.alchemy.com/v2/3lmTWjUVbFylAurhdU-rSUefTC-P4tKf

# API 密鑰（如果需要）
API_SECRET_KEY=你的API密鑰

# 其他服務配置
IPFS_GATEWAY=https://ipfs.io/ipfs/
PINATA_API_KEY=你的Pinata密鑰（如果使用）
PINATA_SECRET_KEY=你的Pinata密鑰（如果使用）
```

### Render.com 環境變數設置
在 Render Dashboard > Environment 中添加：

```bash
# 必須設置的變數
NODE_ENV=production
PORT=3000

# Alchemy RPC (最重要！)
ALCHEMY_BSC_MAINNET_RPC_URL=https://bnb-mainnet.g.alchemy.com/v2/3lmTWjUVbFylAurhdU-rSUefTC-P4tKf

# CORS 設置（允許前端訪問）
CORS_ORIGIN=https://dungeondelvers.xyz,https://dungeondelvers.vercel.app

# 數據庫（如果使用）
DATABASE_URL=你的生產數據庫URL

# 其他服務（根據需要）
IPFS_GATEWAY=https://ipfs.io/ipfs/
API_SECRET_KEY=生產環境的API密鑰
```

## 重要注意事項

### 安全性檢查清單
- ✅ Alchemy API key 只在後端設置
- ✅ 前端使用 RPC 代理模式
- ✅ 所有敏感密鑰都在後端
- ✅ CORS 正確配置
- ✅ 環境變數不提交到 Git

### 驗證步驟

1. **前端驗證**
   ```javascript
   // 在瀏覽器控制台執行
   console.log('RPC Proxy:', import.meta.env.VITE_USE_RPC_PROXY);
   console.log('Backend URL:', import.meta.env.VITE_SERVER_URL);
   ```

2. **後端驗證**
   ```bash
   # 檢查 RPC 代理端點
   curl https://dungeondelvers-backend.onrender.com/api/rpc/status
   ```

3. **監控驗證**
   - 查看管理面板的 RPC 監控系統
   - 確認顯示 "使用私人節點代理"
   - 檢查 Alchemy Dashboard 的請求來源

### 部署流程

1. **後端先部署**
   - 在 Render.com 設置環境變數
   - 確認 `/api/rpc` 端點正常工作
   - 測試 RPC 代理狀態

2. **前端後部署**
   - 在 Vercel 設置環境變數
   - 確認 `VITE_USE_RPC_PROXY=true`
   - 部署並測試連接

### 故障排除

**問題：仍在使用公共節點**
- 檢查 `VITE_USE_RPC_PROXY` 是否為 `true`
- 確認後端 URL 正確
- 清除瀏覽器緩存

**問題：RPC 代理返回錯誤**
- 檢查後端的 Alchemy URL 是否正確
- 查看 Render.com 的日誌
- 確認 CORS 設置

**問題：成本過高**
- 使用 RPC 監控面板查看使用情況
- 調整緩存策略
- 識別高消耗的功能