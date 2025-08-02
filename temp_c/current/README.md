# V22 生產版本合約

這是當前在 BSC 主網上運行的合約版本。

## 部署信息
- **版本**: V22
- **部署日期**: 2025-07-25
- **網路**: BSC Mainnet
- **配置文件**: `/config/v22-config.js`

## 合約地址（V22）
```
SOULSHARD: 0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF
DUNGEONCORE: 0x4D353aFC420E6187bfA5F99f0DdD8F7F137c20E9
ORACLE: 0xb9317179466fd7fb253669538dE1c4635E81eAc4
HERO: 0x141F081922D4015b3157cdA6eE970dff34bb8AAb
RELIC: 0xB1eb505426e852B8Dca4BF41454a7A22D2B6F3D3
PARTY: 0x0B97726acd5a8Fe73c73dC6D473A51321a2e62ee
VIPSTAKING: 0xc59B9944a9CbB947F4067F941EbFB0a5A2564eb9
PLAYERPROFILE: 0x4998FADF96Be619d54f6E9bcc654F89937201FBe
PLAYERVAULT: 0x76d4f6f7270eE61743487c43Cf5E7281238d77F9
DUNGEONMASTER: 0xd13250E0F0766006816d7AfE95EaEEc5e215d082
DUNGEONSTORAGE: 0x17Bd4d145D7dA47833D797297548039D4E666a8f
ALTAROFASCENSION: 0xfb121441510296A92c8A2Cc04B6Aff1a2f72cd3f
```

## 合約列表
- **core/** - 核心系統合約
  - `DungeonCore.sol` - 模組管理總機
  - `DungeonMaster.sol` - 地城探索邏輯
  - `DungeonStorage.sol` - 地城數據存儲
- **defi/** - DeFi 相關合約
  - `Oracle.sol` - Uniswap V3 價格預言機
  - `PlayerVault.sol` - 玩家金庫
- **nft/** - NFT 合約
  - `Hero.sol` - 英雄 NFT
  - `Relic.sol` - 聖物 NFT
  - `Party.sol` - 隊伍 NFT
  - `VIPStaking.sol` - VIP 質押系統
  - `PlayerProfile.sol` - 玩家檔案
- **interfaces/** - 合約接口定義

## 重要設置

### 費用參數
- Hero 鑄造價格: 2 USD
- Relic 鑄造價格: 0.8 USD
- 平台費率: 5% (500/10000)
- 地城探索費: 10% (1000/10000)
- 地城準備費: 0.05 USD

### VIP 質押參數
- 冷卻期: 15 秒（測試用，生產環境建議 7 天）
- 稅率減免: 每個 VIP 等級減 0.5%

### 元數據服務器
基礎 URL: `https://dungeon-delvers-metadata-server.onrender.com/api/`

## 注意事項
1. **請勿直接修改這些文件**
2. 所有新開發應在 `contracts/next/` 目錄進行
3. 修改前請先了解合約間的依賴關係
4. 部署新版本時需要更新所有相關配置

## 部署檢查清單
- [ ] 所有合約已部署
- [ ] DungeonCore 已註冊所有模組
- [ ] 各合約已設置必要的地址依賴
- [ ] 所有 NFT 已設置 baseURI
- [ ] DungeonStorage 已設置 LogicContract
- [ ] 費用參數已正確設置
- [ ] 元數據服務器已更新到 V22 配置
- [ ] 子圖已部署並同步

## 相關腳本
- 部署腳本: `/scripts/active/deploy-v22-complete.js`
- 設置腳本: `/scripts/active/complete-v22-setup.js`
- 驗證腳本: `/scripts/active/verify-v22-deployment.js`