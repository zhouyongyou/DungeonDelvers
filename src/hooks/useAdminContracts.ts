// 專門為 AdminPage 設計的合約讀取 hook
import { useReadContract } from 'wagmi';
import { useState, useEffect, useMemo } from 'react';
import { logger } from '../utils/logger';

interface ContractReadConfig {
  address: `0x${string}`;
  abi: any;
  functionName: string;
  args?: any[];
}

export function useAdminContracts(contracts: ContractReadConfig[]) {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 使用 useMemo 穩定合約配置
  const stableContracts = useMemo(() => {
    return contracts.filter(contract => 
      contract && 
      contract.address && 
      contract.address !== '0x0000000000000000000000000000000000000000' &&
      contract.abi && 
      contract.functionName
    );
  }, [contracts]);

  // 為每個合約創建單獨的讀取 hook (使用新的 useReadContract)
  const contractReads = stableContracts.map((contract, index) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useReadContract({
      address: contract.address,
      abi: contract.abi,
      functionName: contract.functionName,
      args: contract.args,
      query: {
        enabled: !!contract.address && !!contract.abi && !!contract.functionName,
        staleTime: 30000, // 30秒緩存
        gcTime: 60000, // 1分鐘垃圾回收
        retry: 1, // 最多重試1次
        refetchOnWindowFocus: false
      }
    });
  });

  // 組合所有結果
  useEffect(() => {
    const allResults = contractReads.map((read) => ({
      result: read.data,
      status: read.isLoading ? 'loading' : read.isError ? 'error' : 'success',
      error: read.error,
    }));

    const hasLoading = contractReads.some((read) => read.isLoading);
    const firstError = contractReads.find((read) => read.isError)?.error;

    setResults(allResults);
    setIsLoading(hasLoading);
    setError(firstError || null);

    // 記錄調試信息
    if (!hasLoading && allResults.length > 0) {
      const successCount = allResults.filter(r => r.status === 'success').length;
      const errorCount = allResults.filter(r => r.status === 'error').length;
      
      logger.info('AdminContracts 讀取結果:', {
        total: allResults.length,
        success: successCount,
        error: errorCount,
        validContracts: stableContracts.length,
        originalContracts: contracts.length
      });
      
      // 詳細記錄錯誤
      if (errorCount > 0) {
        logger.error('AdminContracts 讀取錯誤詳情:', {
          failures: allResults
            .map((result, index) => ({ 
              index, 
              contract: stableContracts[index], 
              error: result.error,
              errorMessage: result.error?.message 
            }))
            .filter(item => item.error)
        });
      }
    }
  }, [contractReads, stableContracts.length, contracts.length]);

  return {
    data: results,
    isLoading,
    error,
    refetch: async () => {
      for (const read of contractReads) {
        if (read.refetch) {
          await read.refetch();
        }
      }
    },
  };
}