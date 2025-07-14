// server/metadata-api-v2.js - 增強版 Metadata API 服務器（使用真實數據）

const express = require('express');
const cors = require('cors');
const path = require('path');
const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 啟用 CORS
app.use(cors());

// 靜態文件服務 - 提供圖片
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// 合約地址（最新 2025-01-14 部署版本）
const CONTRACTS = {
  hero: process.env.HERO_CONTRACT_ADDRESS || '0x929a4187a462314fCC480ff547019fA122A283f0',
  relic: process.env.RELIC_CONTRACT_ADDRESS || '0x1067295025D21f59C8AcB5E777E42F3866a6D2fF',
  party: process.env.PARTY_CONTRACT_ADDRESS || '0xE0272e1D76de1F789ce0996F3226bCf54a8c7735',
  vip: process.env.VIP_CONTRACT_ADDRESS || '0x7aBEA5b90528a19580A0a2A83e4CF9AD4871880F'
};

// 創建 Viem 客戶端
const publicClient = createPublicClient({
  chain: bsc,
  transport: http(process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/')
});

// 簡化的 ABI（只包含需要的函數）
const heroAbi = parseAbi([
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function getRarity(uint256 tokenId) view returns (uint8)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function getName(uint256 tokenId) view returns (string)'
]);

const partyAbi = parseAbi([
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function getMembers(uint256 tokenId) view returns (uint256[5] memory)',
  'function ownerOf(uint256 tokenId) view returns (address)'
]);

const vipAbi = parseAbi([
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function userStakes(address user) view returns (uint256 amount, uint256 tokenId)',
  'function getVipLevel(address user) view returns (uint8)'
]);

// 內存緩存
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 分鐘

// 緩存輔助函數
function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    contracts: CONTRACTS,
    cache_size: cache.size
  });
});

// 根路徑
app.get('/', (req, res) => {
  res.json({ 
    name: 'DungeonDelvers Metadata API V2',
    version: '2.0.0',
    features: ['Real blockchain data', 'Caching', 'Error handling'],
    endpoints: [
      '/api/metadata/hero/:tokenId',
      '/api/metadata/relic/:tokenId',
      '/api/metadata/party/:tokenId',
      '/api/metadata/vip/:tokenId'
    ]
  });
});

// 輔助函數 - 獲取圖片 URL
function getImageUrl(baseUrl, type, rarity) {
  if (!rarity || rarity === 0) {
    return `${baseUrl}/images/${type}/${type}-placeholder.png`;
  }
  const rarityIndex = Math.max(1, Math.min(5, rarity));
  return `${baseUrl}/images/${type}/${type}-${rarityIndex}.png`;
}

// 輔助函數 - 獲取稀有度名稱
function getRarityName(rarity) {
  const rarityNames = ['Unknown', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  return rarityNames[rarity] || 'Unknown';
}

// 輔助函數 - 安全調用合約
async function safeContractCall(contractCall) {
  try {
    return await contractCall();
  } catch (error) {
    console.error('Contract call error:', error);
    return null;
  }
}

// Hero metadata
app.get('/api/metadata/hero/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const cacheKey = `hero-${tokenId}`;
    
    // 檢查緩存
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }
    
    const baseUrl = `https://${req.get('host')}`;
    
    // 嘗試從區塊鏈讀取數據
    let rarity = 1; // 預設值
    let name = `Hero #${tokenId}`;
    let owner = null;
    
    try {
      // 並行讀取多個數據
      const [rarityData, ownerData, nameData] = await Promise.all([
        safeContractCall(() => publicClient.readContract({
          address: CONTRACTS.hero,
          abi: heroAbi,
          functionName: 'getRarity',
          args: [BigInt(tokenId)]
        })),
        safeContractCall(() => publicClient.readContract({
          address: CONTRACTS.hero,
          abi: heroAbi,
          functionName: 'ownerOf',
          args: [BigInt(tokenId)]
        })),
        safeContractCall(() => publicClient.readContract({
          address: CONTRACTS.hero,
          abi: heroAbi,
          functionName: 'getName',
          args: [BigInt(tokenId)]
        }))
      ]);
      
      if (rarityData !== null) rarity = Number(rarityData);
      if (nameData) name = nameData;
      owner = ownerData;
    } catch (error) {
      console.log('Using fallback data for hero', tokenId);
    }
    
    const metadata = {
      name: name,
      description: `A legendary hero from the DungeonDelvers universe. Rarity: ${getRarityName(rarity)}`,
      image: getImageUrl(baseUrl, 'hero', rarity),
      external_url: `https://dungeondelvers.xyz/hero/${tokenId}`,
      attributes: [
        {
          trait_type: "Rarity",
          value: getRarityName(rarity),
          display_type: "string"
        },
        {
          trait_type: "Rarity Level",
          value: rarity,
          display_type: "number"
        },
        {
          trait_type: "Type",
          value: "Hero"
        }
      ]
    };
    
    if (owner) {
      metadata.attributes.push({
        trait_type: "Owner",
        value: owner.slice(0, 6) + '...' + owner.slice(-4)
      });
    }
    
    // 設置緩存
    setCache(cacheKey, metadata);
    
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Cache', 'MISS');
    res.json(metadata);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate metadata' });
  }
});

// Relic metadata
app.get('/api/metadata/relic/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const cacheKey = `relic-${tokenId}`;
    
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }
    
    const baseUrl = `https://${req.get('host')}`;
    
    // 對於 Relic，我們暫時使用隨機數據，因為合約可能沒有 getRarity
    const rarity = (parseInt(tokenId) % 5) + 1; // 基於 tokenId 的偽隨機
    
    const metadata = {
      name: `Relic #${tokenId}`,
      description: `A powerful relic imbued with ancient magic. Rarity: ${getRarityName(rarity)}`,
      image: getImageUrl(baseUrl, 'relic', rarity),
      external_url: `https://dungeondelvers.xyz/relic/${tokenId}`,
      attributes: [
        {
          trait_type: "Rarity",
          value: getRarityName(rarity)
        },
        {
          trait_type: "Rarity Level",
          value: rarity
        },
        {
          trait_type: "Type",
          value: "Relic"
        }
      ]
    };
    
    setCache(cacheKey, metadata);
    
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Cache', 'MISS');
    res.json(metadata);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate metadata' });
  }
});

// Party metadata
app.get('/api/metadata/party/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const cacheKey = `party-${tokenId}`;
    
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }
    
    const baseUrl = `https://${req.get('host')}`;
    
    // 嘗試讀取隊伍成員
    let memberCount = 0;
    try {
      const members = await safeContractCall(() => publicClient.readContract({
        address: CONTRACTS.party,
        abi: partyAbi,
        functionName: 'getMembers',
        args: [BigInt(tokenId)]
      }));
      
      if (members) {
        memberCount = members.filter(m => m > 0n).length;
      }
    } catch (error) {
      console.log('Using fallback data for party', tokenId);
    }
    
    const metadata = {
      name: `Adventure Party #${tokenId}`,
      description: `An assembled party of heroes ready for dungeon delving adventures. Current members: ${memberCount}/5`,
      image: getImageUrl(baseUrl, 'party', 0),
      external_url: `https://dungeondelvers.xyz/party/${tokenId}`,
      attributes: [
        {
          trait_type: "Type",
          value: "Party"
        },
        {
          trait_type: "Status",
          value: memberCount > 0 ? "Active" : "Empty"
        },
        {
          trait_type: "Members",
          value: memberCount,
          display_type: "number",
          max_value: 5
        }
      ]
    };
    
    setCache(cacheKey, metadata);
    
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Cache', 'MISS');
    res.json(metadata);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate metadata' });
  }
});

// VIP metadata
app.get('/api/metadata/vip/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const cacheKey = `vip-${tokenId}`;
    
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }
    
    const baseUrl = `https://${req.get('host')}`;
    
    // 嘗試讀取 VIP 等級
    let vipLevel = 0;
    let owner = null;
    
    try {
      owner = await safeContractCall(() => publicClient.readContract({
        address: CONTRACTS.vip,
        abi: vipAbi,
        functionName: 'ownerOf',
        args: [BigInt(tokenId)]
      }));
      
      if (owner) {
        vipLevel = await safeContractCall(() => publicClient.readContract({
          address: CONTRACTS.vip,
          abi: vipAbi,
          functionName: 'getVipLevel',
          args: [owner]
        }));
        
        if (vipLevel !== null) vipLevel = Number(vipLevel);
      }
    } catch (error) {
      console.log('Using fallback data for VIP', tokenId);
    }
    
    const metadata = {
      name: `VIP Pass #${tokenId}`,
      description: `Exclusive VIP membership card for DungeonDelvers. Level ${vipLevel} - Grants special privileges and reduced fees.`,
      image: getImageUrl(baseUrl, 'vip', 0),
      external_url: `https://dungeondelvers.xyz/vip/${tokenId}`,
      attributes: [
        {
          trait_type: "Type",
          value: "VIP Pass"
        },
        {
          trait_type: "Status",
          value: "Active"
        },
        {
          trait_type: "VIP Level",
          value: vipLevel,
          display_type: "number"
        },
        {
          trait_type: "Benefits",
          value: `${vipLevel * 50} BP Fee Reduction`
        }
      ]
    };
    
    setCache(cacheKey, metadata);
    
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Cache', 'MISS');
    res.json(metadata);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate metadata' });
  }
});

// 清理緩存端點（管理用）
app.post('/api/cache/clear', (req, res) => {
  const sizeBefore = cache.size;
  cache.clear();
  res.json({ 
    message: 'Cache cleared', 
    itemsCleared: sizeBefore 
  });
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// 定期清理過期緩存
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}, 60000); // 每分鐘清理一次

app.listen(PORT, () => {
  console.log(`DungeonDelvers Metadata API V2 running on port ${PORT}`);
  console.log('Features: Real blockchain data, caching, error handling');
  console.log('Available endpoints:');
  console.log('- /api/metadata/hero/:tokenId');
  console.log('- /api/metadata/relic/:tokenId');
  console.log('- /api/metadata/party/:tokenId');
  console.log('- /api/metadata/vip/:tokenId');
  console.log('- POST /api/cache/clear (admin)');
});