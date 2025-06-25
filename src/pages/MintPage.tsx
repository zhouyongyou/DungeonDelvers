import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, maxUint256, type Hash } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

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

    const contractConfig = getContract(chainId, type);
    const soulShardContract = getContract(chainId, 'soulShardToken');

    const { data: mintPriceUSD } = useReadContract({
        ...contractConfig,
        functionName: 'mintPriceUSD',
        query: { enabled: !!contractConfig },
    });
    
    const { data: singleUnitPrice, isLoading: isLoadingPrice } = useReadContract({
        ...contractConfig,
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

    const { writeContract: approve, isPending: isApproving } = useWriteContract({
        mutation: {
            onSuccess: (hash) => {
                setApprovalTxHash(hash);
                setStep('approveConfirming');
                showToast('授權交易已送出，等待確認...', 'info');
            },
            onError: (err) => {
                showToast(err.message.split('\n')[0], 'error');
                setStep('needsApproval');
            }
        }
    });
    
    // 【核心修正】移除了未被使用的 'receipt' 變數
    const { isLoading: isConfirmingApproval, isSuccess: isConfirmed, isError: isConfirmError } = useWaitForTransactionReceipt({
        hash: approvalTxHash,
    });

    useEffect(() => {
        if (isConfirmed) {
            showToast('授權成功！', 'success');
            refetchAllowance();
        }
        if (isConfirmError) {
            showToast('授權確認失敗', 'error');
            setStep('needsApproval');
        }
    }, [isConfirmed, isConfirmError, refetchAllowance, showToast]);

    useEffect(() => {
        if (!address) { setStep('idle'); return; }
        if (isLoadingAllowance || isLoadingPrice) { setStep('loading'); return; }
        
        if (isConfirmingApproval) {
            setStep('approveConfirming');
            return;
        }

        if (typeof allowance === 'bigint') {
            setStep(allowance >= totalRequiredAmount ? 'readyToMint' : 'needsApproval');
        }
    }, [address, allowance, totalRequiredAmount, isLoadingAllowance, isLoadingPrice, isConfirmingApproval]);

    const handleApprove = () => {
        if (step === 'needsApproval' && contractConfig && soulShardContract) {
            setStep('approving');
            approve({ ...soulShardContract, functionName: 'approve', args: [contractConfig.address, maxUint256] });
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
    
    const { step, totalRequiredAmount, isLoading, isReadyToMint, handleApprove } = useMintLogic(type, quantity);
    const { writeContractAsync, isPending: isMinting } = useWriteContract();
    
    const title = type === 'hero' ? '英雄' : '聖物';

    const handleMint = async () => {
        if (!isReadyToMint) return;

        const contractConfig = getContract(chainId, type);
        if (!contractConfig) return;

        try {
            if (quantity === 1) {
                showToast(`正在招募 1 位${title}...`, 'info');
                await writeContractAsync({ ...contractConfig, functionName: 'mintSingle' });
            } else {
                showToast(`正在批量招募 ${quantity} 位${title}...`, 'info');
                await writeContractAsync({ ...contractConfig, functionName: 'mintBatch', args: [BigInt(quantity)] });
            }
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
            {isMinting ? '交易處理中...' : `招募 ${quantity} 個`}
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
