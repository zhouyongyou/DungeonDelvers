# Vercel 配置部署檢查清單

## 🚀 推薦配置：混合策略（極速 + 安全）

### 📋 部署前檢查清單

#### 1. **Alchemy Dashboard 設置**
- [ ] 登入 [Alchemy Dashboard](https://dashboard.alchemy.com/)
- [ ] 為 `3lmTWjUVbFylAurhdU-rSUefTC-P4tKf` 設置域名限制：
  - 允許域名：`dungeondelvers.xyz`
  - 允許域名：`www.dungeondelvers.xyz`
  - 允許域名：`dungeondelvers.vercel.app`（如有需要）
- [ ] 確認其他 4 個 API keys 無域名限制（用於代理）

#### 2. **The Graph Dashboard 設置**
- [ ] 確認 API key `f6c1aba78203cfdf0cc732eafe677bdd` 已設置域名限制
- [ ] 域名限制應包含：`dungeondelvers.xyz`

#### 3. **Vercel 環境變數設置**

```bash
# 🔥 複製以下環境變數到 Vercel Dashboard
VITE_WALLETCONNECT_PROJECT_ID=d02f4199d4862ab0a12a3d0424fb567b
VITE_THE_GRAPH_NETWORK_URL=https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs
VITE_USE_DECENTRALIZED_GRAPH=true
VITE_DEVELOPER_ADDRESS=0x10925A7138649C7E1794CE646182eeb5BF8ba647
VITE_ALCHEMY_KEY_PUBLIC=3lmTWjUVbFylAurhdU-rSUefTC-P4tKf
ALCHEMY_API_KEY_2=tiPlQVTwx4_2P98Pl7hb-LfzaTyi5HOn
ALCHEMY_API_KEY_3=QzXiHWkNRovjd_EeDRqVfR9rApUDiXRp
ALCHEMY_API_KEY_4=fB2BrBD6zFEhc6YoWxwuP5UQJ_ee-99M
ALCHEMY_API_KEY_5=F7E3-HDwgUHDQvdICnFv_
```

### ⚠️ 部署後驗證

#### 1. **功能測試**
- [ ] 錢包連接正常
- [ ] 合約讀取功能正常
- [ ] The Graph 查詢正常
- [ ] 開發者資訊顯示正常
- [ ] RPC 請求響應快速

#### 2. **效能驗證**
- [ ] 首頁載入時間 < 3 秒
- [ ] The Graph 查詢響應時間 < 500ms
- [ ] RPC 請求響應時間 < 200ms
  
#### 3. **安全檢查**
- [ ] 查看瀏覽器開發者工具，確認只有預期的 API keys 暴露
- [ ] 測試從其他域名無法使用暴露的 keys
- [ ] 監控 Alchemy Dashboard 的使用量是否正常

### 🔧 故障排除

#### 問題：The Graph 查詢失敗
**可能原因：**
- API key 域名限制過嚴
- Subgraph ID 錯誤

**解決方案：**
1. 檢查 The Graph Dashboard 域名設置
2. 驗證 URL 格式正確性
3. 暫時移除 `VITE_USE_DECENTRALIZED_GRAPH` 使用免費版測試

#### 問題：RPC 請求失敗
**可能原因：**
- Alchemy key 域名限制
- API proxy 配置錯誤

**解決方案：**
1. 確認 `VITE_ALCHEMY_KEY_PUBLIC` 在 Alchemy 中有正確域名設置
2. 檢查 `ALCHEMY_API_KEY_*` 變數是否正確設置
3. 查看 Vercel Functions 日志

#### 問題：開發者地址不顯示
**可能測試：**
- 檢查 `VITE_DEVELOPER_ADDRESS` 是否設置
- 確認前端程式碼有使用該變數

### 📊 預期效能提升

| 指標 | 精簡版 | 混合策略 | 提升幅度 |
|------|--------|----------|----------|
| The Graph 查詢 | ~800ms | ~400ms | **50%** |
| RPC 請求 | ~300ms | ~150ms | **50%** |
| 頁面載入 | ~5s | ~2.5s | **50%** |
| 用戶體驗評分 | 6/10 | 9/10 | **50%** |

### 🎯 部署完成檢查

- [ ] 所有環境變數已設置
- [ ] 域名限制已配置
- [ ] 功能測試通過
- [ ] 效能符合預期
- [ ] 安全檢查完成
- [ ] 監控機制啟用

### 📈 後續監控

#### 定期檢查（每週）
- [ ] Alchemy 使用量統計
- [ ] The Graph 查詢次數
- [ ] 網站效能指標
- [ ] 錯誤日志檢查

#### 異常警報設置
- [ ] Alchemy 使用量超過 80% 時警報
- [ ] The Graph 查詢失敗率 > 5% 時警報
- [ ] RPC 響應時間 > 1 秒時警報

---

**🔥 重要提醒**：這個混合策略配置是為 DungeonDelvers 特別優化的方案，可以提供最佳的用戶體驗同時保持安全性。記得定期監控和維護！