import { logger } from './logger';

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

export class RequestDeduper {
  private pendingRequests: Map<string, PendingRequest<any>> = new Map();
  private requestTTL: number;

  constructor(ttl: number = 5000) {
    this.requestTTL = ttl;
    
    // TEMP_DISABLED: 暫時禁用定期清理以避免 RPC 過載
    // setInterval(() => this.cleanup(), 60000); // 每分鐘清理一次
  }

  async execute<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: { ttl?: number; force?: boolean } = {}
  ): Promise<T> {
    const { ttl = this.requestTTL, force = false } = options;

    // 如果強制刷新，移除現有的請求
    if (force) {
      this.pendingRequests.delete(key);
    }

    // 檢查是否有進行中的請求
    const pending = this.pendingRequests.get(key);
    if (pending && Date.now() - pending.timestamp < ttl) {
      logger.debug(`Deduping request for key: ${key}`);
      return pending.promise;
    }

    // 創建新請求
    const promise = requestFn()
      .then(result => {
        // 成功後保留結果一段時間
        this.pendingRequests.set(key, {
          promise: Promise.resolve(result),
          timestamp: Date.now(),
        });
        return result;
      })
      .catch(error => {
        // 錯誤時立即移除
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise;
  }

  clear(keyPattern?: string) {
    if (!keyPattern) {
      this.pendingRequests.clear();
      return;
    }

    // 清除匹配模式的請求
    for (const [key] of this.pendingRequests) {
      if (key.includes(keyPattern)) {
        this.pendingRequests.delete(key);
      }
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests) {
      if (now - request.timestamp > this.requestTTL * 2) {
        this.pendingRequests.delete(key);
      }
    }
  }

  getStats() {
    return {
      pendingCount: this.pendingRequests.size,
      keys: Array.from(this.pendingRequests.keys()),
    };
  }
}

// 創建全局實例
export const globalRequestDeduper = new RequestDeduper();

// GraphQL 專用去重器
export const graphqlDeduper = new RequestDeduper(10000); // 10 秒 TTL

// NFT Metadata 專用去重器
export const nftMetadataDeduper = new RequestDeduper(30000); // 30 秒 TTL

// 便利函數：去重 GraphQL 查詢
export async function dedupeGraphQLQuery<T>(
  query: string,
  variables: Record<string, any>,
  queryFn: () => Promise<T>
): Promise<T> {
  const key = `${query}-${JSON.stringify(variables)}`;
  return graphqlDeduper.execute(key, queryFn);
}

// 便利函數：去重 NFT Metadata 請求
export async function dedupeNFTMetadata<T>(
  contractAddress: string,
  tokenId: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const key = `${contractAddress}-${tokenId}`;
  return nftMetadataDeduper.execute(key, fetchFn);
}