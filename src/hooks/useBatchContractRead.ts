// useBatchContractRead.ts - 批量合約讀取 Hook
// 使用 multicall 合約優化多個讀取請求

import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { multicall } from 'viem/actions';
import { logger } from '../utils/logger';
import { bsc } from 'wagmi/chains';

export interface BatchReadCall {
  address: `0x${string}`;
  abi: any[];
  functionName: string;
  args?: readonly unknown[];
  key?: string; // 用於標識結果
}

export interface BatchReadResult<T = any> {
  success: boolean;
  result?: T;
  error?: Error;
}

export interface UseBatchContractReadOptions {
  enabled?: boolean;
  refetchInterval?: number;
  cacheTime?: number;
  staleTime?: number;
}

/**
 * 批量讀取多個合約函數
 * 使用 multicall 優化，將多個 RPC 請求合併為一個
 */
export function useBatchContractRead<T extends Record<string, any>>(
  calls: BatchReadCall[],
  options: UseBatchContractReadOptions = {}
) {
  const publicClient = usePublicClient({ chainId: bsc.id });
  
  const {
    enabled = true,
    refetchInterval,
    cacheTime = 1000 * 60 * 5, // 5 分鐘
    staleTime = 1000 * 30 // 30 秒
  } = options;

  return useQuery({
    queryKey: ['batchContractRead', calls.map(call => 
      `${call.address}-${call.functionName}-${JSON.stringify(call.args)}`
    )],
    
    queryFn: async (): Promise<T> => {
      if (!publicClient || calls.length === 0) {
        return {} as T;
      }

      try {
        logger.info(`Executing batch read for ${calls.length} contracts`);
        
        // 準備 multicall 參數
        const multicallParams = calls.map((call, index) => ({
          address: call.address,
          abi: call.abi,
          functionName: call.functionName,
          args: call.args || []
        }));

        // 執行 multicall
        const results = await multicall(publicClient, {
          contracts: multicallParams,
          allowFailure: true
        });

        // 處理結果
        const processedResults: Record<string, BatchReadResult> = {};
        
        results.forEach((result, index) => {
          const call = calls[index];
          const key = call.key || `${call.functionName}_${index}`;
          
          if (result.status === 'success') {
            processedResults[key] = {
              success: true,
              result: result.result
            };
          } else {
            processedResults[key] = {
              success: false,
              error: new Error(result.error || 'Unknown error')
            };
            logger.warn(`Batch read failed for ${call.functionName}:`, result.error);
          }
        });

        logger.info(`Batch read completed: ${Object.keys(processedResults).length} results`);
        return processedResults as T;
        
      } catch (error) {
        logger.error('Batch contract read failed:', error);
        throw error;
      }
    },
    
    enabled: enabled && !!publicClient && calls.length > 0,
    refetchInterval,
    cacheTime,
    staleTime,
    
    // 錯誤重試策略
    retry: (failureCount, error) => {
      if (failureCount >= 3) return false;
      
      // 網路錯誤重試
      if (error.message.includes('network') || error.message.includes('timeout')) {
        return true;
      }
      
      return false;
    },
    
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
}

/**
 * 特化的玩家數據批量讀取
 * 針對玩家概覽頁面優化
 */
export function usePlayerDataBatch(address: `0x${string}` | undefined) {
  const calls: BatchReadCall[] = address ? [
    {
      address: '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787' as `0x${string}`, // PlayerVault
      abi: [
        {
          "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
          "name": "balanceOf",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: 'balanceOf',
      args: [address],
      key: 'playerVaultBalance'
    },
    {
      address: '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787' as `0x${string}`, // PlayerVault
      abi: [
        {
          "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
          "name": "getReferrer",
          "outputs": [{"internalType": "address", "name": "", "type": "address"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: 'getReferrer',
      args: [address],
      key: 'referrer'
    },
    {
      address: '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C' as `0x${string}`, // VIPStaking
      abi: [
        {
          "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
          "name": "getStakeAmount",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        }
      ],
      functionName: 'getStakeAmount',
      args: [address],
      key: 'vipStakeAmount'
    }
  ] : [];

  return useBatchContractRead<{
    playerVaultBalance: BatchReadResult<bigint>;
    referrer: BatchReadResult<`0x${string}`>;
    vipStakeAmount: BatchReadResult<bigint>;
  }>(calls, {
    enabled: !!address,
    staleTime: 1000 * 60, // 1 分鐘
    cacheTime: 1000 * 60 * 10 // 10 分鐘
  });
}

/**
 * NFT 批量資訊讀取
 * 針對資產頁面和升星頁面優化
 */
export function useNftDataBatch(
  contractAddress: `0x${string}`,
  tokenIds: bigint[],
  abi: any[]
) {
  const calls: BatchReadCall[] = tokenIds.flatMap(tokenId => [
    {
      address: contractAddress,
      abi,
      functionName: 'ownerOf',
      args: [tokenId],
      key: `owner_${tokenId}`
    },
    {
      address: contractAddress,
      abi,
      functionName: 'tokenURI',
      args: [tokenId],
      key: `tokenURI_${tokenId}`
    }
  ]);

  return useBatchContractRead(calls, {
    enabled: tokenIds.length > 0,
    staleTime: 1000 * 60 * 5, // 5 分鐘（NFT 資料相對穩定）
    cacheTime: 1000 * 60 * 30 // 30 分鐘
  });
}

/**
 * 價格批量查詢
 * 針對鑄造頁面優化
 */
export function usePriceBatch(contractAddresses: `0x${string}`[], abi: any[]) {
  const calls: BatchReadCall[] = contractAddresses.map((address, index) => ({
    address,
    abi,
    functionName: 'mintPrice',
    args: [],
    key: `mintPrice_${index}`
  }));

  return useBatchContractRead(calls, {
    enabled: contractAddresses.length > 0,
    staleTime: 1000 * 60 * 2, // 2 分鐘（價格變動較頻繁）
    cacheTime: 1000 * 60 * 10 // 10 分鐘
  });
}

/**
 * 管理員數據批量讀取
 * 針對管理頁面優化
 */
export function useAdminDataBatch(contractAddresses: Array<{address: `0x${string}`, abi: any[]}>) {
  const calls: BatchReadCall[] = contractAddresses.flatMap((contract, index) => [
    {
      address: contract.address,
      abi: contract.abi,
      functionName: 'paused',
      args: [],
      key: `paused_${index}`
    },
    {
      address: contract.address,
      abi: contract.abi,
      functionName: 'owner',
      args: [],
      key: `owner_${index}`
    }
  ]);

  return useBatchContractRead(calls, {
    enabled: contractAddresses.length > 0,
    staleTime: 1000 * 30, // 30 秒（管理狀態需要較新）
    cacheTime: 1000 * 60 * 5 // 5 分鐘
  });
}