# Subgraph 部署指南 - 支援 RewardsBanked 事件

## 已完成的修改

1. **subgraph.yaml** - 添加了 RewardsBanked 事件監聽
2. **dungeon-master.ts** - 實現了 handleRewardsBanked 處理函數

## 部署步驟

### 1. 安裝依賴
```bash
cd /Users/sotadic/Documents/GitHub/DungeonDelvers/DDgraphql/dungeon-delvers
npm install
```

### 2. 生成代碼
```bash
npm run codegen
```

### 3. 構建 subgraph
```bash
npm run build
```

### 4. 部署到 The Graph Studio

#### 方法 A：使用 npm script
```bash
npm run deploy
```

#### 方法 B：手動部署
```bash
graph deploy --studio dungeon-delvers
```

### 5. 等待同步
- 新交易會立即被索引
- 歷史數據需要時間同步
- 可以在 The Graph Studio 查看同步進度

## 驗證部署

### 1. 檢查事件處理
在 The Graph Explorer 執行查詢：
```graphql
{
  parties(first: 5) {
    id
    unclaimedRewards
    lastUpdatedAt
  }
}
```

### 2. 測試獎勵領取
領取獎勵後，確認：
- Party 的 `unclaimedRewards` 變為 0
- PlayerProfile 的 `totalRewardsEarned` 增加

## 注意事項

1. **版本管理**：確保更新 subgraph 版本號
2. **ABI 同步**：如果合約有更新，記得更新 ABI 文件
3. **錯誤處理**：查看 The Graph Studio 的錯誤日誌

## 回滾方案

如果出現問題：
1. 在 The Graph Studio 選擇之前的版本
2. 點擊 "Activate" 恢復到舊版本
3. 調查問題並修復後重新部署

## 更新前端

部署成功後，確保前端使用新的 subgraph 端點：
```env
VITE_GRAPHQL_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.6
```