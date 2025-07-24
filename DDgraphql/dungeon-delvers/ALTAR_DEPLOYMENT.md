# 祭壇功能子圖部署指南

## 更新內容
1. 已在 `subgraph.yaml` 中添加 AltarOfAscension 數據源
2. 使用現有的 `src/altar-of-ascension.ts` 映射文件
3. 配置了正確的合約地址：0xf2ef1d0341d5439F72cBE065A75234FE5ce38a23

## 部署步驟

```bash
# 1. 生成代碼
npm run codegen

# 2. 構建子圖
npm run build

# 3. 部署到 The Graph Studio
graph deploy --studio dungeon-delvers
```

## 驗證部署

部署後，可以使用以下查詢驗證祭壇功能：

```graphql
{
  upgradeAttempts(first: 10, orderBy: timestamp, orderDirection: desc) {
    id
    player {
      id
    }
    type
    targetId
    isSuccess
    newRarity
    timestamp
  }
}
```

## 注意事項
- startBlock 設為 55018576（與其他合約保持一致）
- 如果需要更精確的起始區塊，請檢查祭壇合約的部署交易
- 事件處理器會追踪所有升級嘗試並更新統計數據