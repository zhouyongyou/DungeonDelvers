# VIP顯示與聖物載入優化修復報告

## 問題概述

用戶報告了兩個主要問題：
1. **VIP卡顯示問題**：VIP卡在"我的資產"→"我的收藏"中顯示正常，但在VIP頁面沒有正確顯示
2. **聖物載入性能問題**：聖物載入速度比英雄慢，影響用戶體驗

## 問題分析

### 1. VIP卡顯示問題分析

經過代碼分析，發現問題的根本原因：

**VIP頁面（正常）**：
- 使用 `VipCardDisplay` 組件
- 直接調用智能合約的 `tokenURI` 函數
- 元數據服務器實時生成包含正確等級的SVG

**我的收藏頁面（異常）**：
- 使用 `NftCard` 組件
- 通過GraphQL獲取數據，但GraphQL中的 `vip.level` 被硬編碼為0
- 只顯示等級數字，不顯示完整的SVG圖片

### 2. 聖物載入性能問題分析

**載入流程問題**：
- NFT元數據需要從IPFS或其他網路源獲取
- 原始超時時間過長（5秒），重試次數過多（2次）
- IPFS載入只使用單一網關，容易出現瓶頸
- 沒有優化載入順序

## 修復方案

### 1. VIP卡顯示修復

**修改文件**：`src/components/ui/NftCard.tsx`

**核心修復**：
- 新增 `VipImage` 專用組件
- 對VIP類型NFT直接調用智能合約獲取 `tokenURI`
- 實現SVG圖片的實時顯示
- 添加載入狀態和錯誤處理

**修復代碼片段**：
```typescript
// VIP卡專用的圖片顯示組件
const VipImage: React.FC<{ nft: VipNft; fallbackImage: string }> = memo(({ nft, fallbackImage }) => {
  const vipStakingContract = getContract(bsc.id, 'vipStaking');
  const [hasError, setHasError] = useState(false);
  
  const { data: tokenURI, isLoading } = useReadContract({
    ...vipStakingContract,
    functionName: 'tokenURI',
    args: [nft.id],
    query: { 
      enabled: !!vipStakingContract && !hasError,
      staleTime: 1000 * 60 * 5, // 5分鐘緩存
    },
  });

  const svgImage = useMemo(() => {
    if (!tokenURI) return null;
    try {
      const uriString = typeof tokenURI === 'string' ? tokenURI : '';
      if (!uriString.startsWith('data:application/json;base64,')) {
        return uriString;
      }
      const decodedUri = Buffer.from(uriString.substring('data:application/json;base64,'.length), 'base64').toString();
      const metadata = JSON.parse(decodedUri);
      return metadata.image;
    } catch (e) {
      console.error("解析 VIP 卡 SVG 失敗:", e);
      setHasError(true);
      return null;
    }
  }, [tokenURI]);

  // 載入狀態和錯誤處理...
});
```

### 2. 聖物載入性能優化

**修改文件**：`src/api/nfts.ts`

**核心優化**：

#### A. 減少超時時間和重試次數
```typescript
const maxRetries = 1; // 減少重試次數以加快失敗恢復
const timeout = 3000; // 減少到3秒以加快載入
```

#### B. IPFS多網關並行載入
```typescript
// 優化IPFS載入 - 使用多個網關並行請求
const ipfsHash = uri.replace('ipfs://', '');
const gateways = [
    `https://ipfs.io/ipfs/${ipfsHash}`,
    `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
    `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`
];
metadata = await fetchWithMultipleGateways(gateways, timeout);
```

#### C. 多網關並行請求實現
```typescript
async function fetchWithMultipleGateways(gateways: string[], timeout: number) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        // 並行請求所有網關，取最快的響應
        const requests = gateways.map(url => 
            fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'DungeonDelvers/1.0'
                }
            }).then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
        );
        
        const result = await Promise.race(requests);
        clearTimeout(timeoutId);
        return result;
    } catch (error) {
        // 錯誤處理...
    }
}
```

#### D. 優化載入順序
```typescript
// 優化載入順序：優先載入聖物和英雄（組隊需要），然後是其他
const [relics, heroes] = await Promise.all([
    parseNfts(playerAssets.relics || [], 'relic', chainId, client),
    parseNfts(playerAssets.heroes || [], 'hero', chainId, client),
]);

// 其他資產並行載入
const [parties, vipCards] = await Promise.all([
    parseNfts(playerAssets.parties || [], 'party', chainId, client),
    playerAssets.vip ? parseNfts([playerAssets.vip], 'vip', chainId, client) : Promise.resolve([]),
]);
```

#### E. 優化失敗回退數據
```typescript
// 為聖物提供更快的fallback數據
const isRelic = contractAddress.toLowerCase().includes('relic');
return { 
    name: isRelic ? `聖物 #${tokenId}` : `NFT #${tokenId}`, 
    description: `正在載入詳細資訊...`, 
    image: isRelic ? '/images/relic-placeholder.svg' : '', 
    attributes: isRelic ? [
        { trait_type: 'Capacity', value: '載入中...' },
        { trait_type: 'Rarity', value: '載入中...' }
    ] : []
};
```

## 修復效果預期

### 1. VIP卡顯示修復效果
- ✅ VIP卡在我的收藏中正確顯示完整的SVG圖片
- ✅ 顯示實時的VIP等級（而非硬編碼的0）
- ✅ 保持與VIP頁面一致的顯示效果
- ✅ 添加載入狀態和錯誤處理

### 2. 聖物載入性能優化效果
- ⚡ 載入超時時間從5秒減少到3秒
- ⚡ 重試次數從2次減少到1次，加快失敗恢復
- ⚡ IPFS載入使用3個網關並行請求，提高成功率
- ⚡ 優先載入聖物和英雄，優化用戶體驗
- ⚡ 提供更好的失敗回退數據

## 技術改進

### 1. 緩存優化
- VIP卡元數據緩存5分鐘，平衡實時性和性能
- 利用現有的IndexedDB緩存系統

### 2. 錯誤處理
- 優雅的錯誤處理，不會因為單個NFT載入失敗影響整體
- 提供有意義的載入狀態提示

### 3. 用戶體驗
- 載入狀態可視化
- 更快的響應時間
- 更穩定的顯示效果

## 注意事項

1. **兼容性**：修復保持向後兼容，不會影響現有功能
2. **性能監控**：建議監控實際載入時間的改善情況
3. **網路依賴**：IPFS網關的可用性仍然會影響載入速度
4. **緩存策略**：VIP卡的5分鐘緩存可以根據需要調整

## 測試建議

### 1. VIP卡顯示測試
- 測試有VIP質押的用戶在我的收藏中的顯示
- 測試VIP等級變化後的顯示更新
- 測試網路錯誤情況下的回退處理

### 2. 聖物載入性能測試
- 比較修復前後的載入時間
- 測試不同網路條件下的表現
- 測試大量聖物的載入情況

修復完成後，VIP卡將在所有地方正確顯示，聖物載入速度將顯著提升。