# 子圖功能列表

## 🎯 現有子圖可實現的功能

### 1. 🏆 排行榜功能

#### 玩家總獎勵排行榜
```graphql
query TopEarners {
  playerStats(
    first: 10
    orderBy: totalRewardsEarned
    orderDirection: desc
  ) {
    id
    player {
      id
      profile {
        name
      }
    }
    totalRewardsEarned
    successfulExpeditions
  }
}
```

#### 最高戰力隊伍排行榜
```graphql
query TopPowerParties {
  parties(
    first: 10
    orderBy: totalPower
    orderDirection: desc
    where: { isBurned: false }
  ) {
    id
    name
    totalPower
    owner {
      id
      profile {
        name
      }
    }
    heroIds
  }
}
```

#### 遠征王者排行榜
```graphql
query ExpeditionKings {
  playerStats(
    first: 10
    orderBy: totalExpeditions
    orderDirection: desc
  ) {
    id
    player {
      profile {
        name
      }
    }
    totalExpeditions
    successfulExpeditions
    # 成功率 = successfulExpeditions / totalExpeditions
  }
}
```

#### 升星大師排行榜
```graphql
query UpgradeMasters {
  playerUpgradeStats(
    first: 10
    orderBy: totalAttempts
    orderDirection: desc
  ) {
    id
    totalAttempts
    totalMinted
    totalBurned
    totalFeesSpent
  }
}
```

#### VIP 質押排行榜
```graphql
query TopVIPs {
  vips(
    first: 10
    orderBy: stakedAmount
    orderDirection: desc
    where: { isUnlocking: false }
  ) {
    id
    owner {
      profile {
        name
      }
    }
    stakedAmount
    stakedAt
  }
}
```

#### 邀請佣金排行榜
```graphql
query TopReferrers {
  playerProfiles(
    first: 10
    orderBy: commissionEarned
    orderDirection: desc
  ) {
    id
    name
    commissionEarned
    invitees
  }
}
```

### 2. 📊 統計分析功能

#### 全局遊戲統計
```graphql
query GlobalGameStats {
  globalStats(id: "global") {
    totalPlayers
    totalHeroes
    totalRelics
    totalParties
    totalExpeditions
    successfulExpeditions
    totalRewardsDistributed
    totalUpgradeAttempts
    successfulUpgrades
  }
}
```

#### 玩家個人統計
```graphql
query PlayerDashboard($player: Bytes!) {
  player(id: $player) {
    heros {
      id
      rarity
      power
    }
    parties {
      id
      totalPower
      unclaimedRewards
      expeditions(first: 10, orderBy: timestamp, orderDirection: desc) {
        dungeonName
        success
        reward
      }
    }
    stats {
      totalRewardsEarned
      highestPartyPower
      successfulExpeditions
    }
    profile {
      name
      successfulExpeditions
      totalRewardsEarned
    }
  }
}
```

#### 時間統計分析
```graphql
query DailyExpeditions($startTime: BigInt!, $endTime: BigInt!) {
  expeditions(
    where: {
      timestamp_gte: $startTime
      timestamp_lte: $endTime
    }
  ) {
    id
    timestamp
    success
    reward
    dungeonId
  }
}
```

### 3. 🔍 查詢和搜尋功能

#### 搜尋玩家
```graphql
query SearchPlayer($name: String!) {
  playerProfiles(
    where: { name_contains_nocase: $name }
    first: 10
  ) {
    id
    name
    owner {
      heros { id }
      parties { id }
    }
  }
}
```

#### 稀有度篩選
```graphql
query RareHeroes($minRarity: Int!) {
  heros(
    where: { 
      rarity_gte: $minRarity
      isBurned: false 
    }
    orderBy: power
    orderDirection: desc
  ) {
    id
    tokenId
    owner {
      id
    }
    rarity
    power
  }
}
```

### 4. 📈 實時監控功能

#### 最近遠征活動
```graphql
query RecentExpeditions {
  expeditions(
    first: 20
    orderBy: timestamp
    orderDirection: desc
  ) {
    player {
      profile {
        name
      }
    }
    party {
      name
      totalPower
    }
    dungeonName
    success
    reward
    timestamp
  }
}
```

#### 最近升星活動
```graphql
query RecentUpgrades {
  upgradeAttempts(
    first: 20
    orderBy: timestamp
    orderDirection: desc
  ) {
    player {
      profile {
        name
      }
    }
    type
    outcome
    baseRarity
    newRarity
    fee
    timestamp
  }
}
```

### 5. 💰 經濟分析功能

#### 獎勵分配分析
```graphql
query RewardDistribution {
  # 前 100 名玩家的獎勵分布
  playerStats(
    first: 100
    orderBy: totalRewardsEarned
    orderDirection: desc
  ) {
    totalRewardsEarned
  }
  
  # 全局總獎勵
  globalStats(id: "global") {
    totalRewardsDistributed
  }
}
```

#### 費用消耗分析
```graphql
query FeeAnalysis {
  globalUpgradeStats(id: "global") {
    totalFeesCollected
    totalAttempts
  }
  
  # 最大消費者
  playerUpgradeStats(
    first: 10
    orderBy: totalFeesSpent
    orderDirection: desc
  ) {
    id
    totalFeesSpent
    totalAttempts
  }
}
```

## 🚀 實施建議

### 1. 前端排行榜頁面
```typescript
// src/pages/LeaderboardPage.tsx
import { gql, useQuery } from '@apollo/client';

const LEADERBOARD_QUERY = gql`
  query GetLeaderboards {
    # 戰力排行
    powerLeaders: playerStats(
      first: 10
      orderBy: highestPartyPower
      orderDirection: desc
    ) {
      id
      player {
        profile { name }
      }
      highestPartyPower
    }
    
    # 獎勵排行
    rewardLeaders: playerStats(
      first: 10
      orderBy: totalRewardsEarned
      orderDirection: desc
    ) {
      id
      player {
        profile { name }
      }
      totalRewardsEarned
    }
  }
`;
```

### 2. 即時更新機制
```typescript
// 使用 Apollo subscriptions
const EXPEDITION_SUBSCRIPTION = gql`
  subscription OnNewExpedition {
    expeditions(
      orderBy: timestamp
      orderDirection: desc
      first: 1
    ) {
      id
      player { id }
      success
      reward
    }
  }
`;
```

### 3. 緩存策略
```typescript
// Apollo Client 緩存配置
const client = new ApolloClient({
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          playerStats: {
            // 排行榜 5 分鐘緩存
            keyArgs: ['orderBy', 'orderDirection'],
            merge: false,
          },
        },
      },
    },
  }),
});
```

## 🔮 未來可能的功能

1. **時間維度排行榜**
   - 每日/每週/每月排行
   - 歷史排名追蹤

2. **社群功能**
   - 公會排行榜
   - 好友排行榜

3. **進階分析**
   - 成長曲線圖
   - 熱力圖分析
   - 留存率分析

4. **競賽系統**
   - 賽季排行榜
   - 特殊活動排行

## 💡 技術要點

1. **查詢優化**
   - 使用 `first` 限制結果數量
   - 利用 `where` 過濾不必要的數據
   - 合理使用 `orderBy` 和 `orderDirection`

2. **數據更新**
   - 子圖索引可能有延遲（通常幾秒到幾分鐘）
   - 重要數據可以結合 RPC 查詢確保即時性

3. **效能考慮**
   - 大量數據查詢應該分頁
   - 使用 GraphQL 片段避免重複代碼
   - 合理設置查詢超時