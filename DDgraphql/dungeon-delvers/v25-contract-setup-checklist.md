# V25 合約互連設定檢查清單

## 🎯 部署資訊
- **版本**: V25 (8/7 PM10)
- **起始區塊**: 56771885
- **子圖版本**: v3.8.2

## 📋 需要執行的合約互連操作

### 1. 新部署合約（需要完整初始化）
```
HERO: 0x671d937b171e2ba2c4dc23c133b07e4449f283ef
RELIC: 0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da
PARTY: 0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3
DUNGEONMASTER: 0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a
DUNGEONSTORAGE: 0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468
ALTAROFASCENSION: 0xa86749237d4631ad92ba859d0b0df4770f6147ba
```

### 2. 重複使用合約（需要重新 SET）
```
DUNGEONCORE: 0x8a2D2b1961135127228EdD71Ff98d6B097915a13
PLAYERVAULT: 0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787
PLAYERPROFILE: 0x0f5932e89908400a5AfDC306899A2987b67a3155
VIPSTAKING: 0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C
ORACLE: 0xf8CE896aF39f95a9d5Dd688c35d381062263E25a
```

## 🔧 關鍵互連操作

### A. DUNGEONMASTER 設定
```solidity
// 1. 設定 NFT 合約地址
setHeroContract(0x671d937b171e2ba2c4dc23c133b07e4449f283ef)
setRelicContract(0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da)
setPartyContract(0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3)

// 2. 設定核心合約
setDungeonCore(0x8a2D2b1961135127228EdD71Ff98d6B097915a13)
setOracle(0xf8CE896aF39f95a9d5Dd688c35d381062263E25a)
setPlayerVault(0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787)

// 3. 設定 VRF
setVRFManager(0x980d224ec4d198d94f34a8af76a19c00dabe2436)
```

### B. VRF 授權
```solidity
// VRFManager 授權 DungeonMaster
VRFManager.setAuthorizedContract(0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a, true)

// 檢查訂閱 ID (VRF V2.5 使用 uint256 格式)
// Subscription ID: 114131353280130458891383141995968474440293173552039681622016393393251650814328
VRFCoordinator.getSubscription(114131353280130458891383141995968474440293173552039681622016393393251650814328)

// 添加 Consumer 合約到訂閱
VRFCoordinator.addConsumer(subscription_id, 0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a) // DungeonMaster
VRFCoordinator.addConsumer(subscription_id, 0xa86749237d4631ad92ba859d0b0df4770f6147ba) // AltarOfAscension
```

### C. NFT 合約授權
```solidity
// Hero 合約授權 DungeonMaster mint/burn
Hero.setMinterRole(0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a)

// Relic 合約授權 DungeonMaster mint/burn  
Relic.setMinterRole(0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a)

// Party 合約授權 DungeonMaster
Party.setDungeonMaster(0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a)
```

### D. 核心系統互連
```solidity
// DungeonCore 設定新的 DungeonMaster
DungeonCore.setDungeonMaster(0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a)

// PlayerVault 授權新的 DungeonMaster
PlayerVault.setAuthorizedContract(0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a, true)

// Oracle 設定新的數據源
Oracle.setDungeonMaster(0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a)
```

### E. Altar of Ascension 設定
```solidity
// 設定 NFT 合約
AltarOfAscension.setHeroContract(0x671d937b171e2ba2c4dc23c133b07e4449f283ef)
AltarOfAscension.setRelicContract(0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da)

// 設定 VRF
AltarOfAscension.setVRFManager(0x980d224ec4d198d94f34a8af76a19c00dabe2436)
```

## ⚠️ 重要提醒

1. **執行順序很重要**：先設定基礎合約，再設定互連關係
2. **權限檢查**：確保部署帳戶有 owner/admin 權限
3. **VRF 訂閱**：確認 subscription ID 29062 有足夠 LINK
4. **測試調用**：每個設定完成後測試基本功能

## 📝 驗證腳本

```javascript
// 使用此腳本驗證所有互連是否正確
npx hardhat run scripts/verify-v25-connections.js --network bsc
```

## 🎯 完成後下一步

1. ✅ 部署子圖 v3.8.2
2. ✅ 前端/後端推送新配置
3. ✅ 測試完整遊戲流程