// 強化的 GraphQL 客戶端 - 處理 indexer 問題
import { THE_GRAPH_API_URL } from '../config/graphConfig';
import { logger } from './logger';

// Indexer 監控器
class IndexerMonitor {
  private failureCount = 0;
  private lastError: string | null = null;
  private readonly maxFailures = 10;

  recordError(error: string) {
    this.failureCount++;
    this.lastError = error;
    
    logger.warn(`📊 Indexer 錯誤計數: ${this.failureCount}`, { error });
    
    if (this.failureCount >= this.maxFailures) {
      this.notifyHighFailureRate();
    }
  }

  recordSuccess() {
    // 成功時逐漸減少錯誤計數
    this.failureCount = Math.max(0, this.failureCount - 1);
  }

  private notifyHighFailureRate() {
    logger.error(`🚨 Indexer 高頻錯誤: ${this.failureCount} 次`, {
      lastError: this.lastError,
      failureCount: this.failureCount
    });
    
    // 可以整合到監控系統或發送通知
    if (import.meta.env.DEV) {
      console.error(`🚨 建議檢查子圖服務狀態！錯誤數: ${this.failureCount}`);
    }
  }

  getStatus() {
    return {
      failureCount: this.failureCount,
      lastError: this.lastError,
      isHealthy: this.failureCount < 5
    };
  }
}

export const indexerMonitor = new IndexerMonitor();

// 簡單的內存緩存
class GraphCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly maxSize = 100; // 防止內存泄漏

  set(key: string, data: any, ttlSeconds: number = 180) {
    // 清理過期項目
    this.cleanup();
    
    // 如果緩存太大，移除最舊的項目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  getStale(key: string): any | null {
    // 獲取過期數據（用於降級處理）
    const cached = this.cache.get(key);
    return cached ? cached.data : null;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  generateKey(query: string, variables: any): string {
    return `${query.replace(/\s+/g, ' ').trim()}-${JSON.stringify(variables)}`;
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
}

export const graphCache = new GraphCache();

// 檢查是否為 indexer 相關錯誤
function isIndexerError(error: any): boolean {
  if (!error || typeof error !== 'object') return false;
  
  const message = error.message || '';
  return message.includes('bad indexers') ||
         message.includes('Unavailable') ||
         message.includes('BadResponse') ||
         message.includes('Store error') ||
         message.includes('failed to get indexing progress');
}

// 強化的 GraphQL 查詢函數
export async function robustGraphQLQuery<T>(
  query: string,
  variables: any = {},
  options: {
    maxRetries?: number;
    retryDelay?: number;
    useCache?: boolean;
    cacheSeconds?: number;
  } = {}
): Promise<T | null> {
  
  const {
    maxRetries = 3,
    retryDelay = 1000,
    useCache = true,
    cacheSeconds = 180
  } = options;

  const cacheKey = graphCache.generateKey(query, variables);

  // 檢查緩存
  if (useCache) {
    const cached = graphCache.get(cacheKey);
    if (cached) {
      logger.info('🎯 使用緩存數據', { cacheKey: cacheKey.substring(0, 50) });
      return cached;
    }
  }

  // 重試邏輯
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`🔍 GraphQL 查詢 (嘗試 ${attempt}/${maxRetries})`, {
        queryStart: query.substring(0, 50),
        variables
      });

      const response = await fetch(THE_GRAPH_API_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // 檢查 GraphQL 錯誤
      if (result.errors && result.errors.length > 0) {
        const indexerErrors = result.errors.filter(isIndexerError);
        
        if (indexerErrors.length > 0) {
          // 記錄 indexer 錯誤
          indexerErrors.forEach(error => indexerMonitor.recordError(error.message));
          
          // 如果還有重試次數，繼續重試
          if (attempt < maxRetries) {
            logger.warn(`⚠️ Indexer 錯誤，重試中...`, { 
              attempt, 
              maxRetries,
              errors: indexerErrors.map(e => e.message)
            });
            
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
            continue;
          }
          
          // 最後一次嘗試失敗，嘗試使用過期緩存
          if (useCache) {
            const staleCache = graphCache.getStale(cacheKey);
            if (staleCache) {
              logger.warn('🔄 使用過期緩存數據作為降級處理');
              return staleCache;
            }
          }
        }
        
        // 非 indexer 錯誤，直接拋出
        throw new Error(`GraphQL 錯誤: ${result.errors.map((e: any) => e.message).join(', ')}`);
      }

      // 查詢成功
      indexerMonitor.recordSuccess();
      
      // 緩存結果
      if (useCache && result.data) {
        graphCache.set(cacheKey, result.data, cacheSeconds);
      }

      logger.info('✅ GraphQL 查詢成功');
      return result.data;

    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error(`❌ GraphQL 查詢失敗 (嘗試 ${attempt}/${maxRetries})`, {
        error: errorMessage,
        isLastAttempt
      });

      if (isIndexerError(error)) {
        indexerMonitor.recordError(errorMessage);
      }

      if (isLastAttempt) {
        // 最後嘗試失敗，檢查是否有過期緩存可用
        if (useCache) {
          const staleCache = graphCache.getStale(cacheKey);
          if (staleCache) {
            logger.warn('🔄 最終降級：使用過期緩存數據');
            return staleCache;
          }
        }
        
        throw error;
      }

      // 等待後重試
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
    }
  }

  return null;
}

// 專用於隊伍查詢的函數（針對你的問題）
export async function queryPartyDetails(partyId: string) {
  const query = `
    query GetPartyDetails($partyId: ID!) {
      party(id: $partyId) {
        id
        tokenId
        name
        totalPower
        heroIds
        relicIds
        heroes {
          id
          tokenId
          rarity
          power
        }
        relics {
          id
          tokenId
          rarity
          capacity
        }
        owner {
          id
        }
        expeditions(first: 10, orderBy: timestamp, orderDirection: desc) {
          id
          dungeonName
          success
          reward
          timestamp
        }
      }
    }
  `;

  return await robustGraphQLQuery(query, { partyId }, {
    maxRetries: 5, // 隊伍查詢更重要，多重試幾次
    cacheSeconds: 120 // 緩存 2 分鐘
  });
}

// 獲取系統狀態的函數
export function getGraphSystemStatus() {
  return {
    indexer: indexerMonitor.getStatus(),
    cache: graphCache.getStats()
  };
}

// 開發環境工具
interface WindowWithDevTools extends Window {
  graphSystemStatus?: () => any;
  clearGraphCache?: () => void;
  robustGraphQLQuery?: typeof robustGraphQLQuery;
}

if (import.meta.env.DEV) {
  const windowWithDevTools = window as WindowWithDevTools;
  windowWithDevTools.graphSystemStatus = getGraphSystemStatus;
  windowWithDevTools.clearGraphCache = () => graphCache.clear();
  windowWithDevTools.robustGraphQLQuery = robustGraphQLQuery;
  
  console.log('🔧 GraphQL 系統工具已註冊:');
  console.log('  - window.graphSystemStatus() - 查看系統狀態');
  console.log('  - window.clearGraphCache() - 清空緩存');
  console.log('  - window.robustGraphQLQuery() - 手動執行查詢');
}