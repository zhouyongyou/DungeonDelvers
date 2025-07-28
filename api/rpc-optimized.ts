import { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'crypto';

// ========== 配置 ==========
const CONFIG = {
  // 緩存配置
  CACHE_TTL: {
    'eth_blockNumber': 3000,        // 3秒
    'eth_getBalance': 30000,        // 30秒
    'eth_getCode': 300000,          // 5分鐘
    'eth_call': 10000,              // 10秒（默認）
    'eth_getTransactionReceipt': 86400000, // 24小時（已確認的交易）
  },
  
  // 速率限制
  RATE_LIMIT: {
    windowMs: 60000,    // 1分鐘
    maxRequests: 100,   // 每個 IP 每分鐘最多 100 個請求
  },
  
  // 重試配置
  RETRY: {
    maxAttempts: 3,
    backoffMs: [100, 500, 1000],
  },
  
  // 超時配置
  TIMEOUT_MS: 30000,
  
  // 批量請求
  BATCH_MAX_SIZE: 10,
};

// ========== 緩存管理 ==========
class MemoryCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private stats = { hits: 0, misses: 0 };
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return item.data;
  }
  
  set(key: string, data: any, ttlMs: number): void {
    // 限制緩存大小
    if (this.cache.size > 1000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs,
    });
  }
  
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%',
      size: this.cache.size,
    };
  }
  
  clear() {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }
}

// ========== 速率限制 ==========
class RateLimiter {
  private requests = new Map<string, number[]>();
  
  isAllowed(clientId: string): boolean {
    const now = Date.now();
    const windowStart = now - CONFIG.RATE_LIMIT.windowMs;
    
    // 獲取或創建請求記錄
    let timestamps = this.requests.get(clientId) || [];
    
    // 過濾出窗口內的請求
    timestamps = timestamps.filter(t => t > windowStart);
    
    // 檢查是否超過限制
    if (timestamps.length >= CONFIG.RATE_LIMIT.maxRequests) {
      return false;
    }
    
    // 記錄新請求
    timestamps.push(now);
    this.requests.set(clientId, timestamps);
    
    // 清理舊數據
    if (this.requests.size > 10000) {
      const entries = Array.from(this.requests.entries());
      this.requests.clear();
      entries.slice(-5000).forEach(([k, v]) => this.requests.set(k, v));
    }
    
    return true;
  }
  
  getStats() {
    return {
      activeClients: this.requests.size,
    };
  }
}

// ========== API Key 管理 ==========
class ApiKeyManager {
  private keys: string[] = [];
  private keyStats = new Map<string, { requests: number; errors: number; lastError?: Date }>();
  private currentIndex = 0;
  
  constructor() {
    this.loadKeys();
  }
  
  private loadKeys() {
    // 載入多個 API keys
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`ALCHEMY_API_KEY_${i}`];
      if (key) {
        this.keys.push(key);
        this.keyStats.set(key, { requests: 0, errors: 0 });
      }
    }
    
    // 向後兼容
    if (process.env.ALCHEMY_KEY) {
      this.keys.push(process.env.ALCHEMY_KEY);
      this.keyStats.set(process.env.ALCHEMY_KEY, { requests: 0, errors: 0 });
    }
    
    // 支援 PUBLIC key
    if (process.env.VITE_ALCHEMY_KEY_PUBLIC) {
      this.keys.push(process.env.VITE_ALCHEMY_KEY_PUBLIC);
      this.keyStats.set(process.env.VITE_ALCHEMY_KEY_PUBLIC, { requests: 0, errors: 0 });
    }
  }
  
  getNextKey(): string | null {
    if (this.keys.length === 0) return null;
    
    // 智能選擇：跳過最近有錯誤的 key
    const now = Date.now();
    let attempts = 0;
    
    while (attempts < this.keys.length) {
      const key = this.keys[this.currentIndex % this.keys.length];
      const stats = this.keyStats.get(key)!;
      
      // 如果這個 key 最近 1 分鐘內有錯誤，跳過
      if (stats.lastError && now - stats.lastError.getTime() < 60000) {
        this.currentIndex++;
        attempts++;
        continue;
      }
      
      this.currentIndex++;
      return key;
    }
    
    // 所有 key 都有問題，返回第一個
    return this.keys[0];
  }
  
  recordRequest(key: string, success: boolean) {
    const stats = this.keyStats.get(key);
    if (stats) {
      stats.requests++;
      if (!success) {
        stats.errors++;
        stats.lastError = new Date();
      }
    }
  }
  
  getStats() {
    const stats = Array.from(this.keyStats.entries()).map(([key, data], index) => ({
      index: index + 1,
      requests: data.requests,
      errors: data.errors,
      errorRate: data.requests > 0 ? (data.errors / data.requests * 100).toFixed(2) + '%' : '0%',
      lastError: data.lastError?.toISOString(),
    }));
    
    return {
      totalKeys: this.keys.length,
      keys: stats,
    };
  }
}

// ========== 全局實例 ==========
const cache = new MemoryCache();
const rateLimiter = new RateLimiter();
const keyManager = new ApiKeyManager();

// ========== 輔助函數 ==========
function getCacheKey(method: string, params: any): string {
  const hash = createHash('md5')
    .update(JSON.stringify({ method, params }))
    .digest('hex');
  return `${method}:${hash}`;
}

function getCacheTTL(method: string): number {
  return CONFIG.CACHE_TTL[method as keyof typeof CONFIG.CACHE_TTL] || CONFIG.CACHE_TTL.eth_call;
}

function getClientId(req: VercelRequest): string {
  return req.headers['x-forwarded-for'] as string || 
         req.headers['x-real-ip'] as string || 
         req.socket?.remoteAddress || 
         'unknown';
}

function shouldCache(method: string): boolean {
  // 不緩存的方法
  const noCacheMethods = [
    'eth_sendTransaction',
    'eth_sendRawTransaction',
    'eth_getTransactionCount',
    'eth_gasPrice',
    'eth_estimateGas',
  ];
  
  return !noCacheMethods.includes(method);
}

// ========== 請求處理 ==========
async function makeRpcRequest(key: string, body: any, attempt = 1): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);
  
  try {
    const response = await fetch(`https://bnb-mainnet.g.alchemy.com/v2/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    keyManager.recordRequest(key, !data.error);
    
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    keyManager.recordRequest(key, false);
    
    // 重試邏輯
    if (attempt < CONFIG.RETRY.maxAttempts) {
      const backoff = CONFIG.RETRY.backoffMs[attempt - 1] || 1000;
      await new Promise(resolve => setTimeout(resolve, backoff));
      
      // 使用不同的 key 重試
      const nextKey = keyManager.getNextKey();
      if (nextKey && nextKey !== key) {
        return makeRpcRequest(nextKey, body, attempt + 1);
      }
    }
    
    throw error;
  }
}

// ========== 批量請求處理 ==========
function isBatchRequest(body: any): boolean {
  return Array.isArray(body);
}

async function handleBatchRequest(requests: any[]): Promise<any[]> {
  // 分組處理，避免超過限制
  const chunks = [];
  for (let i = 0; i < requests.length; i += CONFIG.BATCH_MAX_SIZE) {
    chunks.push(requests.slice(i, i + CONFIG.BATCH_MAX_SIZE));
  }
  
  const results = await Promise.all(
    chunks.map(chunk => {
      const key = keyManager.getNextKey();
      if (!key) throw new Error('No API keys available');
      return makeRpcRequest(key, chunk);
    })
  );
  
  // 合併結果
  return results.flat();
}

// ========== 主處理函數 ==========
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');
  
  // 健康檢查 - 修正路由判斷
  if (req.method === 'GET') {
    // Vercel 中的路徑判斷
    const isHealthCheck = req.url === '/health' || 
                         req.url === '/api/rpc-optimized/health' ||
                         req.url?.endsWith('/health');
    
    if (isHealthCheck) {
      try {
        const stats = keyManager.getStats();
        return res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          stats: {
            cache: cache.getStats(),
            rateLimiter: rateLimiter.getStats(),
            keyManager: stats,
          },
          debug: {
            url: req.url,
            method: req.method,
            hasKeys: stats.totalKeys > 0,
          }
        });
      } catch (error: any) {
        return res.status(500).json({
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }
  
  // OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 只允許 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // 速率限制
  const clientId = getClientId(req);
  if (!rateLimiter.isAllowed(clientId)) {
    return res.status(429).json({
      jsonrpc: '2.0',
      error: {
        code: -32005,
        message: 'Rate limit exceeded',
        data: `Max ${CONFIG.RATE_LIMIT.maxRequests} requests per minute`,
      },
      id: req.body?.id || null,
    });
  }
  
  try {
    const body = req.body;
    
    // 批量請求
    if (isBatchRequest(body)) {
      const results = await handleBatchRequest(body);
      return res.status(200).json(results);
    }
    
    // 單個請求
    const { method, params, id } = body;
    
    // 檢查緩存
    if (shouldCache(method)) {
      const cacheKey = getCacheKey(method, params);
      const cached = cache.get(cacheKey);
      
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);
        return res.status(200).json(cached);
      }
    }
    
    // 獲取 API key
    const key = keyManager.getNextKey();
    if (!key) {
      console.error('No API keys found. Available env vars:', Object.keys(process.env).filter(k => k.includes('ALCHEMY')));
      return res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'No API keys configured. Please check environment variables.',
          data: {
            availableEnvKeys: Object.keys(process.env).filter(k => k.includes('ALCHEMY')).length,
            debug: process.env.NODE_ENV === 'development' ? Object.keys(process.env).filter(k => k.includes('ALCHEMY')) : undefined
          }
        },
        id,
      });
    }
    
    // 發送請求
    const result = await makeRpcRequest(key, body);
    
    // 緩存成功的響應
    if (shouldCache(method) && !result.error) {
      const cacheKey = getCacheKey(method, params);
      const ttl = getCacheTTL(method);
      cache.set(cacheKey, result, ttl);
    }
    
    // 返回結果
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Response-Time', `${Date.now() - startTime}ms`);
    return res.status(200).json(result);
    
  } catch (error: any) {
    console.error('RPC proxy error:', error);
    
    return res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal proxy error',
        data: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      id: req.body?.id || null,
    });
  }
}