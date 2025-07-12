# Dungeon Delvers IPFS Metadata

這個資料夾包含了所有 NFT 類型的 metadata JSON 檔案，用於 IPFS 部署。

## 📁 檔案結構

### 🦸 Hero (英雄)
- `hero-1.json` - Common (普通) - 基礎戰力: 32
- `hero-2.json` - Uncommon (罕見) - 基礎戰力: 75  
- `hero-3.json` - Rare (稀有) - 基礎戰力: 125
- `hero-4.json` - Epic (史詩) - 基礎戰力: 175
- `hero-5.json` - Legendary (傳說) - 基礎戰力: 227

### 🏺 Relic (聖物)
- `relic-1.json` - Common (普通) - 基礎容量: 1
- `relic-2.json` - Uncommon (罕見) - 基礎容量: 2
- `relic-3.json` - Rare (稀有) - 基礎容量: 3
- `relic-4.json` - Epic (史詩) - 基礎容量: 4
- `relic-5.json` - Legendary (傳說) - 基礎容量: 5

### 👥 Party (隊伍)
- `party.json` - 隊伍組合 NFT

### 👑 VIP (會員)
- `vip.json` - VIP 會員資格 NFT

### 👤 Profile (個人資料)
- `profile.json` - 玩家個人資料 NFT

## 🚀 使用方法

### 1. 上傳到 IPFS
```bash
# 上傳整個資料夾
ipfs add -r ipfs-metadata/
```

### 2. 更新圖片路徑
部署後需要將所有 JSON 中的 `PLACEHOLDER_HASH` 替換為實際的圖片 IPFS Hash。

### 3. 設定合約 baseURI
```solidity
// Hero 合約
heroContract.setBaseURI("ipfs://YOUR_METADATA_HASH/");

// Relic 合約  
relicContract.setBaseURI("ipfs://YOUR_METADATA_HASH/");

// Party 合約
partyContract.setBaseURI("ipfs://YOUR_METADATA_HASH/");

// VIP 合約
vipContract.setBaseURI("ipfs://YOUR_METADATA_HASH/");

// Profile 合約
profileContract.setBaseURI("ipfs://YOUR_METADATA_HASH/");
```

## 📊 稀有度分佈

| 稀有度 | 名稱 | 機率 | Hero 戰力 | Relic 容量 |
|--------|------|------|-----------|------------|
| 1 | Common | 50% | 32 | 1 |
| 2 | Uncommon | 30% | 75 | 2 |
| 3 | Rare | 15% | 125 | 3 |
| 4 | Epic | 4% | 175 | 4 |
| 5 | Legendary | 1% | 227 | 5 |

## 🔗 訪問連結

部署後可以通過以下格式訪問：
- Hero: `ipfs://HASH/hero-{rarity}.json`
- Relic: `ipfs://HASH/relic-{rarity}.json`
- Party: `ipfs://HASH/party.json`
- VIP: `ipfs://HASH/vip.json`
- Profile: `ipfs://HASH/profile.json` 