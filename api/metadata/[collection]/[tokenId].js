// api/metadata/[collection]/[tokenId].js
// 🔗 動態 NFT 元數據 API

import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';

// 合約地址配置
const CONTRACTS = {
  hero: '0x...', // 你的 Hero 合約地址
  relic: '0x...', // 你的 Relic 合約地址
  party: '0x...', // 你的 Party 合約地址
  vip: '0x...', // 你的 VIP 合約地址
};

// Hero 合約 ABI（簡化版）
const HERO_ABI = [
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getHeroProperties',
    outputs: [
      { name: 'rarity', type: 'uint8' },
      { name: 'power', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function'
  }
];

// Relic 合約 ABI（簡化版）
const RELIC_ABI = [
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getRelicProperties',
    outputs: [
      { name: 'rarity', type: 'uint8' },
      { name: 'capacity', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
];

// 創建區塊鏈客戶端
const client = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed1.binance.org/')
});

// 稀有度名稱映射
const RARITY_NAMES = {
  1: 'Common',
  2: 'Uncommon', 
  3: 'Rare',
  4: 'Epic',
  5: 'Legendary'
};

// 稀有度顏色映射
const RARITY_COLORS = {
  1: '#9CA3AF', // 灰色
  2: '#10B981', // 綠色
  3: '#3B82F6', // 藍色
  4: '#8B5CF6', // 紫色
  5: '#F59E0B'  // 金色
};

// 生成 Hero 元數據
async function generateHeroMetadata(tokenId) {
  try {
    // 從鏈上讀取 Hero 屬性
    const [rarity, power] = await client.readContract({
      address: CONTRACTS.hero,
      abi: HERO_ABI,
      functionName: 'getHeroProperties',
      args: [BigInt(tokenId)]
    });

    // 獲取擁有者地址
    const owner = await client.readContract({
      address: CONTRACTS.hero,
      abi: HERO_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)]
    });

    const rarityName = RARITY_NAMES[rarity] || 'Unknown';
    const rarityColor = RARITY_COLORS[rarity] || '#9CA3AF';

    return {
      name: `${rarityName} Hero #${tokenId}`,
      description: `A ${rarityName.toLowerCase()} hero from the Dungeon Delvers collection. This brave adventurer has ${power} power and is ready for epic quests!`,
      image: `https://www.dungeondelvers.xyz/images/hero/hero-${rarity}.png`,
      external_url: `https://www.dungeondelvers.xyz/nft/hero/${tokenId}`,
      attributes: [
        {
          trait_type: 'Rarity',
          value: rarityName
        },
        {
          trait_type: 'Power',
          value: Number(power),
          max_value: 255,
          display_type: 'number'
        },
        {
          trait_type: 'Rarity Level',
          value: rarity,
          max_value: 5,
          display_type: 'number'
        },
        {
          trait_type: 'Owner',
          value: owner
        },
        {
          trait_type: 'Collection',
          value: 'Hero'
        }
      ],
      properties: {
        rarity: {
          name: rarityName,
          level: rarity,
          color: rarityColor
        },
        power: Number(power),
        owner: owner,
        tokenId: tokenId,
        contract: CONTRACTS.hero,
        lastUpdated: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error generating hero metadata:', error);
    throw error;
  }
}

// 生成 Relic 元數據
async function generateRelicMetadata(tokenId) {
  try {
    const [rarity, capacity] = await client.readContract({
      address: CONTRACTS.relic,
      abi: RELIC_ABI,
      functionName: 'getRelicProperties',
      args: [BigInt(tokenId)]
    });

    const owner = await client.readContract({
      address: CONTRACTS.relic,
      abi: RELIC_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)]
    });

    const rarityName = RARITY_NAMES[rarity] || 'Unknown';
    const rarityColor = RARITY_COLORS[rarity] || '#9CA3AF';

    return {
      name: `${rarityName} Relic #${tokenId}`,
      description: `A ${rarityName.toLowerCase()} relic from the Dungeon Delvers collection. This ancient artifact provides ${capacity} capacity for your adventures!`,
      image: `https://www.dungeondelvers.xyz/images/relic/relic-${rarity}.png`,
      external_url: `https://www.dungeondelvers.xyz/nft/relic/${tokenId}`,
      attributes: [
        {
          trait_type: 'Rarity',
          value: rarityName
        },
        {
          trait_type: 'Capacity',
          value: Number(capacity),
          max_value: 255,
          display_type: 'number'
        },
        {
          trait_type: 'Rarity Level',
          value: rarity,
          max_value: 5,
          display_type: 'number'
        },
        {
          trait_type: 'Owner',
          value: owner
        },
        {
          trait_type: 'Collection',
          value: 'Relic'
        }
      ],
      properties: {
        rarity: {
          name: rarityName,
          level: rarity,
          color: rarityColor
        },
        capacity: Number(capacity),
        owner: owner,
        tokenId: tokenId,
        contract: CONTRACTS.relic,
        lastUpdated: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error generating relic metadata:', error);
    throw error;
  }
}

// 生成 fallback 元數據
function generateFallbackMetadata(collection, tokenId) {
  return {
    name: `${collection.charAt(0).toUpperCase() + collection.slice(1)} #${tokenId}`,
    description: `A ${collection} from the Dungeon Delvers collection. Metadata is being generated...`,
    image: `https://www.dungeondelvers.xyz/images/${collection}/${collection}-1.png`,
    external_url: `https://www.dungeondelvers.xyz/nft/${collection}/${tokenId}`,
    attributes: [
      {
        trait_type: 'Status',
        value: 'Loading...'
      },
      {
        trait_type: 'Collection',
        value: collection.charAt(0).toUpperCase() + collection.slice(1)
      }
    ],
    properties: {
      tokenId: tokenId,
      collection: collection,
      status: 'loading',
      lastUpdated: new Date().toISOString()
    }
  };
}

// 主要 API 處理函數
export default async function handler(req, res) {
  const { collection, tokenId } = req.query;

  // 設置 CORS 頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5分鐘緩存

  // 處理 OPTIONS 請求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允許 GET 請求
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // 驗證參數
  if (!collection || !tokenId) {
    res.status(400).json({ error: 'Missing collection or tokenId' });
    return;
  }

  // 驗證 tokenId 是數字
  const tokenIdNum = parseInt(tokenId);
  if (isNaN(tokenIdNum) || tokenIdNum < 1) {
    res.status(400).json({ error: 'Invalid tokenId' });
    return;
  }

  // 驗證 collection 類型
  const supportedCollections = ['hero', 'relic', 'party', 'vip'];
  if (!supportedCollections.includes(collection.toLowerCase())) {
    res.status(400).json({ error: 'Unsupported collection' });
    return;
  }

  try {
    let metadata;

    // 根據 collection 類型生成元數據
    switch (collection.toLowerCase()) {
      case 'hero':
        metadata = await generateHeroMetadata(tokenIdNum);
        break;
      case 'relic':
        metadata = await generateRelicMetadata(tokenIdNum);
        break;
      case 'party':
        // TODO: 實現 Party 元數據生成
        metadata = generateFallbackMetadata('party', tokenIdNum);
        break;
      case 'vip':
        // TODO: 實現 VIP 元數據生成
        metadata = generateFallbackMetadata('vip', tokenIdNum);
        break;
      default:
        throw new Error('Unsupported collection type');
    }

    // 返回 JSON 元數據
    res.status(200).json(metadata);

  } catch (error) {
    console.error('Error generating metadata:', error);
    
    // 返回 fallback 元數據
    const fallbackMetadata = generateFallbackMetadata(collection, tokenIdNum);
    res.status(200).json(fallbackMetadata);
  }
} 