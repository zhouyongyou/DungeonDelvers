// src/hooks/useOptimizedContractRead.ts - 優化的合約讀取 Hook

import { useReadContracts, useQueryClient } from 'wagmi';
import { useEffect, useRef, useMemo } from 'react';
import { useMonitoredReadContracts } from './useMonitoredContract';
import { adminPageQueryConfig } from '../config/wagmiOptimized';

interface OptimizedContractReadConfig {
  contracts: any[];
  contractName?: string;
  batchName?: string;
  enableAutoRefresh?: boolean;
  customStaleTime?: number;
}

/**
 * 優化的合約讀取 Hook
 * - 防止重複的事件監聽器
 * - 智能緩存管理
 * - 請求去重
 */
export function useOptimizedContractRead({
  contracts,
  contractName,
  batchName,
  enableAutoRefresh = false,
  customStaleTime,
}: OptimizedContractReadConfig) {
  const queryClient = useQueryClient();
  const previousContractsRef = useRef<string>('');
  
  // 序列化合約配置用於比較
  const contractsKey = useMemo(() => {
    return JSON.stringify(contracts.map(c => ({
      address: c.address,
      functionName: c.functionName,
      args: c.args,
    })));
  }, [contracts]);
  
  // 檢查合約配置是否改變
  const hasContractsChanged = contractsKey !== previousContractsRef.current;
  
  useEffect(() => {
    previousContractsRef.current = contractsKey;
  }, [contractsKey]);
  
  // 使用優化的查詢配置
  const queryConfig = useMemo(() => ({
    ...adminPageQueryConfig,
    ...(customStaleTime && { staleTime: customStaleTime }),
    enabled: contracts.length > 0 && !hasContractsChanged,
    // 防止重複訂閱事件
    watch: false,
    // 啟用智能重試
    retry: (failureCount: number, error: any) => {
      // 如果是用戶拒絕或網絡錯誤，不重試
      if (error?.message?.includes('User rejected') || 
          error?.message?.includes('Network error')) {
        return false;
      }
      return failureCount < 2;
    },
  }), [contracts.length, hasContractsChanged, customStaleTime]);
  
  // 使用監控的讀取合約 Hook
  const result = useMonitoredReadContracts({
    contracts,
    contractName,
    batchName,
    query: queryConfig,
  });
  
  // 手動刷新函數
  const refresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['readContracts', contracts],
    });
  };
  
  return {
    ...result,
    refresh,
    hasContractsChanged,
  };
}

/**
 * 批量優化的合約讀取
 * 將多個合約調用合併為一個批次
 */
export function useBatchOptimizedContractRead(
  contractGroups: Array<{
    key: string;
    contracts: any[];
    contractName?: string;
  }>
) {
  const results = contractGroups.map(group => 
    useOptimizedContractRead({
      contracts: group.contracts,
      contractName: group.contractName,
      batchName: `batch_${group.key}`,
    })
  );
  
  // 合併所有結果
  const isLoading = results.some(r => r.isLoading);
  const error = results.find(r => r.error)?.error;
  const data = results.map(r => r.data);
  
  return {
    data,
    isLoading,
    error,
    results,
  };
}