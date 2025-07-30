# RPC 配置指南

## 🔧 本地開發配置

### 1. 基本配置（推薦）
在 `.env.local` 文件中添加：

```bash
# Alchemy API Key（BSC 主網）
VITE_ALCHEMY_KEY=你的_ALCHEMY_API_KEY

# 或使用多個 Key 進行負載均衡
VITE_ALCHEMY_KEY_1=第一個_API_KEY
VITE_ALCHEMY_KEY_2=第二個_API_KEY
VITE_ALCHEMY_KEY_3=第三個_API_KEY

# 禁用 RPC 代理（直連 Alchemy）
VITE_USE_RPC_PROXY=false
```

### 2. 獲取 Alchemy Key
1. 訪問 https://www.alchemy.com/
2. 註冊並創建新應用
3. 選擇 BNB Smart Chain (BSC Mainnet)
4. 複製 API Key

### 3. 配置檢查
在瀏覽器控制台執行：
```javascript
// 檢查當前 RPC 配置
checkRpcConfiguration()
```

## 🚨 緊急 RPC 模式

### 問題現象
- 控制台顯示 "🆘 使用緊急 RPC 執行請求"
- 使用公共節點而非私人節點
- 可能影響性能和穩定性

### 解決方法
1. **清除緊急模式**
   ```javascript
   // 在控制台執行
   clearEmergencyRpcMode()
   ```
   然後刷新頁面

2. **檢查配置**
   - 確認 `.env.local` 存在
   - 確認 Alchemy Key 正確
   - 重啟開發服務器

### 觸發原因
- 私人節點連接失敗
- API Key 無效或過期
- 網路問題

## 🎯 最佳實踐

### 開發環境
```bash
# .env.local
VITE_ALCHEMY_KEY=開發用_KEY
VITE_USE_RPC_PROXY=false
```

### 生產環境（Vercel）
```bash
# Vercel 環境變數
VITE_ALCHEMY_KEY_PUBLIC=公開用_KEY（有速率限制）
ALCHEMY_API_KEY_1=私密_KEY_1（通過代理保護）
ALCHEMY_API_KEY_2=私密_KEY_2
```

## 📊 RPC 使用策略

### 1. 直連模式（開發推薦）
- 配置 `VITE_ALCHEMY_KEY`
- 設置 `VITE_USE_RPC_PROXY=false`
- 直接連接 Alchemy 節點

### 2. 代理模式（生產推薦）
- 設置 `VITE_USE_RPC_PROXY=true`
- 請求通過 `/api/rpc` 轉發
- 保護 API Key 不暴露

### 3. 混合模式
- 事件監聽：使用公開 Key
- 其他請求：使用私密 Key

## 🐛 常見問題

### Q: 為什麼一直使用緊急 RPC？
A: 可能原因：
- 未配置 Alchemy Key
- 處於緊急模式（需清除）
- Key 無效或網路問題

### Q: 如何確認使用了私人節點？
A: 檢查控制台日誌：
- ✅ "🔑 使用直接 Alchemy RPC 節點"
- ❌ "🆘 使用緊急 RPC 執行請求"

### Q: 配置了 Key 但還是用公共節點？
A: 執行以下步驟：
1. `clearEmergencyRpcMode()`
2. 刷新頁面
3. 檢查 `.env.local` 格式
4. 重啟開發服務器

## 📝 環境變數優先級

1. `.env.local`（最高優先級）
2. `.env`
3. 系統環境變數
4. 默認值

## 🔍 調試技巧

### 1. 檢查載入的配置
```javascript
// 查看所有環境變數
console.log(import.meta.env)
```

### 2. 監控 RPC 請求
打開 Network 標籤，過濾：
- `alchemy.com` - 私人節點
- `binance.org` - 公共節點

### 3. 清理和重置
```bash
# 清理緩存
rm -rf node_modules/.vite

# 重新安裝和啟動
npm install
npm run dev
```