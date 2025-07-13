# DungeonDelvers 生產環境合約地址配置
> 最後更新：2025-01-14
> 網絡：BSC Mainnet (Chain ID: 56)

## ✅ 正式合約地址（最新版本）

### 核心 NFT 合約
- **Hero**: `0x2a046140668cBb8F598ff3852B08852A8EB23b6a`
- **Relic**: `0x95F005e2e0d38381576DA36c5CA4619a87da550E`
- **Party**: `0x11FB68409222B53b04626d382d7e691e640A1DcD`

### 遊戲系統合約
- **DungeonMaster**: `0xd14A5eFFc45D0131af3eb876992fC6eD9683f5B0`
- **AltarOfAscension**: `0x83a7fB85E0892A67041FcFc4c1F0F1111e5aB3DA`
- **DungeonCore**: `0x4CbAC0E4AEC9Ef3B11C93805483c23224ed1f118`
- **DungeonStorage**: `0x976d8C71DbbAaBF1898B9fD8d28dC6Db7B17cD66`
- **Oracle**: `0xc5bBFfFf552167D1328432AA856B752e9c4b4838`

### 玩家系統合約
- **PlayerVault**: `0x6187DBCcb58088E414437A6b8d58a42cD2BD1ec4`
- **PlayerProfile**: `0x43a9BE911f1074788A00cE8e6E00732c7364c1F4`
- **VIPStaking**: `0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB`

### 代幣合約
- **SoulShard Token**: `0xc88dAD283Ac209D77Bfe452807d378615AB8B94a`
- **USD Token (測試)**: `0x7C67Af4EBC6651c95dF78De11cfe325660d935FE`
- **Pool**: `0x737c5b0430d5aeb104680460179aaa38608b6169`

## 📝 需要更新的系統

### 1. The Graph 子圖
- [ ] 更新 `subgraph.yaml` 中的所有合約地址
- [ ] 重新部署子圖到 The Graph Studio

### 2. Metadata Server
- [ ] 更新 `src/index.js` 中的 CONTRACTS 對象
- [ ] 更新 `.env` 文件中的環境變量
- [ ] 推送到 GitHub 觸發 Render 自動部署

### 3. 區塊鏈合約
- [ ] 更新所有 NFT 合約的 BaseURI
- [ ] 指向新的 metadata server URL

### 4. 前端應用
- [x] 合約地址已經是最新的 ✅
- [ ] 確認環境變量配置正確

## 🚀 部署步驟

### Step 1: 更新 The Graph 子圖
```bash
cd DDgraphql/dungeon-delvers
# 編輯 subgraph.yaml 更新所有合約地址
npm run codegen
npm run build
npm run deploy
```

### Step 2: 更新 Metadata Server
```bash
cd dungeon-delvers-metadata-server
# 更新合約地址
git add -A
git commit -m "Update to latest contract addresses"
git push
# 等待 Render 自動部署
```

### Step 3: 更新合約 BaseURI
```bash
cd DungeonDelversContracts
# 確保 .env 有正確的私鑰
npm run update-baseuri
```

## 🔍 驗證檢查清單

- [ ] The Graph 查詢返回正確數據
- [ ] Metadata API 返回正確的 NFT 數據
- [ ] NFT 市場（OKX/Element）顯示正確圖片
- [ ] 前端應用所有功能正常

## ⚠️ 注意事項

1. **不要混用不同版本的合約地址**
2. **確保所有系統使用同一套地址**
3. **部署順序很重要：子圖 → Metadata → BaseURI**

## 📞 技術支持

如有任何問題，請檢查：
- BSCScan: https://bscscan.com/address/[合約地址]
- The Graph: https://thegraph.com/studio/
- Metadata Server: https://dungeon-delvers-metadata-server.onrender.com/health