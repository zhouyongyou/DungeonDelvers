// src/pages/MintPage.tsx

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useBalance } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query'; // ★ 修正 #1：從正確的套件導入
import { formatEther, maxUint256, type Abi } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useTransactionStore } from '../stores/useTransactionStore';
import { bsc, bscTestnet } from 'wagmi/chains';

// =================================================================
// Section: 型別定義與輔助 Hook
// =================================================================

type PaymentSource = 'wallet' | 'vault';

/**
 * @dev 一個自定義 Hook，專門負責計算鑄造所需的成本和檢查用戶的授權狀態。
 * @returns {object} 包含所需代幣數量、用戶餘額、是否需要授權等資訊的物件。
 */
const useMintLogic = (type: 'hero' | 'relic', quantity: number, paymentSource: PaymentSource) => {
    const { address, chainId } = useAccount();

    // ★ 核心修正 #2: 在 Hook 內部加入型別防衛，確保後續操作的型別安全
    if (!chainId || (chainId !== bsc.id && chainId !== bscTestnet.id)) {
        return {
            requiredAmount: 0n,
            balance: 0n,
            needsApproval: false,
            isLoading: true,
            platformFee: 0n,
        };
    }
    
    // 現在 TypeScript 知道 chainId 是 56 或 97，所以 getContract 可以正確推斷型別
    const contractConfig = getContract(chainId, type);
    const soulShardContract = getContract(chainId, 'soulShard');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    const playerVaultContract = getContract(chainId, 'playerVault');

    const { data: mintPriceUSD, isLoading: isLoadingPrice } = useReadContract({
        ...contractConfig,
        functionName: 'mintPriceUSD',
        query: { enabled: !!contractConfig },
    });

    const { data: requiredAmountPerUnit, isLoading: isLoadingConversion } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'getSoulShardAmountForUSD',
        args: [(mintPriceUSD as bigint) || 0n],
        query: { enabled: !!dungeonCoreContract && typeof mintPriceUSD === 'bigint' },
    });
    
    const totalRequiredAmount = useMemo(() => {
        if (!requiredAmountPerUnit) return 0n;
        return requiredAmountPerUnit * BigInt(quantity);
    }, [requiredAmountPerUnit, quantity]);

    const { data: walletBalance } = useBalance({ 
        address, 
        token: soulShardContract?.address,
        query: { enabled: !!address && !!soulShardContract }
    });
    
    const { data: vaultInfo } = useReadContract({
        ...playerVaultContract,
        functionName: 'playerInfo',
        args: [address!],
        query: { 
            enabled: !!address && !!playerVaultContract,
            refetchInterval: 5000 
        },
    });
    const vaultBalance = useMemo(() => (Array.isArray(vaultInfo) ? vaultInfo[0] as bigint : 0n), [vaultInfo]);

    const { data: allowance } = useReadContract({
        ...soulShardContract,
        functionName: 'allowance',
        args: [address!, contractConfig?.address!],
        query: { 
            enabled: !!address && !!soulShardContract && !!contractConfig && paymentSource === 'wallet',
        },
    });

    const needsApproval = useMemo(() => {
        if (paymentSource !== 'wallet' || typeof allowance !== 'bigint' || !totalRequiredAmount) {
            return false;
        }
        return allowance < totalRequiredAmount;
    }, [paymentSource, allowance, totalRequiredAmount]);
    
    const { data: platformFee } = useReadContract({
        ...contractConfig,
        functionName: 'platformFee',
        query: { enabled: !!contractConfig },
    });

    return {
        requiredAmount: totalRequiredAmount,
        balance: paymentSource === 'wallet' ? (walletBalance?.value ?? 0n) : vaultBalance,
        needsApproval,
        isLoading: isLoadingPrice || isLoadingConversion,
        platformFee: platformFee as bigint ?? 0n,
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
    const { chainId, address } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const queryClient = useQueryClient();
    
    const [quantity, setQuantity] = useState(1);
    const [paymentSource, setPaymentSource] = useState<PaymentSource>('wallet');

    const { requiredAmount, balance, needsApproval, isLoading: isLoadingPrice, platformFee } = useMintLogic(type, quantity, paymentSource);
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
            // 授權後，主動讓相關的 allowance 查詢失效，以觸發重新獲取
            await queryClient.invalidateQueries({ 
                queryKey: ['readContract', { address: soulShardContract.address, functionName: 'allowance', args: [address!, contractConfig.address], chainId }]
            });
        } catch (e: any) {
             if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "授權失敗", "error");
            }
        }
    };

    const handleMint = async () => {
        if (!contractConfig) return;
        if (balance < requiredAmount) return showToast(`${paymentSource === 'wallet' ? '錢包' : '金庫'}餘額不足`, 'error');
        if (paymentSource === 'wallet' && needsApproval) return showToast(`請先完成授權`, 'error');

        try {
            const description = `從${paymentSource === 'wallet' ? '錢包' : '金庫'}鑄造 ${quantity} 個${title}`;
            const functionName = paymentSource === 'wallet' ? 'mintFromWallet' : 'mintFromVault';
            
            const hash = await writeContractAsync({
                address: contractConfig.address,
                abi: contractConfig.abi as Abi,
                functionName,
                args: [BigInt(quantity)],
                value: platformFee * BigInt(quantity),
            });
            addTransaction({ hash, description });
        } catch (error: any) {
            if (!error.message.includes('User rejected the request')) {
                showToast(error.shortMessage || "鑄造失敗", "error");
            }
        }
    };
    
    const actionButton = (paymentSource === 'wallet' && needsApproval)
        ? <ActionButton onClick={handleApprove} isLoading={isMinting} className="w-48 h-12">授權</ActionButton>
        : <ActionButton onClick={handleMint} isLoading={isMinting || isLoadingPrice} disabled={!address || isLoadingPrice || balance < requiredAmount} className="w-48 h-12">
            {isMinting ? '請在錢包確認' : (address ? `招募 ${quantity} 個` : '請先連接錢包')}
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
                    {paymentSource === 'wallet' ? '錢包餘額' : '金庫餘額'}: {address ? parseFloat(formatEther(balance)).toFixed(4) : '0.00'} $SoulShard
                </p>
            </div>

            <div className="text-center mb-4 min-h-[72px] flex-grow flex flex-col justify-center">
                {isLoadingPrice ? <LoadingSpinner color="border-gray-500" /> : 
                    <div>
                        <p className="text-lg text-gray-400">總價:</p>
                        <p className="font-bold text-yellow-400 text-2xl">{parseFloat(formatEther(requiredAmount)).toFixed(4)}</p>
                        <p className="text-xs text-gray-500">$SoulShard + {formatEther(platformFee * BigInt(quantity))} BNB</p>
                    </div>
                }
            </div>
            
            {actionButton}
            <p className="text-xs text-center text-gray-500 mt-2 px-2 h-8">
                {`每次鑄造都會為社群更新隨機數種子！`}
            </p>
        </div>
    );
};

// =================================================================
// Section: MintPage 主元件
// =================================================================

const MintPage: React.FC = () => {
    const { chainId } = useAccount();
    const heroMintOptions = [1, 5, 10, 20, 50];
    const relicMintOptions = [1, 5, 10, 20, 50];
    
    // 在頁面元件層級進行網路檢查，提供清晰的用戶指引
    if (!chainId || (chainId !== bsc.id && chainId !== bscTestnet.id)) {
        return (
            <section>
                <h2 className="page-title">鑄造工坊</h2>
                <div className="card-bg p-10 rounded-xl text-center text-gray-400">
                    <p>請先連接到支援的網路 (BSC 或 BSC 測試網) 以使用鑄造功能。</p>
                </div>
            </section>
        );
    }

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
