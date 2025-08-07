# V25 部署後測試檢查清單

## 🎯 部署資訊確認
- [x] 版本: V25
- [x] 部署時間: 2025-08-07T22:00:00Z  
- [x] 起始區塊: 56771885
- [x] 子圖版本: v3.8.2

## 🔧 合約互連測試

### 1. VRF 系統測試
- [ ] 檢查 VRF Subscription 餘額 (ID: 11413135328013045889...)
- [ ] 驗證 Consumer 合約授權 (DungeonMaster, AltarOfAscension)
- [ ] 測試隨機數生成功能

### 2. NFT 系統測試
- [ ] Hero Mint 功能 (0x671d937b171e2ba2c4dc23c133b07e4449f283ef)
- [ ] Relic Mint 功能 (0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da)
- [ ] Party 創建功能 (0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3)

### 3. 遊戲邏輯測試
- [ ] DungeonMaster 探險功能 (0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a)
- [ ] AltarOfAscension 升級功能 (0xa86749237d4631ad92ba859d0b0df4770f6147ba)
- [ ] PlayerVault 存取款功能

### 4. 數據同步測試
- [ ] 子圖索引是否正常工作
- [ ] 前端能否正確顯示新數據
- [ ] 後端 API 是否返回正確的 metadata

## ⚠️ 關鍵檢查點

### VRF 訂閱管理
- 訪問: https://vrf.chain.link/bsc
- 檢查餘額是否 > 0.1 LINK
- 確認 Consumer 合約列表

### 合約權限檢查
- DungeonMaster 是否有 NFT mint 權限
- VRFManager 是否授權給遊戲合約
- PlayerVault 是否授權給 DungeonMaster

### 網路配置檢查
- 前端 RPC 連接正常
- 子圖同步進度正常
- 後端 API 響應正常

## 🚨 緊急聯絡資訊
- 管理員錢包: 0x10925A7138649C7E1794CE646182eeb5BF8ba647
- 部署網路: BSC Mainnet (Chain ID: 56)
- VRF Coordinator: 0xd691f04bc0C9a24Edb78af9E005Cf85768F694C9

## 📊 監控端點
- 子圖 Studio: https://api.studio.thegraph.com/query/115633/dungeon-delvers---bsc/v3.8.2
- 子圖去中心化: https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs
- 後端 API: https://dungeon-delvers-metadata-server.onrender.com
