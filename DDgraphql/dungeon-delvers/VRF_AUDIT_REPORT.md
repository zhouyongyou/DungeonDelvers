# V25 VRF 版本審計報告

## 🔍 審計結果總結

### ✅ 已正確更新到 VRF 版本
1. **合約地址** - 全部更新到 V25 最新地址
2. **起始區塊** - 已更新到 56757876
3. **基礎事件** - HeroMinted, RelicMinted 等基礎事件保留

### ⚠️ 發現的問題：混合了 VRF 和舊版 Commit-Reveal 代碼

## 🔴 【強力挑戰】殘留的舊代碼

**核心問題：子圖仍在追蹤舊版的 Commit-Reveal 事件，但這些事件在 V25 VRF 合約中已不存在！**

### 詳細分析：

#### 1. **subgraph.yaml 中的問題事件**
```yaml
# DungeonMaster 中仍在監聽的舊事件：
- event: ExpeditionCommitted  # ❌ 這是舊版 Commit-Reveal 事件
- event: ExpeditionRevealed   # ❌ 這是舊版 Commit-Reveal 事件
```

**問題**：V25 VRF 版本的 DungeonMaster 已經沒有這些事件了！現在應該是：
- `ExpeditionRequested` - VRF 請求時觸發
- `ExpeditionFulfilled` - VRF 完成後觸發（這個保留了）

#### 2. **schema.graphql 中的殘留實體**
```graphql
# 完全是舊版 Commit-Reveal 的實體：
type MintCommitment      # ❌ 舊版：兩步驟鑄造承諾
type RevealEvent         # ❌ 舊版：揭示事件
type ForcedRevealEvent   # ❌ 舊版：強制揭示
type ProxyRevealEvent    # ❌ 舊版：代理揭示

# Hero/Relic 實體中的舊欄位：
mintCommitment           # ❌ 舊版關聯
isRevealed              # ❌ VRF 版本不需要這個
revealedAt              # ❌ VRF 版本直接鑄造即揭示
```

#### 3. **缺失的 VRF 事件**

**Hero/Relic 缺失的 VRF 事件：**
```solidity
// V25 VRF 版本實際的事件（但子圖沒有追蹤）：
event VRFManagerSet(address indexed vrfManager)  // ✅ 需要添加
event MintRequested(address indexed user, uint256 quantity)  // ✅ 需要添加
```

**VRFManager 合約完全缺失：**
子圖根本沒有追蹤 VRFManagerV2Plus 的核心事件：
- `RandomRequested` ✅ 有追蹤
- `RandomFulfilled` ❌ 沒有追蹤
- `AuthorizationUpdated` ❌ 沒有追蹤

## 📊 實際 V25 VRF 流程 vs 當前子圖追蹤

### 實際 V25 VRF 流程：
1. 用戶調用 `mintFromWallet()` 
2. 合約請求 VRF → 觸發 `VRFManager.RandomRequested`
3. Chainlink 返回隨機數 → 觸發 `VRFManager.RandomFulfilled`
4. 合約鑄造 NFT → 觸發 `HeroMinted`（屬性已確定）

### 當前子圖錯誤追蹤：
1. 等待 `MintCommitted` ❌（不存在）
2. 等待 `HeroRevealed` ❌（不存在）
3. 追蹤 `mintCommitment` ❌（無意義）

## 🛠️ 立即需要的修正

### 1. 移除所有 Commit-Reveal 殘留
```bash
# 從 schema.graphql 移除：
- MintCommitment
- RevealEvent
- ForcedRevealEvent
- ProxyRevealEvent
- mintCommitment 欄位
- isRevealed 欄位
- revealedAt 欄位
```

### 2. 移除錯誤的事件處理器
```bash
# 從 subgraph.yaml 移除：
- handleExpeditionCommitted
- handleExpeditionRevealed
```

### 3. 添加正確的 VRF 事件
```yaml
# Hero/Relic 應該添加：
- event: VRFManagerSet(indexed address)
  handler: handleVRFManagerSet

# VRFManagerV2Plus 應該添加完整追蹤：
- event: RandomFulfilled(indexed uint256,uint256[])
  handler: handleRandomFulfilled
- event: AuthorizationUpdated(indexed address,bool)
  handler: handleAuthorizationUpdated
```

### 4. 更新 Schema 為 VRF 模式
```graphql
type VRFRequest @entity {
  id: ID!
  requestId: BigInt!
  requester: Bytes!
  user: Bytes!
  requestType: String!
  fulfilled: Boolean!
  randomWords: [BigInt!]
  timestamp: BigInt!
}

type Hero @entity {
  # 移除 isRevealed, revealedAt, mintCommitment
  # 添加 vrfRequestId
  vrfRequestId: BigInt
}
```

## ⚠️ 影響評估

### 嚴重性：高
- **資料不一致**：前端查詢 `mintCommitment` 永遠為空
- **事件丟失**：ExpeditionCommitted/Revealed 永遠不會觸發
- **用戶體驗**：無法追蹤 VRF 請求狀態

### 建議優先級：
1. **P0 - 立即修復**：移除不存在的事件監聽
2. **P1 - 今天修復**：添加 VRF 核心事件
3. **P2 - 本週修復**：優化 Schema 結構

## 📝 正確的 V25 VRF 事件列表

### Hero.sol (V25 VRF)
- ✅ `HeroMinted` - 保留
- ✅ `HeroBurned` - 保留
- ✅ `Transfer` - 保留
- 🆕 `VRFManagerSet` - 需要添加

### Relic.sol (V25 VRF)
- ✅ `RelicMinted` - 保留
- ✅ `RelicBurned` - 保留
- ✅ `Transfer` - 保留
- 🆕 `VRFManagerSet` - 需要添加

### DungeonMaster.sol (V25 VRF)
- ✅ `ExpeditionFulfilled` - 保留（最終結果）
- ❌ `ExpeditionCommitted` - 移除（不存在）
- ❌ `ExpeditionRevealed` - 移除（不存在）

### VRFManagerV2Plus.sol
- ✅ `RandomRequested` - 已追蹤
- 🆕 `RandomFulfilled` - 需要添加
- 🆕 `AuthorizationUpdated` - 需要添加

## 🚨 結論

**當前子圖是 VRF 和 Commit-Reveal 的混合體，需要立即清理！**

最危險的是 `ExpeditionCommitted` 和 `ExpeditionRevealed` 這兩個事件處理器，它們在等待永遠不會發生的事件。

---

*審計時間：2025-08-07*
*審計版本：V25 VRF*
*審計狀態：❌ 需要重大修正*