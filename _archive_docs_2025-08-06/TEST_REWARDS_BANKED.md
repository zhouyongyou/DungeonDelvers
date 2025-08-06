# 驗證 RewardsBanked 事件測試指南

## 測試步驟

### 1. 在 The Graph Playground 測試查詢

訪問：https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.7

執行以下查詢來檢查 Party 的未領取獎勵狀態：

```graphql
# 查詢特定隊伍的狀態
query CheckPartyRewards {
  parties(first: 5, orderBy: lastUpdatedAt, orderDirection: desc) {
    id
    owner
    unclaimedRewards
    lastUpdatedAt
    totalPower
  }
}
```

### 2. 查詢最近的遠征結果

```graphql
query RecentExpeditions {
  expeditions(
    first: 10
    orderBy: timestamp
    orderDirection: desc
  ) {
    id
    player
    party {
      id
      unclaimedRewards
    }
    success
    reward
    timestamp
  }
}
```

### 3. 查詢玩家檔案的總獎勵

```graphql
query PlayerRewards($player: String!) {
  playerProfile(id: $player) {
    id
    totalRewardsEarned
    successfulExpeditions
    lastUpdatedAt
  }
}
```

## 手動測試流程

### 步驟 1：記錄初始狀態
1. 查詢你的隊伍 ID 和當前的 `unclaimedRewards`
2. 記錄 PlayerProfile 的 `totalRewardsEarned`

### 步驟 2：執行遠征
1. 在 DungeonDelvers 前端執行一次遠征
2. 等待遠征完成
3. 再次查詢，確認 `unclaimedRewards` 增加

### 步驟 3：領取獎勵
1. 點擊「領取獎勵」按鈕
2. 等待交易確認

### 步驟 4：驗證更新
1. 再次執行查詢
2. 確認：
   - Party 的 `unclaimedRewards` 應該變為 0
   - PlayerProfile 的 `totalRewardsEarned` 應該增加
   - `lastUpdatedAt` 時間戳應該更新

## 監控查詢

用於持續監控事件處理：

```graphql
# 監控最近更新的隊伍
subscription MonitorPartyUpdates {
  parties(
    orderBy: lastUpdatedAt
    orderDirection: desc
    first: 5
  ) {
    id
    unclaimedRewards
    lastUpdatedAt
  }
}
```

## 調試查詢

如果發現問題，使用以下查詢調試：

```graphql
# 查看特定隊伍的完整資訊
query DebugParty($partyId: ID!) {
  party(id: $partyId) {
    id
    owner
    unclaimedRewards
    provisionsRemaining
    cooldownEndsAt
    lastUpdatedAt
    createdAt
    heroes {
      id
      rarity
      power
    }
    relics {
      id
      rarity
      capacity
    }
  }
}
```

## 預期結果

### ✅ 成功案例
- 遠征後：`unclaimedRewards` 增加對應的獎勵數量
- 領取後：`unclaimedRewards` 歸零
- PlayerProfile 的 `totalRewardsEarned` 累積增加

### ❌ 可能的問題
1. **unclaimedRewards 不歸零**
   - 原因：RewardsBanked 事件未被正確處理
   - 解決：檢查 subgraph 日誌

2. **totalRewardsEarned 不更新**
   - 原因：PlayerProfile 更新邏輯問題
   - 解決：檢查 handleRewardsBanked 函數

3. **延遲更新**
   - 原因：區塊確認延遲或 subgraph 索引延遲
   - 解決：等待更長時間或檢查同步狀態

## 使用前端驗證

在瀏覽器控制台執行：

```javascript
// 獲取當前隊伍狀態
const partyId = "1"; // 替換為你的隊伍 ID
const query = `
  query {
    party(id: "${partyId}") {
      unclaimedRewards
      lastUpdatedAt
    }
  }
`;

fetch('https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.7', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
})
.then(res => res.json())
.then(data => console.log('Party status:', data));
```

## 結論

通過以上測試，可以確認：
1. ExpeditionFulfilled 事件正確增加 unclaimedRewards
2. RewardsBanked 事件正確將 unclaimedRewards 歸零
3. 玩家統計數據正確更新

如果所有測試都通過，說明 RewardsBanked 事件整合成功！