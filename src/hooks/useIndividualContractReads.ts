// 修復版的合約讀取 hook - 使用固定數量的 hooks
import { useContractRead } from 'wagmi';
import { useMemo } from 'react';
import { logger } from '../utils/logger';

interface ContractConfig {
  address: `0x${string}`;
  abi: any;
  functionName: string;
  args?: any[];
}

// 最多支援 30 個合約讀取（AdminPage 目前約需要 10-15 個）
const MAX_CONTRACTS = 30;

export function useIndividualContractReads(contracts: ContractConfig[]) {
  // 創建固定數量的 hooks（避免違反 hooks 規則）
  const hook0 = useContractRead({ ...contracts[0], enabled: !!contracts[0] });
  const hook1 = useContractRead({ ...contracts[1], enabled: !!contracts[1] });
  const hook2 = useContractRead({ ...contracts[2], enabled: !!contracts[2] });
  const hook3 = useContractRead({ ...contracts[3], enabled: !!contracts[3] });
  const hook4 = useContractRead({ ...contracts[4], enabled: !!contracts[4] });
  const hook5 = useContractRead({ ...contracts[5], enabled: !!contracts[5] });
  const hook6 = useContractRead({ ...contracts[6], enabled: !!contracts[6] });
  const hook7 = useContractRead({ ...contracts[7], enabled: !!contracts[7] });
  const hook8 = useContractRead({ ...contracts[8], enabled: !!contracts[8] });
  const hook9 = useContractRead({ ...contracts[9], enabled: !!contracts[9] });
  const hook10 = useContractRead({ ...contracts[10], enabled: !!contracts[10] });
  const hook11 = useContractRead({ ...contracts[11], enabled: !!contracts[11] });
  const hook12 = useContractRead({ ...contracts[12], enabled: !!contracts[12] });
  const hook13 = useContractRead({ ...contracts[13], enabled: !!contracts[13] });
  const hook14 = useContractRead({ ...contracts[14], enabled: !!contracts[14] });
  const hook15 = useContractRead({ ...contracts[15], enabled: !!contracts[15] });
  const hook16 = useContractRead({ ...contracts[16], enabled: !!contracts[16] });
  const hook17 = useContractRead({ ...contracts[17], enabled: !!contracts[17] });
  const hook18 = useContractRead({ ...contracts[18], enabled: !!contracts[18] });
  const hook19 = useContractRead({ ...contracts[19], enabled: !!contracts[19] });
  const hook20 = useContractRead({ ...contracts[20], enabled: !!contracts[20] });
  const hook21 = useContractRead({ ...contracts[21], enabled: !!contracts[21] });
  const hook22 = useContractRead({ ...contracts[22], enabled: !!contracts[22] });
  const hook23 = useContractRead({ ...contracts[23], enabled: !!contracts[23] });
  const hook24 = useContractRead({ ...contracts[24], enabled: !!contracts[24] });
  const hook25 = useContractRead({ ...contracts[25], enabled: !!contracts[25] });
  const hook26 = useContractRead({ ...contracts[26], enabled: !!contracts[26] });
  const hook27 = useContractRead({ ...contracts[27], enabled: !!contracts[27] });
  const hook28 = useContractRead({ ...contracts[28], enabled: !!contracts[28] });
  const hook29 = useContractRead({ ...contracts[29], enabled: !!contracts[29] });
  
  // 將所有 hooks 放入陣列
  const allHooks = [
    hook0, hook1, hook2, hook3, hook4, hook5, hook6, hook7, hook8, hook9,
    hook10, hook11, hook12, hook13, hook14, hook15, hook16, hook17, hook18, hook19,
    hook20, hook21, hook22, hook23, hook24, hook25, hook26, hook27, hook28, hook29
  ];
  
  // 組合結果
  const combinedResults = useMemo(() => {
    // 只取實際需要的合約數量
    const relevantHooks = allHooks.slice(0, contracts.length);
    
    const data = relevantHooks.map((hook) => ({
      result: hook.data,
      status: hook.isLoading ? 'loading' : hook.isError ? 'error' : 'success',
      error: hook.error
    }));
    
    const isLoading = relevantHooks.some(h => h.isLoading);
    const error = relevantHooks.find(h => h.isError)?.error;
    
    // 記錄調試信息
    if (!isLoading && contracts.length > 0) {
      const successCount = data.filter(d => d.status === 'success').length;
      const errorCount = data.filter(d => d.status === 'error').length;
      
      logger.debug('useIndividualContractReads 結果:', {
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
        // 觸發所有相關讀取的 refetch
        for (let i = 0; i < contracts.length; i++) {
          const hook = allHooks[i];
          if (hook?.refetch) {
            await hook.refetch();
          }
        }
      }
    };
  }, [
    contracts.length,
    // 依賴所有相關的數據變化
    ...allHooks.slice(0, contracts.length).map(h => h.data),
    ...allHooks.slice(0, contracts.length).map(h => h.isLoading),
    ...allHooks.slice(0, contracts.length).map(h => h.isError)
  ]);
  
  return combinedResults;
}