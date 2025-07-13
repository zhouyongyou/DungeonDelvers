// server/metadata-api.js - Metadata API 服務器 (for Render.com)

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 啟用 CORS
app.use(cors());

// 靜態文件服務 - 提供圖片
app.use('/images', express.static(path.join(__dirname, '../public/images')));

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 根路徑
app.get('/', (req, res) => {
  res.json({ 
    name: 'DungeonDelvers Metadata API',
    version: '1.0.0',
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

// Hero metadata
app.get('/api/metadata/hero/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params;
    const baseUrl = `https://${req.get('host')}`;
    
    // 這裡應該從區塊鏈或數據庫讀取實際數據
    // 現在使用模擬數據
    const rarity = Math.floor(Math.random() * 6); // 0-5
    
    const metadata = {
      name: `Hero #${tokenId}`,
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
    
    res.setHeader('Cache-Control', 'public, max-age=300');
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
    const baseUrl = `https://${req.get('host')}`;
    
    const rarity = Math.floor(Math.random() * 6);
    
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
    
    res.setHeader('Cache-Control', 'public, max-age=300');
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
    const baseUrl = `https://${req.get('host')}`;
    
    const metadata = {
      name: `Adventure Party #${tokenId}`,
      description: "An assembled party of heroes ready for dungeon delving adventures.",
      image: getImageUrl(baseUrl, 'party', 0), // Party 通常沒有稀有度
      external_url: `https://dungeondelvers.xyz/party/${tokenId}`,
      attributes: [
        {
          trait_type: "Type",
          value: "Party"
        },
        {
          trait_type: "Status",
          value: "Active"
        }
      ]
    };
    
    res.setHeader('Cache-Control', 'public, max-age=300');
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
    const baseUrl = `https://${req.get('host')}`;
    
    const metadata = {
      name: `VIP Pass #${tokenId}`,
      description: "Exclusive VIP membership card for DungeonDelvers. Grants special privileges and reduced fees.",
      image: getImageUrl(baseUrl, 'vip', 0), // VIP 使用統一圖片
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
          trait_type: "Benefits",
          value: "Fee Reduction"
        }
      ]
    };
    
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(metadata);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate metadata' });
  }
});

// 404 處理
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`DungeonDelvers Metadata API running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log('- /api/metadata/hero/:tokenId');
  console.log('- /api/metadata/relic/:tokenId');
  console.log('- /api/metadata/party/:tokenId');
  console.log('- /api/metadata/vip/:tokenId');
});