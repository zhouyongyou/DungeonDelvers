// 元數據伺服器健康檢查工具
import { logger } from './logger';

const METADATA_SERVER_URL = import.meta.env.VITE_METADATA_SERVER_URL || 'https://dungeon-delvers-metadata-server.onrender.com';

export interface MetadataServerStatus {
  isHealthy: boolean;
  statusCode?: number;
  error?: string;
  latency?: number;
  endpoints?: {
    [key: string]: boolean;
  };
}

export async function checkMetadataServerHealth(): Promise<MetadataServerStatus> {
  const startTime = Date.now();
  const status: MetadataServerStatus = {
    isHealthy: false,
    endpoints: {}
  };

  try {
    // 檢查根路徑
    const rootResponse = await fetch(METADATA_SERVER_URL, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    
    status.statusCode = rootResponse.status;
    status.latency = Date.now() - startTime;
    
    if (rootResponse.ok) {
      status.isHealthy = true;
      
      // 檢查常用端點
      const endpointsToCheck = [
        '/api/health',
        '/api/nft/hero/1',
        '/api/nft/relic/1',
        '/api/player/0x0000000000000000000000000000000000000000/assets'
      ];
      
      for (const endpoint of endpointsToCheck) {
        try {
          const response = await fetch(`${METADATA_SERVER_URL}${endpoint}`, {
            method: 'HEAD',
            signal: AbortSignal.timeout(3000)
          });
          status.endpoints![endpoint] = response.ok;
        } catch {
          status.endpoints![endpoint] = false;
        }
      }
    }
    
  } catch (error) {
    status.error = error instanceof Error ? error.message : '未知錯誤';
    logger.error('Metadata server health check failed:', error);
  }
  
  return status;
}

// 自動回退機制
export async function fetchWithFallback(path: string, options?: RequestInit): Promise<Response | null> {
  try {
    const response = await fetch(`${METADATA_SERVER_URL}${path}`, {
      ...options,
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      return response;
    }
    
    logger.warn(`Metadata server returned ${response.status} for ${path}`);
    return null;
    
  } catch (error) {
    logger.error(`Failed to fetch from metadata server: ${path}`, error);
    return null;
  }
}

// 快取元數據以減少請求
const metadataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分鐘

export async function fetchMetadataWithCache(
  type: 'hero' | 'relic' | 'party' | 'vip',
  tokenId: string | number
): Promise<any | null> {
  const cacheKey = `${type}/${tokenId}`;
  const cached = metadataCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const response = await fetchWithFallback(`/api/nft/${type}/${tokenId}`);
  if (!response) return null;
  
  try {
    const data = await response.json();
    metadataCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch {
    return null;
  }
}

// 批量獲取元數據
export async function fetchBatchMetadata(
  items: Array<{ type: 'hero' | 'relic' | 'party' | 'vip'; tokenId: string | number }>
): Promise<Map<string, any>> {
  const results = new Map<string, any>();
  
  // 並行請求，但限制並發數
  const BATCH_SIZE = 5;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async ({ type, tokenId }) => {
      const data = await fetchMetadataWithCache(type, tokenId);
      if (data) {
        results.set(`${type}/${tokenId}`, data);
      }
    });
    
    await Promise.all(promises);
  }
  
  return results;
}

// 導出單例健康檢查器
let healthCheckInterval: NodeJS.Timeout | null = null;
let lastHealthStatus: MetadataServerStatus | null = null;

export function startHealthMonitoring(intervalMs: number = 60000) {
  if (healthCheckInterval) return;
  
  // 立即執行一次
  checkMetadataServerHealth().then(status => {
    lastHealthStatus = status;
    if (!status.isHealthy) {
      logger.warn('Metadata server is unhealthy:', status);
    }
  });
  
  // 定期檢查
  healthCheckInterval = setInterval(async () => {
    const status = await checkMetadataServerHealth();
    lastHealthStatus = status;
    
    if (!status.isHealthy) {
      logger.warn('Metadata server health check failed:', status);
    }
  }, intervalMs);
}

export function stopHealthMonitoring() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

export function getLastHealthStatus(): MetadataServerStatus | null {
  return lastHealthStatus;
}