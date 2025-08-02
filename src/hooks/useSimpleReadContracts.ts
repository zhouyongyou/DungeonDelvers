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

  // 直接使用 wagmi，使用 enabled 控制是否執行
  const result = useReadContracts({
    contracts: validContracts.length > 0 ? validContracts : [{ 
      address: '0x0000000000000000000000000000000000000000', 
      abi: [], 
      functionName: 'dummy' 
    }], // 提供假數據避免空數組
    allowFailure: true,
    query: {
      enabled: validContracts.length > 0
    }
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

  return result;
}