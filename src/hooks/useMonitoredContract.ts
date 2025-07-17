// src/hooks/useMonitoredContract.ts - 帶監控的合約 Hook 包裝器

import { useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { useEffect, useCallback, useMemo } from 'react';
// import { rpcMonitor } from '../utils/rpcMonitor'; // Removed RPC monitoring
import { logger } from '../utils/logger';
import { getOptimizedQueryConfig, shouldEnableWatch, watchManager } from '../config/watchConfig';
import { useSafeReadContracts } from './useSafeReadContracts';

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
  
  // RPC monitoring removed - hook now just passes through to useReadContract
  
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
    if (!readConfig.contracts) {
      logger.debug('useMonitoredReadContracts: contracts 未定義');
      return { ...readConfig, contracts: [] };
    }
    
    if (!Array.isArray(readConfig.contracts)) {
      logger.error('useMonitoredReadContracts: contracts 不是數組', { 
        contracts: readConfig.contracts,
        type: typeof readConfig.contracts
      });
      return { ...readConfig, contracts: [] };
    }
    
    logger.debug('useMonitoredReadContracts: 開始過濾合約', { 
      contractCount: readConfig.contracts.length 
    });
    
    const validContracts = readConfig.contracts.filter(contract => {
      const isValid = contract && 
        contract.address && 
        contract.address !== '0x' && 
        contract.address !== '0x0000000000000000000000000000000000000000' &&
        contract.functionName &&
        contract.abi;
      
      if (!isValid) {
        logger.debug('無效合約過濾:', { 
          contract,
          hasAddress: !!contract?.address,
          hasFunction: !!contract?.functionName,
          hasAbi: !!contract?.abi
        });
      }
      
      return isValid;
    });

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
          validContracts.map(c => {
            // 安全地序列化參數，處理 BigInt
            const safeArgs = (c.args || []).map((arg: any) => {
              if (typeof arg === 'bigint') {
                return `bigint:${arg.toString()}`;
              }
              if (arg && typeof arg === 'object' && arg.constructor?.name === 'BigInt') {
                return `bigint:${arg.toString()}`;
              }
              return arg;
            });
            
            try {
              return `${c.address}:${c.functionName}:${JSON.stringify(safeArgs)}`;
            } catch (e) {
              // 如果還是無法序列化，使用簡單的字符串表示
              return `${c.address}:${c.functionName}:${safeArgs.toString()}`;
            }
          }).join('|')
        ],
      }
    };
  }, [readConfig, contractName, batchName]);
  
  let result;
  try {
    // 額外的防護：確保 contracts 是有效的數組
    if (!optimizedConfig.contracts || !Array.isArray(optimizedConfig.contracts) || optimizedConfig.contracts.length === 0) {
      logger.debug('useMonitoredReadContracts: 合約數組為空或無效，返回空結果', {
        contractName,
        batchName,
        hasContracts: !!optimizedConfig.contracts,
        isArray: Array.isArray(optimizedConfig.contracts),
        length: optimizedConfig.contracts?.length
      });
      result = {
        data: undefined,
        isLoading: false,
        error: null,
        refetch: () => Promise.resolve({ data: undefined })
      };
    } else {
      // 再次驗證每個合約對象的有效性
      const validContracts = optimizedConfig.contracts.every(contract => 
        contract && 
        contract.address && 
        contract.functionName && 
        contract.abi &&
        contract.address !== '0x' &&
        contract.address !== '0x0000000000000000000000000000000000000000'
      );
      
      if (!validContracts) {
        logger.error('useMonitoredReadContracts: 發現無效合約配置', {
          contractName,
          batchName,
          contracts: optimizedConfig.contracts.map((c, idx) => ({
            index: idx,
            address: c?.address,
            functionName: c?.functionName,
            hasAbi: !!c?.abi,
            isValid: !!(c && c.address && c.functionName && c.abi)
          }))
        });
        result = {
          data: undefined,
          isLoading: false,
          error: new Error('Invalid contract configuration'),
          refetch: () => Promise.resolve({ data: undefined })
        };
      } else {
        // 詳細記錄即將傳遞給 useSafeReadContracts 的配置
        if (batchName === 'adminParametersBatch' || batchName === 'vipStatusBatch') {
          logger.debug(`🔍 ${batchName} 詳細配置:`, {
            contractCount: optimizedConfig.contracts?.length || 0,
            contracts: optimizedConfig.contracts?.map((c, idx) => ({
              index: idx,
              address: c.address,
              functionName: c.functionName,
              hasArgs: !!c.args,
              args: c.args
            })) || []
          });
        }
        result = useSafeReadContracts(optimizedConfig);
      }
    }
  } catch (error) {
    logger.error('useReadContracts 調用失敗:', { error, contractName, batchName });
    result = {
      data: undefined,
      isLoading: false,
      error: error,
      refetch: () => Promise.resolve({ data: undefined })
    };
  }
  
  // RPC monitoring removed - hook now just passes through to useReadContracts
  // Performance warning still enabled
  useEffect(() => {
    if (optimizedConfig.contracts && optimizedConfig.contracts.length > 10) {
      logger.warn(`⚠️ 大量合約請求 (${optimizedConfig.contracts.length}):`, {
        batchName,
        contractName,
        page: getCurrentPageName()
      });
    }
  }, [optimizedConfig.contracts?.length, batchName, contractName]);

  return result;
}

// 監控版本的 useWriteContract - RPC monitoring removed
export function useMonitoredWriteContract() {
  const writeContract = useWriteContract();
  
  // RPC monitoring removed - hook now just passes through to useWriteContract
  return writeContract;
}

// 為現有 hooks 添加監控的高階組件 - RPC monitoring removed
export function withRpcMonitoring<T extends any[]>(
  hook: (...args: T) => any,
  hookName: string,
  contractName?: string
) {
  // RPC monitoring removed - now just passes through to the original hook
  return hook;
}

// 智能重試包裝器 - RPC monitoring removed
export function useSmartRetry<T>(
  queryFn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    contractName?: string;
    functionName?: string;
  } = {}
) {
  const { maxRetries = 3, retryDelay = 1000 } = options;

  const executeWithRetry = useCallback(async (): Promise<T> => {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }

        const result = await queryFn();
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }
      }
    }

    throw lastError;
  }, [queryFn, maxRetries, retryDelay]);

  return { executeWithRetry };
}

// 批量請求優化器 - RPC monitoring removed
export function useBatchOptimizer() {
  const executeBatch = useCallback(async (
    requests: Array<{
      fn: () => Promise<any>;
      key: string;
      contractName?: string;
      functionName?: string;
    }>
  ) => {
    try {
      const results = await Promise.all(
        requests.map(async (req) => {
          try {
            const result = await req.fn();
            return { success: true, data: result, key: req.key };
          } catch (error) {
            return { success: false, error, key: req.key };
          }
        })
      );

      return results;
    } catch (error) {
      throw error;
    }
  }, []);

  return { executeBatch };
}

// 緩存優化的 hook - RPC monitoring removed
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
  const executeQuery = useCallback(async (): Promise<T> => {
    try {
      const result = await queryFn();
      return result;
    } catch (error) {
      throw error;
    }
  }, [queryFn]);

  return { executeQuery };
}