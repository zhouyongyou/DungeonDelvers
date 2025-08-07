# 🚀 V25 PM10 完整配置清單

> **部署狀態**：✅ 所有合約已部署
> **配置狀態**：❌ 需要完整配置設置
> **部署時間**：2025-08-07 PM10
> **起始區塊**：56771885

## 🔍 當前狀況檢查結果

### ✅ 已完成
- 所有 V25 合約成功部署
- 合約地址已同步到前端、後端配置
- Alchemy 私人 RPC 節點已配置
- VRF 訂閱模式前端顯示已修復

### ❌ 待完成（關鍵）
1. **VRF Manager Subscription ID**：目前是 29062，需要更新為正確的長訂閱 ID
2. **DungeonCore 合約連接**：所有新合約地址都是零地址，需要設置
3. **子圖更新**：需要更新到 v3.8.2 版本

## 🔧 必要設置步驟（按順序執行）

### 步驟 1: 更新 VRF Manager Subscription ID
```bash
cd /Users/sotadic/Documents/GitHub/DungeonDelvers

# 使用你的管理員私鑰執行
PRIVATE_KEY=你的私鑰 node scripts/fix-vrf-subscription.js --execute
```

**預期結果**：
- Subscription ID 從 29062 更新為 `114131353280130458891383141995968474440293173552039681622016393393251650814328`

### 步驟 2: 設置 DungeonCore 合約連接
需要在 DungeonCore (0x8a2D2b1961135127228EdD71Ff98d6B097915a13) 中設置以下地址：

```javascript
// 需要設置的新合約地址
heroContract = 0x671d937b171e2ba2c4dc23c133b07e4449f283ef
relicContract = 0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da  
partyContract = 0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3
dungeonMasterContract = 0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a
```

**手動執行**（在 BSCScan 或使用 Hardhat）：
1. 調用 `setHeroContract(0x671d937b171e2ba2c4dc23c133b07e4449f283ef)`
2. 調用 `setRelicContract(0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da)`
3. 調用 `setPartyContract(0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3)`
4. 調用 `setDungeonMasterContract(0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a)`

### 步驟 3: 設置新合約的 DungeonCore 連接
在每個新合約中設置 DungeonCore 地址：

**對於每個合約** (HERO, RELIC, PARTY, DUNGEONMASTER)：
```javascript
// 設置 DungeonCore 地址
setDungeonCoreContract(0x8a2D2b1961135127228EdD71Ff98d6B097915a13)
```

### 步驟 4: VRF Manager 授權設置
為新合約授權 VRF 使用權限：

```javascript
// 在 VRF Manager (0x980d224ec4d198d94f34a8af76a19c00dabe2436) 中
authorizeContract(0x671d937b171e2ba2c4dc23c133b07e4449f283ef) // HERO
authorizeContract(0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da)  // RELIC  
authorizeContract(0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3)  // PARTY
authorizeContract(0xa86749237d4631ad92ba859d0b0df4770f6147ba)  // ALTAR
authorizeContract(0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a)  // DUNGEONMASTER
```

### 步驟 5: 更新子圖到 v3.8.2
```bash
cd /Users/sotadic/Documents/GitHub/DungeonDelvers/DDgraphql/dungeon-delvers

# 確認 subgraph.yaml 中的合約地址已更新
# 部署新版本
graph deploy --studio dungeon-delvers---bsc
```

**預期 Studio URL**：
`https://api.studio.thegraph.com/query/115633/dungeon-delvers---bsc/v3.8.2`

## 📊 配置驗證

完成所有設置後，執行驗證：
```bash
node scripts/verify-v25-system.js
```

**預期所有項目都顯示** ✅

## 🏗️ V25 完整合約地址清單

### 🆕 新部署的合約
```
DUNGEONSTORAGE: 0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468
DUNGEONMASTER: 0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a
HERO: 0x671d937b171e2ba2c4dc23c133b07e4449f283ef
RELIC: 0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da
ALTAROFASCENSION: 0xa86749237d4631ad92ba859d0b0df4770f6147ba
PARTY: 0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3
```

### 🔄 複用合約（需要重新連接）
```
DUNGEONCORE: 0x8a2D2b1961135127228EdD71Ff98d6B097915a13
PLAYERVAULT: 0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787
PLAYERPROFILE: 0x0f5932e89908400a5AfDC306899A2987b67a3155
VIPSTAKING: 0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C
ORACLE: 0xf8CE896aF39f95a9d5Dd688c35d381062263E25a
```

### 🪙 Token 合約（不變）
```
SOULSHARD: 0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF
USD: 0x7C67Af4EBC6651c95dF78De11cfe325660d935FE
UNISWAP_POOL: 0x1e5Cd5F386Fb6F39cD8788675dd3A5ceB6521C82
```

### 🎲 VRF 系統（長期固定）
```
VRF_MANAGER: 0x980d224ec4d198d94f34a8af76a19c00dabe2436
VRF_COORDINATOR: 0xd691f04bc0C9a24Edb78af9E005Cf85768F694C9
VRF_SUBSCRIPTION_ID: 114131353280130458891383141995968474440293173552039681622016393393251650814328
```

## 🌐 服務端點配置

### 子圖端點
- **Studio**：`https://api.studio.thegraph.com/query/115633/dungeon-delvers---bsc/v3.8.2`
- **去中心化**：`https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs`

### 後端 API
- **Metadata 服務器**：`https://dungeon-delvers-metadata-server.onrender.com`

### Alchemy RPC 節點
- **前端主用**：`https://bnb-mainnet.g.alchemy.com/v2/QzXiHWkNRovjd_EeDRqVfR9rApUDiXRp`
- **後端主用**：`https://bnb-mainnet.g.alchemy.com/v2/F7E3-HDwgUHDQvdICnFv_`
- **備援節點**：3 個額外節點自動故障轉移

## ⚠️ 重要提醒

1. **必須按順序執行**：VRF → DungeonCore → 新合約 → 授權 → 子圖
2. **每步驗證**：執行後用驗證腳本確認成功
3. **Gas 費用**：確保管理員錢包有足夠 BNB 支付 gas
4. **備份**：重要操作前記錄當前狀態

## 🎯 完成標準

所有設置完成後，應該看到：
- ✅ VRF Subscription ID 正確
- ✅ DungeonCore 所有合約連接正確
- ✅ 新合約都連接到 DungeonCore
- ✅ VRF 授權完整
- ✅ 子圖 v3.8.2 正常運行
- ✅ 前端費用顯示："免費鑄造 (VRF 由項目方承擔)"