# 隊伍 NFT 戰力分級系統實現方案

## 🎯 目標
根據隊伍的總戰力（totalPower）顯示不同的圖片，讓玩家能夠一目了然地看出隊伍的強度等級。

## 📊 戰力分級設計

### 建議的分級系統
```
青銅隊伍 (Bronze):     300 - 4,199
白銀隊伍 (Silver):     4,200 - 9,999  
黃金隊伍 (Gold):       10,000 - 19,999
白金隊伍 (Platinum):   20,000 - 39,999
鑽石隊伍 (Diamond):    40,000 - 79,999
大師隊伍 (Master):     80,000 - 149,999
宗師隊伍 (Grandmaster): 150,000 - 299,999
傳奇隊伍 (Legend):     300,000+
```

## 🔧 實現步驟

### 1. 準備圖片資源
在 `/public/images/party/` 目錄下準備以下圖片：
- `party-bronze.png` (青銅)
- `party-silver.png` (白銀)
- `party-gold.png` (黃金)
- `party-platinum.png` (白金)
- `party-diamond.png` (鑽石)
- `party-master.png` (大師)
- `party-grandmaster.png` (宗師)
- `party-legend.png` (傳奇)

### 2. 前端實現 (最簡單方案)

#### a. 創建戰力分級工具函數
```typescript
// src/utils/partyTiers.ts
export interface PartyTier {
  name: string;
  minPower: number;
  maxPower: number;
  image: string;
  color: string; // 用於 UI 顯示
}

export const PARTY_TIERS: PartyTier[] = [
  { name: 'Bronze', minPower: 300, maxPower: 4199, image: 'party-bronze.png', color: '#CD7F32' },
  { name: 'Silver', minPower: 4200, maxPower: 9999, image: 'party-silver.png', color: '#C0C0C0' },
  { name: 'Gold', minPower: 10000, maxPower: 19999, image: 'party-gold.png', color: '#FFD700' },
  { name: 'Platinum', minPower: 20000, maxPower: 39999, image: 'party-platinum.png', color: '#E5E4E2' },
  { name: 'Diamond', minPower: 40000, maxPower: 79999, image: 'party-diamond.png', color: '#B9F2FF' },
  { name: 'Master', minPower: 80000, maxPower: 149999, image: 'party-master.png', color: '#FF6B6B' },
  { name: 'Grandmaster', minPower: 150000, maxPower: 299999, image: 'party-grandmaster.png', color: '#9B59B6' },
  { name: 'Legend', minPower: 300000, maxPower: Infinity, image: 'party-legend.png', color: '#F39C12' }
];

export function getPartyTier(totalPower: number): PartyTier {
  return PARTY_TIERS.find(tier => 
    totalPower >= tier.minPower && totalPower <= tier.maxPower
  ) || PARTY_TIERS[0];
}

export function getPartyImagePath(totalPower: number): string {
  const tier = getPartyTier(totalPower);
  return `/images/party/${tier.image}`;
}
```

#### b. 更新 NFT API
修改 `src/api/nfts.ts` 中的 `parseNfts` 函數：

```typescript
case 'party': {
    const partyAsset = asset as unknown as PartyAsset;
    const totalPower = Number(partyAsset.totalPower);
    
    return { 
        ...baseNft, 
        type, 
        totalPower: BigInt(partyAsset.totalPower), 
        totalCapacity: BigInt(partyAsset.totalCapacity), 
        heroIds: partyAsset.heroIds ? partyAsset.heroIds.map((id) => BigInt(id)) : [], 
        relicIds: [], 
        partyRarity: Number(partyAsset.partyRarity),
        // 動態設置圖片路徑
        image: getPartyImagePath(totalPower),
        attributes: [
            { trait_type: 'Total Power', value: totalPower },
            { trait_type: 'Total Capacity', value: Number(partyAsset.totalCapacity) },
            { trait_type: 'Rarity', value: Number(partyAsset.partyRarity) },
            { trait_type: 'Tier', value: getPartyTier(totalPower).name }
        ]
    };
}
```

### 3. 進階方案：後端動態生成 Metadata

如果需要更靈活的方案，可以修改後端 metadata 服務：

#### a. 修改 metadata 服務器
在 `/Users/sotadic/Documents/dungeon-delvers-metadata-server/` 中：

1. 添加路由處理動態 metadata
2. 根據 tokenId 查詢鏈上數據獲取 totalPower
3. 動態生成對應的 metadata JSON

#### b. 合約端支持（可選）
如果要完全去中心化，可以考慮：
1. 在合約中添加 `getPartyTier()` 函數
2. 將分級邏輯寫入合約
3. 但這會增加 gas 成本，不建議

## 📝 實施優先級

1. **第一階段**：前端實現（最快）
   - 只需修改前端代碼
   - 準備不同等級的圖片
   - 立即生效

2. **第二階段**：後端支持（可選）
   - 如果需要更複雜的邏輯
   - 支持動態生成圖片
   - 可以加入更多視覺效果

3. **第三階段**：合約升級（不建議）
   - 除非有特殊需求
   - 會產生額外 gas 費用

## 🎨 視覺設計建議

1. **顏色主題**：
   - 青銅：棕色調
   - 白銀：灰色調
   - 黃金：金色調
   - 白金：銀白色調
   - 鑽石：藍色調
   - 大師：紅色調
   - 宗師：紫色調
   - 傳奇：橙色調

2. **圖片元素**：
   - 邊框裝飾越來越華麗
   - 背景特效逐級增強
   - 可加入粒子效果或光暈

## 🚀 快速開始

1. 準備 8 張不同等級的隊伍圖片
2. 實現上述工具函數
3. 更新 `parseNfts` 函數
4. 測試不同戰力的隊伍顯示效果

這樣就能實現隊伍 NFT 根據總戰力顯示不同圖片的功能了！