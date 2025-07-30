import { VercelRequest, VercelResponse } from '@vercel/node';

// BSC Mainnet Chain ID - kept for reference
// const BSC_CHAIN_ID = '0x38'; // 56 in hex

// 獲取需要代理保護的 Alchemy API Keys (按優先級排序)
function getProtectedAlchemyKeys(): string[] {
  const keys: string[] = [];
  
  // 第一優先：主要私人節點
  for (let i = 1; i <= 5; i++) {
    const key = process.env[`ALCHEMY_API_KEY_${i}`];
    if (key) keys.push(key);
  }
  
  // 向後兼容：如果有舊的單個 key 配置
  if (process.env.ALCHEMY_KEY) {
    keys.push(process.env.ALCHEMY_KEY);
  }
  
  // 第二備援：指定的備用私人節點
  const backupKey = '3lmTWjUVbFylAurhdU-rSUefTC-P4tKf';
  if (!keys.includes(backupKey)) {
    keys.push(backupKey);
  }
  
  // 去重並保持順序
  return Array.from(new Set(keys));
}

// 公共 BSC RPC 備援節點（最後選擇）
const PUBLIC_FALLBACK_RPCS = [
  'https://bsc-dataseed1.binance.org/',
  'https://bsc-dataseed2.binance.org/',
  'https://bsc-dataseed3.binance.org/',
  'https://bsc-dataseed4.binance.org/',
  'https://bsc.publicnode.com',
];

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

  // 完整備援機制：私人節點 -> 備用私人節點 -> 公共節點
  const method = req.body?.method || 'unknown';
  let lastError: any;
  
  requestCount++;
  console.log(`RPC Proxy: ${method} | Total: ${requestCount} | Errors: ${errorCount}`);

  // 第一階段：嘗試所有 Alchemy 私人節點
  for (let i = 0; i < keys.length; i++) {
    const keyIndex = (currentKeyIndex + i) % keys.length;
    const key = keys[keyIndex];
    
    try {
      console.log(`嘗試 Alchemy Key ${keyIndex + 1}/${keys.length} (${key.substring(0, 8)}...)`);
      
      const alchemyUrl = `https://bnb-mainnet.g.alchemy.com/v2/${key}`;
      const response = await fetch(alchemyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'RPC error');
      }

      // 成功！更新輪換索引
      currentKeyIndex = (keyIndex + 1) % keys.length;
      console.log(`✅ Alchemy Key ${keyIndex + 1} 成功`);
      return res.status(200).json(data);
      
    } catch (error: any) {
      lastError = error;
      console.warn(`❌ Alchemy Key ${keyIndex + 1} 失敗: ${error.message}`);
      
      // 如果不是最後一個 key，繼續嘗試下一個
      if (i < keys.length - 1) {
        continue;
      }
    }
  }

  // 第二階段：如果所有 Alchemy 節點都失敗，嘗試公共節點
  console.warn('🚨 所有 Alchemy 節點失敗，嘗試公共備援節點');
  
  for (let i = 0; i < PUBLIC_FALLBACK_RPCS.length; i++) {
    const publicRpc = PUBLIC_FALLBACK_RPCS[i];
    
    try {
      console.log(`嘗試公共節點 ${i + 1}/${PUBLIC_FALLBACK_RPCS.length}: ${publicRpc}`);
      
      const response = await fetch(publicRpc, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'RPC error');
      }

      console.log(`✅ 公共節點 ${i + 1} 成功`);
      return res.status(200).json(data);
      
    } catch (error: any) {
      lastError = error;
      console.warn(`❌ 公共節點 ${i + 1} 失敗: ${error.message}`);
      continue;
    }
  }

  // 所有節點都失敗
  errorCount++;
  console.error('💥 所有 RPC 節點都失敗:', {
    message: lastError?.message,
    method,
    totalErrors: errorCount,
    alchemyKeysCount: keys.length,
    publicRpcsCount: PUBLIC_FALLBACK_RPCS.length
  });
  
  return res.status(500).json({
    jsonrpc: '2.0',
    error: { 
      code: -32603, 
      message: '所有 RPC 節點都無法連接',
      data: process.env.NODE_ENV === 'development' ? lastError?.message : undefined
    },
    id: req.body?.id || null
  });
}