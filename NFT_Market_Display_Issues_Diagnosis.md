# NFT 市場顯示問題診斷報告

## 問題總結

用戶報告了兩個主要顯示問題：
1. **NFT 市場沒有顯示 LOGO**
2. **聖物 NFT 在官網和 NFT 市場都顯示不出 SVG**

## 問題分析

### 1. VIP 卡 SVG 顯示問題

#### 問題狀況
- VIP 卡在 NFT 市場中無法正確顯示 SVG 圖片
- 可能顯示為空白或載入失敗

#### 根本原因
通過代碼分析發現，問題可能出現在以下幾個層面：

**A. 子圖 (Subgraph) 數據問題**
- 文件：`DDgraphql/dungeon-delvers/src/vip-staking.ts`
- 第 16 行和第 55 行：`vip.level = 0 // Level is calculated off-chain`
- VIP 等級被硬編碼為 0，而非實際計算值

**B. 元數據服務器已修正但可能存在服務問題**
- 文件：`dungeon-delvers-metadata-server/src/index.js`
- 第 267-281 行：已正確實現智能合約 `getVipLevel` 調用
- 但服務器可能存在連接或性能問題

**C. 前端組件實現正確**
- 文件：`src/components/ui/NftCard.tsx`
- 第 25-70 行：`VipImage` 組件正確實現了 SVG 載入邏輯
- 直接調用智能合約獲取 `tokenURI`

### 2. 聖物 NFT SVG 載入問題

#### 問題狀況
- 聖物 NFT 載入速度慢於英雄 NFT
- SVG 圖片顯示失敗或載入超時

#### 根本原因分析
通過 `src/api/nfts.ts` 代碼分析，已實現以下優化：

**A. IPFS 載入優化**（第 97-132 行）
- 使用多個 IPFS 網關並行請求
- 網關包括：`ipfs.io`、`gateway.pinata.cloud`、`cloudflare-ipfs.com`
- 超時時間已優化至 3 秒

**B. 載入順序優化**（第 358-370 行）
- 優先載入聖物和英雄（組隊需要）
- 其他資產並行載入

**C. 錯誤處理優化**（第 81-93 行）
- 為聖物提供專門的 fallback 數據
- 包含 `relic-placeholder.svg` 預設圖片

### 3. 潛在的服務器或網路問題

#### 可能的服務器問題
1. **元數據服務器狀態**
   - 服務器可能過載或響應緩慢
   - CORS 設定可能有問題

2. **RPC 節點問題**
   - BSC RPC 節點可能不穩定
   - 智能合約調用可能失敗

3. **子圖同步問題**
   - The Graph 索引可能延遲
   - 數據同步可能不完整

## 診斷建議

### 1. 立即檢查項目

**A. 服務器狀態檢查**
```bash
# 檢查元數據服務器健康狀態
curl -X GET https://your-metadata-server.com/health

# 檢查 VIP NFT 元數據 API
curl -X GET https://your-metadata-server.com/api/vipstaking/1
```

**B. 智能合約狀態檢查**
```bash
# 檢查 VIP 合約是否正常
# 測試 getVipLevel 函數調用
# 測試 tokenURI 函數調用
```

**C. 子圖數據檢查**
```graphql
query {
  player(id: "USER_ADDRESS") {
    vip {
      level
      stakedAmount
      tokenId
    }
  }
}
```

### 2. 修復方案

#### A. 緊急修復 - 前端繞過問題
如果是服務器問題，可以在前端直接載入：

```typescript
// 在 NftCard 組件中添加錯誤處理
const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const target = e.currentTarget;
  // 嘗試直接從智能合約獲取 tokenURI
  // 作為 fallback 機制
};
```

#### B. 中期修復 - 服務器優化
1. **增加服務器監控**
   - 添加健康檢查端點
   - 監控響應時間和錯誤率

2. **優化緩存策略**
   - 增加 NFT 元數據緩存時間
   - 使用 Redis 或 CDN 緩存

#### C. 長期修復 - 子圖數據修正
雖然元數據服務器已修正，但為了數據一致性，建議：

```typescript
// 在 vip-staking.ts 中添加 VIP 等級計算
export function handleStaked(event: Staked): void {
  // 現有邏輯...
  
  // 可選：計算 VIP 等級（如果需要在子圖中使用）
  // 但建議保持現狀，讓前端和元數據服務器直接調用智能合約
}
```

### 3. 測試步驟

#### A. 功能測試
1. **VIP 卡測試**
   - 測試不同 VIP 等級的顯示
   - 測試 SVG 載入和顯示

2. **聖物 NFT 測試**
   - 測試聖物 NFT 的載入速度
   - 測試 IPFS 圖片載入

#### B. 性能測試
1. **載入時間測試**
   - 測量 NFT 載入時間
   - 比較不同網路條件下的表現

2. **服務器壓力測試**
   - 測試大量併發請求
   - 監控服務器響應時間

## 建議的修復優先順序

### 高優先級（立即修復）
1. **檢查元數據服務器狀態**
   - 確認服務器是否正常運行
   - 檢查 API 端點是否可訪問

2. **檢查 RPC 節點連接**
   - 測試智能合約調用
   - 確認區塊鏈連接穩定

### 中優先級（本週修復）
1. **優化錯誤處理**
   - 改善 SVG 載入失敗的 fallback 機制
   - 添加更好的載入狀態提示

2. **增強監控**
   - 添加性能監控
   - 設置錯誤警報

### 低優先級（後續優化）
1. **子圖數據優化**
   - 考慮是否需要在子圖中計算 VIP 等級
   - 優化數據同步機制

## 結論

問題主要集中在：
1. **服務器端**：元數據服務器可能存在性能或連接問題
2. **網路層**：RPC 節點或 IPFS 網關可能不穩定
3. **數據層**：子圖數據的 VIP 等級硬編碼為 0

建議首先檢查服務器狀態和網路連接，然後逐步優化各個層面的問題。前端代碼已經有較好的錯誤處理機制，主要問題可能在基礎設施層面。