// 專門為 AdminPage 設計的合約讀取 hook
import { useContractRead } from 'wagmi';
import { useState, useEffect } from 'react';
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

  // 為每個合約創建單獨的讀取 hook
  const contractReads = contracts.map((contract) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useContractRead({
      address: contract.address,
      abi: contract.abi,
      functionName: contract.functionName,
      args: contract.args,
      enabled: !!contract.address && !!contract.abi && !!contract.functionName,
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
      
      // 減少日誌輸出，只在有錯誤時記錄
      if (errorCount > 0) {
        logger.error('AdminContracts 讀取錯誤:', {
          total: allResults.length,
          success: successCount,
          error: errorCount,
          failures: allResults
            .map((result, index) => ({ index, error: result.error }))
            .filter(item => item.error)
        });
      }
    }
  }, contractReads); // 使用穩定的依賴

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