import { VercelRequest, VercelResponse } from '@vercel/node';

// BSC Mainnet Chain ID
const BSC_CHAIN_ID = '0x38'; // 56 in hex

// 獲取 Alchemy API Keys
function getAlchemyKeys(): string[] {
  const keys: string[] = [];
  
  // 單個 key
  if (process.env.ALCHEMY_KEY) {
    keys.push(process.env.ALCHEMY_KEY);
  }
  
  // 多個 keys
  for (let i = 1; i <= 5; i++) {
    const key = process.env[`ALCHEMY_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  
  return keys;
}

// 簡單的輪換機制
let currentKeyIndex = 0;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 設置 CORS 頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 處理 OPTIONS 請求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const keys = getAlchemyKeys();
    
    if (keys.length === 0) {
      console.error('No Alchemy keys configured');
      return res.status(500).json({ 
        jsonrpc: '2.0',
        error: { code: -32603, message: 'No RPC keys configured' },
        id: req.body?.id || null
      });
    }

    // 選擇一個 key（輪換）
    const key = keys[currentKeyIndex % keys.length];
    currentKeyIndex++;

    // 構建 Alchemy URL
    const alchemyUrl = `https://bnb-mainnet.g.alchemy.com/v2/${key}`;

    // 轉發請求到 Alchemy
    const response = await fetch(alchemyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    // 獲取響應
    const data = await response.json();

    // 返回響應
    return res.status(200).json(data);
  } catch (error) {
    console.error('RPC proxy error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      error: { 
        code: -32603, 
        message: 'Internal RPC proxy error',
        data: error.message 
      },
      id: req.body?.id || null
    });
  }
}