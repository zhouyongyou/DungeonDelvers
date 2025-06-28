import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, maxUint256, type Hash } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
// 【第1步：導入我們新的 store 和型別】
import { useTransactionStore } from '../stores/useTransactionStore';

type MintingStep = 'idle' | 'loading' | 'needsApproval' | 'approving' | 'approveConfirming' | 'readyToMint';
type NftToMint = 'hero' | 'relic';

/**
 * @notice 處理鑄造邏輯的自定義 Hook
 * @param type - 'hero' 或 'relic'
 * @param quantity - 鑄造數量
 */
const useMintLogic = (type: NftToMint, quantity: number) => {
    const { address, chainId } = useAccount();
    const [step, setStep] = useState<MintingStep>('idle');
    const { showToast } = useAppToast();
    const [approvalTxHash, setApprovalTxHash] = useState<Hash | undefined>();

    // 【第2步：從 store 獲取 addTransaction 函式】
    const { addTransaction } = useTransactionStore();

    const contractConfig = getContract(chainId, type);
    const soulShardContract = getContract(chainId, 'soulShard'); 

    const { data: mintPriceUSD } = useReadContract({
        address: contractConfig?.address,
        abi: contractConfig?.abi,
        functionName: 'mintPriceUSD',
        query: { enabled: !!contractConfig },
    });
    
    const { data: singleUnitPrice, isLoading: isLoadingPrice } = useReadContract({
        address: contractConfig?.address,
        abi: contractConfig?.abi,
        functionName: 'getSoulShardAmountForUSD',
        args: [mintPriceUSD || 0n], 
        query: { enabled: !!contractConfig && typeof mintPriceUSD === 'bigint' },
    });
    
    const totalRequiredAmount = useMemo(() => {
        if (typeof singleUnitPrice !== 'bigint') return 0n;
        return singleUnitPrice * BigInt(quantity);
    }, [singleUnitPrice, quantity]);

    const { data: allowance, refetch: refetchAllowance, isLoading: isLoadingAllowance } = useReadContract({
        address: soulShardContract?.address,
        abi: soulShardContract?.abi,
        functionName: 'allowance',
        args: [address!, contractConfig?.address!],
        query: { enabled: !!address && !!contractConfig && !!soulShardContract },
    });

    // 【修改】將 useWriteContract 簡化，我們將在 handleApprove 中使用異步版本
    const { writeContractAsync: approveAsync, isPending: isApproving } = useWriteContract();
    
    const { isLoading: isConfirmingApproval, isSuccess: isConfirmed, isError: isConfirmError } = useWaitForTransactionReceipt({
        hash: approvalTxHash,
    });

    useEffect(() => {
        if (isConfirmed) {
            showToast('授權成功！', 'success');
            refetchAllowance();
            setApprovalTxHash(undefined);
        }
        if (isConfirmError) {
            showToast('授權確認失敗', 'error');
            setStep('needsApproval');
            setApprovalTxHash(undefined);
        }
    }, [isConfirmed, isConfirmError, refetchAllowance, showToast]);

    useEffect(() => {
        if (!address) { setStep('idle'); return; }
        if (isLoadingAllowance || isLoadingPrice) { setStep('loading'); return; }
        if (isConfirmingApproval) { setStep('approveConfirming'); return; }
        if (typeof allowance === 'bigint' && totalRequiredAmount > 0n) {
            setStep(allowance >= totalRequiredAmount ? 'readyToMint' : 'needsApproval');
        }
    }, [address, allowance, totalRequiredAmount, isLoadingAllowance, isLoadingPrice, isConfirmingApproval]);

    // 【修改】handleApprove 改為 async 函式，並使用新的交易追蹤系統
    const handleApprove = async () => {
        if (step === 'needsApproval' && contractConfig && soulShardContract) {
            setStep('approving');
            try {
                const hash = await approveAsync({ 
                    address: soulShardContract.address,
                    abi: soulShardContract.abi,
                    functionName: 'approve', 
                    args: [contractConfig.address, maxUint256] 
                });
                
                // 【第3步：將交易加入 store，而不是用 Toast】
                addTransaction({ hash, description: `批准 ${type === 'hero' ? '英雄' : '聖物'} 合約使用代幣` });

                setApprovalTxHash(hash);
                setStep('approveConfirming');

            } catch(err: any) {
                if (err.message.includes('User rejected the request')) {
                    showToast('操作已由使用者取消。', 'error');
                } else {
                    showToast(err.message.split('\n')[0], 'error');
                }
                setStep('needsApproval');
            }
        }
    };

    return {
        step,
        totalRequiredAmount,
        isLoading: step === 'loading' || isApproving || isConfirmingApproval,
        isReadyToMint: step === 'readyToMint',
        handleApprove
    };
};


const MintCard: React.FC<{ type: NftToMint; options: number[] }> = ({ type, options }) => {
    const { chainId } = useAccount();
    const { showToast } = useAppToast();
    const [quantity, setQuantity] = useState(1);
    
    // 【第4步：從 store 獲取 addTransaction 函式】
    const { addTransaction } = useTransactionStore();
    const { step, totalRequiredAmount, isLoading, isReadyToMint, handleApprove } = useMintLogic(type, quantity);
    const { writeContractAsync, isPending: isMinting } = useWriteContract();
    
    const title = type === 'hero' ? '英雄' : '聖物';

    const handleMint = async () => {
        if (!isReadyToMint) return;

        const contractConfig = getContract(chainId, type);
        if (!contractConfig) return;

        try {
            const description = quantity === 1
                ? `招募 1 位${title}`
                : `批量招募 ${quantity} 位${title}`;
            
            const hash = await writeContractAsync({ 
                address: contractConfig.address,
                abi: contractConfig.abi,
                functionName: quantity === 1 ? 'mintSingle' : 'mintBatch',
                args: quantity > 1 ? [BigInt(quantity)] : undefined
            });
            
            // 【第5步：將鑄造交易加入 store】
            addTransaction({ hash, description });

        } catch (error: any) {
            if (error.message.includes('User rejected the request')) {
                showToast('操作已由使用者取消。', 'error');
            } else {
                showToast(error.message.split('\n')[0], 'error');
            }
        }
    };

    const renderButton = () => {
        if (step === 'needsApproval') {
            return <ActionButton onClick={handleApprove} isLoading={isLoading} disabled={isLoading} className="w-48 h-12">批准代幣</ActionButton>;
        }
        if (step === 'approveConfirming') {
            return <ActionButton isLoading={true} disabled={true} className="w-48 h-12">授權確認中...</ActionButton>;
        }
        
        return <ActionButton onClick={handleMint} isLoading={isMinting || isLoading} disabled={!isReadyToMint || isMinting} className="w-48 h-12">
            {isMinting ? '請在錢包中確認...' : `招募 ${quantity} 個`}
        </ActionButton>;
    };

    return (
        <div className="card-bg p-6 rounded-xl shadow-lg flex flex-col items-center h-full">
            <h3 className="section-title">招募{title}</h3>
            <p className="text-sm text-gray-500 mb-4 px-4 text-center">
                所有鑄造均使用VRF安全種子，公平公正。批量鑄造更省Gas！
            </p>
            <div className="flex items-center justify-center gap-2 mb-4">
                {options.map(q => 
                    <button key={q} onClick={() => setQuantity(q)} className={`w-12 h-12 rounded-full font-bold text-lg transition-all flex items-center justify-center border-2 ${quantity === q ? 'bg-indigo-500 text-white border-transparent scale-110' : 'bg-white/50 hover:bg-white border-gray-300'}`}>
                        {q}
                    </button>
                )}
            </div>
            <div className="text-center mb-4 min-h-[72px] flex-grow flex flex-col justify-center">
                {isLoading ? <LoadingSpinner color="border-gray-500" /> : 
                    <div>
                        <p className="text-lg">總價:</p>
                        <p className="font-bold text-yellow-600 text-2xl">{formatEther(totalRequiredAmount)}</p>
                        <p className="text-xs text-gray-500">$SoulShard</p>
                    </div>
                }
            </div>
            {renderButton()}
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
