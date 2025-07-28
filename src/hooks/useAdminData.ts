// src/hooks/useAdminData.ts - 管理員數據混合載入 Hook

import { useState, useEffect, useMemo } from 'react';
import { useMonitoredReadContracts } from './useMonitoredContract';
import { getContract } from '../config/contracts';
import { logger } from '../utils/logger';
import { formatEther, parseEther } from 'viem';
import { bsc } from 'wagmi/chains';

// TODO: 暫時禁用 GraphQL 查詢，先實施 RPC 部分

// GraphQL 查詢將在子圖事件處理完成後實施
// const ADMIN_DATA_QUERY = `...`;

interface AdminDataHookReturn {
  // 數據
  parameters: Record<string, any> | null;
  contracts: Record<string, string> | null;
  recentActions: any[];
  
  // 狀態
  loading: boolean;
  error: Error | null;
  dataSource: 'subgraph' | 'rpc' | 'mixed';
  
  // 方法
  refreshFromRPC: () => Promise<void>;
  verifyParameter: (key: string) => Promise<any>;
}

export function useAdminData(): AdminDataHookReturn {
  const chainId = bsc.id;
  
  // 暫時模擬子圖數據
  const subgraphData = null;
  const subgraphLoading = false;
  const subgraphError = null;
  const refetchSubgraph = async () => { logger.info('子圖查詢尚未實施'); };
  
  // 狀態管理
  const [verifiedData, setVerifiedData] = useState<Record<string, any>>({});
  const [verificationStatus, setVerificationStatus] = useState<Record<string, 'pending' | 'verified' | 'error'>>({});
  const [dataSource, setDataSource] = useState<'subgraph' | 'rpc' | 'mixed'>('subgraph');
  
  // 關鍵參數列表（需要 RPC 驗證的）
  const criticalParameters = useMemo(() => [
    'heroMintPriceUSD',
    'relicMintPriceUSD',
    'explorationFee',
    'globalRewardMultiplier',
  ], []);
  
  // 準備 RPC 驗證的合約調用
  const verificationContracts = useMemo(() => {
    if (!subgraphData?.contractRegistry) return [];
    
    const contracts = [];
    const registry = subgraphData.contractRegistry;
    
    // 只驗證關鍵參數
    if (registry.hero) {
      contracts.push({
        address: registry.hero,
        abi: getContract('HERO').abi,
        functionName: 'mintPriceUSD',
      });
    }
    
    if (registry.relic) {
      contracts.push({
        address: registry.relic,
        abi: getContract('RELIC').abi,
        functionName: 'mintPriceUSD',
      });
    }
    
    if (registry.dungeonMaster) {
      contracts.push({
        address: registry.dungeonMaster,
        abi: getContract('DUNGEONMASTER').abi,
        functionName: 'explorationFee',
      });
      contracts.push({
        address: registry.dungeonMaster,
        abi: getContract('DUNGEONMASTER').abi,
        functionName: 'globalRewardMultiplier',
      });
    }
    
    return contracts;
  }, [subgraphData, chainId]);
  
  // 使用公開節點進行關鍵參數驗證
  const { data: rpcVerificationData, isLoading: isVerifying } = useMonitoredReadContracts({
    contracts: verificationContracts,
    query: {
      enabled: verificationContracts.length > 0 && criticalParameters.length > 0,
      staleTime: 300000, // 5 分鐘快取
      gcTime: 600000, // 10 分鐘垃圾回收
    },
  });
  
  // 處理驗證結果
  useEffect(() => {
    if (rpcVerificationData && verificationContracts.length > 0) {
      const verified: Record<string, any> = {};
      
      verificationContracts.forEach((contract, index) => {
        const result = rpcVerificationData[index];
        if (result && result.status === 'success') {
          const key = contract.functionName;
          verified[key] = result.result;
          
          // 記錄差異（用於調試）
          if (subgraphData?.adminParameters?.[key]) {
            const subgraphValue = subgraphData.adminParameters[key];
            const rpcValue = result.result;
            
            if (subgraphValue !== rpcValue?.toString()) {
              logger.warn(`參數差異檢測 - ${key}:`, {
                subgraph: subgraphValue,
                rpc: rpcValue?.toString(),
              });
            }
          }
        }
      });
      
      setVerifiedData(verified);
      setDataSource(Object.keys(verified).length > 0 ? 'mixed' : 'subgraph');
    }
  }, [rpcVerificationData, verificationContracts, subgraphData]);
  
  // 手動驗證單個參數
  const verifyParameter = async (key: string): Promise<any> => {
    logger.info(`手動驗證參數: ${key}`);
    // TODO: 實施單個參數的 RPC 驗證
    return verifiedData[key] || subgraphData?.adminParameters?.[key];
  };
  
  // 強制從 RPC 刷新所有數據
  const refreshFromRPC = async () => {
    logger.info('強制從 RPC 刷新管理員數據');
    setDataSource('rpc');
    
    // TODO: 實施完整的 RPC 數據載入
    // 這裡應該使用代理節點進行批量查詢
    
    // TODO: 同時刷新子圖數據
    // await refetchSubgraph();
  };
  
  // 合併數據源
  const parameters = useMemo(() => {
    if (!subgraphData?.adminParameters) return null;
    
    // 基礎數據來自子圖
    const merged = { ...subgraphData.adminParameters };
    
    // 用 RPC 驗證的數據覆蓋
    Object.entries(verifiedData).forEach(([key, value]) => {
      merged[key] = value;
    });
    
    return merged;
  }, [subgraphData, verifiedData]);
  
  const contracts = useMemo(() => {
    if (!subgraphData?.contractRegistry) return null;
    return subgraphData.contractRegistry;
  }, [subgraphData]);
  
  const recentActions = useMemo(() => {
    return subgraphData?.adminActions || [];
  }, [subgraphData]);
  
  return {
    // 數據
    parameters,
    contracts,
    recentActions,
    
    // 狀態
    loading: subgraphLoading || isVerifying,
    error: subgraphError,
    dataSource,
    
    // 方法
    refreshFromRPC,
    verifyParameter,
  };
}

// 輔助函數：格式化參數值
export function formatParameterValue(key: string, value: any, unit?: string): string {
  if (!value) return '未設定';
  
  try {
    const bigIntValue = BigInt(value.toString());
    
    switch (unit) {
      case 'USD':
        return `$${formatEther(bigIntValue)}`;
      case 'BNB':
        return `${formatEther(bigIntValue)} BNB`;
      case '‱':
        return `${(Number(bigIntValue) / 100).toFixed(2)}%`;
      case '秒':
        return `${bigIntValue} 秒`;
      default:
        // 嘗試智能格式化
        if (key.includes('Price') || key.includes('Fee')) {
          return formatEther(bigIntValue);
        }
        return bigIntValue.toString();
    }
  } catch (error) {
    logger.error(`格式化參數值失敗 - ${key}:`, error);
    return value.toString();
  }
}

// 輔助函數：解析參數值
export function parseParameterValue(key: string, value: string, unit?: string): bigint {
  try {
    switch (unit) {
      case 'USD':
      case 'BNB':
        return parseEther(value.replace(/[$,]/g, ''));
      case '‱':
        return BigInt(Math.round(parseFloat(value) * 100));
      default:
        return BigInt(value);
    }
  } catch (error) {
    logger.error(`解析參數值失敗 - ${key}:`, error);
    throw error;
  }
}