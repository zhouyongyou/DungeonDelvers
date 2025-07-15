import { VercelRequest, VercelResponse } from '@vercel/node';

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

// 改進的輪換機制 - 使用時間戳避免狀態問題
function getCurrentKeyIndex(keys: string[]): number {
  if (keys.length === 0) return 0;
  // 使用時間戳進行輪換，每10秒切換一次
  const rotationInterval = 10000; // 10秒
  return Math.floor(Date.now() / rotationInterval) % keys.length;
}

// 請求日誌記錄
function logRequest(method: string, keyIndex: number, duration: number, success: boolean) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] RPC ${method} - Key:${keyIndex} - ${duration}ms - ${success ? 'SUCCESS' : 'FAILED'}`);
}

// 錯誤響應格式化
function formatErrorResponse(code: number, message: string, data?: any, id?: any) {
  return {
    jsonrpc: '2.0',
    error: {
      code,
      message,
      ...(data && { data })
    },
    id: id || null
  };
}

// 健康檢查端點
function handleHealthCheck(res: VercelResponse) {
  const keys = getAlchemyKeys();
  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    keyCount: keys.length,
    service: 'rpc-proxy',
    version: '1.1.0'
  });
}

// 主處理函數
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  
  // 設置 CORS 頭
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, cache-control');
  
  // 健康檢查端點
  if (req.url?.endsWith('/health') || req.url?.endsWith('/status')) {
    return handleHealthCheck(res);
  }
  
  // 處理 OPTIONS 請求
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400'); // 24小時
    return res.status(200).end();
  }

  // 只允許 POST 請求
  if (req.method !== 'POST') {
    return res.status(405).json(
      formatErrorResponse(-32601, 'Method not allowed', { allowedMethods: ['POST', 'OPTIONS'] })
    );
  }

  try {
    // 驗證請求體
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json(
        formatErrorResponse(-32700, 'Parse error', { message: 'Invalid JSON request' })
      );
    }

    const keys = getAlchemyKeys();
    
    if (keys.length === 0) {
      console.error('No Alchemy keys configured');
      return res.status(500).json(
        formatErrorResponse(-32603, 'Internal error', { message: 'No RPC keys configured' }, req.body?.id)
      );
    }

    // 改進的金鑰選擇
    const keyIndex = getCurrentKeyIndex(keys);
    const key = keys[keyIndex];

    // 構建 Alchemy URL
    const alchemyUrl = `https://bnb-mainnet.g.alchemy.com/v2/${key}`;
    
    // 記錄請求信息
    const method = req.body.method || 'unknown';
    console.log(`[${new Date().toISOString()}] RPC Request: ${method} (Key: ${keyIndex + 1}/${keys.length})`);

    // 創建 AbortController 用於超時處理
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超時

    try {
      // 轉發請求到 Alchemy
      const response = await fetch(alchemyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(req.body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // 檢查響應狀態
      if (!response.ok) {
        throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
      }

      // 獲取響應
      const data = await response.json();
      const duration = Date.now() - startTime;

      // 記錄請求結果
      logRequest(method, keyIndex + 1, duration, !data.error);

      // 添加響應標頭
      res.setHeader('X-RPC-Key-Index', keyIndex + 1);
      res.setHeader('X-Response-Time', `${duration}ms`);
      res.setHeader('X-RPC-Provider', 'alchemy');

      // 返回響應
      return res.status(200).json(data);

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        const duration = Date.now() - startTime;
        logRequest(method, keyIndex + 1, duration, false);
        
        return res.status(408).json(
          formatErrorResponse(-32603, 'Request timeout', { 
            message: 'Request took too long to complete',
            timeout: '30s'
          }, req.body?.id)
        );
      }

      throw fetchError; // 重新拋出其他錯誤
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] RPC Error (${duration}ms):`, error);

    // 根據錯誤類型返回適當的響應
    if (error.message?.includes('Parse error')) {
      return res.status(400).json(
        formatErrorResponse(-32700, 'Parse error', { message: error.message }, req.body?.id)
      );
    }

    if (error.message?.includes('Invalid request')) {
      return res.status(400).json(
        formatErrorResponse(-32600, 'Invalid request', { message: error.message }, req.body?.id)
      );
    }

    // 一般內部錯誤
    return res.status(500).json(
      formatErrorResponse(-32603, 'Internal error', { 
        message: 'Internal RPC proxy error',
        duration: `${duration}ms`
      }, req.body?.id)
    );
  }
}