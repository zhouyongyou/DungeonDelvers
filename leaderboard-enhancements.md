# 排行榜增強建議

## 問題分析

當前的 GraphQL 錯誤可能由以下原因造成：
1. 子圖尚未同步最新的 schema 更改
2. 某些查詢參數傳遞有誤

## 解決方案

### 方案 A：立即可用的排行榜類型（使用現有數據）
建議優先實現這些不需要子圖修改的排行榜：

#### 1. **隊伍總戰力排行** 🏆
```graphql
query GetTopParties($first: Int!) {
  parties(
    first: $first
    orderBy: totalPower
    orderDirection: desc
    where: { isBurned: false }
  ) {
    id
    tokenId
    name
    totalPower
    owner { id }
  }
}
```
- 展示最強大的隊伍配置
- 激勵玩家優化隊伍組成

#### 2. **VIP 等級排行** ⭐
```graphql
query GetTopVips($first: Int!) {
  vips(
    first: $first
    orderBy: level
    orderDirection: desc
  ) {
    id
    level
    stakedAmount
    owner { id }
  }
}
```
- 展示 VIP 投入最多的玩家
- 增加 VIP 系統的社交競爭性

#### 3. **英雄收藏排行** 🗡️
```graphql
query GetHeroCollectors($first: Int!) {
  players(
    first: $first
    orderBy: heroCount
    orderDirection: desc
  ) {
    id
    heros(where: { isBurned: false }) {
      id
    }
  }
}
```
- 展示收集最多英雄的玩家
- 鼓勵收藏行為

### 方案 B：需要子圖更新的排行榜

#### 1. **週/月收益排行**
需要在子圖中增加時間窗口統計：
```graphql
type PlayerStats @entity {
  # 新增欄位
  weeklyRewardsEarned: BigInt!
  monthlyRewardsEarned: BigInt!
  lastWeekReset: BigInt!
  lastMonthReset: BigInt!
}
```

#### 2. **連勝/連敗統計**
追踪玩家的連續成功/失敗記錄：
```graphql
type PlayerStats @entity {
  # 新增欄位
  currentWinStreak: Int!
  bestWinStreak: Int!
  currentLoseStreak: Int!
}
```

## 實施建議

### 第一階段：快速實現（1-2天）
1. ✅ 修復現有 GraphQL 錯誤
2. 🚀 實現隊伍總戰力排行
3. 🚀 實現 VIP 等級排行
4. 🚀 優化排行榜 UI 組件

### 第二階段：擴展功能（3-5天）
1. 📊 增加時間篩選器（日/週/月/總）
2. 🎯 添加個人排名追踪
3. 🏅 設計獎勵機制（如前10名特殊徽章）

### 第三階段：深度優化（1週+）
1. 📈 實時排名變化追踪
2. 🔔 排名變化通知
3. 🎮 賽季制排行榜

## 思維突破

**從單一指標到多維度評價系統**

傳統排行榜只關注單一指標（如總收益），但真正的遊戲深度來自多維度的競爭：

1. **綜合實力指數**
   - 結合：總收益 × 成功率 × 英雄數量 × VIP等級
   - 創建一個"綜合戰力值"，更全面評價玩家

2. **動態排行榜**
   - 不同時段展示不同類型排行
   - 早上：日收益榜
   - 下午：PVP戰績榜
   - 晚上：總資產榜

3. **社交化排行**
   - 好友排行榜
   - 公會/團隊排行榜
   - 地區排行榜

這樣可以讓每個玩家都有機會在某個維度上獲得成就感，增加遊戲黏性。