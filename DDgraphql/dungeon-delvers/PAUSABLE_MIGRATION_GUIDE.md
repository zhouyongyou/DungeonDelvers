# 🛡️ Pausable 功能遷移指南

當新版本合約（包含 OpenZeppelin Pausable 功能）部署後，需要按照此指南更新子圖以支援 Pausable 事件。

## 📋 需要更新的合約

以下合約在新版本中都實現了 Pausable 功能：
- ✅ **Hero** - 英雄 NFT 合約
- ✅ **Relic** - 聖物 NFT 合約  
- ✅ **PartyV3** - 隊伍 NFT 合約
- ✅ **VIPStaking** - VIP 質押合約
- ✅ **PlayerProfile** - 玩家檔案合約
- ✅ **DungeonMaster** - 地下城主控合約
- ✅ **AltarOfAscension** - 升星祭壇合約

## 🔧 遷移步驟

### 1. 更新 ABI 文件

從新版本合約中提取 ABI，確保包含以下事件：
```json
{
  "anonymous": false,
  "inputs": [
    {
      "indexed": false,
      "internalType": "address",
      "name": "account",
      "type": "address"
    }
  ],
  "name": "Paused",
  "type": "event"
},
{
  "anonymous": false,
  "inputs": [
    {
      "indexed": false,
      "internalType": "address",
      "name": "account",
      "type": "address"
    }
  ],
  "name": "Unpaused",
  "type": "event"
}
```

### 2. 啟用映射函數

在每個相關的映射文件中，取消註釋 Pausable 事件處理函數：

#### VIPStaking (`src/vip-staking.ts`)
```typescript
// 取消註釋以下函數
export function handlePaused(event: Paused): void {
    createPausedEvent(event.params.account, event, "VIPStaking")
}

export function handleUnpaused(event: Unpaused): void {
    createUnpausedEvent(event.params.account, event, "VIPStaking")
}
```

#### Hero (`src/hero.ts`)
```typescript
// 取消註釋以下函數
export function handlePaused(event: Paused): void {
    createPausedEvent(event.params.account, event, "Hero")
}

export function handleUnpaused(event: Unpaused): void {
    createUnpausedEvent(event.params.account, event, "Hero")
}
```

#### 其他合約類似處理...

### 3. 更新 subgraph.yaml

為每個支援 Pausable 的合約添加事件處理器配置：

```yaml
dataSources:
  - kind: ethereum/contract
    name: VIPStaking
    network: bsc
    source:
      address: "0x..." # 新合約地址
      abi: VIPStaking
      startBlock: 123456 # 新合約部署區塊
    mapping:
      # ... 其他配置
      eventHandlers:
        # ... 現有事件處理器
        - event: Paused(address)
          handler: handlePaused
        - event: Unpaused(address)
          handler: handleUnpaused
```

### 4. 取消註釋導入

在每個映射文件中，取消註釋 pausable-handler 的導入：
```typescript
import { createPausedEvent, createUnpausedEvent } from "./pausable-handler"
```

### 5. 重新生成和部署

```bash
# 重新生成類型
npm run codegen

# 構建子圖
npm run build

# 部署到 The Graph Studio
graph deploy --studio dungeon-delvers
```

## 📊 Schema 實體

已添加 `PausableEvent` 實體來追蹤暫停事件：

```graphql
type PausableEvent @entity(immutable: true) {
  id: ID!
  contractAddress: Bytes!
  contractName: String!
  eventType: String!        # "paused" 或 "unpaused"
  account: Bytes!           # 執行暫停操作的帳戶
  txHash: Bytes!
  blockNumber: BigInt!
  timestamp: BigInt!
}
```

## 🔍 查詢範例

部署後可以使用以下 GraphQL 查詢來監控暫停事件：

```graphql
# 查詢所有暫停事件
query GetPausableEvents {
  pausableEvents(orderBy: timestamp, orderDirection: desc) {
    id
    contractName
    eventType
    account
    timestamp
  }
}

# 查詢特定合約的暫停狀態
query GetContractPausableEvents($contractName: String!) {
  pausableEvents(
    where: { contractName: $contractName }
    orderBy: timestamp
    orderDirection: desc
    first: 1
  ) {
    eventType
    timestamp
    account
  }
}
```

## ⚠️ 重要提醒

1. **部署順序**：確保新合約部署完成後再更新子圖
2. **區塊號**：更新 `startBlock` 為新合約的部署區塊
3. **測試**：在測試網先驗證功能正常
4. **監控**：部署後監控子圖同步狀態

## 📁 已準備的文件

- ✅ `src/pausable-handler.ts` - 通用 Pausable 事件處理器
- ✅ `schema.graphql` - 已添加 PausableEvent 實體
- ✅ 所有映射文件已準備好處理函數（暫時註釋）

當新版本合約部署時，只需要按照上述步驟啟用相關功能即可。