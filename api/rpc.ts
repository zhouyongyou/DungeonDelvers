import { VercelRequest, VercelResponse } from '@vercel/node';

// BSC Mainnet Chain ID - kept for reference
// const BSC_CHAIN_ID = '0x38'; // 56 in hex

// 獲取需要代理保護的 Alchemy API Keys
function getProtectedAlchemyKeys(): string[] {
  const keys: string[] = [];
  
  // 注意：不包括 VITE_ALCHEMY_KEY_PUBLIC（那個是公開的）
  
  // 收集需要保護的 keys (不包括公開的 key)
  for (let i = 1; i <= 5; i++) {
    const key = process.env[`ALCHEMY_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  
  // 向後兼容：如果有舊的單個 key 配置
  if (process.env.ALCHEMY_KEY) {
    keys.push(process.env.ALCHEMY_KEY);
  }
  
  // 去重
  return [...new Set(keys)];
}

// 簡單的輪換機制
let currentKeyIndex = 0;

// 請求統計
let requestCount = 0;
let errorCount = 0;
let lastReset = Date.now();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 重置統計（每小時）
  if (Date.now() - lastReset > 3600000) {
    requestCount = 0;
    errorCount = 0;
    lastReset = Date.now();
  }
  
  // 設置 CORS 頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, cache-control');

  // 處理 OPTIONS 請求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const keys = getProtectedAlchemyKeys();
    
    if (keys.length === 0) {
      console.error('No protected Alchemy keys configured for proxy');
      errorCount++;
      return res.status(500).json({ 
        jsonrpc: '2.0',
        error: { 
          code: -32603, 
          message: 'No protected RPC keys configured',
          data: 'Please configure ALCHEMY_API_KEY_1 through ALCHEMY_API_KEY_5'
        },
        id: req.body?.id || null
      });
    }
    
    requestCount++;

    // 記錄請求類型（用於監控）
    const method = req.body?.method || 'unknown';
    console.log(`RPC Proxy: ${method} | Key ${currentKeyIndex % keys.length + 1}/${keys.length} | Total: ${requestCount} | Errors: ${errorCount}`);
    
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
  } catch (error: any) {
    errorCount++;
    console.error('RPC proxy error:', {
      message: error.message,
      method: req.body?.method,
      keyIndex: (currentKeyIndex - 1) % keys.length,
      totalErrors: errorCount
    });
    
    return res.status(500).json({
      jsonrpc: '2.0',
      error: { 
        code: -32603, 
        message: 'Internal RPC proxy error',
        data: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      id: req.body?.id || null
    });
  }
}