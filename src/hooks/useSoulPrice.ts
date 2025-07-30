// useSoulPrice.ts
// 獲取 SOUL 代幣的 USD 價格

import { useCachedReadContract } from './useCachedReadContract';
import { getContractWithABI } from '../config/contractsWithABI';
import { formatUnits } from 'viem';

export const useSoulPrice = () => {
    const oracleContract = getContractWithABI('ORACLE', 56);
    
    const { data: priceData, isLoading, error } = useCachedReadContract({
        address: oracleContract?.address,
        abi: oracleContract?.abi,
        functionName: 'getLatestPrice',
        args: [],
        cacheKey: 'soulPrice',
        cacheTime: 300000 // 5 分鐘緩存
    });
    
    // Oracle 返回的價格是 8 位小數
    const priceInUsd = priceData ? Number(formatUnits(priceData as bigint, 8)) : 0;
    
    return {
        priceInUsd,
        isLoading,
        error,
        formatSoulToUsd: (soulAmount: string | number) => {
            const amount = typeof soulAmount === 'string' ? parseFloat(soulAmount) : soulAmount;
            return (amount * priceInUsd).toFixed(2);
        }
    };
};