# Subgraph BatchMint Update Summary

## 更新內容

為了支援新的批量鑄造防撞庫機制，已更新子圖以監聽 `BatchMintCompleted` 事件。

### 1. 更新的文件

#### ABI 文件
- **abis/Hero.json** - 添加了 `BatchMintCompleted` 和 `BatchTierSet` 事件定義
- **abis/Relic.json** - 添加了 `BatchMintCompleted` 和 `BatchTierSet` 事件定義

#### 映射文件  
- **src/hero.ts** - 添加了 `handleBatchMintCompleted` 處理函數
- **src/relic.ts** - 添加了 `handleBatchMintCompleted` 處理函數

#### 配置文件
- **subgraph.yaml** - 為 Hero 和 Relic 添加了新的事件處理器

### 2. 事件結構

```typescript
event BatchMintCompleted(
    address indexed player,
    uint256 quantity,
    uint8 maxRarity,
    uint256[] tokenIds
);
```

### 3. 處理邏輯

批量鑄造完成事件主要用於：
- 記錄批量鑄造的完成狀態
- 追蹤玩家使用的批量鑄造層級
- 前端可以使用此事件顯示批量鑄造的結果

注意：實際的 NFT 創建仍由 `HeroMinted` 和 `RelicMinted` 事件處理，避免重複計算。

### 4. 部署步驟

```bash
# 1. 生成代碼
npm run codegen

# 2. 構建子圖  
npm run build

# 3. 部署到 The Graph Studio
graph deploy --studio dungeon-delvers

# 或使用配置的部署腳本
npm run deploy:current
```

### 5. 注意事項

- 確保新合約已部署並包含批量鑄造功能
- 更新 startBlock 到新合約的部署區塊
- 批量鑄造事件不會影響現有的 NFT 統計邏輯

### 6. 查詢示例

部署後可以查詢批量鑄造事件：

```graphql
{
  batchMintCompleteds(first: 10, orderBy: timestamp, orderDirection: desc) {
    id
    player
    quantity
    maxRarity
    tokenIds
    timestamp
  }
}
```

## 下一步

1. 部署新的 Hero 和 Relic 合約
2. 更新 subgraph.yaml 中的合約地址
3. 設定正確的 startBlock
4. 部署子圖到 The Graph