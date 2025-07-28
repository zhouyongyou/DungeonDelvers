# DungeonDelvers 合約地址管理

此文檔記錄所有需要更新合約地址的位置，方便未來合約升級時使用。

## 🚨 最新合約地址 (V25 - 2025-07-28)

| 合約名稱 | V25 地址 | 說明 |
|---------|------|------|
| **Oracle** | `0x2350D85e5DF1b6a6d055CD61FeD27d5dC36B6F52` | **V25 - 價格預言機** |
| **DungeonCore** | `0x04b33eEB6Da358ea9Dd002a1E1c28AC90A25881E` | **V25 - 核心合約** |
| **DungeonStorage** | `0x4b1A9a45d0a1C35CDbae04272814f3daA9b59c47` | **V25 - 地城資料儲存** |
| **PlayerVault** | `0x4d06483c907DB1CfA9C2207D9DC5a1Abad86544b` | **V25 - 玩家金庫** |
| **DungeonMaster** | `0x08Bd8E0D85A7F10bEecCBA9a67da9033f9a7C8D9` | **V25 - 地城探索** |
| **Hero** | `0x162b0b673f38C11732b0bc0B4B026304e563e8e2` | **V25 - 英雄 NFT** |
| **Relic** | `0x15c2454A31Abc0063ef4a71d0640057d71847a22` | **V25 - 聖物 NFT** |
| **Party** | `0xab07E90d44c34FB62313C74F3C7b4b343E52a253` | **V25 - 隊伍 NFT** |
| **AltarOfAscension** | `0x0148Aff0Dee6D31BA9825e66ED34a66BCeF45845` | **V25 - 升星祭壇** |
| **VIPStaking** | `0xdC285539069Fa51b9259bd1F1d66f23f74B96A6c` | **V25 - VIP 質押** |
| **PlayerProfile** | `0x145F19e672a7D53ddb16bcE3fdeAd976bb3ef82f` | **V25 - 玩家檔案** |
| **SoulShard** | `0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF` | **代幣合約** |
| **DungeonMasterWallet** | `0x10925A7138649C7E1794CE646182eeb5BF8ba647` | **管理員錢包** |

## 🚀 V25 配置系統革新

**重要變更**: 從 V25 開始，合約地址管理完全革新：

### ✅ **新系統：配置即服務**
- **單一配置源**: `/public/config/v25.json`
- **自動同步**: 前端、後端、子圖全部自動同步
- **零停機更新**: 更新配置文件即可，無需重新部署

### ❌ **舊系統：手動管理**
- 需要手動更新 20+ 個文件中的硬編碼地址
- 容易出錯，更新時可能遺漏某些位置
- 需要重新部署所有服務

## 📍 需要更新合約地址的位置

### 1. 前端 (DungeonDelvers)

#### 環境變數配置
- ✅ `/Users/sotadic/Documents/GitHub/DungeonDelvers/.env`
  - 所有 `VITE_MAINNET_*_ADDRESS` 變數

#### 硬編碼地址
- ✅ `/src/config/contracts.ts` 
  - CONTRACT_ADDRESSES 物件中的所有地址
  - 作為環境變數的後備值

- ⚠️ `/src/shared-config.json`
  - 包含舊的合約地址，需要更新或移除

### 2. 後端 (metadata-server)

#### 環境變數配置  
- ⏳ `/Users/sotadic/Documents/dungeon-delvers-metadata-server/.env`
  - 所有合約地址相關變數

#### 硬編碼地址
- ⚠️ `/src/index.js`
  - 預設合約地址（應該從環境變數讀取）

- ⚠️ `/src/contractReader.js`
  - 包含硬編碼的合約地址

- ⚠️ `/update-contracts.js` 和 `/update-new-contracts.js`
  - 包含不同版本的合約地址（需要統一）

### 3. 子圖 (DDgraphql)

#### 配置檔案
- ✅ `/DDgraphql/dungeon-delvers/subgraph.yaml`
  - 所有 dataSources 中的 address 欄位
  - 已更新為 V2 地址

- ⚠️ `/DDgraphql/dungeon-delvers/src/config.ts`
  - CONTRACT_ADDRESSES 物件包含舊地址
  - 需要更新為 V2 地址

#### ABI 檔案
- ⏳ `/DDgraphql/dungeon-delvers/abis/DungeonMaster.json`
  - 需要更新為 DungeonMaster V2 的 ABI

### 4. 部署平台環境變數

#### Vercel (前端)
需要更新的環境變數：
```
VITE_MAINNET_ORACLE_ADDRESS
VITE_MAINNET_DUNGEONSTORAGE_ADDRESS
VITE_MAINNET_PLAYERVAULT_ADDRESS
VITE_MAINNET_ALTAROFASCENSION_ADDRESS
VITE_MAINNET_DUNGEONMASTER_ADDRESS
VITE_MAINNET_HERO_ADDRESS
VITE_MAINNET_RELIC_ADDRESS
VITE_MAINNET_PARTY_ADDRESS
VITE_MAINNET_VIPSTAKING_ADDRESS
VITE_MAINNET_PLAYERPROFILE_ADDRESS
VITE_MAINNET_DUNGEONCORE_ADDRESS
```

#### Render (後端)
需要更新的環境變數：
```
HERO_CONTRACT_ADDRESS
RELIC_CONTRACT_ADDRESS
PARTY_CONTRACT_ADDRESS
VIP_CONTRACT_ADDRESS
PLAYER_PROFILE_CONTRACT_ADDRESS
DUNGEON_MASTER_CONTRACT_ADDRESS
DUNGEON_CORE_CONTRACT_ADDRESS
ORACLE_CONTRACT_ADDRESS
PLAYER_VAULT_CONTRACT_ADDRESS
ALTAR_CONTRACT_ADDRESS
DUNGEON_STORAGE_CONTRACT_ADDRESS
```

## 🔄 更新流程

1. **備份當前配置**
   ```bash
   # 備份環境變數和配置檔案
   ```

2. **更新本地環境**
   - 更新所有 .env 檔案
   - 更新所有硬編碼地址
   - 更新 ABI 檔案

3. **測試**
   - 本地測試所有功能
   - 確認合約交互正常

4. **更新部署平台**
   - 更新 Vercel 環境變數
   - 更新 Render 環境變數
   - 重新部署子圖

5. **驗證**
   - 檢查所有服務運行狀態
   - 測試關鍵功能

## ⚠️ 注意事項

1. **DungeonMaster V2 變更**：
   - 移除了 `onlyPartyOwner` 限制
   - 任何人都可以為任何隊伍購買儲備
   - 新增事件參數：`PartyRested` 加入 `payer`，`ProvisionsBought` 加入 `buyer`

2. **向後兼容性**：
   - 確保舊數據能正確遷移
   - 考慮保留舊合約的讀取功能

3. **測試優先**：
   - 在生產環境更新前充分測試
   - 準備回滾方案

---
最後更新：2025-01-17