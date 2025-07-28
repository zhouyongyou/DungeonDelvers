// 安全的批量合約讀取 hook
import { useReadContracts } from 'wagmi';
import { useMemo, useRef } from 'react';
import { logger } from '../utils/logger';

export function useSafeReadContracts(config: any) {
  // 使用 ref 來追踪是否已經記錄過錯誤
  const hasLoggedError = useRef(false);
  
  // 確保 contracts 是有效的數組格式
  const safeConfig = useMemo(() => {
    if (!config) {
      return null;
    }

    const { contracts, query, ...restConfig } = config;
    
    // 確保 contracts 是數組
    if (!contracts || !Array.isArray(contracts)) {
      if (!hasLoggedError.current) {
        logger.warn('useSafeReadContracts: contracts 不是有效的數組', {
          contracts: contracts,
          isArray: Array.isArray(contracts)
        });
        hasLoggedError.current = true;
      }
      return null;
    }

    // 過濾並轉換合約格式，確保符合 wagmi v2 的要求
    const safeContracts = contracts
      .filter((contract: any) => {
        const isValid = contract && 
               contract.address && 
               contract.abi && 
               contract.functionName &&
               Array.isArray(contract.abi) &&
               contract.address.length === 42 &&
               contract.address.startsWith('0x');
        
        if (!isValid) {
          logger.debug('過濾無效合約:', {
            hasContract: !!contract,
            hasAddress: !!contract?.address,
            hasAbi: !!contract?.abi,
            hasFunctionName: !!contract?.functionName,
            isAbiArray: Array.isArray(contract?.abi),
            addressLength: contract?.address?.length,
            addressFormat: contract?.address?.startsWith?.('0x')
          });
        }
        
        return isValid;
      })
      .map((contract: any) => {
        const mappedContract = {
          address: contract.address as `0x${string}`,
          abi: contract.abi,
          functionName: contract.functionName,
          args: contract.args || []
        };
        
        // 確保 args 是有效的數組
        if (!Array.isArray(mappedContract.args)) {
          mappedContract.args = [];
        }
        
        return mappedContract;
      });

    if (safeContracts.length === 0) {
      logger.warn('useSafeReadContracts: 沒有有效的合約');
      return null;
    }

    // 記錄合約配置用於調試
    logger.debug('useSafeReadContracts 配置:', {
      contractCount: safeContracts.length,
      firstContract: safeContracts.length > 0 ? safeContracts[0] : null
    });

    // wagmi v2 的正確配置格式
    const wagmiConfig = {
      contracts: safeContracts,
      allowFailure: true,
      query: {
        enabled: query?.enabled !== false && safeContracts.length > 0,
        ...query
      }
    };
    
    // 移除 wagmi 不認識的配置
    return wagmiConfig;
  }, [config]);

  // 總是調用 wagmi hook，但通過 enabled 控制是否執行
  const finalConfig = useMemo(() => {
    if (safeConfig) {
      return safeConfig;
    }
    
    // 確保傳遞給 wagmi 的配置總是有效的
    return {
      contracts: [],
      allowFailure: true,
      query: { 
        enabled: false,
        // 添加一個假的 queryKey 以避免 wagmi 內部錯誤
        queryKey: ['safe-read-contracts-disabled']
      }
    };
  }, [safeConfig]);

  // 使用 wagmi hook - 總是調用以遵守 Hook 規則
  const result = useReadContracts(finalConfig as any);
  
  // 如果配置無效，覆蓋結果
  if (!safeConfig) {
    return {
      data: undefined,
      isLoading: false,
      error: null,
      refetch: () => Promise.resolve({ data: undefined })
    };
  }
  
  // 詳細的調試日誌
  if (!hasLoggedError.current && (result.error || result.data)) {
    logger.debug('useSafeReadContracts 結果:', {
      hasError: !!result.error,
      errorMessage: result.error?.message,
      dataLength: result.data?.length,
      isLoading: result.isLoading,
      contractCount: safeConfig?.contracts?.length || 0
    });
    
    // 如果有錯誤，記錄詳細信息
    if (result.error) {
      logger.error('useReadContracts 錯誤詳情:', {
        error: result.error,
        errorName: result.error.name,
        errorMessage: result.error.message,
        config: {
          contractCount: safeConfig?.contracts?.length || 0,
          firstContract: safeConfig?.contracts?.length > 0 ? safeConfig.contracts[0] : null,
          allowFailure: safeConfig.allowFailure,
          query: safeConfig.query
        }
      });
      hasLoggedError.current = true;
    }
  }
  
  return result;
}