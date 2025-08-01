# 子圖查詢負載分析與優化方案

## 當前負載評估

### 查詢複雜度分析

| 排行榜類型 | 查詢實體 | 索引字段 | 預估負載 | 數據變動頻率 | 建議緩存時間 |
|------------|----------|----------|----------|-------------|-------------|
| 🛡️ 隊伍戰力 | `parties` | `totalPower` | **低** | 低（配置變動） | 5分鐘 |
| 👑 VIP 等級 | `vips` | `level` | **低** | 極低（質押變動） | 5分鐘 |
| 🎯 玩家等級 | `playerProfiles` | `level` | **低** | 低（經驗累積） | 5分鐘 |
| 💰 總收益 | `playerStats` | `totalRewardsEarned` | **中** | 高（每次探險） | 1分鐘 |
| ⚔️ 通關次數 | `playerProfiles` | `successfulExpeditions` | **中** | 高（每次探險） | 1分鐘 |
| ⚡ 升級次數 | `playerStats` | `totalUpgradeAttempts` | **中** | 中等（升級活動） | 2分鐘 |

### 負載影響因素

#### 1. 數據量
- **當前規模**：假設 1000 活躍玩家
- **查詢量**：每次最多 50 條記錄
- **索引效率**：所有 `orderBy` 字段都有索引

#### 2. 並發查詢
- **峰值時間**：可能同時有 10-50 用戶查詢
- **查詢頻率**：平均每分鐘 100-500 次請求

## 優化方案

### 已實施的優化

#### 1. 智能緩存策略 ✅
```typescript
// 根據數據變動頻率設置不同緩存時間
case 'playerLevel':
case 'vipLevel':
  return { staleTime: 5 * 60 * 1000 }; // 5分鐘（變動少）

case 'totalEarnings':
case 'dungeonClears':
  return { staleTime: 60 * 1000 }; // 1分鐘（變動頻繁）
```

#### 2. 懶加載組件 ✅
- 只載入用戶實際查看的排行榜
- 減少初始查詢數量
- 視覺負載指示器

### 建議的進一步優化

#### 1. 子圖層面優化
```graphql
# 建議在子圖 schema 中添加
type LeaderboardCache @entity {
  id: String! # "totalEarnings-daily"
  type: String!
  timeRange: String!
  data: String! # JSON 字符串
  lastUpdated: BigInt!
}
```

#### 2. 分頁查詢
```typescript
// 支持分頁，減少單次查詢壓力
const GET_PAGINATED_LEADERBOARD = `
  query GetLeaderboard($first: Int!, $skip: Int!) {
    playerStats(
      first: $first
      skip: $skip
      orderBy: totalRewardsEarned
      orderDirection: desc
    ) { ... }
  }
`;
```

#### 3. 前端預載策略
- 預載熱門排行榜（總收益、通關次數）
- 後台預載其他排行榜
- 使用 Service Worker 緩存

## 性能監控建議

### 1. 查詢時間監控
```typescript
const startTime = performance.now();
const result = await fetchLeaderboardData(type, limit);
const queryTime = performance.now() - startTime;

// 報告慢查詢（>2秒）
if (queryTime > 2000) {
  console.warn(`慢查詢檢測: ${type} 耗時 ${queryTime}ms`);
}
```

### 2. 緩存命中率追蹤
- React Query 提供內建的 devtools
- 監控不同排行榜的緩存效率
- 調整緩存策略

## 結論

### 當前狀況
- **總體負載：中等偏低** 📊
- **最大瓶頸：總收益和通關次數查詢**
- **優化效果：預計減少 60-80% 重複查詢**

### 子圖壓力預估
以 1000 活躍用戶，高峰期 100 並發為例：

**優化前**：
- 每用戶 6 個查詢 = 600 QPS
- 無緩存，重複查詢多

**優化後**：
- 智能緩存減少 70% = 180 QPS  
- 懶加載減少 50% = 90 QPS
- **最終負載：約 90 QPS**

### 建議
1. **立即實施**：已完成的緩存和懶加載優化
2. **中期規劃**：子圖層面的緩存表
3. **長期優化**：分布式緩存和 CDN

這個負載水平對於 The Graph 的去中心化網絡來說是完全可以承受的。