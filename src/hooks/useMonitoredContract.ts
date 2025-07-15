// src/hooks/useMonitoredContract.ts - 帶監控的合約 Hook 包裝器

import { useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { useEffect, useCallback, useMemo } from 'react';
import { rpcMonitor } from '../utils/rpcMonitor';
import { logger } from '../utils/logger';
import { getOptimizedQueryConfig, shouldEnableWatch, watchManager } from '../config/watchConfig';

// 獲取當前頁面名稱
const getCurrentPageName = (): string => {
  const path = window.location.pathname;
  const pathSegments = path.split('/').filter(Boolean);
  return pathSegments[pathSegments.length - 1] || 'home';
};

// 監控版本的 useReadContract
export function useMonitoredReadContract<T = any>(
  config: Parameters<typeof useReadContract>[0] & {
    contractName?: string;
    functionName?: string;
  }
) {
  const { contractName, functionName, ...readConfig } = config;
  
  // 使用智能配置
  const optimizedConfig = getOptimizedQueryConfig({
    ...readConfig,
    functionName,
    watch: shouldEnableWatch(functionName),
  });
  
  const result = useReadContract(optimizedConfig);
  const pageName = getCurrentPageName();

  // 監控請求 - 只在實際發生網絡請求時記錄
  useEffect(() => {
    if (config.address && config.functionName && result.isLoading) {
      const requestId = rpcMonitor.startRequest(
        config.address,
        String(config.functionName),
        config.args || [],
        pageName,
        contractName,
        functionName
      );

      // 監控結果
      const monitorResult = () => {
        if (result.error) {
          rpcMonitor.completeRequest(requestId, undefined, result.error.message);
        } else if (result.data !== undefined && !result.isLoading) {
          rpcMonitor.completeRequest(requestId, result.data);
        }
      };

      // 當請求完成時記錄結果
      return () => {
        monitorResult();
      };
    }
  }, [result.isLoading, config.address, config.functionName]);

  return result;
}

// 監控版本的 useReadContracts
export function useMonitoredReadContracts<T = any>(
  config: Parameters<typeof useReadContracts>[0] & {
    contractName?: string;
    batchName?: string;
  }
) {
  const { contractName, batchName, ...readConfig } = config;
  
  // 優化合約配置 - 過濾無效合約
  const optimizedConfig = useMemo(() => {
    if (!readConfig.contracts) return readConfig;
    
    const validContracts = readConfig.contracts.filter(contract => 
      contract && 
      contract.address && 
      contract.address !== '0x' && 
      contract.address !== '0x0000000000000000000000000000000000000000' &&
      contract.functionName &&
      contract.abi
    );

    // 使用智能配置
    const baseConfig = {
      ...readConfig,
      contracts: validContracts,
      watch: shouldEnableWatch(),
    };

    const optimized = getOptimizedQueryConfig(baseConfig);
    
    return {
      ...optimized,
      query: {
        ...optimized.query,
        enabled: (optimized.query?.enabled !== false) && validContracts.length > 0,
        // 添加請求去重
        queryKey: [
          'monitored-read-contracts',
          contractName,
          batchName,
          validContracts.map(c => `${c.address}:${c.functionName}:${JSON.stringify(c.args || [])}`).join('|')
        ],
      }
    };
  }, [readConfig, contractName, batchName]);
  
  const result = useReadContracts(optimizedConfig);
  const pageName = getCurrentPageName();

  // 監控批量請求 - 只在實際發生網絡請求時記錄
  useEffect(() => {
    if (optimizedConfig.contracts && optimizedConfig.contracts.length > 0 && result.isLoading) {
      const requestIds = optimizedConfig.contracts.map((contract, index) => {
        if (contract && contract.address && contract.functionName) {
          return rpcMonitor.startRequest(
            contract.address,
            String(contract.functionName),
            contract.args || [],
            pageName,
            contractName || 'unknown',
            `${batchName || 'batch'}_${index}`
          );
        }
        return null;
      }).filter(Boolean);

      // 當請求完成時記錄結果
      return () => {
        if (result.error) {
          requestIds.forEach(id => {
            if (id) rpcMonitor.completeRequest(id, undefined, result.error?.message);
          });
        } else if (result.data && !result.isLoading) {
          requestIds.forEach((id, index) => {
            if (id && result.data && result.data[index]) {
              rpcMonitor.completeRequest(id, result.data[index]);
            }
          });
        }
      };
    }
  }, [result.isLoading, optimizedConfig.contracts?.length]);

  // 添加性能監控
  useEffect(() => {
    if (optimizedConfig.contracts && optimizedConfig.contracts.length > 10) {
      logger.warn(`⚠️ 大量合約請求 (${optimizedConfig.contracts.length}):`, {
        batchName,
        contractName,
        page: pageName
      });
    }
  }, [optimizedConfig.contracts?.length, batchName, contractName, pageName]);

  return result;
}

// 監控版本的 useWriteContract
export function useMonitoredWriteContract() {
  const writeContract = useWriteContract();
  const pageName = getCurrentPageName();

  const writeContractAsync = useCallback(async (config: any) => {
    const requestId = rpcMonitor.startRequest(
      config.address,
      String(config.functionName),
      config.args || [],
      pageName,
      'contract_write',
      String(config.functionName)
    );

    try {
      const result = await writeContract.writeContractAsync(config);
      rpcMonitor.completeRequest(requestId, result);
      return result;
    } catch (error) {
      rpcMonitor.completeRequest(requestId, undefined, error.message);
      throw error;
    }
  }, [writeContract.writeContractAsync, pageName]);

  return {
    ...writeContract,
    writeContractAsync,
  };
}

// 為現有 hooks 添加監控的高階組件
export function withRpcMonitoring<T extends any[]>(
  hook: (...args: T) => any,
  hookName: string,
  contractName?: string
) {
  return function (...args: T) {
    const result = hook(...args);
    const pageName = getCurrentPageName();

    // 監控 hook 的使用
    useEffect(() => {
      const requestId = rpcMonitor.startRequest(
        'hook_call',
        hookName,
        args,
        pageName,
        contractName || 'custom_hook',
        hookName
      );

      if (result?.error) {
        rpcMonitor.completeRequest(requestId, undefined, result.error.message);
      } else if (result?.data !== undefined) {
        rpcMonitor.completeRequest(requestId, result.data);
      } else {
        // 對於沒有明確 data/error 結構的 hook，延遲監控
        setTimeout(() => {
          rpcMonitor.completeRequest(requestId, result);
        }, 100);
      }
    }, [result, hookName, pageName]);

    return result;
  };
}

// 智能重試包裝器
export function useSmartRetry<T>(
  queryFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    contractName?: string;
    functionName?: string;
  } = {}
) {
  const { maxRetries = 3, retryDelay = 1000, contractName, functionName } = options;
  const pageName = getCurrentPageName();

  const executeWithRetry = useCallback(async (): Promise<T> => {
    let lastError: any;
    let requestId: string | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }

        requestId = rpcMonitor.startRequest(
          'smart_retry',
          functionName || 'unknown',
          [],
          pageName,
          contractName || 'unknown',
          functionName || 'unknown'
        );

        if (attempt > 0) {
          rpcMonitor.recordRetry(requestId);
        }

        const result = await queryFn();
        rpcMonitor.completeRequest(requestId, result);
        return result;
      } catch (error) {
        lastError = error;
        if (requestId) {
          rpcMonitor.completeRequest(requestId, undefined, error.message);
        }
        
        if (attempt === maxRetries) {
          throw error;
        }
      }
    }

    throw lastError;
  }, [queryFn, maxRetries, retryDelay, contractName, functionName, pageName]);

  return { executeWithRetry };
}

// 批量請求優化器
export function useBatchOptimizer() {
  const pageName = getCurrentPageName();

  const executeBatch = useCallback(async (
    requests: Array<{
      fn: () => Promise<any>;
      key: string;
      contractName?: string;
      functionName?: string;
    }>
  ) => {
    const batchId = `batch_${Date.now()}`;
    const requestIds = requests.map(req => 
      rpcMonitor.startRequest(
        batchId,
        req.functionName || 'batch_item',
        [],
        pageName,
        req.contractName || 'batch',
        req.functionName || req.key
      )
    );

    try {
      const results = await Promise.all(
        requests.map(async (req, index) => {
          try {
            const result = await req.fn();
            rpcMonitor.completeRequest(requestIds[index], result);
            return { success: true, data: result, key: req.key };
          } catch (error) {
            rpcMonitor.completeRequest(requestIds[index], undefined, error.message);
            return { success: false, error, key: req.key };
          }
        })
      );

      return results;
    } catch (error) {
      requestIds.forEach(id => 
        rpcMonitor.completeRequest(id, undefined, error.message)
      );
      throw error;
    }
  }, [pageName]);

  return { executeBatch };
}

// 緩存優化的 hook
export function useOptimizedQuery<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options: {
    staleTime?: number;
    gcTime?: number;
    contractName?: string;
    functionName?: string;
  } = {}
) {
  const { contractName, functionName, ...cacheOptions } = options;
  const pageName = getCurrentPageName();

  const executeQuery = useCallback(async (): Promise<T> => {
    const requestId = rpcMonitor.startRequest(
      'optimized_query',
      functionName || queryKey,
      [],
      pageName,
      contractName || 'optimized',
      functionName || queryKey
    );

    try {
      const result = await queryFn();
      rpcMonitor.completeRequest(requestId, result);
      return result;
    } catch (error) {
      rpcMonitor.completeRequest(requestId, undefined, error.message);
      throw error;
    }
  }, [queryFn, queryKey, contractName, functionName, pageName]);

  return { executeQuery };
}