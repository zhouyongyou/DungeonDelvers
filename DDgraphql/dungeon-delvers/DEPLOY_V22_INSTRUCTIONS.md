# 部署 V22 子圖的指引

## 前置準備

1. **設置 Graph Access Token**
   ```bash
   export GRAPH_ACCESS_TOKEN=你的_access_token
   ```
   
   如果沒有 token，請到 [The Graph Studio](https://thegraph.com/studio/) 獲取。

## 部署步驟

### 方法一：使用自動部署腳本（推薦）

```bash
# 確保在子圖根目錄
cd /Users/sotadic/Documents/GitHub/DungeonDelvers/DDgraphql/dungeon-delvers

# 執行部署腳本
./deploy-v22.sh
```

腳本會自動執行：
1. 生成 subgraph.yaml
2. 運行 codegen
3. 構建子圖
4. 部署到 The Graph Studio

### 方法二：手動步驟

```bash
# 1. 生成配置（已完成）
npm run sync:v22

# 2. 生成代碼
npm run codegen

# 3. 構建子圖
npm run build

# 4. 部署
graph deploy dungeon-delvers \
  --version-label v22.0.0 \
  --access-token $GRAPH_ACCESS_TOKEN \
  --node https://api.studio.thegraph.com/deploy/
```

## 部署後步驟

1. **檢查同步狀態**
   - 訪問 [The Graph Studio](https://thegraph.com/studio/subgraph/dungeon-delvers)
   - 查看同步進度

2. **更新前端配置**
   當子圖同步完成後，更新前端的 API URL：
   
   文件：`/Users/sotadic/Documents/GitHub/DungeonDelvers/.env.local`
   ```
   VITE_THE_GRAPH_API_URL=https://api.studio.thegraph.com/query/115633/dungeon-delvers/v22.0.0
   ```

3. **測試查詢**
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"query":"{ heros(first: 5) { id tokenId power rarity } }"}' \
     https://api.studio.thegraph.com/query/115633/dungeon-delvers/v22.0.0
   ```

## 注意事項

- 起始區塊設為 55309000（約 V21 後 5 天）
- 如需精確區塊號，可查詢 Oracle V22 部署交易：`0x35ee9ab5d96b0c0ad72d77154cf2ee5e90c95f47b5037b59c30e5f982a5c20ea`
- 子圖同步可能需要一些時間，請耐心等待

## 故障排除

1. **如果部署失敗**
   - 檢查 GRAPH_ACCESS_TOKEN 是否正確設置
   - 確認網絡連接正常
   - 查看錯誤信息並相應處理

2. **如果同步緩慢**
   - 這是正常的，特別是對於歷史數據
   - 新的事件會立即被索引
   - 可以在 Studio 中查看詳細進度

## 配置變更

從 V21 到 V22 的主要變更：
- Oracle 地址更新為支持自適應 TWAP 的新版本
- 使用 v22-config.js 作為配置來源
- 起始區塊更新為更近期的區塊