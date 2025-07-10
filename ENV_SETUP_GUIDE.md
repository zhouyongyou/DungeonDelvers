# 環境變數設定指南

本專案提供了多個環境變數範例文件，以便在不同的環境中快速部署和開發。

## 📁 文件說明

### 主要前端專案

| 檔案 | 用途 | 說明 |
|------|------|------|
| `.env.example` | 基本範例 | 包含所有必要環境變數的通用範例 |
| `.env.local.example` | 本地開發 | 適合本地開發的設定，使用免費 RPC 節點 |
| `.env.vercel` | Vercel 部署 | 專門為 Vercel 平台優化的生產環境設定 |
| `.env.production.example` | 一般生產環境 | 適用於其他生產環境的設定 |

### 元數據伺服器

| 檔案 | 用途 | 說明 |
|------|------|------|
| `dungeon-delvers-metadata-server/.env.example` | 伺服器環境 | 元數據伺服器的環境變數範例 |

## 🚀 快速開始

### 1. 本地開發環境

```bash
# 複製本地開發範例
cp .env.local.example .env.local

# 編輯並填入您的數值
nano .env.local
```

### 2. Vercel 部署

有兩種方式設定 Vercel 環境變數：

#### 方式 A：通過 Vercel Dashboard
1. 前往 Vercel 專案設定頁面
2. 進入 "Environment Variables" 區段
3. 逐一添加 `.env.vercel` 中的變數

#### 方式 B：使用 .env.production
```bash
# 複製 Vercel 範例為生產環境檔案
cp .env.vercel .env.production

# 編輯並填入您的數值
nano .env.production
```

### 3. 其他生產環境

```bash
# 複製生產環境範例
cp .env.production.example .env.production

# 編輯並填入您的數值
nano .env.production
```

### 4. 設定元數據伺服器

```bash
# 進入元數據伺服器目錄
cd dungeon-delvers-metadata-server

# 複製環境變數範例
cp .env.example .env

# 編輯並填入您的數值
nano .env
```

## 🔧 環境變數說明

### 必填變數

以下變數是專案正常運行的必要設定：

#### RPC 節點（至少需要一個）
- `VITE_ALCHEMY_BSC_MAINNET_RPC_URL`
- `VITE_INFURA_BSC_MAINNET_RPC_URL`
- `VITE_ANKR_BSC_MAINNET_RPC_URL`

#### 核心合約地址
- `VITE_MAINNET_SOUL_SHARD_TOKEN_ADDRESS`
- `VITE_MAINNET_HERO_ADDRESS`
- `VITE_MAINNET_RELIC_ADDRESS`
- `VITE_MAINNET_PARTY_ADDRESS`
- 其他所有 `VITE_MAINNET_*_ADDRESS` 變數

#### API 端點
- `VITE_THE_GRAPH_STUDIO_API_URL`

### 選填變數

這些變數有預設值，但建議根據實際需求調整：

- `VITE_MAINNET_URL` - 主網站 URL
- `VITE_USD_TOKEN_ADDRESS` - USD 代幣地址
- `VITE_MAINNET_POOL_ADDRESS` - 流動性池地址

## 💡 最佳實踐

### 1. 安全性
- 🔒 永遠不要將包含真實 API keys 的 `.env` 檔案提交到版本控制
- 🔒 對於生產環境，建議使用平台提供的環境變數功能
- 🔒 定期更換 API keys

### 2. 效能優化
- ⚡ 生產環境建議使用付費的 RPC 服務（如 Alchemy、Infura）
- ⚡ 設定多個備用 RPC 節點以提高可用性
- ⚡ 使用 CDN 和快取來減少 API 調用

### 3. 環境管理
- 📝 為不同環境維護不同的配置文件
- 📝 使用有意義的註解說明各個變數的用途
- 📝 定期檢查和更新環境變數

## 🔍 故障排除

### 常見問題

1. **RPC 節點連接失敗**
   - 檢查 RPC URL 是否正確
   - 確認 API key 是否有效
   - 嘗試使用不同的 RPC 提供商

2. **合約地址錯誤**
   - 確認所有合約地址都是正確的主網地址
   - 檢查地址格式是否正確（0x 開頭）

3. **環境變數未生效**
   - 重啟開發伺服器
   - 確認檔案名稱正確
   - 檢查變數名稱是否完全匹配

### 驗證環境設定

可以使用以下腳本驗證環境變數是否正確設定：

```bash
# 檢查所有必要的環境變數
npm run check-env
```

## 📞 獲得幫助

如果在設定過程中遇到問題，請：

1. 檢查本文件的故障排除區段
2. 查看專案的 GitHub Issues
3. 在 Discord 社群尋求協助

---

*最後更新：2024年12月*