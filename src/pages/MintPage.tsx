import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useBalance } from 'wagmi';
import { formatEther, maxUint256, type Abi } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useTransactionStore } from '../stores/useTransactionStore';
import type { NftType } from '../types/nft';

// =================================================================
// Section: 型別定義與輔助 Hook
// =================================================================

type PaymentSource = 'wallet' | 'vault';

/**
 * @dev 一個自定義 Hook，專門負責計算鑄造所需的成本和檢查用戶的授權狀態。
 * 它只關心「計算」和「檢查」，不處理實際的交易發送。
 * @returns {object} 包含所需代幣數量、用戶餘額、是否需要授權等資訊的物件。
 */
const useMintLogic = (type: NftType, quantity: number, paymentSource: PaymentSource) => {
    const { address, chainId } = useAccount();

    const contractConfig = getContract(chainId, type);
    const soulShardContract = getContract(chainId, 'soulShard');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');

    // 獲取鑄造價格 (USD)
    const { data: mintPriceUSD, isLoading: isLoadingPrice } = useReadContract({
        ...contractConfig,
        functionName: 'mintPriceUSD',
        query: { enabled: !!contractConfig },
    });

    // 將 USD 價格轉換為 SoulShard 代幣數量
    const { data: requiredAmountPerUnit, isLoading: isLoadingConversion } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'getSoulShardAmountForUSD',
        args: [mintPriceUSD || 0n],
        query: { enabled: !!dungeonCoreContract && typeof mintPriceUSD === 'bigint' },
    });
    
    // 根據數量計算總價
    const totalRequiredAmount = useMemo(() => {
        if (!requiredAmountPerUnit) return 0n;
        return requiredAmountPerUnit * BigInt(quantity);
    }, [requiredAmountPerUnit, quantity]);

    // 獲取用戶的錢包餘額和金庫餘額
    const { data: walletBalance } = useBalance({ address, token: soulShardContract?.address });
    const { data: vaultData } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'playerInfo',
        args: [address!],
        query: { enabled: !!address && !!dungeonCoreContract, refetchInterval: 5000 },
    });
    const vaultBalance = useMemo(() => (Array.isArray(vaultData) ? vaultData[0] as bigint : 0n), [vaultData]);

    // 根據支付方式，檢查是否需要授權
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        ...soulShardContract,
        functionName: 'allowance',
        args: [address!, contractConfig?.address!],
        query: { enabled: !!address && !!contractConfig && paymentSource === 'wallet' },
    });

    const needsApproval = useMemo(() => {
        if (paymentSource !== 'wallet' || !allowance || !totalRequiredAmount) return false;
        return allowance < totalRequiredAmount;
    }, [paymentSource, allowance, totalRequiredAmount]);

    return {
        requiredAmount: totalRequiredAmount,
        balance: paymentSource === 'wallet' ? (walletBalance?.value ?? 0n) : vaultBalance,
        needsApproval,
        refetchAllowance,
        isLoading: isLoadingPrice || isLoadingConversion,
    };
};

// =================================================================
// Section: MintCard 子元件
// =================================================================

interface MintCardProps {
    type: 'hero' | 'relic';
    options: number[];
}

const MintCard: React.FC<MintCardProps> = ({ type, options }) => {
    const { chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    
    const [quantity, setQuantity] = useState(1);
    const [paymentSource, setPaymentSource] = useState<PaymentSource>('wallet');

    const { requiredAmount, balance, needsApproval, refetchAllowance, isLoading: isLoadingPrice } = useMintLogic(type, quantity, paymentSource);
    const { writeContractAsync, isPending: isMinting } = useWriteContract();
    
    const title = type === 'hero' ? '英雄' : '聖物';
    const contractConfig = getContract(chainId, type);
    const soulShardContract = getContract(chainId, 'soulShard');

    const handleApprove = async () => {
        if (!contractConfig || !soulShardContract) return;
        try {
            const hash = await writeContractAsync({
                address: soulShardContract.address,
                abi: soulShardContract.abi,
                functionName: 'approve',
                args: [contractConfig.address, maxUint256]
            });
            addTransaction({ hash, description: `批准 ${title} 合約使用代幣` });
            // 等待交易確認後再刷新授權狀態
            setTimeout(() => refetchAllowance(), 2000); 
        } catch (e: any) {
             if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "授權失敗", "error");
            }
        }
    };

    const handleMint = async () => {
        if (!contractConfig) return;
        if (balance < requiredAmount) return showToast(`${paymentSource === 'wallet' ? '錢包' : '金庫'}餘額不足`, 'error');
        if (needsApproval) return showToast(`請先完成授權`, 'error');

        try {
            const description = `從${paymentSource === 'wallet' ? '錢包' : '金庫'}鑄造 ${quantity} 個${title}`;
            // 根據支付方式和數量選擇正確的函式
            const functionName = paymentSource === 'wallet' ? (quantity === 1 ? 'mintSingle' : 'mintBatch') : 'mintWithVault';
            const args = quantity > 1 ? [BigInt(quantity)] : [];

            const hash = await writeContractAsync({
                address: contractConfig.address,
                abi: contractConfig.abi as Abi,
                functionName,
                args,
            });
            addTransaction({ hash, description });
        } catch (error: any) {
            if (!error.message.includes('User rejected the request')) {
                showToast(error.shortMessage || "鑄造失敗", "error");
            }
        }
    };
    
    const actionButton = needsApproval 
        ? <ActionButton onClick={handleApprove} isLoading={isMinting} className="w-48 h-12">授權</ActionButton>
        : <ActionButton onClick={handleMint} isLoading={isMinting || isLoadingPrice} disabled={isLoadingPrice || balance < requiredAmount} className="w-48 h-12">
            {isMinting ? '請在錢包確認' : `招募 ${quantity} 個`}
          </ActionButton>;

    return (
        <div className="card-bg p-6 rounded-xl shadow-lg flex flex-col items-center h-full">
            <h3 className="section-title">招募{title}</h3>
            <div className="flex items-center justify-center gap-2 my-4">
                {options.map(q => 
                    <button key={q} onClick={() => setQuantity(q)} className={`w-12 h-12 rounded-full font-bold text-lg transition-all flex items-center justify-center border-2 ${quantity === q ? 'bg-indigo-500 text-white border-transparent scale-110' : 'bg-white/10 hover:bg-white/20 border-gray-600'}`}>
                        {q}
                    </button>
                )}
            </div>
            
            <div className="w-full my-4">
                <label className="block text-sm font-medium mb-2 text-center text-gray-400">選擇支付方式</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-900/50 rounded-lg">
                    <button onClick={() => setPaymentSource('wallet')} className={`px-4 py-2 rounded-md text-sm font-semibold transition ${paymentSource === 'wallet' ? 'bg-gray-700 text-white shadow' : 'text-gray-300'}`}>錢包支付</button>
                    <button onClick={() => setPaymentSource('vault')} className={`px-4 py-2 rounded-md text-sm font-semibold transition ${paymentSource === 'vault' ? 'bg-gray-700 text-white shadow' : 'text-gray-300'}`}>金庫支付 (免稅)</button>
                </div>
                <p className="text-xs text-center mt-2 text-gray-500">
                    {paymentSource === 'wallet' ? '錢包餘額' : '金庫餘額'}: {parseFloat(formatEther(balance)).toFixed(4)} $SoulShard
                </p>
            </div>

            <div className="text-center mb-4 min-h-[72px] flex-grow flex flex-col justify-center">
                {isLoadingPrice ? <LoadingSpinner color="border-gray-500" /> : 
                    <div>
                        <p className="text-lg text-gray-400">總價:</p>
                        <p className="font-bold text-yellow-400 text-2xl">{parseFloat(formatEther(requiredAmount)).toFixed(4)}</p>
                        <p className="text-xs text-gray-500">$SoulShard</p>
                    </div>
                }
            </div>
            
            {actionButton}
            <p className="text-xs text-center text-gray-500 mt-2 px-2 h-8">
                {quantity > 1 && `您的本次批量鑄造將為社群更新隨機數種子！`}
            </p>
        </div>
    );
};

// =================================================================
// Section: MintPage 主元件
// =================================================================

const MintPage: React.FC = () => {
    const heroMintOptions = [1, 5, 10, 20, 50];
    const relicMintOptions = [1, 5, 10, 20];

    return (
        <section>
            <h2 className="page-title">鑄造工坊</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <MintCard type="hero" options={heroMintOptions} />
                <MintCard type="relic" options={relicMintOptions} />
            </div>
        </section>
    );
};

export default MintPage;
