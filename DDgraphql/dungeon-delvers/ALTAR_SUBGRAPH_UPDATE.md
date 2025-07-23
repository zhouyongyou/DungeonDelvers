# 祭壇功能子圖更新指南

## 概述
為了支援 AltarOfAscension（升星祭壇）功能，需要更新子圖以追蹤升級事件和統計數據。

## 需要更新的文件

### 1. schema.graphql
添加祭壇相關實體：

```graphql
# 祭壇升級記錄
type AltarUpgrade @entity {
  id: ID!
  player: Player!
  tokenContract: Bytes! # Hero 或 Relic 合約地址
  baseRarity: Int!
  targetRarity: Int!
  burnedTokenIds: [BigInt!]!
  mintedTokenIds: [BigInt!]!
  outcome: Int! # 0=失敗, 1=部分失敗, 2=成功, 3=大成功
  fee: BigInt!
  timestamp: BigInt!
  transactionHash: Bytes!
}

# 玩家祭壇統計
type PlayerAltarStats @entity {
  id: ID! # player address
  player: Player!
  totalAttempts: BigInt!
  totalBurned: BigInt!
  totalMinted: BigInt!
  totalFeesSpent: BigInt!
  successCount: BigInt!
  greatSuccessCount: BigInt!
  partialFailCount: BigInt!
  failCount: BigInt!
}

# 全局祭壇統計
type GlobalAltarStats @entity {
  id: ID! # "global"
  totalAttempts: BigInt!
  totalBurned: BigInt!
  totalMinted: BigInt!
  totalFeesCollected: BigInt!
  uniquePlayers: BigInt!
}

# 在 Player 實體中添加
type Player @entity {
  # ... 現有欄位
  altarStats: PlayerAltarStats
  altarUpgrades: [AltarUpgrade!]! @derivedFrom(field: "player")
}
```

### 2. subgraph.yaml
添加 AltarOfAscension 數據源：

```yaml
dataSources:
  # ... 現有數據源
  - kind: ethereum/contract
    name: AltarOfAscension
    network: bsc
    source:
      address: "0xbA76D9E0063280d4B0F6e139B5dD45A47BBD1e4e" # 或使用正確的 V18 地址
      abi: AltarOfAscension
      startBlock: 46000000 # 設置適當的起始區塊
    mapping:
      kind: ethereum/events
      apiVersion: 0.0.7
      language: wasm/assemblyscript
      entities:
        - AltarUpgrade
        - PlayerAltarStats
        - GlobalAltarStats
        - Player
        - Hero
        - Relic
      abis:
        - name: AltarOfAscension
          file: ./abis/AltarOfAscension.json
      eventHandlers:
        - event: UpgradeAttempted(indexed address,indexed address,uint8,uint8,uint256[],uint256[],uint8,uint256)
          handler: handleUpgradeAttempted
        - event: PlayerStatsUpdated(indexed address,uint256,uint256,uint256)
          handler: handlePlayerStatsUpdated
      file: ./src/altar-mapping.ts
```

### 3. src/altar-mapping.ts
創建事件處理器：

```typescript
import { 
  UpgradeAttempted,
  PlayerStatsUpdated
} from '../generated/AltarOfAscension/AltarOfAscension'
import { 
  AltarUpgrade,
  PlayerAltarStats,
  GlobalAltarStats,
  Player
} from '../generated/schema'
import { BigInt, Bytes } from '@graphprotocol/graph-ts'

export function handleUpgradeAttempted(event: UpgradeAttempted): void {
  // 創建升級記錄
  let upgradeId = event.transaction.hash.toHex() + '-' + event.logIndex.toString()
  let upgrade = new AltarUpgrade(upgradeId)
  
  upgrade.player = event.params.player.toHex()
  upgrade.tokenContract = event.params.tokenContract
  upgrade.baseRarity = event.params.baseRarity
  upgrade.targetRarity = event.params.targetRarity
  upgrade.burnedTokenIds = event.params.burnedTokenIds
  upgrade.mintedTokenIds = event.params.mintedTokenIds
  upgrade.outcome = event.params.outcome
  upgrade.fee = event.params.fee
  upgrade.timestamp = event.block.timestamp
  upgrade.transactionHash = event.transaction.hash
  
  upgrade.save()
  
  // 更新玩家統計
  updatePlayerAltarStats(event)
  
  // 更新全局統計
  updateGlobalAltarStats(event)
}

export function handlePlayerStatsUpdated(event: PlayerStatsUpdated): void {
  let playerId = event.params.player.toHex()
  let stats = PlayerAltarStats.load(playerId)
  
  if (!stats) {
    stats = new PlayerAltarStats(playerId)
    stats.player = playerId
    stats.totalAttempts = BigInt.fromI32(0)
    stats.totalBurned = BigInt.fromI32(0)
    stats.totalMinted = BigInt.fromI32(0)
    stats.totalFeesSpent = BigInt.fromI32(0)
    stats.successCount = BigInt.fromI32(0)
    stats.greatSuccessCount = BigInt.fromI32(0)
    stats.partialFailCount = BigInt.fromI32(0)
    stats.failCount = BigInt.fromI32(0)
  }
  
  stats.totalAttempts = event.params.totalAttempts
  stats.totalBurned = event.params.totalBurned
  stats.totalMinted = event.params.totalMinted
  
  stats.save()
}

function updatePlayerAltarStats(event: UpgradeAttempted): void {
  let playerId = event.params.player.toHex()
  let stats = PlayerAltarStats.load(playerId)
  
  if (!stats) {
    stats = new PlayerAltarStats(playerId)
    stats.player = playerId
    stats.totalAttempts = BigInt.fromI32(0)
    stats.totalBurned = BigInt.fromI32(0)
    stats.totalMinted = BigInt.fromI32(0)
    stats.totalFeesSpent = BigInt.fromI32(0)
    stats.successCount = BigInt.fromI32(0)
    stats.greatSuccessCount = BigInt.fromI32(0)
    stats.partialFailCount = BigInt.fromI32(0)
    stats.failCount = BigInt.fromI32(0)
  }
  
  stats.totalAttempts = stats.totalAttempts.plus(BigInt.fromI32(1))
  stats.totalBurned = stats.totalBurned.plus(BigInt.fromI32(event.params.burnedTokenIds.length))
  stats.totalMinted = stats.totalMinted.plus(BigInt.fromI32(event.params.mintedTokenIds.length))
  stats.totalFeesSpent = stats.totalFeesSpent.plus(event.params.fee)
  
  // 根據結果更新計數
  let outcome = event.params.outcome
  if (outcome == 0) {
    stats.failCount = stats.failCount.plus(BigInt.fromI32(1))
  } else if (outcome == 1) {
    stats.partialFailCount = stats.partialFailCount.plus(BigInt.fromI32(1))
  } else if (outcome == 2) {
    stats.successCount = stats.successCount.plus(BigInt.fromI32(1))
  } else if (outcome == 3) {
    stats.greatSuccessCount = stats.greatSuccessCount.plus(BigInt.fromI32(1))
  }
  
  stats.save()
  
  // 更新 Player 實體連接
  let player = Player.load(playerId)
  if (player) {
    player.altarStats = playerId
    player.save()
  }
}

function updateGlobalAltarStats(event: UpgradeAttempted): void {
  let globalId = 'global'
  let global = GlobalAltarStats.load(globalId)
  
  if (!global) {
    global = new GlobalAltarStats(globalId)
    global.totalAttempts = BigInt.fromI32(0)
    global.totalBurned = BigInt.fromI32(0)
    global.totalMinted = BigInt.fromI32(0)
    global.totalFeesCollected = BigInt.fromI32(0)
    global.uniquePlayers = BigInt.fromI32(0)
  }
  
  global.totalAttempts = global.totalAttempts.plus(BigInt.fromI32(1))
  global.totalBurned = global.totalBurned.plus(BigInt.fromI32(event.params.burnedTokenIds.length))
  global.totalMinted = global.totalMinted.plus(BigInt.fromI32(event.params.mintedTokenIds.length))
  global.totalFeesCollected = global.totalFeesCollected.plus(event.params.fee)
  
  // 檢查是否為新玩家
  let playerId = event.params.player.toHex()
  let playerStats = PlayerAltarStats.load(playerId)
  if (playerStats && playerStats.totalAttempts.equals(BigInt.fromI32(1))) {
    global.uniquePlayers = global.uniquePlayers.plus(BigInt.fromI32(1))
  }
  
  global.save()
}
```

### 4. 需要的 ABI 文件
將 AltarOfAscension.json ABI 文件複製到 abis/ 目錄。

## 部署步驟

1. **更新 schema.graphql**
   ```bash
   # 添加上述祭壇相關實體
   ```

2. **更新 subgraph.yaml**
   ```bash
   # 添加 AltarOfAscension 數據源
   # 注意使用正確的合約地址
   ```

3. **創建映射文件**
   ```bash
   # 創建 src/altar-mapping.ts
   ```

4. **複製 ABI**
   ```bash
   cp /path/to/AltarOfAscension.json ./abis/
   ```

5. **生成代碼**
   ```bash
   graph codegen
   ```

6. **構建子圖**
   ```bash
   graph build
   ```

7. **部署到 The Graph**
   ```bash
   # 部署到 Studio
   graph deploy --studio dungeon-delvers
   
   # 或部署到 Hosted Service
   graph deploy --product hosted-service <USERNAME>/dungeon-delvers
   ```

## 查詢示例

### 查詢玩家祭壇記錄
```graphql
query PlayerAltarHistory($player: String!) {
  player(id: $player) {
    altarStats {
      totalAttempts
      successCount
      greatSuccessCount
      totalFeesSpent
    }
    altarUpgrades(first: 10, orderBy: timestamp, orderDirection: desc) {
      id
      baseRarity
      targetRarity
      outcome
      fee
      timestamp
    }
  }
}
```

### 查詢全局祭壇統計
```graphql
query GlobalAltarStats {
  globalAltarStats(id: "global") {
    totalAttempts
    totalBurned
    totalMinted
    totalFeesCollected
    uniquePlayers
  }
}
```

### 查詢最近的升級活動
```graphql
query RecentUpgrades {
  altarUpgrades(
    first: 20
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    player {
      id
    }
    baseRarity
    targetRarity
    outcome
    burnedTokenIds
    mintedTokenIds
    fee
    timestamp
  }
}
```

## 注意事項

1. **起始區塊**：設置適當的 startBlock，建議從祭壇合約部署的區塊開始。

2. **事件監聽**：確保 AltarOfAscension 合約有正確的事件定義：
   - `UpgradeAttempted`
   - `PlayerStatsUpdated`

3. **版本兼容**：如果使用 AltarOfAscensionV2，需要檢查事件簽名是否有變化。

4. **測試**：部署前先在測試網測試子圖功能。

5. **索引時間**：初次部署可能需要較長時間索引歷史數據。

## 未來擴展

1. **VIP 加成追蹤**：如果祭壇支援 VIP 加成，可以添加相關字段。
2. **冷卻時間追蹤**：記錄玩家的升級冷卻狀態。
3. **稀有度分布**：統計各稀有度的分布情況。
4. **經濟分析**：追蹤 NFT 供應量變化。