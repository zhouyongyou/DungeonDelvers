// server/metadata-api.js - Metadata API 服務器 (for Render.com)

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// 啟用 CORS
app.use(cors());

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Metadata 路由
app.get('/api/metadata/:contractAddress/:tokenId', async (req, res) => {
  try {
    const { contractAddress, tokenId } = req.params;
    const { market } = req.query; // ?market=okx
    
    // 這裡調用你的 metadata 生成邏輯
    const { generateOptimizedMetadata } = require('../dist/api/metadata-okx-optimized');
    
    const metadata = await generateOptimizedMetadata(contractAddress, tokenId, {
      marketOptimized: market || 'general'
    });
    
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5分鐘緩存
    res.json(metadata);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to generate metadata' });
  }
});

// SVG 路由
app.get('/api/metadata/:contractAddress/:tokenId/svg', async (req, res) => {
  try {
    const { contractAddress, tokenId } = req.params;
    
    // 生成 SVG
    const svg = await generateSvgForNft(contractAddress, tokenId);
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 1小時緩存
    res.send(svg);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('<svg><text>Error</text></svg>');
  }
});

app.listen(PORT, () => {
  console.log(`Metadata API running on port ${PORT}`);
});