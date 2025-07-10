# Collection 元數據整合方案

## 📋 現況分析

您已經準備了完整的 Collection 元數據文件，這非常棒！這些 JSON 文件有雙重用途：

### 現有文件結構：
```
public/metadata/
├── hero-collection.json          // 英雄收藏
├── relic-collection.json         // 聖物收藏  
├── party-collection.json         // 隊伍收藏
├── player-profile-collection.json // 玩家檔案收藏
└── vip-staking-collection.json   // VIP質押收藏
```

## 🎯 兩種使用方式

### 1. **NFT市場展示** (contractURI)
**目的**: 讓 OpenSea 等市場正確顯示您的 Collection 信息

#### 📝 需要在合約中添加：
```solidity
// 在每個NFT合約中添加
contract Hero is ERC721, Ownable, ReentrancyGuard, Pausable {
    // ... 現有代碼 ...
    
    string private _contractURI;
    
    function contractURI() public view returns (string memory) {
        return _contractURI;
    }
    
    function setContractURI(string memory newContractURI) external onlyOwner {
        _contractURI = newContractURI;
        emit ContractURIUpdated(newContractURI);
    }
    
    event ContractURIUpdated(string newContractURI);
}
```

#### 🚀 部署後設置：
```solidity
// 部署後執行
hero.setContractURI("https://www.dungeondelvers.xyz/metadata/hero-collection.json");
relic.setContractURI("https://www.dungeondelvers.xyz/metadata/relic-collection.json");
party.setContractURI("https://www.dungeondelvers.xyz/metadata/party-collection.json");
```

### 2. **前端應用展示**
**目的**: 在您的DApp中展示豐富的收藏信息

## 🔧 前端整合方案

### 方案A: 靜態導入 (推薦)
```typescript
// src/data/collections.ts
import heroCollection from '../../public/metadata/hero-collection.json';
import relicCollection from '../../public/metadata/relic-collection.json';
import partyCollection from '../../public/metadata/party-collection.json';
import profileCollection from '../../public/metadata/player-profile-collection.json';
import vipCollection from '../../public/metadata/vip-staking-collection.json';

export interface CollectionMetadata {
  name: string;
  description: string;
  image: string;
  external_link: string;
  seller_fee_basis_points?: number;
  fee_recipient?: string;
}

export const collections: Record<string, CollectionMetadata> = {
  hero: heroCollection,
  relic: relicCollection,
  party: partyCollection,
  profile: profileCollection,
  vip: vipCollection,
};

export const getCollectionInfo = (type: string): CollectionMetadata | null => {
  return collections[type] || null;
};
```

### 方案B: 動態加載
```typescript
// src/hooks/useCollectionMetadata.ts
import { useState, useEffect } from 'react';
import { CollectionMetadata } from '../types/metadata';

export const useCollectionMetadata = (collectionType: string) => {
  const [metadata, setMetadata] = useState<CollectionMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/metadata/${collectionType}-collection.json`);
        if (!response.ok) throw new Error('Failed to fetch collection metadata');
        const data = await response.json();
        setMetadata(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [collectionType]);

  return { metadata, loading, error };
};
```

## 🎨 前端展示組件

### Collection Card 組件
```typescript
// src/components/CollectionCard.tsx
import React from 'react';
import { CollectionMetadata } from '../types/metadata';

interface CollectionCardProps {
  collection: CollectionMetadata;
  totalSupply?: number;
  floorPrice?: string;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  totalSupply,
  floorPrice,
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors">
      <div className="flex items-center space-x-4 mb-4">
        <img 
          src={collection.image} 
          alt={collection.name}
          className="w-16 h-16 rounded-lg"
        />
        <div>
          <h3 className="text-xl font-bold text-white">{collection.name}</h3>
          {collection.seller_fee_basis_points && (
            <p className="text-sm text-gray-400">
              版稅: {collection.seller_fee_basis_points / 100}%
            </p>
          )}
        </div>
      </div>
      
      <p className="text-gray-300 mb-4 text-sm leading-relaxed">
        {collection.description}
      </p>
      
      <div className="flex justify-between items-center text-sm">
        {totalSupply && (
          <span className="text-blue-400">總供應量: {totalSupply}</span>
        )}
        {floorPrice && (
          <span className="text-green-400">地板價: {floorPrice} BNB</span>
        )}
      </div>
      
      <a 
        href={collection.external_link}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 block w-full bg-blue-600 hover:bg-blue-700 
                   text-white py-2 px-4 rounded text-center transition-colors"
      >
        查看詳情
      </a>
    </div>
  );
};
```

### Collections 頁面
```typescript
// src/pages/Collections.tsx
import React from 'react';
import { CollectionCard } from '../components/CollectionCard';
import { collections } from '../data/collections';

export const Collections: React.FC = () => {
  const collectionTypes = [
    { key: 'hero', totalSupply: 1000, floorPrice: '0.1' },
    { key: 'relic', totalSupply: 800, floorPrice: '0.05' },
    { key: 'party', totalSupply: 300, floorPrice: '0.5' },
    { key: 'profile', totalSupply: 500, floorPrice: 'SBT' },
    { key: 'vip', totalSupply: 100, floorPrice: 'SBT' },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">
          Dungeon Delvers Collections
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          探索我們獨特的NFT收藏，每個都有其特殊的遊戲功能和價值
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collectionTypes.map(({ key, totalSupply, floorPrice }) => (
          <CollectionCard
            key={key}
            collection={collections[key]}
            totalSupply={totalSupply}
            floorPrice={floorPrice}
          />
        ))}
      </div>
    </div>
  );
};
```

## 🛠️ 實施檢查清單

### Phase 1: 合約更新
- [ ] 在所有NFT合約中添加 `contractURI()` 功能
- [ ] 部署合約更新
- [ ] 設置正確的 contractURI

### Phase 2: 前端整合
- [ ] 選擇整合方案（靜態 vs 動態）
- [ ] 創建 collection 數據類型定義
- [ ] 實現 CollectionCard 組件
- [ ] 創建 Collections 頁面
- [ ] 在導航中添加 Collections 入口

### Phase 3: 測試與優化
- [ ] 測試 OpenSea collection 顯示
- [ ] 驗證前端展示效果
- [ ] 優化圖片載入性能
- [ ] SEO 優化

## 📊 預期效果

### NFT市場端：
- ✅ Collection 有完整的品牌展示
- ✅ 正確的版稅設置
- ✅ 專業的描述和圖片

### 前端應用端：
- ✅ 統一的 Collection 展示
- ✅ 豐富的元數據信息
- ✅ 更好的用戶體驗

## 🎯 建議

**是的，建議您同時在前端和合約中使用這些JSON文件！**

1. **立即實施**: 添加 contractURI 功能到合約
2. **前端展示**: 創建漂亮的 Collections 頁面  
3. **長期維護**: 建立更新機制來保持元數據的時效性

這將大大提升您的NFT項目的專業度和用戶體驗！🚀