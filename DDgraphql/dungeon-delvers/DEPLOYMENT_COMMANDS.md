# 子圖部署命令

## 部署到 The Graph Studio

```bash
# 如果還沒有認證
graph auth --studio [YOUR_DEPLOY_KEY]

# 部署子圖（版本號可以調整）
graph deploy --studio dungeon-delvers --version-label v3.0.2
```

## 重要資訊
- 新 DungeonMaster 地址: `0x0048396d13C8A505a09f4F839ae66Ef72007C512`
- 起始區塊: `54557721`
- 新增事件: `ExpeditionRequested`

## 部署後驗證
1. 檢查 The Graph Studio 儀表板
2. 等待索引完成
3. 測試查詢新的探險數據

## 查詢範例
```graphql
query {
  expeditions(first: 10, orderBy: timestamp, orderDirection: desc) {
    id
    dungeonName
    partyPower
    dungeonPowerRequired
    success
    reward
  }
}
```