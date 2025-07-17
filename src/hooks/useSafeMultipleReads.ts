// 安全的多重合約讀取 - 使用 wagmi 原生功能但加上錯誤處理
import { useReadContracts } from 'wagmi';
import { useMemo } from 'react';
import { logger } from '../utils/logger';

interface ContractConfig {
  address: `0x${string}`;
  abi: any;
  functionName: string;
  args?: any[];
}

export function useSafeMultipleReads(contracts: ContractConfig[], options?: { enabled?: boolean }) {
  // 確保合約配置格式正確
  const formattedContracts = useMemo(() => {
    if (!contracts || contracts.length === 0) return [];
    
    return contracts.map(contract => ({
      address: contract.address,
      abi: contract.abi,
      functionName: contract.functionName,
      args: contract.args || []
    }));
  }, [contracts]);

  // 使用 wagmi 的 useReadContracts，確保配置正確
  const result = useReadContracts({
    contracts: formattedContracts,
    allowFailure: true, // 允許部分失敗
    query: {
      enabled: formattedContracts.length > 0 && (options?.enabled !== false),
      staleTime: 1000 * 60 * 5, // 5分鐘快取
      retry: (failureCount, error) => {
        // 只重試網路錯誤，不重試合約錯誤
        if (error?.message?.includes('network')) {
          return failureCount < 2;
        }
        return false;
      }
    }
  });

  // 轉換結果格式以符合 AdminPage 的預期
  const transformedResult = useMemo(() => {
    if (!result.data) {
      return {
        data: undefined,
        isLoading: result.isLoading,
        error: result.error,
        refetch: result.refetch
      };
    }

    // wagmi v2 的 useReadContracts 返回格式是 { data: [{ result, status, error }] }
    // 我們需要保持這個格式
    return {
      data: result.data,
      isLoading: result.isLoading,
      error: result.error,
      refetch: result.refetch
    };
  }, [result]);

  // 診斷日誌
  useMemo(() => {
    if (!result.isLoading && result.data) {
      const successCount = result.data.filter(r => r.status === 'success').length;
      const failureCount = result.data.filter(r => r.status === 'failure').length;
      
      if (failureCount > 0) {
        logger.debug('合約讀取部分失敗:', {
          total: result.data.length,
          success: successCount,
          failure: failureCount,
          failures: result.data
            .map((r, idx) => ({ idx, status: r.status, error: r.error }))
            .filter(r => r.status === 'failure')
        });
      }
    }
  }, [result.data, result.isLoading]);

  return transformedResult;
}