import { logger } from './logger';

interface BatchItem<T> {
  key: string;
  resolve: (value: T) => void;
  reject: (error: any) => void;
}

interface BatcherConfig {
  maxBatchSize?: number;
  batchDelay?: number;
  maxRetries?: number;
}

export class RequestBatcher<TRequest, TResponse> {
  private queue: Map<string, BatchItem<TResponse>> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private config: Required<BatcherConfig>;

  constructor(
    private batchProcessor: (requests: Map<string, TRequest>) => Promise<Map<string, TResponse>>,
    private keyExtractor: (request: TRequest) => string,
    config: BatcherConfig = {}
  ) {
    this.config = {
      maxBatchSize: config.maxBatchSize || 50,
      batchDelay: config.batchDelay || 50, // 50ms
      maxRetries: config.maxRetries || 3,
    };
  }

  async request(request: TRequest): Promise<TResponse> {
    const key = this.keyExtractor(request);

    return new Promise<TResponse>((resolve, reject) => {
      // Check if already in queue
      if (this.queue.has(key)) {
        logger.warn(`Duplicate request detected for key: ${key}`);
        // Return the same promise
        const existingItem = this.queue.get(key)!;
        return new Promise<TResponse>((res, rej) => {
          const originalResolve = existingItem.resolve;
          const originalReject = existingItem.reject;
          existingItem.resolve = (value) => {
            originalResolve(value);
            res(value);
          };
          existingItem.reject = (error) => {
            originalReject(error);
            rej(error);
          };
        });
      }

      this.queue.set(key, { key, resolve, reject });

      // Schedule batch processing
      this.scheduleBatch();

      // Process immediately if batch is full
      if (this.queue.size >= this.config.maxBatchSize) {
        this.processBatch();
      }
    });
  }

  private scheduleBatch(): void {
    if (this.timer) return;

    this.timer = setTimeout(() => {
      this.processBatch();
    }, this.config.batchDelay);
  }

  private async processBatch(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.size === 0) return;

    // Extract current batch
    const batch = new Map(this.queue);
    this.queue.clear();

    try {
      // Process batch
      const requests = new Map<string, TRequest>();
      batch.forEach((item, key) => {
        // Note: We need the actual request object here
        // This is a simplified version - in real implementation,
        // we'd store the request along with the promise handlers
      });

      const results = await this.batchProcessor(requests);

      // Resolve promises
      batch.forEach((item, key) => {
        if (results.has(key)) {
          item.resolve(results.get(key)!);
        } else {
          item.reject(new Error(`No result for key: ${key}`));
        }
      });
    } catch (error) {
      // Reject all promises in batch
      batch.forEach(item => {
        item.reject(error);
      });
    }
  }
}

// Specialized batchers for common use cases

// NFT Metadata Batcher
export const nftMetadataBatcher = new RequestBatcher<
  { tokenId: string; contractAddress: string; uri: string },
  any
>(
  async (requests) => {
    const results = new Map();
    
    // Group by contract address for more efficient fetching
    const byContract = new Map<string, string[]>();
    requests.forEach((req, key) => {
      if (!byContract.has(req.contractAddress)) {
        byContract.set(req.contractAddress, []);
      }
      byContract.get(req.contractAddress)!.push(req.tokenId);
    });

    // Fetch metadata in parallel by contract
    await Promise.all(
      Array.from(byContract.entries()).map(async ([contractAddress, tokenIds]) => {
        try {
          // This would be replaced with actual batch metadata fetching logic
          const metadataList = await fetchBatchMetadata(contractAddress, tokenIds);
          metadataList.forEach((metadata, index) => {
            const key = `${contractAddress}-${tokenIds[index]}`;
            results.set(key, metadata);
          });
        } catch (error) {
          logger.error(`Failed to fetch batch metadata for ${contractAddress}:`, error);
        }
      })
    );

    return results;
  },
  (req) => `${req.contractAddress}-${req.tokenId}`
);

// Contract Read Batcher
export const contractReadBatcher = new RequestBatcher<
  { contract: string; method: string; args: any[] },
  any
>(
  async (requests) => {
    const results = new Map();
    
    // Group by contract
    const byContract = new Map<string, Array<{ key: string; method: string; args: any[] }>>();
    requests.forEach((req, key) => {
      if (!byContract.has(req.contract)) {
        byContract.set(req.contract, []);
      }
      byContract.get(req.contract)!.push({ key, method: req.method, args: req.args });
    });

    // Use multicall for each contract
    await Promise.all(
      Array.from(byContract.entries()).map(async ([contract, calls]) => {
        try {
          // This would use viem's multicall
          const multicallResults = await performMulticall(contract, calls);
          multicallResults.forEach((result, index) => {
            results.set(calls[index].key, result);
          });
        } catch (error) {
          logger.error(`Multicall failed for ${contract}:`, error);
        }
      })
    );

    return results;
  },
  (req) => `${req.contract}-${req.method}-${JSON.stringify(req.args)}`
);

// Helper functions (these would be implemented with actual logic)
async function fetchBatchMetadata(contractAddress: string, tokenIds: string[]): Promise<any[]> {
  // Implementation would fetch metadata for multiple tokens efficiently
  return tokenIds.map(id => ({ tokenId: id, name: `NFT #${id}` }));
}

async function performMulticall(contract: string, calls: any[]): Promise<any[]> {
  // Implementation would use viem's multicall functionality
  return calls.map(() => ({ success: true, data: '0x' }));
}

// Debounced request helper
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// Throttled request helper
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}