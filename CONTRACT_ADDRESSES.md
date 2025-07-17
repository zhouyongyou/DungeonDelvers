# DungeonDelvers 合約地址管理

此文檔記錄所有需要更新合約地址的位置，方便未來合約升級時使用。

## 🚨 最新合約地址 (V2 - 2025-01-17)

| 合約名稱 | 地址 | 說明 |
|---------|------|------|
| Oracle | `0xD7e41690270Cc4f06F13eF47764F030CC4411904` | 價格預言機 |
| DungeonStorage | `0x85Fe26dF31903A522e78eb7C853DeA7b6CF7eFa6` | 地城資料儲存 |
| PlayerVault | `0x67CEecf8BE748dFd77D90D87a376Bd745B7c3c62` | 玩家金庫 |
| AltarOfAscension | `0xdf87881b48b51380CE47Bf6B54930ef1e07471F0` | 升星祭壇 |
| **DungeonMaster** | `0xd13250E0F0766006816d7AfE95EaEEc5e215d082` | **V2 - 移除擁有權限制** |
| Hero | `0xB882915F4fD4C3773e0E8eeBB65088CB584A0Bdf` | 英雄 NFT |
| Relic | `0x41cb97b903547C4190D66E818A64b7b37DE005c0` | 聖物 NFT |
| Party | `0x075F68Ab40A55CB4341A7dF5CFdB873696502dd0` | 隊伍 NFT |
| VIPStaking | `0x8D7Eb405247C9AD0373D398C5F63E88421ba7b49` | VIP 質押 |
| PlayerProfile | `0x7f5D359bC65F0aB07f7A874C2efF72752Fb294e5` | 玩家檔案 |
| DungeonCore | `0xd03d3D7456ba3B52E6E0112eBc2494dB1cB34524` | 核心合約 |
| SoulShard | `0xc88dAD283Ac209D77Bfe452807d378615AB8B94a` | 代幣（未更新） |

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