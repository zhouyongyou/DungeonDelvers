# 合約更新指南 - IPFS 支援

## 📋 需要修改的合約

### 1. Hero.sol
```solidity
// 在合約中添加或修改 baseURI 設定
string private _baseURI = "ipfs://YOUR_METADATA_HASH/hero/";

function setBaseURI(string memory newBaseURI) external onlyOwner {
    _baseURI = newBaseURI;
}

function _baseURI() internal view override returns (string memory) {
    return _baseURI;
}

// 修改 tokenURI 函數以支援稀有度
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
    
    // 從子圖或鏈上獲取稀有度
    uint8 rarity = getRarity(tokenId);
    
    return string(abi.encodePacked(_baseURI(), rarity.toString(), ".json"));
}
```

### 2. Relic.sol
```solidity
// 類似 Hero.sol 的修改
string private _baseURI = "ipfs://YOUR_METADATA_HASH/relic/";

function setBaseURI(string memory newBaseURI) external onlyOwner {
    _baseURI = newBaseURI;
}

function _baseURI() internal view override returns (string memory) {
    return _baseURI;
}

function tokenURI(uint256 tokenId) public view override returns (string memory) {
    require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
    
    uint8 rarity = getRarity(tokenId);
    
    return string(abi.encodePacked(_baseURI(), rarity.toString(), ".json"));
}
```

### 3. Party.sol
```solidity
// Party 使用固定的 metadata
string private _baseURI = "ipfs://YOUR_METADATA_HASH/party/";

function setBaseURI(string memory newBaseURI) external onlyOwner {
    _baseURI = newBaseURI;
}

function _baseURI() internal view override returns (string memory) {
    return _baseURI;
}

function tokenURI(uint256 tokenId) public view override returns (string memory) {
    require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
    
    return string(abi.encodePacked(_baseURI(), "party.json"));
}
```

### 4. PlayerProfile.sol
```solidity
// Profile 使用固定的 metadata
string private _baseURI = "ipfs://YOUR_METADATA_HASH/profile/";

function setBaseURI(string memory newBaseURI) external onlyOwner {
    _baseURI = newBaseURI;
}

function _baseURI() internal view override returns (string memory) {
    return _baseURI;
}

function tokenURI(uint256 tokenId) public view override returns (string memory) {
    require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
    
    return string(abi.encodePacked(_baseURI(), "profile.json"));
}
```

### 5. VIPStaking.sol
```solidity
// VIP 使用固定的 metadata
string private _baseURI = "ipfs://YOUR_METADATA_HASH/vip/";

function setBaseURI(string memory newBaseURI) external onlyOwner {
    _baseURI = newBaseURI;
}

function _baseURI() internal view override returns (string memory) {
    return _baseURI;
}

function tokenURI(uint256 tokenId) public view override returns (string memory) {
    require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
    
    return string(abi.encodePacked(_baseURI(), "vip.json"));
}
```

## 🔄 部署步驟

### 1. 重新編譯合約
```bash
npx hardhat compile
```

### 2. 部署合約
```bash
npx hardhat run scripts/deploy.js --network bsc
```

### 3. 設定 baseURI
```javascript
// 部署後設定 baseURI
const heroContract = await Hero.attach("YOUR_HERO_CONTRACT_ADDRESS");
await heroContract.setBaseURI("ipfs://YOUR_METADATA_HASH/hero/");

const relicContract = await Relic.attach("YOUR_RELIC_CONTRACT_ADDRESS");
await relicContract.setBaseURI("ipfs://YOUR_METADATA_HASH/relic/");

const partyContract = await Party.attach("YOUR_PARTY_CONTRACT_ADDRESS");
await partyContract.setBaseURI("ipfs://YOUR_METADATA_HASH/party/");

const profileContract = await PlayerProfile.attach("YOUR_PROFILE_CONTRACT_ADDRESS");
await profileContract.setBaseURI("ipfs://YOUR_METADATA_HASH/profile/");

const vipContract = await VIPStaking.attach("YOUR_VIP_CONTRACT_ADDRESS");
await vipContract.setBaseURI("ipfs://YOUR_METADATA_HASH/vip/");
```

## ⚠️ 注意事項

1. **稀有度獲取**: Hero 和 Relic 需要從鏈上或子圖獲取稀有度
2. **Gas 費用**: 設定 baseURI 需要支付 gas 費用
3. **不可逆性**: 一旦設定 baseURI，就無法輕易更改
4. **測試**: 部署前請在測試網測試

## 🎯 混合方案優勢

### IPFS 存放 (固定資料)
- ✅ 圖片永久保存
- ✅ 基本 metadata 固定
- ✅ 完全去中心化
- ✅ 無需維護伺服器

### 子圖存放 (動態資料)
- ✅ 即時戰力/容量
- ✅ 遊戲狀態更新
- ✅ 升級歷史記錄
- ✅ 玩家統計資料

### 前端組合
- ✅ 最佳用戶體驗
- ✅ 快速載入
- ✅ 資料完整性
- ✅ 靈活顯示 