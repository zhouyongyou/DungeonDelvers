import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, maxUint256, type Hash } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

type MintingStep = 'idle' | 'loading' | 'needsApproval' | 'approving' | 'approveConfirming' | 'readyToMint' | 'minting';

/**
 * @notice 這是一個自定義 Hook，封裝了鑄造卡片所需的所有共享邏輯。
 * @param type - 'hero' 或 'relic'
 * @param quantity - 當前選擇的鑄造數量
 * @returns 返回所有需要的狀態和處理函式
 */
const useMintCardLogic = (type: 'hero' | 'relic', quantity: number) => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const [step, setStep] = useState<MintingStep>('idle');
    const [approvalTxHash, setApprovalTxHash] = useState<Hash | undefined>();

    const contractConfig = getContract(chainId, type);
    const soulShardContract = getContract(chainId, 'soulShardToken');

    const { data: priceData, isLoading: isLoadingPrice } = useReadContracts({
        contracts: [
            { ...contractConfig, functionName: 'mintPriceUSD' },
            { ...contractConfig, functionName: 'getSoulShardAmountForUSD', args: [BigInt(2 * 1e18)] },
        ],
        query: { enabled: !!contractConfig },
    });

    const singleUnitPrice = priceData?.[1]?.result as bigint | undefined;
    
    const totalRequiredAmount = useMemo(() => {
        if (!singleUnitPrice) return 0n;
        return singleUnitPrice * BigInt(quantity);
    }, [singleUnitPrice, quantity]);

    const { data: allowance, refetch: refetchAllowance, isLoading: isLoadingAllowance } = useReadContract({
        ...soulShardContract,
        functionName: 'allowance',
        args: [address!, contractConfig?.address!],
        query: { enabled: !!address && !!contractConfig },
    });

    const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract({
        mutation: { 
            onSuccess: () => setStep('approveConfirming'),
            onError: (err) => { showToast(err.message.split('\n')[0], 'error'); setStep('needsApproval'); }
        }
    });
    
    useWaitForTransactionReceipt({
        hash: approvalTxHash,
        onSuccess: () => { showToast('授權成功！', 'success'); refetchAllowance(); },
    });
    
    useEffect(() => { if (approveHash) setApprovalTxHash(approveHash); }, [approveHash]);

    useEffect(() => {
        if (!address) { setStep('idle'); return; }
        if (isLoadingAllowance || isLoadingPrice) { setStep('loading'); return; }
        if (allowance !== undefined && totalRequiredAmount > 0) {
            setStep(allowance >= totalRequiredAmount ? 'readyToMint' : 'needsApproval');
        }
    }, [address, allowance, totalRequiredAmount, isLoadingAllowance, isLoadingPrice]);
    
    const handleApprove = () => {
        if (step === 'needsApproval' && contractConfig) {
            setStep('approving');
            approve({ ...soulShardContract, functionName: 'approve', args: [contractConfig.address, maxUint256] });
        }
    };

    return {
        step,
        totalRequiredAmount,
        isLoading: step === 'loading' || step === 'approving' || step === 'approveConfirming',
        isReady: step === 'readyToMint',
        handleApprove
    };
};


// --- 卡片一：單次/少量隨機鑄造 (VRF) ---
const VrfMintCard: React.FC<{ type: 'hero' | 'relic' }> = ({ type }) => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const [quantity, setQuantity] = useState(1);
    const [isMinting, setIsMinting] = useState(false);
    
    const { step, totalRequiredAmount, isLoading, isReady, handleApprove } = useMintCardLogic(type, quantity);
    const { writeContractAsync } = useWriteContract();

    const handleVrfMint = async () => {
        if (!isReady) return;
        const contractConfig = getContract(chainId, type);
        setIsMinting(true);
        showToast(`準備發起 ${quantity} 次鑄造，請在錢包中連續確認交易。`, 'info');
        
        for (let i = 0; i < quantity; i++) {
            try {
                await writeContractAsync({ 
                    ...contractConfig, 
                    functionName: type === 'hero' ? 'requestNewHero' : 'requestNewRelic' 
                });
                if (quantity > 1) { showToast(`第 ${i + 1} / ${quantity} 個請求已送出！`, 'success'); }
            } catch (error: any) {
                showToast('操作已由使用者取消。', 'error');
                setIsMinting(false);
                return;
            }
        }
        setIsMinting(false);
    };

    const handleClick = () => {
        if (step === 'needsApproval') handleApprove();
        else if (step === 'readyToMint') handleVrfMint();
    };

    return (
        <div className="card-bg p-6 rounded-xl shadow-lg flex flex-col items-center h-full">
            <h3 className="section-title">招募{type === 'hero' ? '英雄' : '聖物'} (公平隨機)</h3>
            <div className="flex items-center justify-center gap-2 mb-4">
                {[1, 5, 10].map(q => <button key={q} onClick={() => setQuantity(q)} className={`w-12 h-12 rounded-full font-bold text-lg transition-all flex items-center justify-center border-2 ${quantity === q ? 'bg-indigo-500 text-white border-transparent' : 'bg-white/50 hover:bg-white border-gray-300'}`}>{q}</button>)}
            </div>
            <div className="text-center mb-4 min-h-[72px] flex-grow flex flex-col justify-center">
                {isLoading ? <LoadingSpinner color="border-gray-500" /> : <p className="text-lg">總價: <span className="font-bold text-yellow-600">{formatEther(totalRequiredAmount)}</span> $SoulShard</p>}
            </div>
            <ActionButton onClick={handleClick} isLoading={isLoading || isMinting} disabled={step === 'idle' || step === 'loading'} className="w-48 h-12">
                {step === 'needsApproval' ? '批准代幣' : (quantity > 1 ? `發起 ${quantity} 次` : '鑄造')}
            </ActionButton>
            <p className="text-xs text-center text-gray-500 mt-2 px-2">使用鏈上VRF，結果絕對公平。需支付額外Gas並多次確認交易。</p>
        </div>
    );
};

// --- 卡片二：快速批量鑄造 (非VRF) ---
const BatchMintCard: React.FC<{ type: 'hero' | 'relic' }> = ({ type }) => {
    const { address, chainId } = useAccount();
    const [quantity, setQuantity] = useState(20);
    const { step, totalRequiredAmount, isLoading, isReady, handleApprove } = useMintCardLogic(type, quantity);
    const { writeContract, isPending } = useWriteContract();
    
    const handleBatchMint = () => {
        if (!isReady) return;
        writeContract({
            ...getContract(chainId, type),
            functionName: 'batchMint',
            args: [BigInt(quantity)]
        });
    };

    const handleClick = () => {
        if (step === 'needsApproval') handleApprove();
        else if (step === 'readyToMint') handleBatchMint();
    };

    return (
        <div className="card-bg p-6 rounded-xl shadow-lg flex flex-col items-center border-2 border-dashed border-yellow-500 bg-yellow-50/20 h-full">
            <h3 className="section-title text-yellow-600">快速批量招募</h3>
            <div className="flex items-center justify-center gap-2 mb-4">
                {[20, 50, 100].map(q => <button key={q} onClick={() => setQuantity(q)} className={`w-12 h-12 rounded-full font-bold text-lg transition-all flex items-center justify-center border-2 ${quantity === q ? 'bg-yellow-500 text-white border-transparent' : 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300'}`}>{q}</button>)}
            </div>
            <div className="text-center mb-4 min-h-[72px] flex-grow flex flex-col justify-center">
                 {isLoading ? <LoadingSpinner color="border-gray-500" /> : <p className="text-lg">總價: <span className="font-bold text-yellow-600">{formatEther(totalRequiredAmount)}</span> $SoulShard</p>}
            </div>
            <ActionButton onClick={handleClick} isLoading={isLoading || isPending} disabled={step === 'idle' || step === 'loading'} className="w-48 h-12 bg-gradient-to-tr from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500">
                {step === 'needsApproval' ? '批准代幣' : `一次性鑄造 ${quantity} 個`}
            </ActionButton>
            <p className="text-xs text-center text-gray-500 mt-2 px-2">一次交易完成，節省大量Gas。機率由合約程式碼決定。</p>
        </div>
    );
};


const MintPage: React.FC = () => {
    return (
        <section>
            <h2 className="page-title">鑄造工坊</h2>
            <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <VrfMintCard type="hero" />
                    <VrfMintCard type="relic" />
                </div>
                <hr className="my-8 border-t-2 border-dashed border-gray-300" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <BatchMintCard type="hero" />
                    <BatchMintCard type="relic" />
                </div>
            </div>
        </section>
    );
};

export default MintPage;
