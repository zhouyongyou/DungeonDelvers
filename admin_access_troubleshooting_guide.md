# 管理員頁面訪問問題解決指南

## 🚨 問題診斷

您遇到的「哎呀！出了點問題，應用程式遇到了一個錯誤」錯誤主要是由於 **缺少環境變量配置文件 (.env)** 導致的。

## 📋 問題原因分析

### 1. **核心問題：缺少 .env 文件**
- 應用程式無法讀取智能合約地址
- 所有合約地址變為 `undefined`
- 權限檢查失敗，導致頁面無法載入

### 2. **權限檢查流程**
```typescript
// AdminPage.tsx 中的權限檢查
const ownerAddress = currentAddressMap.owner;
if (ownerAddress && ownerAddress.toLowerCase() !== address?.toLowerCase()) {
  return <EmptyState message="權限不足，僅合約擁有者可訪問。" />;
}
```

當合約地址為 `undefined` 時，`ownerAddress` 無法正確獲取，導致權限檢查失敗。

## 🔧 解決方案

### 步驟 1: 創建 .env 文件

在項目根目錄創建 `.env` 文件，包含以下環境變量：

```bash
# BSC 主網 RPC URLs
VITE_ALCHEMY_BSC_MAINNET_RPC_URL=https://bsc-dataseed1.binance.org/
VITE_INFURA_BSC_MAINNET_RPC_URL=https://bsc-dataseed2.binance.org/
VITE_ANKR_BSC_MAINNET_RPC_URL=https://rpc.ankr.com/bsc

# 主網域名
VITE_MAINNET_URL=https://www.dungeondelvers.xyz

# The Graph API
VITE_THE_GRAPH_STUDIO_API_URL=your_graph_api_url_here

# 智能合約地址 (請替換為您的實際合約地址)
VITE_MAINNET_SOUL_SHARD_TOKEN_ADDRESS=0x您的智能合約地址
VITE_MAINNET_HERO_ADDRESS=0x您的智能合約地址
VITE_MAINNET_RELIC_ADDRESS=0x您的智能合約地址
VITE_MAINNET_PARTY_ADDRESS=0x您的智能合約地址
VITE_MAINNET_VIPSTAKING_ADDRESS=0x您的智能合約地址
VITE_MAINNET_DUNGEONCORE_ADDRESS=0x您的智能合約地址
VITE_MAINNET_DUNGEONMASTER_ADDRESS=0x您的智能合約地址
VITE_MAINNET_DUNGEONSTORAGE_ADDRESS=0x您的智能合約地址
VITE_MAINNET_PLAYERVAULT_ADDRESS=0x您的智能合約地址
VITE_MAINNET_PLAYERPROFILE_ADDRESS=0x您的智能合約地址
VITE_MAINNET_ALTAROFASCENSION_ADDRESS=0x您的智能合約地址
VITE_MAINNET_ORACLE_ADDRESS=0x您的智能合約地址

# 其他地址
VITE_USD_TOKEN_ADDRESS=0x您的智能合約地址
VITE_MAINNET_POOL_ADDRESS=0x您的智能合約地址
VITE_MAINNET_DUNGEONSVGLIBRARY_ADDRESS=0x您的智能合約地址
VITE_MAINNET_VIPSVGLIBRARY_ADDRESS=0x您的智能合約地址
VITE_MAINNET_PROFILESVGLIBRARY_ADDRESS=0x您的智能合約地址
```

### 步驟 2: 驗證錢包連接

確保您的錢包已正確連接到 BSC 主網：

1. **網路設置**：
   - 網路名稱：BSC Mainnet
   - 鏈 ID：56
   - RPC URL：https://bsc-dataseed1.binance.org/
   - 貨幣符號：BNB

2. **確認連接狀態**：
   - 檢查錢包是否顯示 BSC 主網
   - 確認餘額能正常顯示
   - 測試簡單的交易功能

### 步驟 3: 驗證管理員權限

1. **檢查合約擁有者地址**：
   ```bash
   # 使用 BSC 瀏覽器查詢合約擁有者
   # 前往 https://bscscan.com/address/您的DungeonCore合約地址
   # 查看 "Contract" 標籤下的 "Read Contract" 功能
   # 調用 "owner" 函數獲取擁有者地址
   ```

2. **確認錢包地址匹配**：
   - 您的錢包地址必須與合約 `owner` 地址完全一致
   - 地址比較不區分大小寫

### 步驟 4: 重新啟動應用程式

```bash
# 清除快取並重新啟動
npm run dev
```

## 🔍 進階診斷

### 檢查瀏覽器控制台

1. **打開開發者工具**：按 F12 或右鍵選擇「檢查元素」
2. **查看 Console 標籤**：尋找紅色錯誤訊息
3. **常見錯誤類型**：
   - `Cannot read properties of undefined`
   - `Contract address is undefined`
   - `Network mismatch`
   - `Connection failed`

### 檢查網路連接

```bash
# 測試 BSC 主網連接
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://bsc-dataseed1.binance.org/
```

### 驗證合約地址

使用 BSC 瀏覽器 (https://bscscan.com/) 確認：
- 合約地址是否存在
- 合約是否已驗證
- 合約是否部署在正確的網路上

## 📱 移動設備特殊注意事項

如果您使用移動設備：

1. **確保錢包應用程式更新到最新版本**
2. **檢查應用程式內瀏覽器的網路設置**
3. **嘗試切換到桌面版本進行測試**

## 🚨 緊急恢復步驟

如果問題仍然存在：

1. **清除瀏覽器快取**：
   - Chrome：設定 → 隱私權和安全性 → 清除瀏覽資料
   - Firefox：設定 → 隱私權與安全性 → 清除資料

2. **重新連接錢包**：
   - 在應用程式中斷開錢包連接
   - 重新整理頁面
   - 重新連接錢包

3. **嘗試不同的 RPC 端點**：
   - 在 .env 文件中更換不同的 RPC URL
   - 重新啟動應用程式

## 📞 技術支援

如果所有步驟都無法解決問題，請提供以下資訊：

1. **瀏覽器控制台的完整錯誤訊息**
2. **您的錢包地址** (前 6 位和後 4 位)
3. **正在使用的瀏覽器和版本**
4. **網路連接狀態**
5. **合約地址** (如果已知)

## ✅ 成功標誌

當問題解決後，您應該能夠：
- ✅ 成功訪問管理員頁面
- ✅ 看到「超級管理控制台」標題
- ✅ 看到各種管理選項和設置
- ✅ 能夠讀取當前的合約設置
- ✅ 能夠執行管理員操作

遵循此指南應該能夠解決您的管理員頁面訪問問題。如果問題持續存在，建議檢查合約部署狀態和網路連接。