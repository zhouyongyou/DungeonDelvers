// src/pages/ProvisionsPage.tsx

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { formatEther } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useTransactionStore } from '../stores/useTransactionStore';
import type { PartyNft } from '../types/nft';

// 【修改】讓元件接收一個可選的回呼函式
interface ProvisionsPageProps {
    preselectedPartyId: bigint | null;
    onPurchaseSuccess?: () => void; // 購買成功後的回呼
}

const useBuyProvisionsLogic = (quantity: number) => {
    const { chainId } = useAccount();
    
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const playerVaultContract = getContract(chainId, 'playerVault');

    const { data: provisionPriceUSD, isLoading: isLoadingPrice } = useReadContract({ 
        ...dungeonMasterContract, 
        functionName: 'provisionPriceUSD', 
        query: { enabled: !!dungeonMasterContract } 
    });
    
    const { data: playerVaultAddress } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'playerVaultAddress',
        query: { enabled: !!dungeonCoreContract }
    });
    
    const { data: soulShardTokenAddress } = useReadContract({
        address: playerVaultAddress,
        abi: playerVaultContract?.abi,
        functionName: 'soulShardToken',
        query: { enabled: !!playerVaultAddress && !!playerVaultContract }
    });

    const { data: singleUnitPrice, isLoading: isLoadingConversion } = useReadContract({ 
        ...dungeonCoreContract, 
        functionName: 'getSoulShardAmountForUSD', 
        args: [provisionPriceUSD || 0n], 
        query: { enabled: !!dungeonCoreContract && typeof provisionPriceUSD === 'bigint' } 
    });
    
    const totalRequiredAmount = useMemo(() => {
        if (typeof singleUnitPrice !== 'bigint') return 0n;
        return singleUnitPrice * BigInt(quantity);
    }, [singleUnitPrice, quantity]);
    
    return { 
        totalRequiredAmount,
        isLoading: isLoadingPrice || isLoadingConversion,
    };
};

const ProvisionsPage: React.FC<ProvisionsPageProps> = ({ preselectedPartyId, onPurchaseSuccess }) => {
    const { chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const [quantity, setQuantity] = useState(1);
    const purchaseOptions = [1, 7, 14, 30];

    const { totalRequiredAmount, isLoading: isLogicLoading } = useBuyProvisionsLogic(quantity);
    const { writeContractAsync, isPending: isPurchasing } = useWriteContract();

    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');

    const handlePurchase = async () => {
        if (!dungeonMasterContract || !preselectedPartyId) return;
        try {
            const hash = await writeContractAsync({
                ...dungeonMasterContract,
                functionName: 'buyProvisions',
                args: [preselectedPartyId, BigInt(quantity)],
            });
            addTransaction({ hash, description: `為隊伍 #${preselectedPartyId} 購買 ${quantity} 次儲備` });
            if (onPurchaseSuccess) {
                onPurchaseSuccess(); // 觸發回呼
            }
        } catch (err: any) {
            if (!err.message.includes('User rejected the request')) {
                showToast(err.shortMessage || '購買失敗', 'error');
            }
        }
    };

    return (
        <div className="p-2 h-full flex flex-col">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">儲備是進行地下城遠征的必要物資。每次購買都將從您的**遊戲內金庫**扣款。</p>
            
            <div className="mb-6">
                <label className="block text-sm font-bold mb-2">選擇數量</label>
                <div className="flex flex-wrap gap-2">
                    {purchaseOptions.map(q => <button key={q} onClick={() => setQuantity(q)} className={`px-4 py-2 rounded-full font-bold transition ${quantity === q ? 'bg-indigo-500 text-white' : 'bg-white/10 dark:bg-gray-800 hover:bg-white/20 dark:hover:bg-gray-700'}`}>{q} 次</button>)}
                </div>
            </div>

            <div className="text-center my-4 flex-grow flex items-center justify-center">
                {isLogicLoading ? <LoadingSpinner/> : (
                    <div>
                        <p className="text-lg">總價:</p>
                        <p className="font-bold text-yellow-500 text-3xl">{parseFloat(formatEther(totalRequiredAmount)).toFixed(4)}</p>
                        <p className="text-xs text-gray-500">$SoulShard</p>
                    </div>
                )}
            </div>
            <ActionButton onClick={handlePurchase} isLoading={isPurchasing || isLogicLoading} className="w-full h-12">確認購買</ActionButton>
        </div>
    );
};

export default ProvisionsPage;