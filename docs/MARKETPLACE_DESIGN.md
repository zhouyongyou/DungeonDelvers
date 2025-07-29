# 🏪 DungeonDelvers P2P 內部市場設計文檔

## 📋 概述

內部 P2P 市場讓玩家能夠直接交易英雄、聖物和隊伍 NFT，並提供遊戲相關數據的完整展示。

## 🏗️ 系統架構

### 1. 智能合約層
由於我們採用無合約方案，將使用現有的 NFT 合約的 `approve` 和 `transferFrom` 機制：

```solidity
// 賣家流程
1. approve(買家地址, tokenId)
2. 買家直接 transferFrom(賣家, 買家, tokenId)
```

### 2. 數據存儲層
使用 The Graph 索引所有交易相關事件：

```graphql
type Listing @entity {
  id: ID!
  seller: String!
  nftType: String! # hero/relic/party
  tokenId: BigInt!
  price: BigInt!
  status: String! # active/sold/cancelled
  createdAt: BigInt!
  soldAt: BigInt
  buyer: String
}
```

### 3. 前端架構

```
MarketplacePage/
├── components/
│   ├── MarketplaceHeader.tsx      # 搜索和篩選
│   ├── ListingGrid.tsx            # 商品列表
│   ├── ListingCard.tsx            # 單個商品卡片
│   ├── ListingModal.tsx           # 掛單彈窗
│   ├── PurchaseModal.tsx          # 購買彈窗
│   └── MarketStats.tsx            # 市場統計
├── hooks/
│   ├── useMarketListings.ts       # 獲取掛單列表
│   ├── useCreateListing.ts        # 創建掛單
│   └── usePurchaseItem.ts         # 購買物品
└── utils/
    └── marketHelpers.ts           # 價格計算等

```

## 🔄 交易流程

### 掛單流程
1. 用戶選擇要出售的 NFT
2. 設定價格（SOUL）
3. 授權市場地址
4. 創建鏈下掛單記錄
5. 廣播到 P2P 網絡

### 購買流程
1. 瀏覽市場列表
2. 查看詳細信息（戰力、屬性等）
3. 確認購買
4. 支付 SOUL + 手續費
5. 自動完成 NFT 轉移

## 🎯 核心功能

### 1. 增強的 NFT 展示
- **英雄**：顯示等級、戰力、屬性、技能
- **聖物**：顯示加成效果、適配英雄
- **隊伍**：顯示總戰力、成員詳情、協同效果

### 2. 智能篩選器
```typescript
interface MarketFilters {
  nftType: 'hero' | 'relic' | 'party' | 'all';
  priceRange: { min: number; max: number };
  powerRange: { min: number; max: number };
  rarity: string[];
  element: string[];
  sortBy: 'price' | 'power' | 'newest' | 'ending';
  sortOrder: 'asc' | 'desc';
}
```

### 3. 價格建議系統
基於歷史成交價和當前戰力提供合理定價建議

### 4. 交易歷史追蹤
完整的買賣記錄，包含價格走勢圖表

## 🛡️ 安全考量

1. **防止雙重支付**：使用 nonce 機制
2. **價格操縱防護**：設置最高/最低價格限制
3. **防機器人**：交易冷卻期
4. **託管機制**：確保資產安全轉移

## 📊 市場數據展示

### 實時統計
- 24小時交易量
- 地板價追蹤
- 熱門英雄排行
- 稀有度分布圖

### 個人統計
- 我的掛單
- 購買歷史
- 收藏價值評估
- 投資回報率

## 🚀 實施計劃

### Phase 1：基礎市場（1-2週）
- [x] 市場頁面 UI
- [ ] 掛單和瀏覽功能
- [ ] 基本篩選和排序
- [ ] The Graph 整合

### Phase 2：進階功能（2-3週）
- [ ] 戰力計算和展示
- [ ] 價格建議系統
- [ ] 交易歷史圖表
- [ ] 批量操作

### Phase 3：優化和擴展（3-4週）
- [ ] 移動端優化
- [ ] 推薦算法
- [ ] 社交功能（關注、評論）
- [ ] API 開放

## 💡 創新特性

1. **隊伍預覽**：購買前模擬隊伍搭配效果
2. **戰力計算器**：實時顯示購買後的戰力提升
3. **稀有度提醒**：特殊屬性組合的自動標記
4. **價格警報**：設定心儀價格，降價時通知

---

*最後更新：2024-01-29*