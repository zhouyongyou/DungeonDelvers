# 祭壇 V2Fixed 子圖更新指南

## 📝 更新清單

### 1. 更新 ABI
- [ ] 將 `AltarOfAscensionV2Fixed.json` ABI 複製到 `abis/` 目錄
- [ ] 確保 ABI 包含新的事件定義

### 2. 更新 Schema (`schema.graphql`)
```graphql
# 現有的 UpgradeAttempt 需要更新
type UpgradeAttempt @entity {
  id: ID!
  player: Player!
  type: String!
  targetId: String!
  materialIds: [String!]!
  materials: [BigInt!]!
  isSuccess: Boolean!
  newRarity: Int
  timestamp: BigInt!
  
  # V2Fixed 新增欄位
  baseRarity: Int!
  outcome: Int!  # 0=失敗, 1=部分失敗, 2=成功, 3=大成功
  fee: BigInt!
  burnedTokenIds: [BigInt!]!
  mintedTokenIds: [BigInt!]!
}

# 新增玩家升級統計
type PlayerUpgradeStats @entity {
  id: ID!  # player address
  totalAttempts: BigInt!
  totalBurned: BigInt!
  totalMinted: BigInt!
  totalFeesSpent: BigInt!
  lastUpdated: BigInt!
}

# 新增全局升級統計
type GlobalUpgradeStats @entity {
  id: ID!  # "global"
  totalAttempts: BigInt!
  totalBurned: BigInt!
  totalMinted: BigInt!
  totalFeesCollected: BigInt!
  lastUpdated: BigInt!
}
```

### 3. 更新 Subgraph.yaml
```yaml
- kind: "ethereum/contract"
  name: "AltarOfAscension"
  network: "bsc"
  source:
    address: "0x[V2Fixed_ADDRESS]"  # 更新為 V2Fixed 地址
    abi: "AltarOfAscensionV2Fixed"
    startBlock: [V18_DEPLOYMENT_BLOCK]  # 更新為 V18 部署區塊
  mapping:
    kind: "ethereum/events"
    apiVersion: "0.0.6"
    language: "wasm/assemblyscript"
    entities:
      - "UpgradeAttempt"
      - "Player"
      - "PlayerUpgradeStats"
      - "GlobalUpgradeStats"
    abis:
      - name: "AltarOfAscensionV2Fixed"
        file: "./abis/AltarOfAscensionV2Fixed.json"
    eventHandlers:
      - event: "UpgradeAttempted(indexed address,indexed address,uint8,uint8,uint256[],uint256[],uint8,uint256)"
        handler: "handleUpgradeAttempted"
      - event: "PlayerStatsUpdated(indexed address,uint256,uint256,uint256,uint256)"
        handler: "handlePlayerStatsUpdated"
      - event: "GlobalStatsUpdated(uint256,uint256,uint256,uint256)"
        handler: "handleGlobalStatsUpdated"
    file: "./src/altar-of-ascension.ts"
```

### 4. 更新事件處理器
```typescript
// src/altar-of-ascension.ts
import { 
  UpgradeAttempted,
  PlayerStatsUpdated,
  GlobalStatsUpdated
} from "../generated/AltarOfAscension/AltarOfAscensionV2Fixed"

export function handleUpgradeAttempted(event: UpgradeAttempted): void {
  const player = getOrCreatePlayer(event.params.player)
  const attemptId = event.transaction.hash.toHexString()
    .concat("-")
    .concat(event.logIndex.toString())
  
  const upgradeAttempt = new UpgradeAttempt(attemptId)
  upgradeAttempt.player = player.id
  upgradeAttempt.type = event.params.tokenContract.toHexString()
  upgradeAttempt.baseRarity = event.params.baseRarity
  upgradeAttempt.targetId = event.params.targetRarity.toString()
  upgradeAttempt.burnedTokenIds = event.params.burnedTokenIds.map(id => id.toString())
  upgradeAttempt.mintedTokenIds = event.params.mintedTokenIds.map(id => id.toString())
  upgradeAttempt.outcome = event.params.outcome
  upgradeAttempt.isSuccess = event.params.outcome >= 2
  upgradeAttempt.fee = event.params.fee
  upgradeAttempt.timestamp = event.block.timestamp
  
  if (event.params.outcome >= 2) {
    upgradeAttempt.newRarity = event.params.targetRarity
  }
  
  upgradeAttempt.save()
}

export function handlePlayerStatsUpdated(event: PlayerStatsUpdated): void {
  let stats = PlayerUpgradeStats.load(event.params.player.toHexString())
  if (!stats) {
    stats = new PlayerUpgradeStats(event.params.player.toHexString())
  }
  
  stats.totalAttempts = event.params.totalAttempts
  stats.totalBurned = event.params.totalBurned
  stats.totalMinted = event.params.totalMinted
  stats.totalFeesSpent = event.params.totalFeesSpent
  stats.lastUpdated = event.block.timestamp
  stats.save()
}

export function handleGlobalStatsUpdated(event: GlobalStatsUpdated): void {
  let stats = GlobalUpgradeStats.load("global")
  if (!stats) {
    stats = new GlobalUpgradeStats("global")
  }
  
  stats.totalAttempts = event.params.totalAttempts
  stats.totalBurned = event.params.totalBurned
  stats.totalMinted = event.params.totalMinted
  stats.totalFeesCollected = event.params.totalFeesCollected
  stats.lastUpdated = event.block.timestamp
  stats.save()
}
```

### 5. 部署步驟

1. **部署 V18 合約後**：
   ```bash
   # 記錄部署地址和區塊號
   V2FIXED_ADDRESS=0x...
   DEPLOYMENT_BLOCK=...
   ```

2. **更新子圖配置**：
   ```bash
   # 更新 subgraph.yaml 中的地址和區塊
   sed -i "s/0xf2ef1d0341d5439F72cBE065A75234FE5ce38a23/$V2FIXED_ADDRESS/g" subgraph.yaml
   sed -i "s/55018576/$DEPLOYMENT_BLOCK/g" subgraph.yaml
   ```

3. **編譯和部署**：
   ```bash
   npm run codegen
   npm run build
   graph deploy --studio dungeon-delvers
   ```

## 🎯 預期效果

更新後的子圖將能夠：
1. 追蹤詳細的升級記錄（包含燒毀和鑄造的 Token ID）
2. 提供個人和全局的升級統計
3. 支援前端顯示成功率、材料消耗等數據
4. 為運營分析提供數據支撐

## ⚠️ 注意事項

1. **向後相容**：保留舊的升級記錄，只是新記錄有更多數據
2. **性能考量**：大量 Token ID 數組可能影響查詢性能
3. **數據遷移**：V1 祭壇的歷史數據不會有新欄位