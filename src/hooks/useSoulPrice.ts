// useSoulPrice.ts
// 獲取 SOUL 代幣的 USD 價格

import { useReadContract } from 'wagmi';
import { getContractWithABI } from '../config/contractsWithABI';
import { formatUnits } from 'viem';

export const useSoulPrice = () => {
    // 改用與 MintPage 相同的方法：通過 DungeonCore 獲取準確價格
    const dungeonCoreContract = getContractWithABI('DUNGEONCORE');
    
    // 使用 1 USD 作為基準計算 SOUL 價格
    const oneUsdInWei = BigInt(10) ** BigInt(18); // 1 USD with 18 decimals
    
    const { data: soulAmountFor1USD, isLoading, error } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'getSoulShardAmountForUSD',
        args: [oneUsdInWei],
        query: {
            enabled: !!dungeonCoreContract?.address && !!dungeonCoreContract?.abi,
            staleTime: 2 * 60 * 1000, // 2 分鐘
            retry: 3
        }
    });
    
    let priceInUsd: number | null = null;
    
    if (soulAmountFor1USD) {
        try {
            // 計算 1 SOUL 的 USD 價格
            // 如果 1 USD = X SOUL，那麼 1 SOUL = 1/X USD
            const soulFor1USD = Number(formatUnits(soulAmountFor1USD as bigint, 18));
            
            if (soulFor1USD > 0) {
                const calculatedPrice = 1 / soulFor1USD;
                
                // 合理性檢查：SOUL 價格應該在 $0.00001 - $0.1 之間
                if (calculatedPrice >= 0.00001 && calculatedPrice <= 0.1) {
                    priceInUsd = calculatedPrice;
                    console.log(`[useSoulPrice] SOUL 價格: $${priceInUsd.toFixed(8)} (${soulFor1USD.toFixed(2)} SOUL = $1)`);
                } else {
                    console.warn(`[useSoulPrice] 計算出的 SOUL 價格異常: $${calculatedPrice.toFixed(8)}，不使用此價格`);
                    priceInUsd = null;
                }
            } else {
                console.error('[useSoulPrice] 獲得的 SOUL 數量為 0，無法計算價格');
                priceInUsd = null;
            }
        } catch (err) {
            console.error('[useSoulPrice] 價格計算失敗:', err);
            priceInUsd = null;
        }
    } else {
        console.info('[useSoulPrice] 無價格數據');
        priceInUsd = null;
    }
    
    return {
        priceInUsd,
        isLoading,
        error,
        hasValidPrice: priceInUsd !== null,
        formatSoulToUsd: (soulAmount: string | number | bigint) => {
            if (priceInUsd === null) return '-';
            
            let amount: number;
            if (typeof soulAmount === 'bigint') {
                // 處理 bigint，假設是 wei 單位 (18 decimals)
                amount = Number(soulAmount) / 1e18;
            } else {
                amount = typeof soulAmount === 'string' ? parseFloat(soulAmount) : soulAmount;
            }
            
            // 當金額為 0 時，顯示 0.00 而不是 -
            if (amount === 0) return '0.00';
            
            return (amount * priceInUsd).toFixed(2);
        }
    };
};