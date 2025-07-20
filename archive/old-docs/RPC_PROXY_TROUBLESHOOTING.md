# RPC 代理故障排除指南

## 當前問題
- 管理頁面載入失敗
- 錯誤訊息：`net::ERR_CONNECTION_CLOSED`
- 系統回退到公共節點 `bsc.publicnode.com`

## 可能原因

### 1. 瀏覽器緩存
- 清除瀏覽器緩存和 Cookie
- 使用無痕模式測試
- 強制刷新頁面 (Ctrl+F5 或 Cmd+Shift+R)

### 2. 環境變數未生效
```bash
# 重啟開發服務器
cd /Users/sotadic/Documents/GitHub/DungeonDelvers
npm run dev
```

### 3. CORS 問題
公共節點可能阻擋來自瀏覽器的直接請求。

## 立即解決方案

### 方案 A：確認代理 URL 正確
在瀏覽器控制台執行：
```javascript
console.log('RPC Proxy URL:', import.meta.env.VITE_METADATA_SERVER_URL);
console.log('Use Proxy:', import.meta.env.VITE_USE_RPC_PROXY);
```

應該顯示：
- `https://dungeon-delvers-metadata-server.onrender.com`
- `true`

### 方案 B：測試 RPC 代理
在瀏覽器控制台執行：
```javascript
fetch('https://dungeon-delvers-metadata-server.onrender.com/api/rpc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_blockNumber',
    params: [],
    id: 1
  })
}).then(r => r.json()).then(console.log);
```

### 方案 C：檢查網路請求
1. 打開瀏覽器開發者工具
2. 切換到 Network 標籤
3. 重新載入頁面
4. 查找 `/api/rpc` 請求
5. 確認請求是否發送到正確的後端

## 長期解決方案

### 1. 禁用公共節點回退
修改 `smartRpcTransport.ts`，當代理可用時不要回退到公共節點。

### 2. 改善錯誤處理
添加更詳細的錯誤日誌來診斷問題。

### 3. 添加重試機制
為代理請求添加智能重試邏輯。

## 驗證檢查清單
- [ ] 本地 `.env` 文件已更新
- [ ] 開發服務器已重啟
- [ ] 瀏覽器緩存已清除
- [ ] 控制台顯示正確的環境變數
- [ ] RPC 代理端點可訪問
- [ ] 沒有 CORS 錯誤