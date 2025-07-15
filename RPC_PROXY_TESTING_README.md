# DungeonDelvers RPC 代理測試指南

## 📋 總覽

本指南提供了完整的 RPC 代理功能測試解決方案，包括自動化測試、手動測試、環境檢查和故障排除。

## 🚀 快速開始

### 1. 環境檢查
```bash
# 檢查 RPC 配置
npm run rpc:check-env
```

### 2. 運行測試
```bash
# 全面自動化測試
npm run rpc:test

# 手動測試（互動式）
npm run rpc:test-manual

# Shell 腳本測試
npm run rpc:test-curl
```

## 📁 測試文件說明

### 🔧 測試腳本
- **`test-rpc-proxy.cjs`** - 全面的自動化測試套件
- **`manual-rpc-test.cjs`** - 互動式手動測試工具
- **`test-rpc-curl.sh`** - 純 shell 腳本測試（無需 Node.js）
- **`test-env-vars.cjs`** - 環境變量配置檢查

### 📄 文檔文件
- **`RPC_PROXY_TEST_ANALYSIS.md`** - 詳細技術分析
- **`RPC_PROXY_TEST_FINAL_REPORT.md`** - 最終測試報告
- **`api/rpc-improved.ts`** - 改進版 RPC 代理實現

## 🔍 測試覆蓋範圍

### ✅ 基本功能測試
- [x] `eth_chainId` 請求
- [x] `eth_blockNumber` 請求
- [x] `eth_gasPrice` 請求
- [x] `eth_getBalance` 請求

### ✅ CORS 設置驗證
- [x] OPTIONS 請求處理
- [x] 跨域標頭檢查
- [x] 前端兼容性測試

### ✅ API 金鑰輪換測試
- [x] 多金鑰循環使用
- [x] 負載均衡測試
- [x] 失效保護機制

### ✅ 錯誤處理測試
- [x] 無效 JSON 請求
- [x] 無效 RPC 方法
- [x] 網絡連接失敗
- [x] 超時處理

### ✅ 性能測試
- [x] 響應時間測量
- [x] 並發請求測試
- [x] 吞吐量測試

## 📊 測試結果解讀

### 🟢 成功標準
- 基本 RPC 請求成功率 > 95%
- 平均響應時間 < 2 秒
- 所有 CORS 標頭正確設置
- 錯誤響應格式符合 JSON-RPC 2.0 標準

### 🔴 失敗處理
如果測試失敗，請檢查：
1. Alchemy API 金鑰是否有效
2. 網絡連接是否正常
3. Vercel 函數是否正確部署
4. 環境變量是否正確設置

## 🛠️ 故障排除

### 常見問題

#### 1. 環境變量未載入
```bash
# 確保使用 dotenv 載入
node -r dotenv/config test-env-vars.cjs
```

#### 2. 本地服務器未運行
```bash
# 啟動開發服務器
npm run dev

# 或者測試 Vercel 部署
export VERCEL_URL="https://your-app.vercel.app"
./test-rpc-curl.sh --vercel
```

#### 3. API 金鑰問題
```bash
# 檢查 API 金鑰配置
npm run rpc:check-env

# 確保 .env 文件包含正確的金鑰
cat .env | grep ALCHEMY
```

## 🔧 配置說明

### 環境變量配置
```env
# 後端使用（不加 VITE_ 前綴）
ALCHEMY_API_KEY_1=your_key_1
ALCHEMY_API_KEY_2=your_key_2
ALCHEMY_API_KEY_3=your_key_3

# 前端配置
VITE_METADATA_SERVER_URL=https://your-server.com
VITE_USE_RPC_PROXY=true
```

### Vercel 配置
```json
{
  "functions": {
    "api/rpc.ts": {
      "maxDuration": 30
    }
  }
}
```

## 📈 性能監控

### 監控指標
- 請求成功率
- 平均響應時間
- API 金鑰使用分佈
- 錯誤類型統計

### 日誌分析
```bash
# 查看 Vercel 函數日誌
vercel logs

# 分析錯誤模式
grep "RPC.*Error" logs/*.log
```

## 🚀 部署建議

### 開發環境
1. 創建 `.env.local` 文件
2. 運行 `npm run rpc:check-env` 驗證配置
3. 使用 `npm run rpc:test` 進行測試

### 生產環境
1. 在 Vercel 設置環境變量
2. 部署後運行 `npm run rpc:test-curl --vercel`
3. 設置監控和告警

## 📚 相關文檔

- [RPC_SECURITY_GUIDE.md](./RPC_SECURITY_GUIDE.md) - 安全配置指南
- [RPC_OPTIMIZATION_GUIDE.md](./RPC_OPTIMIZATION_GUIDE.md) - 性能優化指南
- [VERCEL_ENV_CHECKLIST.md](./VERCEL_ENV_CHECKLIST.md) - 部署檢查清單

## 💡 最佳實踐

### 1. 測試策略
- 在每次部署前運行完整測試
- 定期檢查 API 金鑰有效性
- 監控生產環境性能

### 2. 錯誤處理
- 實現適當的重試機制
- 記錄詳細的錯誤信息
- 設置告警通知

### 3. 性能優化
- 使用多個 API 金鑰進行負載均衡
- 實現請求緩存
- 優化請求批處理

## 🔗 npm 腳本快捷方式

```bash
# 環境檢查
npm run rpc:check-env

# 測試腳本
npm run rpc:test          # 全面自動化測試
npm run rpc:test-manual   # 手動測試
npm run rpc:test-curl     # Shell 腳本測試
```

## 📞 技術支持

如果遇到問題：
1. 查看 [RPC_PROXY_TEST_FINAL_REPORT.md](./RPC_PROXY_TEST_FINAL_REPORT.md) 詳細報告
2. 運行 `npm run rpc:check-env` 檢查配置
3. 查看 Vercel 函數日誌
4. 參考故障排除指南

---

**📌 注意**: 此測試套件專為 DungeonDelvers 項目設計，使用 Alchemy 作為 RPC 提供商。如需調整其他提供商，請修改相應的配置。