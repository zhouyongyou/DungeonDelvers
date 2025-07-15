// src/utils/contractBatchOptimizer.ts - 合約批處理優化器

import { type UseReadContractsConfig } from 'wagmi';
import { rpcMonitor } from './rpcMonitor';
import { logger } from './logger';
import { BATCH_REQUEST_CONFIG, DEDUP_CONFIG } from '../config/rpcOptimization';

// 請求去重緩存
class RequestDeduplicator {
  private cache = new Map<string, {
    promise: Promise<any>;
    timestamp: number;
  }>();

  private generateKey(contracts: any[]): string {
    return contracts.map(contract => 
      `${contract.address}:${contract.functionName}:${JSON.stringify(contract.args || [])}`
    ).join('|');
  }

  async deduplicate<T>(contracts: any[], fetcher: () => Promise<T>): Promise<T> {
    const key = this.generateKey(contracts);
    const now = Date.now();
    const cached = this.cache.get(key);

    // 如果有緩存且在時間窗口內，返回緩存的 promise
    if (cached && (now - cached.timestamp) < DEDUP_CONFIG.windowMs) {
      logger.debug('🔄 使用去重緩存的請求:', key);
      return cached.promise;
    }

    // 創建新的請求
    const promise = fetcher();
    this.cache.set(key, { promise, timestamp: now });

    // 清理過期緩存
    this.cleanup();

    return promise;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, { timestamp }] of this.cache.entries()) {
      if (now - timestamp > DEDUP_CONFIG.windowMs) {
        this.cache.delete(key);
      }
    }
  }
}

// 批處理管理器
class BatchManager {
  private batches = new Map<string, {
    contracts: any[];
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timestamp: number;
  }[]>();

  private timers = new Map<string, NodeJS.Timeout>();

  async addToBatch(
    batchKey: string,
    contracts: any[],
    executor: (contracts: any[]) => Promise<any>
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // 將請求加入批處理
      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, []);
      }

      const batch = this.batches.get(batchKey)!;
      batch.push({ contracts, resolve, reject, timestamp: Date.now() });

      // 如果批處理達到最大大小，立即執行
      if (batch.length >= BATCH_REQUEST_CONFIG.maxBatchSize) {
        this.executeBatch(batchKey, executor);
        return;
      }

      // 設置延遲執行
      if (this.timers.has(batchKey)) {
        clearTimeout(this.timers.get(batchKey)!);
      }

      this.timers.set(batchKey, setTimeout(() => {
        this.executeBatch(batchKey, executor);
      }, BATCH_REQUEST_CONFIG.batchDelayMs));
    });
  }

  private async executeBatch(batchKey: string, executor: (contracts: any[]) => Promise<any>) {
    const batch = this.batches.get(batchKey);
    if (!batch || batch.length === 0) return;

    // 清理計時器
    if (this.timers.has(batchKey)) {
      clearTimeout(this.timers.get(batchKey)!);
      this.timers.delete(batchKey);
    }

    // 合併所有合約
    const allContracts = batch.flatMap(item => item.contracts);
    
    try {
      logger.info(`🔄 執行批處理: ${batchKey}, 合約數量: ${allContracts.length}`);
      
      const results = await executor(allContracts);
      
      // 分發結果
      let resultIndex = 0;
      for (const item of batch) {
        const itemResults = results.slice(resultIndex, resultIndex + item.contracts.length);
        resultIndex += item.contracts.length;
        item.resolve(itemResults);
      }
    } catch (error) {
      logger.error(`批處理執行失敗: ${batchKey}`, error);
      batch.forEach(item => item.reject(error));
    }

    // 清理批處理
    this.batches.delete(batchKey);
  }
}

// 合約批處理優化器主類
export class ContractBatchOptimizer {
  private deduplicator = new RequestDeduplicator();
  private batchManager = new BatchManager();
  private activeRequests = new Set<string>();

  // 優化 useReadContracts 配置
  optimizeReadContractsConfig(config: UseReadContractsConfig): UseReadContractsConfig {
    const optimizedConfig = {
      ...config,
      // 優化查詢配置
      query: {
        ...config.query,
        // 禁用自動刷新相關功能
        refetchInterval: false,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        
        // 優化緩存設置
        staleTime: 1000 * 60 * 15, // 15分鐘
        gcTime: 1000 * 60 * 45,    // 45分鐘
        
        // 減少重試次數
        retry: 1,
        retryDelay: 2000,
        
        // 添加去重邏輯
        queryFn: config.query?.queryFn ? async () => {
          const contracts = config.contracts || [];
          return this.deduplicator.deduplicate(contracts, async () => {
            return config.query!.queryFn!();
          });
        } : undefined,
      },
    };

    return optimizedConfig;
  }

  // 批處理合約讀取
  async batchReadContracts(
    contracts: any[],
    batchKey: string,
    executor: (contracts: any[]) => Promise<any>
  ): Promise<any> {
    // 檢查是否有相同的請求正在進行
    const requestKey = `${batchKey}:${JSON.stringify(contracts)}`;
    
    if (this.activeRequests.has(requestKey)) {
      logger.debug('⏳ 跳過重複請求:', requestKey);
      return new Promise((resolve) => {
        // 等待當前請求完成
        const checkInterval = setInterval(() => {
          if (!this.activeRequests.has(requestKey)) {
            clearInterval(checkInterval);
            resolve(null);
          }
        }, 100);
      });
    }

    this.activeRequests.add(requestKey);

    try {
      const result = await this.batchManager.addToBatch(batchKey, contracts, executor);
      return result;
    } finally {
      this.activeRequests.delete(requestKey);
    }
  }

  // 驗證合約配置
  validateContractConfig(contracts: any[]): {
    valid: any[];
    invalid: any[];
    errors: string[];
  } {
    const valid: any[] = [];
    const invalid: any[] = [];
    const errors: string[] = [];

    contracts.forEach((contract, index) => {
      if (!contract) {
        invalid.push(contract);
        errors.push(`合約 ${index}: 配置為空`);
        return;
      }

      if (!contract.address || contract.address === '0x' || contract.address === '0x0000000000000000000000000000000000000000') {
        invalid.push(contract);
        errors.push(`合約 ${index}: 無效的地址 ${contract.address}`);
        return;
      }

      if (!contract.functionName) {
        invalid.push(contract);
        errors.push(`合約 ${index}: 缺少函數名稱`);
        return;
      }

      if (!contract.abi) {
        invalid.push(contract);
        errors.push(`合約 ${index}: 缺少 ABI`);
        return;
      }

      valid.push(contract);
    });

    return { valid, invalid, errors };
  }

  // 分組合約請求（按合約地址分組）
  groupContractsByAddress(contracts: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    contracts.forEach(contract => {
      const address = contract.address.toLowerCase();
      if (!groups.has(address)) {
        groups.set(address, []);
      }
      groups.get(address)!.push(contract);
    });

    return groups;
  }

  // 分析合約請求性能
  analyzeContractPerformance(contracts: any[]): {
    totalContracts: number;
    uniqueAddresses: number;
    potentialOptimizations: string[];
    recommendations: string[];
  } {
    const uniqueAddresses = new Set(contracts.map(c => c.address?.toLowerCase())).size;
    const potentialOptimizations: string[] = [];
    const recommendations: string[] = [];

    // 分析重複請求
    const addressCount = new Map<string, number>();
    contracts.forEach(contract => {
      const key = `${contract.address}:${contract.functionName}`;
      addressCount.set(key, (addressCount.get(key) || 0) + 1);
    });

    const duplicates = Array.from(addressCount.entries()).filter(([, count]) => count > 1);
    if (duplicates.length > 0) {
      potentialOptimizations.push('發現重複的合約調用');
      recommendations.push('考慮合併或緩存重複的請求');
    }

    // 分析批處理潛力
    if (contracts.length > 10) {
      potentialOptimizations.push('大量合約請求');
      recommendations.push('考慮分批處理請求');
    }

    // 分析無效合約
    const invalidContracts = contracts.filter(c => 
      !c.address || c.address === '0x' || !c.functionName
    );
    if (invalidContracts.length > 0) {
      potentialOptimizations.push('存在無效的合約配置');
      recommendations.push('移除或修復無效的合約配置');
    }

    return {
      totalContracts: contracts.length,
      uniqueAddresses,
      potentialOptimizations,
      recommendations,
    };
  }

  // 清理和重置
  cleanup() {
    this.activeRequests.clear();
    logger.info('🧹 合約批處理優化器已清理');
  }
}

// 創建全局實例
export const contractBatchOptimizer = new ContractBatchOptimizer();

// 工具函數：創建優化的合約讀取配置
export function createOptimizedContractReadConfig(
  contracts: any[],
  batchName: string,
  options: {
    staleTime?: number;
    gcTime?: number;
    enabled?: boolean;
  } = {}
): UseReadContractsConfig {
  const { valid, invalid, errors } = contractBatchOptimizer.validateContractConfig(contracts);

  if (invalid.length > 0) {
    logger.warn('⚠️ 發現無效的合約配置:', errors);
  }

  return {
    contracts: valid,
    query: {
      enabled: options.enabled !== false && valid.length > 0,
      staleTime: options.staleTime || 1000 * 60 * 15, // 15分鐘
      gcTime: options.gcTime || 1000 * 60 * 45,       // 45分鐘
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
      retryDelay: 2000,
      meta: {
        batchName,
        contractCount: valid.length,
      },
    },
  };
}

// 工具函數：合約地址驗證
export function validateContractAddress(address: string): boolean {
  return !!(address && 
    address.length === 42 && 
    address.startsWith('0x') && 
    address !== '0x0000000000000000000000000000000000000000'
  );
}

// 工具函數：安全的合約調用
export function safeContractCall<T>(
  contractFn: () => T,
  fallback: T,
  errorMessage: string = '合約調用失敗'
): T {
  try {
    return contractFn();
  } catch (error) {
    logger.error(errorMessage, error);
    return fallback;
  }
}