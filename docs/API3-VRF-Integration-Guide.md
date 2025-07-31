# API3 dAPI VRF 整合指南

## 🎯 整合目標

將現有的偽隨機 NFT 鑄造升級為使用 API3 dAPI 的真隨機數生成，確保公平性和不可預測性。

## 📋 現狀分析

### 當前機制問題
```solidity
// 目前的偽隨機生成 (Hero.sol:162-169)
uint256 pseudoRandom = uint256(keccak256(abi.encodePacked(
    dynamicSeed,           // 可預測
    block.prevrandao,      // 礦工可影響
    block.timestamp,       // 可預測
    msg.sender,           // 攻擊者已知
    _salt,                // 攻擊者可控制
    _nextTokenId          // 可預測
)));
```

**風險評估：**
- 🔴 **高風險**：MEV 攻擊者可以預測結果
- 🔴 **高風險**：礦工可以選擇性打包交易
- 🟡 **中風險**：同區塊內結果可預測

## 🚀 API3 dAPI 整合方案

### 步驟 1: 依賴項安裝

```bash
# 安裝 API3 依賴
npm install @api3/airnode-protocol

# 更新 Hardhat 配置
npm install @nomiclabs/hardhat-ethers ethers
```

### 步驟 2: BSC 上的 API3 配置

```javascript
// hardhat.config.js
const API3_CONFIG = {
  bsc: {
    airnodeRrp: "0xa0AD79D995DdeeB18a14eAef56A549A04e3Aa1Bd", // BSC 主網
    airnode: "0x6238772544f029ecaBfDED4300f13A3c4FE84E1D",      // QRNG Airnode
    endpointIdUint256: "0xfb6d017bb87991b7495f563db3c8cf59ff87b09781947bb1e417006ad7f55a78",
    sponsorWallet: "YOUR_SPONSOR_WALLET_ADDRESS" // 需要創建
  }
};
```

### 步驟 3: 合約升級

#### 3.1 新增狀態變數
```solidity
// API3 VRF 配置
address public airnode;
bytes32 public endpointIdUint256; 
address public sponsorWallet;

// 請求追蹤
mapping(bytes32 => PendingMint) public pendingMints;
mapping(bytes32 => bool) public requestIdToWaiting;
```

#### 3.2 修改鑄造函數
```solidity
function batchMintWithVRF(uint256 _quantity) external payable {
    // 1. 驗證和扣費
    uint8 maxRarity = _validateAndGetMaxRarity(_quantity);
    uint256 requiredAmount = _quantity * mintPriceUSD;
    IPlayerVault(dungeonCore.playerVaultAddress()).spendForGame(msg.sender, requiredAmount);
    
    // 2. 請求隨機數
    bytes32 requestId = airnodeRrp.makeRequestUint256(
        airnode,
        endpointIdUint256,
        address(this),
        sponsorWallet,
        address(this),
        this.fulfillUint256.selector,
        ""
    );
    
    // 3. 記錄請求
    pendingMints[requestId] = PendingMint({
        recipient: msg.sender,
        quantity: _quantity,
        maxRarity: maxRarity,
        timestamp: block.timestamp,
        fulfilled: false
    });
}
```

#### 3.3 VRF 回調處理
```solidity
function fulfillUint256(bytes32 requestId, bytes calldata data) 
    external onlyAirnodeRrp {
    uint256 randomness = abi.decode(data, (uint256));
    
    // 執行實際鑄造
    _executeBatchMint(requestId, randomness);
}
```

### 步驟 4: 前端整合

#### 4.1 更新合約 ABI
```typescript
// 新增 VRF 相關事件監聽
const heroContract = new ethers.Contract(address, abi, provider);

// 監聽隨機數請求
heroContract.on("RandomnessRequested", (requestId, sender, quantity) => {
  console.log(`VRF requested: ${requestId} for ${quantity} NFTs`);
  // 顯示等待狀態
});

// 監聽隨機數完成
heroContract.on("BatchMintCompleted", (player, quantity, maxRarity, tokenIds) => {
  console.log(`Minting completed: ${tokenIds.length} NFTs`);
  // 更新UI，顯示新鑄造的NFT
});
```

#### 4.2 用戶體驗優化
```typescript
// 鑄造狀態管理
interface MintingState {
  status: 'idle' | 'requesting' | 'pending' | 'completed' | 'failed';
  requestId?: string;
  estimatedTime?: number;
  tokenIds?: string[];
}

const useMinting = () => {
  const [state, setState] = useState<MintingState>({ status: 'idle' });
  
  const mintWithVRF = async (quantity: number) => {
    setState({ status: 'requesting' });
    
    try {
      const tx = await heroContract.batchMintWithVRF(quantity);
      const receipt = await tx.wait();
      
      // 從事件中獲取 requestId
      const event = receipt.events.find(e => e.event === 'RandomnessRequested');
      const requestId = event.args.requestId;
      
      setState({ 
        status: 'pending', 
        requestId,
        estimatedTime: 60 // 預估60秒
      });
      
      // 等待完成
      await waitForCompletion(requestId);
      
    } catch (error) {
      setState({ status: 'failed' });
    }
  };
};
```

### 步驟 5: 成本計算

#### 5.1 API3 費用結構
```typescript
// BSC 上的 API3 dAPI 費用 (2024年數據)
const API3_COSTS = {
  perRequest: 0.000105, // ETH (~$0.105 at $1000/ETH)
  gasLimit: 500000,     // 預估 gas 限制
  priorityFee: 1        // gwei
};

// 月度成本估算
const monthlyEstimate = {
  requests: 100,        // 每月NFT鑄造次數
  costPerRequest: 0.105, // USD
  totalCost: 10.5       // USD
};
```

#### 5.2 與現有方案對比
```
偽隨機 (當前):
- 成本: ~$0.5/次 (僅gas)
- 風險: 高 (可預測)
- 用戶信任: 低

API3 VRF:
- 成本: ~$0.605/次 (gas + VRF)
- 風險: 極低 (真隨機)
- 用戶信任: 高

成本增加: $0.105/次
安全提升: 顯著
```

### 步驟 6: 部署計劃

#### 6.1 測試網部署
```bash
# 1. 部署到 BSC 測試網
npx hardhat run scripts/deploy-hero-vrf.js --network bsctestnet

# 2. 設置 Sponsor Wallet
npx hardhat run scripts/setup-sponsor.js --network bsctestnet

# 3. 測試鑄造流程
npx hardhat test test/hero-vrf.test.js --network bsctestnet
```

#### 6.2 主網部署策略
```
階段1: 雙軌運行 (1-2週)
- VRF鑄造: 高價值包 (20+個NFT)
- 偽隨機: 低價值包 (1-5個NFT)

階段2: 逐步遷移 (2-4週)  
- VRF鑄造: 中價值包 (5+個NFT)
- 偽隨機: 僅單個NFT

階段3: 完全遷移 (4週後)
- 所有鑄造使用VRF
- 移除偽隨機選項
```

### 步驟 7: 風險管控

#### 7.1 緊急情況處理
```solidity
// VRF失敗時的備用方案
function emergencyMint(address recipient, uint256 quantity) external onlyOwner {
    // 使用管理員權限進行緊急鑄造
    // 記錄日誌便於稽核
}

// 過期請求處理
function cancelExpiredRequest(bytes32 requestId) external {
    require(block.timestamp > pendingMints[requestId].timestamp + 1 hours);
    // 退款處理
}
```

#### 7.2 監控指標
```typescript
const monitoring = {
  successRate: 99.5,     // VRF成功率 > 99.5%
  avgResponseTime: 45,   // 平均響應時間 < 60秒
  costPerRequest: 0.105, // 單次成本穩定
  userSatisfaction: 4.8  // 用戶滿意度 > 4.5/5
};
```

### 步驟 8: 文檔更新

#### 8.1 用戶指南
- VRF鑄造流程說明
- 等待時間預期設定
- 費用結構透明化

#### 8.2 開發文檔  
- 合約升級記錄
- API3整合技術細節
- 故障排除指南

## 🎉 預期效果

### 安全性提升
- ✅ 消除MEV攻擊風險
- ✅ 真隨機數保證公平性
- ✅ 增強用戶信任度

### 用戶體驗
- ✅ 透明的隨機性證明
- ✅ 可預期的響應時間
- ⚠️ 輕微的等待時間增加 (30-60秒)

### 經濟效益
- 成本增加: $0.105/次
- 信任價值: 無法量化但極其重要
- 長期收益: 用戶滿意度提升

## 📞 實施支援

需要技術支援時聯繫：
- API3 Discord: https://discord.gg/qnRrcfnm5W
- 官方文檔: https://docs.api3.org/
- GitHub範例: https://github.com/api3dao/qrng-example