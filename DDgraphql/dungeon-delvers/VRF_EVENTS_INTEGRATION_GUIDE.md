# VRF 事件集成指南

## 📋 概述
V25 版本引入了 VRF（可驗證隨機函數）來替代原有的區塊哈希隨機機制。本指南說明子圖需要追蹤的新事件。

## 🆕 VRF 相關新事件

### 1. **NFT 鑄造流程事件**

#### Hero.sol
- `MintCommitted(address indexed player, uint256 quantity, uint256 blockNumber, bool fromVault)`
  - 用戶提交鑄造請求時觸發
  - 記錄鑄造承諾，等待 VRF 隨機數
  
- `HeroRevealed(uint256 indexed tokenId, address indexed owner, uint8 rarity, uint256 power)`
  - VRF 隨機數返回後，揭示英雄屬性時觸發
  - 與 `HeroMinted` 配合使用
  
- `BatchMintCompleted(address indexed player, uint256 quantity, uint8 maxRarity, uint256[] tokenIds)`
  - 批次鑄造完成時觸發
  - 標記用戶的鑄造承諾已完成

#### Relic.sol
- `MintCommitted` - 聖物鑄造承諾
- `RelicRevealed` - 聖物屬性揭示
- `BatchMintCompleted` - 批次鑄造完成

### 2. **探索流程事件**

#### DungeonMaster.sol
- `ExpeditionCommitted(address indexed player, uint256 partyId, uint256 dungeonId, uint256 blockNumber)`
  - 探索開始時觸發
  - 等待 VRF 決定成功/失敗
  
- `ExpeditionRevealed(address indexed player, uint256 partyId, bool success)`
  - VRF 返回後，揭示探索結果
  
- `VRFRequestFulfilled(uint256 indexed requestId, uint256 randomWordsCount)`
  - VRF 請求完成時觸發

### 3. **升級流程事件**

#### AltarOfAscension.sol
- `UpgradeCommitted(address indexed player, address tokenContract, uint8 baseRarity, uint256 blockNumber, uint256[] burnedTokenIds)`
  - 升級開始時觸發
  
- `UpgradeRevealed(address indexed player, uint8 outcome, uint8 targetRarity)`
  - VRF 返回後，揭示升級結果
  
- `UpgradeRequested(address indexed user, uint256[] tokenIds, uint256 materialTokenId, uint256 requestId)`
  - VRF 升級請求事件

### 4. **VRF 管理事件**

#### VRFManagerV2Plus.sol
- `RandomRequested(uint256 indexed requestId, address indexed requester, uint8 requestType)`
  - 任何合約請求隨機數時觸發
  - requestType: 0=MINT, 1=REVEAL, 2=EXPEDITION, 3=UPGRADE
  
- `RandomFulfilled(uint256 indexed requestId, uint256[] randomWords)`
  - Chainlink VRF 返回隨機數時觸發
  
- `AuthorizationUpdated(address indexed contract_, bool authorized)`
  - 合約授權狀態變更時觸發

## 📊 Schema 更新建議

### 新增實體

```graphql
type MintCommitment @entity {
  id: ID! # user address
  user: Bytes!
  quantity: BigInt!
  blockNumber: BigInt!
  fromVault: Boolean!
  fulfilled: Boolean!
  createdAt: BigInt!
}

type VRFRequest @entity {
  id: ID! # requestId
  requestId: BigInt!
  requester: Bytes!
  requestType: Int!
  fulfilled: Boolean!
  randomWords: [BigInt!]
  createdAt: BigInt!
  fulfilledAt: BigInt
}
```

### 更新現有實體

在 `Hero` 和 `Relic` 實體中添加：
```graphql
isRevealed: Boolean!
revealedAt: BigInt
vrfRequestId: BigInt
```

## 🔄 事件處理流程

### NFT 鑄造流程
1. `MintCommitted` → 創建 `MintCommitment` 實體
2. `RandomRequested` → 創建 `VRFRequest` 實體
3. `RandomFulfilled` → 更新 `VRFRequest` 為已完成
4. `HeroRevealed` → 更新 `Hero` 實體屬性
5. `BatchMintCompleted` → 更新 `MintCommitment` 為已完成

### 查詢範例

```graphql
# 查詢用戶的待揭示 NFT
query PendingMints($user: Bytes!) {
  mintCommitments(where: { 
    user: $user, 
    fulfilled: false 
  }) {
    id
    quantity
    blockNumber
    createdAt
  }
}

# 查詢 VRF 請求狀態
query VRFStatus {
  vrfRequests(first: 10, orderBy: createdAt, orderDirection: desc) {
    id
    requestType
    fulfilled
    createdAt
    fulfilledAt
  }
}
```

## ⚠️ 重要變更

### 移除的事件
以下事件在 V25 中已不存在，需要從子圖中移除：
- ❌ `CommitmentMade` (已改為 `MintCommitted`)
- ❌ `RevealRequested` (整合到 VRF 流程)
- ❌ 區塊哈希相關的揭示事件

### 兼容性處理
- 保留 `HeroMinted` 和 `RelicMinted` 事件處理
- 新增 `isRevealed` 標記來區分是否已揭示
- 同時支持 VRF 和區塊哈希揭示（fallback 機制）

## 🚀 實施步驟

1. **更新 schema.graphql**
   ```bash
   # 添加新實體定義
   cat schema-vrf-additions.graphql >> schema.graphql
   ```

2. **更新 subgraph.yaml**
   ```bash
   # 運行更新腳本
   node update-vrf-events.js
   ```

3. **實現事件處理器**
   - 使用生成的模板文件
   - 實現具體的處理邏輯

4. **生成和構建**
   ```bash
   npm run codegen
   npm run build
   ```

5. **部署**
   ```bash
   graph deploy --studio dungeon-delvers
   ```

## 📈 監控建議

### 關鍵指標
- VRF 請求完成率
- 平均完成時間
- 待處理請求數量
- 授權合約數量

### 告警條件
- VRF 請求超過 5 分鐘未完成
- 大量失敗的請求
- 授權被撤銷

## 🔍 調試技巧

### 常見問題
1. **事件簽名不匹配**
   - 確保 ABI 是最新的
   - 檢查事件參數類型

2. **處理器未觸發**
   - 確認起始區塊正確（56757876）
   - 檢查合約地址是否正確

3. **實體關聯錯誤**
   - 使用正確的 ID 格式
   - 確保外鍵關係正確

---

*最後更新：2025-08-07*
*版本：V25 VRF*