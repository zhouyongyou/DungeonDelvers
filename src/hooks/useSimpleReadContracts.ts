// 簡化版本 - 直接使用 wagmi 的 useReadContracts
import { useReadContracts } from 'wagmi';
import { logger } from '../utils/logger';

export function useSimpleReadContracts(contracts: any[]) {
  // 過濾有效合約
  const validContracts = contracts.filter(contract => 
    contract && 
    contract.address && 
    contract.abi && 
    contract.functionName
  );

  logger.debug('useSimpleReadContracts:', {
    inputCount: contracts.length,
    validCount: validContracts.length
  });

  // 如果沒有有效合約，返回空結果
  if (validContracts.length === 0) {
    return {
      data: undefined,
      isLoading: false,
      error: null,
      refetch: () => Promise.resolve({ data: undefined })
    };
  }

  // 直接使用 wagmi
  return useReadContracts({
    contracts: validContracts,
    allowFailure: true
  });
}