# Dungeon Delvers 合約重新部署檢查清單

## 🎯 專案概述
Dungeon Delvers 是一個複雜的區塊鏈遊戲項目，包含多個智能合約、前端應用程式、API 伺服器和 GraphQL 服務。重新部署合約時需要更新多個配置文件和地址引用。

## 🌐 域名更新 (已更新到 https://www.dungeondelvers.xyz/)

### 需要更新的文件：
1. **`index.html`** - 更新 meta 標籤中的 URL
2. **`README.md`** - 更新專案連結
3. **`public/metadata/`** 目錄下的所有 JSON 文件：
   - `hero-collection.json`
   - `relic-collection.json`
   - `party-collection.json`
   - `player-profile-collection.json`
   - `vip-staking-collection.json`
4. **`src/components/layout/Footer.tsx`** - 更新 mainnet URL
5. **`src/contexts/ExpeditionContext.tsx`** - 更新 Twitter 分享 URL
6. **`dungeon-delvers-whitepaper/README.md`** - 更新 DApp 連結

## 🔧 智能合約地址更新

### 1. 前端配置 (最高優先級)

#### `src/config/contracts.ts`
```typescript
// 需要更新所有 VITE_MAINNET_*_ADDRESS 環境變數對應的合約地址
export const contracts = {
  soulShard: { address: import.meta.env.VITE_MAINNET_SOUL_SHARD_TOKEN_ADDRESS as Address, abi: soulShardTokenABI },
  hero: { address: import.meta.env.VITE_MAINNET_HERO_ADDRESS as Address, abi: heroABI },
  relic: { address: import.meta.env.VITE_MAINNET_RELIC_ADDRESS as Address, abi: relicABI },
  party: { address: import.meta.env.VITE_MAINNET_PARTY_ADDRESS as Address, abi: partyABI },
  vipStaking: { address: import.meta.env.VITE_MAINNET_VIPSTAKING_ADDRESS as Address, abi: vipStakingABI },
  dungeonCore: { address: import.meta.env.VITE_MAINNET_DUNGEONCORE_ADDRESS as Address, abi: dungeonCoreABI },
  dungeonMaster: { address: import.meta.env.VITE_MAINNET_DUNGEONMASTER_ADDRESS as Address, abi: dungeonMasterABI },
  dungeonStorage: { address: import.meta.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS as Address, abi: dungeonStorageABI },
  playerVault: { address: import.meta.env.VITE_MAINNET_PLAYERVAULT_ADDRESS as Address, abi: playerVaultABI },
  playerProfile: { address: import.meta.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS as Address, abi: playerProfileABI },
  altarOfAscension: { address: import.meta.env.VITE_MAINNET_ALTAROFASCENSION_ADDRESS as Address, abi: altarOfAscensionABI },
  oracle: { address: import.meta.env.VITE_MAINNET_ORACLE_ADDRESS as Address, abi: oracleABI },
}
```

#### `src/vite-env.d.ts`
已定義所有環境變數類型，確保 .env 文件中包含所有必要的地址。

### 2. 環境變數文件 (.env)
需要更新的環境變數：
```bash
# 核心代幣合約
VITE_MAINNET_SOUL_SHARD_TOKEN_ADDRESS=0x新地址
VITE_USD_TOKEN_ADDRESS=0x新地址
VITE_MAINNET_POOL_ADDRESS=0x新地址

# SVG 函式庫合約
VITE_MAINNET_DUNGEONSVGLIBRARY_ADDRESS=0x新地址
VITE_MAINNET_VIPSVGLIBRARY_ADDRESS=0x新地址
VITE_MAINNET_PROFILESVGLIBRARY_ADDRESS=0x新地址

# 核心功能合約
VITE_MAINNET_ORACLE_ADDRESS=0x新地址
VITE_MAINNET_DUNGEONSTORAGE_ADDRESS=0x新地址
VITE_MAINNET_PLAYERVAULT_ADDRESS=0x新地址
VITE_MAINNET_ALTAROFASCENSION_ADDRESS=0x新地址
VITE_MAINNET_DUNGEONMASTER_ADDRESS=0x新地址
VITE_MAINNET_PLAYERPROFILE_ADDRESS=0x新地址
VITE_MAINNET_DUNGEONCORE_ADDRESS=0x新地址

# NFT 合約
VITE_MAINNET_HERO_ADDRESS=0x新地址
VITE_MAINNET_RELIC_ADDRESS=0x新地址
VITE_MAINNET_PARTY_ADDRESS=0x新地址
VITE_MAINNET_VIPSTAKING_ADDRESS=0x新地址
```

### 3. 後端 API 伺服器配置

#### `dungeon-delvers-metadata-server/src/utils.js`
```javascript
export const contractAddresses = {
    hero: process.env.VITE_MAINNET_HERO_ADDRESS,
    relic: process.env.VITE_MAINNET_RELIC_ADDRESS,
    party: process.env.VITE_MAINNET_PARTY_ADDRESS,
    playerProfile: process.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS,
    vipStaking: process.env.VITE_MAINNET_VIPSTAKING_ADDRESS,
    oracle: process.env.VITE_MAINNET_ORACLE_ADDRESS,
    soulShard: process.env.VITE_MAINNET_SOUL_SHARD_TOKEN_ADDRESS,
};
```

#### `dungeon-delvers-metadata-server/src/index.js`
更新環境變數檢查清單中的所有地址變數。

### 4. GraphQL 子圖配置 (The Graph)

#### `DDgraphql/dungeon-delvers/subgraph.yaml`
需要更新每個 dataSource 的 `source.address` 欄位：
```yaml
dataSources:
  - kind: ethereum
    name: Hero
    network: bsc
    source:
      address: "0x新的Hero合約地址"
      abi: Hero
      startBlock: 新的區塊號
  - kind: ethereum
    name: Relic
    network: bsc
    source:
      address: "0x新的Relic合約地址"
      abi: Relic
      startBlock: 新的區塊號
  # ... 其他合約
```

#### `DDgraphql/dungeon-delvers/src/config.ts`
這個文件是由腳本自動生成的，不要手動編輯。更新 `subgraph.yaml` 後運行：
```bash
npm run sync-addresses
```

### 5. 舊版本檔案中的地址參考 (低優先級)
這些文件在 `archive/` 目錄中，可能不需要更新，但如果需要：
- `archive/old_version2/script.js` - 包含硬編碼的合約地址
- `archive/old_version4/DungeonCore.sol` - 包含合約地址參考

## 🚀 部署流程建議

### 1. 準備階段
- [ ] 確保所有新合約都已部署並驗證
- [ ] 記錄所有新合約的地址和部署區塊號
- [ ] 備份現有的配置文件

### 2. 更新配置
- [ ] 更新 `.env` 文件中的所有合約地址
- [ ] 更新域名相關的 URL
- [ ] 更新 GraphQL 子圖的 `subgraph.yaml`

### 3. 重新部署服務
- [ ] 重新構建並部署前端應用程式
- [ ] 重新啟動 metadata server
- [ ] 重新部署 GraphQL 子圖到 The Graph

### 4. 測試階段
- [ ] 測試前端的所有功能
- [ ] 測試 NFT metadata 的正確生成
- [ ] 測試 GraphQL 查詢的正確性
- [ ] 確認所有 URL 都指向新域名

## ⚠️ 注意事項

1. **同步更新**：所有服務必須同時更新，否則可能導致數據不一致
2. **區塊號**：GraphQL 子圖的 `startBlock` 需要設置為新合約的部署區塊號
3. **快取清除**：部署後可能需要清除各種快取
4. **監控**：部署後密切監控所有服務的運行狀態

## 📝 檢查清單總結

### 必須更新的文件：
- [ ] `.env` - 所有 VITE_MAINNET_*_ADDRESS 變數
- [ ] `DDgraphql/dungeon-delvers/subgraph.yaml` - 所有合約地址和區塊號
- [ ] 運行 `npm run sync-addresses` 更新 GraphQL 配置
- [ ] 重新部署所有服務

### 域名相關更新：
- [ ] `index.html` - meta 標籤
- [ ] `README.md` - 專案連結
- [ ] `public/metadata/*.json` - 所有 collection 檔案
- [ ] `src/components/layout/Footer.tsx` - mainnet URL
- [ ] `src/contexts/ExpeditionContext.tsx` - Twitter URL

### 測試項目：
- [ ] 前端功能正常
- [ ] NFT metadata 正確顯示
- [ ] GraphQL 查詢正常
- [ ] 所有 URL 指向正確域名