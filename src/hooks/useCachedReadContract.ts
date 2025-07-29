// src/hooks/useCachedReadContract.ts
// 提供頁面級別緩存的 useReadContract hook，避免重複 RPC 請求

import { useReadContract, type UseReadContractParameters, type UseReadContractReturnType } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

interface CachedReadContractConfig extends UseReadContractParameters {
    cacheKey?: string;
    cacheTime?: number; // 緩存時間（毫秒）
}

export function useCachedReadContract<
    const abi extends readonly unknown[] = readonly unknown[],
    functionName extends string = string,
    args extends readonly unknown[] = readonly unknown[]
>(
    config: CachedReadContractConfig
): UseReadContractReturnType<abi, functionName, args> {
    const queryClient = useQueryClient();
    const { cacheKey, cacheTime = 60000, ...wagmiConfig } = config;
    
    // 使用標準的 useReadContract
    const result = useReadContract({
        ...wagmiConfig,
        query: {
            ...wagmiConfig.query,
            // 設置更長的緩存時間
            staleTime: cacheTime,
            gcTime: cacheTime * 2,
        }
    });
    
    // 如果提供了 cacheKey，在組件卸載後保留數據
    useEffect(() => {
        if (cacheKey && result.data !== undefined) {
            // 將數據存儲到全局緩存
            queryClient.setQueryData(['cachedContract', cacheKey], {
                data: result.data,
                timestamp: Date.now()
            });
        }
    }, [cacheKey, result.data, queryClient]);
    
    // 在組件掛載時檢查緩存
    useEffect(() => {
        if (cacheKey) {
            const cached = queryClient.getQueryData(['cachedContract', cacheKey]) as {
                data: any;
                timestamp: number;
            } | undefined;
            
            if (cached && Date.now() - cached.timestamp < cacheTime) {
                // 如果緩存仍然有效，使用緩存數據
                queryClient.setQueryData(
                    result.queryKey,
                    cached.data
                );
            }
        }
    }, [cacheKey, cacheTime, queryClient, result.queryKey]);
    
    return result;
}

// 批量讀取合約並緩存
export function useCachedReadContracts<
    const contracts extends readonly unknown[] = readonly unknown[]
>(
    configs: contracts,
    options?: {
        cacheTime?: number;
        batchCacheKey?: string;
    }
) {
    const queryClient = useQueryClient();
    const { cacheTime = 60000, batchCacheKey } = options || {};
    
    const results = configs.map((config: any) => 
        useCachedReadContract({
            ...config,
            cacheTime,
            cacheKey: batchCacheKey ? `${batchCacheKey}-${config.functionName}` : undefined
        })
    );
    
    return results;
}