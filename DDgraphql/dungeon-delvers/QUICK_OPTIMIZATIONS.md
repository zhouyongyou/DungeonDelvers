# 子圖快速優化指南

## 🚀 立即可實施的優化（不需要重寫）

### 1. 減少日誌輸出 ⚡
**複雜度**：簡單  
**時間**：10分鐘  
**效果**：5-10% 效能提升

```typescript
// 檔案：所有 .ts 處理器
// 搜尋並移除或註解：
log.info(...);  // 移除
log.warning(...);  // 保留（重要警告）
log.error(...);  // 保留（錯誤必須記錄）
```

### 2. 優化統計更新頻率 📊
**複雜度**：中等  
**時間**：30分鐘  
**效果**：15-20% 效能提升

```typescript
// 原本：每個事件都更新統計
export function handleHeroMinted(event: HeroMinted): void {
  // ... 處理英雄
  updateGlobalStats(TOTAL_HEROES, 1, event.block.timestamp);  // 每次都寫入
}

// 優化：批次更新（每 10 個區塊）
export function handleHeroMinted(event: HeroMinted): void {
  // ... 處理英雄
  if (event.block.number.mod(BigInt.fromI32(10)).equals(BigInt.zero())) {
    updateGlobalStats(TOTAL_HEROES, getPendingHeroCount(), event.block.timestamp);
  }
}
```

### 3. 移除不必要的 entity 關聯 🔗
**複雜度**：簡單  
**時間**：20分鐘  
**效果**：10-15% 查詢效能提升

```graphql
# schema.graphql
# 移除不常用的 @derivedFrom 關聯
type Hero @entity {
  id: ID!
  owner: Bytes!
  # parties: [Party!]! @derivedFrom(field: "heroes")  # 移除
  # 只保留必要欄位
}
```

### 4. 簡化複雜計算 🧮
**複雜度**：中等  
**時間**：30分鐘  
**效果**：5-10% 效能提升

```typescript
// 原本：每次都重新計算總力量
party.totalPower = calculateTotalPower(heroes, relics);

// 優化：增量更新
party.totalPower = party.totalPower + newHeroPower - oldHeroPower;
```

### 5. 合併重複的資料庫查詢 🔄
**複雜度**：簡單  
**時間**：15分鐘  
**效果**：10% 效能提升

```typescript
// 原本：多次查詢
let hero1 = Hero.load(id1);
let hero2 = Hero.load(id2);
let hero3 = Hero.load(id3);

// 優化：批次載入（如果 AssemblyScript 支援）
// 或快取常用實體
```

## 📋 實施步驟

1. **備份當前版本**
   ```bash
   cp -r src src-backup
   ```

2. **逐步實施優化**
   - 先做簡單的（移除日誌）
   - 測試每個優化的效果
   - 監控同步速度變化

3. **驗證資料一致性**
   - 確保優化後資料正確
   - 比對關鍵統計數據

## 🎯 預期總體效果

| 優化項目 | 單項提升 | 累積提升 |
|---------|---------|---------|
| 移除日誌 | 5-10% | 5-10% |
| 批次統計 | 15-20% | 20-30% |
| 簡化關聯 | 10-15% | 30-45% |
| 簡化計算 | 5-10% | 35-55% |
| 合併查詢 | 10% | 45-65% |

**總體預期**：同步時間從 3-5分鐘 → 1.5-2.5分鐘

## ⚠️ 注意事項

1. **不要過度優化**
   - 保持程式碼可讀性
   - 優化要有測量依據

2. **分階段實施**
   - 每次只做一種優化
   - 充分測試後再做下一個

3. **保留回滾能力**
   - 備份原始程式碼
   - 記錄每次優化的變更

## 🔧 前端配合調整

### 需要調整的 Hooks：
```typescript
// useMarketStats - 添加錯誤處理
export const useMarketStats = () => {
  return useQuery({
    queryKey: ['marketStats'],
    queryFn: async () => {
      try {
        return await marketplaceApi.getMarketStats();
      } catch (error) {
        // 市場功能暫時關閉，返回空資料
        return { listings: 0, volume: 0, users: 0 };
      }
    },
    retry: false,  // 不重試
  });
};
```

### GraphQL 查詢調整：
```typescript
// 移除市場相關欄位
const GET_PLAYER_ASSETS = gql`
  query GetPlayerAssets($owner: String!) {
    player(id: $owner) {
      heroes { ... }
      relics { ... }
      parties { ... }
      # marketListings { ... }  // 移除
      # offers { ... }  // 移除
    }
  }
`;
```

---

最後更新：2025-08-02  
下次優化評估：部署後觀察效果