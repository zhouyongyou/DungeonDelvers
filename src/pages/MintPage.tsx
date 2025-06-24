import React, { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, maxUint256, type Hash } from 'viem';
import { useAppToast } from '../hooks/useAppToast';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

type MintingStep = 'idle' | 'checkingAllowance' | 'needsApproval' | 'approving' | 'approveConfirming' | 'readyToMint' | 'minting' | 'mintConfirming';

const MintCard: React.FC<{ type: 'hero' | 'relic' }> = ({ type }) => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();

    const [quantity, setQuantity] = useState(1);
    const [step, setStep] = useState<MintingStep>('idle');
    const [approvalTxHash, setApprovalTxHash] = useState<Hash | undefined>();

    const contractConfig = getContract(chainId, type);
    const soulShardContract = getContract(chainId, 'soulShardToken');
    const title = type === 'hero' ? '英雄' : '聖物';

    const { data: priceData, isLoading: isLoadingPrice } = useReadContracts({
        contracts: [
            { ...contractConfig, functionName: 'mintPriceUSD' },
            { ...contractConfig, functionName: 'getSoulShardAmountForUSD', args: [2n * 10n**18n] },
        ],
        query: { enabled: !!contractConfig },
    });

    const singleUnitPrice = priceData?.[1]?.result ?? 0n;
    
    // 【新功能】根據數量計算總價
    const totalRequiredAmount = useMemo(() => {
        return singleUnitPrice * BigInt(quantity);
    }, [singleUnitPrice, quantity]);

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        ...soulShardContract,
        functionName: 'allowance',
        args: [address!, contractConfig?.address!],
        query: { enabled: !!address && !!contractConfig },
    });

    const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract({
        mutation: { onSuccess: () => setStep('approveConfirming'), onError: (err) => { showToast(err.message.split('\n')[0], 'error'); setStep('needsApproval'); } }
    });

    useWaitForTransactionReceipt({
        hash: approvalTxHash,
        onSuccess: () => { showToast('授權成功！', 'success'); refetchAllowance(); setStep('readyToMint'); },
    });

    const { writeContractAsync: mint, isPending: isMinting } = useWriteContract({
        mutation: { onError: (err) => { showToast(err.message.split('\n')[0], 'error'); setStep('readyToMint'); } }
    });
    
    useEffect(() => {
        if (!address) { setStep('idle'); return; }
        if (allowance !== undefined && totalRequiredAmount > 0) {
            setStep(allowance >= totalRequiredAmount ? 'readyToMint' : 'needsApproval');
        }
    }, [address, allowance, totalRequiredAmount]);

    useEffect(() => { if (approveHash) setApprovalTxHash(approveHash); }, [approveHash]);

    const handleBatchMint = async () => {
        if (step !== 'readyToMint' || !contractConfig) return;

        setStep('minting');
        showToast(`準備批量鑄造 ${quantity} 個${title}，請依序確認錢包交易。`, 'info');

        for (let i = 0; i < quantity; i++) {
            try {
                showToast(`正在發起第 ${i + 1} / ${quantity} 個鑄造...`, 'info');
                await mint({ ...contractConfig, functionName: type === 'hero' ? 'requestNewHero' : 'requestNewRelic' });
                // 每個成功後可以給一個小提示
                showToast(`第 ${i + 1} 個鑄造請求已送出！`, 'success');
            } catch (error: any) {
                // 如果用戶拒絕了其中一筆交易，就中止循環
                if (error.message.includes('User rejected the request')) {
                    showToast('批量鑄造已取消。', 'error');
                    setStep('readyToMint');
                    return;
                }
            }
        }
        setStep('readyToMint'); // 所有交易發送完畢後，恢復按鈕狀態
    };


    const handleButtonClick = () => {
        if (step === 'needsApproval' && contractConfig) {
            setStep('approving');
            approve({ ...soulShardContract, functionName: 'approve', args: [contractConfig.address, maxUint256] });
        } else if (step === 'readyToMint') {
            handleBatchMint();
        }
    };
    
    const quantityOptions = [1, 3, 5];

    const getButtonState = (): { text: string; disabled: boolean; isLoading: boolean } => {
        // ... 狀態機邏輯與之前版本類似，但現在統一由 handleButtonClick 觸發 ...
        switch (step) {
            case 'idle': return { text: '連接錢包', disabled: true, isLoading: false };
            case 'needsApproval': return { text: '批准代幣', disabled: false, isLoading: false };
            case 'approving': return { text: '請求授權...', disabled: true, isLoading: true };
            case 'approveConfirming': return { text: '等待授權確認...', disabled: true, isLoading: true };
            case 'readyToMint': return { text: `鑄造 ${quantity} 個`, disabled: false, isLoading: false };
            case 'minting': return { text: '處理中...', disabled: true, isLoading: true };
            default: return { text: '載入中...', disabled: true, isLoading: true };
        }
    };

    const buttonState = getButtonState();

    return (
        <div className="card-bg p-6 rounded-xl shadow-lg flex flex-col items-center">
            <h3 className="section-title">招募{title}</h3>
            
            {/* 【新功能】數量選擇器 */}
            <div className="mb-4">
                <p className="text-sm text-center mb-2">選擇數量:</p>
                <div className="flex items-center justify-center gap-2">
                    {quantityOptions.map(q => (
                        <button 
                            key={q} 
                            onClick={() => setQuantity(q)}
                            className={`w-12 h-12 rounded-full font-bold text-lg transition-all flex items-center justify-center border-2 ${quantity === q ? 'bg-indigo-500 text-white border-transparent' : 'bg-white/50 hover:bg-white border-gray-300'}`}
                        >
                            {q}
                        </button>
                    ))}
                </div>
            </div>

            <div className="text-center mb-4 min-h-[72px]">
                {isLoadingPrice ? <LoadingSpinner color="border-gray-500" /> : (
                    <>
                        <p>單價: <span className="font-bold">{singleUnitPrice ? parseFloat(formatEther(singleUnitPrice)).toFixed(4) : '...'}</span> $SoulShard</p>
                        <p className="text-gray-600">總價: <span className="font-bold text-yellow-600 text-lg">{totalRequiredAmount ? parseFloat(formatEther(totalRequiredAmount)).toFixed(4) : '...'}</span> $SoulShard</p>
                    </>
                )}
            </div>
            <ActionButton
                onClick={handleButtonClick}
                disabled={buttonState.disabled || !address}
                isLoading={buttonState.isLoading}
                className="px-8 py-3 rounded-lg text-lg w-48 h-12"
            >
                {buttonState.text}
            </ActionButton>
        </div>
    );
};

const MintPage: React.FC = () => {
    return (
        <section>
            <h2 className="page-title">鑄造工坊</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <MintCard type="hero" />
                <MintCard type="relic" />
            </div>
        </section>
    );
};

export default MintPage;