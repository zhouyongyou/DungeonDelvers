import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useBalance } from 'wagmi';
import { formatEther, maxUint256 } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useTransactionStore } from '../stores/useTransactionStore';

// 定義支付方式的型別
type PaymentSource = 'wallet' | 'vault';
type NftToMint = 'hero' | 'relic';

// 【第1步：新增】為自定義 Hook 定義一個清晰的回傳型別介面
interface UseMintLogicReturn {
    requiredAmount: bigint;
    balance: bigint;
    needsApproval: boolean;
    handleApprove: () => Promise<void>;
    isLoading: boolean;
}

// -----------------------------------
// 處理鑄造邏輯的自定義 Hook (V2 版本)
// -----------------------------------
const useMintLogic = (type: NftToMint, quantity: number, paymentSource: PaymentSource): UseMintLogicReturn => {
    const { address, chainId } = useAccount();
    const { addTransaction } = useTransactionStore();

    // 獲取 V2 合約
    const contractConfig = getContract(chainId, type);
    const soulShardContract = getContract(chainId, 'soulShard');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');

    // 讀取價格和餘額
    const { data: requiredAmount, isLoading: isLoadingPrice } = useReadContract({
        ...contractConfig,
        functionName: 'getRequiredSoulShardAmount',
        args: [BigInt(quantity)],
        query: { enabled: !!contractConfig && quantity > 0 },
    });
    
    const { data: tokenBalance } = useBalance({ address, token: soulShardContract?.address });
    const { data: vaultData } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'playerInfo',
        args: [address!],
        query: { enabled: !!address && !!dungeonCoreContract, refetchInterval: 5000 },
    });
    const vaultBalance = useMemo(() => (Array.isArray(vaultData) ? vaultData[0] as bigint : 0n), [vaultData]);

    // 讀取授權狀態
    const { data: tokenAllowance, refetch: refetchTokenAllowance } = useReadContract({
        ...soulShardContract,
        functionName: 'allowance',
        args: [address!, contractConfig?.address!],
        query: { enabled: !!address && !!contractConfig && !!soulShardContract && paymentSource === 'wallet' },
    });

    const { data: spenderApproval, refetch: refetchSpenderApproval } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'isSpenderApproved',
        args: [address!, contractConfig?.address!],
        query: { enabled: !!address && !!contractConfig && !!dungeonCoreContract && paymentSource === 'vault' },
    });

    const { writeContractAsync } = useWriteContract();

    // 【修正】更安全的型別檢查
    const needsApproval = useMemo(() => {
        if (typeof requiredAmount !== 'bigint' || requiredAmount === 0n) return false;
        
        if (paymentSource === 'wallet') {
            return typeof tokenAllowance === 'bigint' && tokenAllowance < requiredAmount;
        }
        if (paymentSource === 'vault') {
            return !spenderApproval;
        }
        return false;
    }, [paymentSource, requiredAmount, tokenAllowance, spenderApproval]);
    
    // 【修正】拆分 writeContractAsync 呼叫以確保型別安全
    const handleApprove = async () => {
        if (!needsApproval || !contractConfig) return;
        
        try {
            if (paymentSource === 'wallet') {
                if (!soulShardContract) return;
                const hash = await writeContractAsync({
                    address: soulShardContract.address,
                    abi: soulShardContract.abi,
                    functionName: 'approve',
                    args: [contractConfig.address, maxUint256]
                });
                addTransaction({ hash, description: `批准 ${type} 合約使用代幣` });
                setTimeout(() => refetchTokenAllowance(), 1000);
            } else { // paymentSource === 'vault'
                if (!dungeonCoreContract) return;
                 const hash = await writeContractAsync({
                    address: dungeonCoreContract.address,
                    abi: dungeonCoreContract.abi,
                    functionName: 'approveSpender',
                    args: [contractConfig.address, true]
                });
                addTransaction({ hash, description: `授權 ${type} 合約動用金庫` });
                setTimeout(() => refetchSpenderApproval(), 1000);
            }
        } catch (e: any) {
             // 由 TransactionWatcher 處理錯誤，此處僅捕獲，防止程式崩潰
        }
    };

    return {
        requiredAmount: typeof requiredAmount === 'bigint' ? requiredAmount : 0n,
        balance: paymentSource === 'wallet' ? (tokenBalance?.value ?? 0n) : vaultBalance,
        needsApproval,
        handleApprove,
        isLoading: isLoadingPrice,
    };
};

// -----------------------------------
// MintCard 元件
// -----------------------------------
const MintCard: React.FC<{ type: NftToMint; options: number[] }> = ({ type, options }) => {
    const { chainId } = useAccount();
    const { showToast } = useAppToast();
    const [quantity, setQuantity] = useState(1);
    const [paymentSource, setPaymentSource] = useState<PaymentSource>('wallet');
    const { addTransaction } = useTransactionStore();

    const { requiredAmount, balance, needsApproval, handleApprove, isLoading } = useMintLogic(type, quantity, paymentSource);
    const { writeContractAsync, isPending: isMinting } = useWriteContract();
    
    const title = type === 'hero' ? '英雄' : '聖物';
    const contractConfig = getContract(chainId, type);

    const handleMint = async () => {
        if (!contractConfig) return;
        // 【修正】更安全的型別檢查
        if (balance < requiredAmount) {
            return showToast(`${paymentSource === 'wallet' ? '錢包' : '金庫'}餘額不足`, 'error');
        }
        if (needsApproval) {
            return showToast(`請先完成授權`, 'error');
        }

        try {
            const description = `從${paymentSource === 'wallet' ? '錢包' : '金庫'}鑄造 ${quantity} 個${title}`;
            let hash;

            // 【修正】拆分 writeContractAsync 呼叫以確保型別安全
            if (paymentSource === 'wallet') {
                if (quantity === 1) {
                    hash = await writeContractAsync({ ...contractConfig, functionName: 'mintSingle' });
                } else {
                    hash = await writeContractAsync({ ...contractConfig, functionName: 'mintBatch', args: [BigInt(quantity)] });
                }
            } else { // paymentSource === 'vault'
                hash = await writeContractAsync({ ...contractConfig, functionName: 'mintWithVault', args: [BigInt(quantity)] });
            }
            
            addTransaction({ hash, description });

        } catch (error: any) {
            if (!error.message.includes('User rejected the request')) {
                showToast(error.message.split('\n')[0], 'error');
            }
        }
    };
    
    return (
        <div className="card-bg p-6 rounded-xl shadow-lg flex flex-col items-center h-full">
            <h3 className="section-title">招募{title}</h3>
            <div className="flex items-center justify-center gap-2 my-4">
                {options.map(q => 
                    <button key={q} onClick={() => setQuantity(q)} className={`w-12 h-12 rounded-full font-bold text-lg transition-all flex items-center justify-center border-2 ${quantity === q ? 'bg-indigo-500 text-white border-transparent scale-110' : 'bg-white/50 hover:bg-white border-gray-300'}`}>
                        {q}
                    </button>
                )}
            </div>
            
            <div className="w-full my-4">
                <label className="block text-sm font-medium mb-2 text-center">選擇支付方式</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                    <button onClick={() => setPaymentSource('wallet')} className={`px-4 py-2 rounded-md text-sm font-semibold transition ${paymentSource === 'wallet' ? 'bg-white dark:bg-gray-900 text-indigo-600 shadow' : 'text-gray-600 dark:text-gray-300'}`}>錢包支付</button>
                    <button onClick={() => setPaymentSource('vault')} className={`px-4 py-2 rounded-md text-sm font-semibold transition ${paymentSource === 'vault' ? 'bg-white dark:bg-gray-900 text-indigo-600 shadow' : 'text-gray-600 dark:text-gray-300'}`}>金庫支付 (免稅)</button>
                </div>
                <p className="text-xs text-center mt-2 text-gray-500">
                    {paymentSource === 'wallet' ? '錢包餘額' : '金庫餘額'}: {parseFloat(formatEther(balance)).toFixed(4)} $SoulShard
                </p>
            </div>

            <div className="text-center mb-4 min-h-[72px] flex-grow flex flex-col justify-center">
                {isLoading ? <LoadingSpinner color="border-gray-500" /> : 
                    <div>
                        <p className="text-lg">總價:</p>
                        <p className="font-bold text-yellow-600 text-2xl">{formatEther(requiredAmount)}</p>
                        <p className="text-xs text-gray-500">$SoulShard</p>
                    </div>
                }
            </div>
            
            {needsApproval ? (
                <ActionButton onClick={handleApprove} isLoading={isMinting} className="w-48 h-12">授權</ActionButton>
            ) : (
                // 【修正】更安全的 disabled 判斷
                <ActionButton onClick={handleMint} isLoading={isMinting} disabled={isLoading || isMinting || balance < requiredAmount} className="w-48 h-12">
                    {isMinting ? '請在錢包確認' : `招募 ${quantity} 個`}
                </ActionButton>
            )}
             <p className="text-xs text-center text-gray-500 mt-2 px-2 h-8">
                {quantity > 1 && `您的本次批量鑄造將為社群更新隨機數種子！`}
            </p>
        </div>
    );
};


const MintPage: React.FC = () => {
    const heroMintOptions = [1, 5, 10, 20, 50];
    const relicMintOptions = [1, 5, 10, 20];

    return (
        <section>
            <h2 className="page-title">鑄造工坊</h2>
            <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <MintCard type="hero" options={heroMintOptions} />
                    <MintCard type="relic" options={relicMintOptions} />
                </div>
            </div>
        </section>
    );
};

export default MintPage;
