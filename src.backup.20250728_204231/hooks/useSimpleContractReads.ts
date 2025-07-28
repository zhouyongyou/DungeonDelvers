// 簡化的合約讀取 hook - 專門用於解決 AdminPage 的問題
import { useContractRead } from 'wagmi';
import { useMemo } from 'react';
import { logger } from '../utils/logger';

interface ContractConfig {
  address: `0x${string}`;
  abi: any;
  functionName: string;
  args?: any[];
}

// 使用多個獨立的 useContractRead 調用來避免批量讀取的問題
export function useSimpleContractReads(contracts: ContractConfig[]) {
  // 為每個合約創建獨立的 hook 調用
  const reads = contracts.map((contract, index) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const result = useContractRead({
      address: contract.address,
      abi: contract.abi,
      functionName: contract.functionName,
      args: contract.args || [],
      enabled: !!contract.address && !!contract.abi && !!contract.functionName,
    });
    
    return {
      ...result,
      index,
      contract
    };
  });
  
  // 組合結果為預期的格式
  const combinedResults = useMemo(() => {
    const data = reads.map((read) => ({
      result: read.data,
      status: read.isLoading ? 'loading' : read.isError ? 'error' : 'success',
      error: read.error
    }));
    
    const isLoading = reads.some(r => r.isLoading);
    const error = reads.find(r => r.isError)?.error;
    
    // 記錄調試信息
    const successCount = data.filter(d => d.status === 'success').length;
    const errorCount = data.filter(d => d.status === 'error').length;
    
    if (!isLoading && contracts.length > 0) {
      logger.debug('useSimpleContractReads 結果:', {
        total: contracts.length,
        success: successCount,
        error: errorCount,
        loading: data.filter(d => d.status === 'loading').length
      });
    }
    
    return {
      data,
      isLoading,
      error,
      refetch: async () => {
        // 觸發所有讀取的 refetch
        for (const read of reads) {
          if (read.refetch) {
            await read.refetch();
          }
        }
      }
    };
  }, [reads.map(r => r.data).join(','), reads.map(r => r.isLoading).join(',')]);
  
  return combinedResults;
}