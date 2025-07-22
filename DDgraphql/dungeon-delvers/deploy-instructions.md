# 子圖部署指南

## 部署 v3.0.8 到 The Graph Studio

### 修復內容
1. 修正了 totalRewardsEarned 計算錯誤（將經驗值誤加到獎勵）
2. 修正了 successfulExpeditions 未更新的問題
3. 移除了 ExperienceAdded 事件對 totalRewardsEarned 的錯誤影響

### 部署步驟

1. 設定 Access Token（從 The Graph Studio 獲取）：
```bash
export GRAPH_ACCESS_TOKEN=你的token
```

2. 部署子圖：
```bash
npm run deploy
```

或直接使用：
```bash
graph deploy dungeon-delvers --access-token 你的token --node https://api.studio.thegraph.com/deploy/ --version-label v3.0.8
```

### 注意事項
- 部署後需要等待子圖同步
- 歷史數據需要重新索引，這可能需要一些時間
- 新的查詢端點：https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.8

### 更新前端配置
部署成功後，需要在前端更新 GraphQL 端點：
```typescript
// .env
VITE_THE_GRAPH_API_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.8
```