import React, { useState, useEffect } from 'react';
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

    // 狀態管理
    const [step, setStep] = useState<MintingStep>('idle');
    const [approvalTxHash, setApprovalTxHash] = useState<Hash | undefined>();

    // 合約配置
    const contractConfig = getContract(chainId, type);
    const soulShardContract = getContract(chainId, 'soulShardToken');
    const title = type === 'hero' ? '英雄' : '聖物';

    // 讀取價格和所需代幣數量
    const { data: priceData, isLoading: isLoadingPrice } = useReadContracts({
        contracts: [
            { ...contractConfig, functionName: 'mintPriceUSD' },
            { ...contractConfig, functionName: 'getSoulShardAmountForUSD', args: [2n * 10n**18n] }, // 假設價格為 2 USD，可以動態讀取
        ],
        query: { enabled: !!contractConfig },
    });
    const requiredAmount = priceData?.[1]?.result ?? 0n;

    // 檢查當前的代幣授權額度
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        ...soulShardContract,
        functionName: 'allowance',
        args: [address!, contractConfig?.address!],
        query: { enabled: !!address && !!contractConfig },
    });

    // 處理授權的 hook
    const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract({
        mutation: {
            onSuccess: () => setStep('approveConfirming'),
            onError: (err) => { showToast(err.message.split('\n')[0], 'error'); setStep('needsApproval'); }
        }
    });

    // 等待授權交易確認的 hook
    useWaitForTransactionReceipt({
        hash: approvalTxHash,
        query: {
            enabled: !!approvalTxHash,
            onSuccess: () => {
                showToast('授權成功！', 'success');
                refetchAllowance(); // 重新獲取授權額度
                setStep('readyToMint');
            },
        }
    });

    // 處理鑄造的 hook
    const { writeContract: mint, isPending: isMinting } = useWriteContract({
        mutation: {
            onSuccess: () => {
                showToast(`${title}鑄造請求已送出！`, 'success');
                setStep('mintConfirming');
            },
            onError: (err) => { showToast(err.message.split('\n')[0], 'error'); setStep('readyToMint'); }
        }
    });

    // 監控 address 和 allowance 的變化，來更新狀態機
    useEffect(() => {
        if (!address) {
            setStep('idle');
            return;
        }
        if (allowance !== undefined) {
            setStep(allowance >= requiredAmount ? 'readyToMint' : 'needsApproval');
        }
    }, [address, allowance, requiredAmount]);

    // 監控 approve hash 的變化，以觸發 useWaitForTransactionReceipt
    useEffect(() => {
        if (approveHash) {
            setApprovalTxHash(approveHash);
        }
    }, [approveHash]);

    // 主按鈕的點擊處理函式
    const handleButtonClick = () => {
        if (step === 'needsApproval' && contractConfig) {
            setStep('approving');
            approve({ ...soulShardContract, functionName: 'approve', args: [contractConfig.address, maxUint256] });
        } else if (step === 'readyToMint' && contractConfig) {
            setStep('minting');
            mint({ ...contractConfig, functionName: type === 'hero' ? 'requestNewHero' : 'requestNewRelic' });
        }
    };

    // 根據當前步驟，決定按鈕的文字和狀態
    const getButtonState = (): { text: string; disabled: boolean; isLoading: boolean } => {
        switch (step) {
            case 'idle': return { text: '連接錢包', disabled: true, isLoading: false };
            case 'needsApproval': return { text: '批准代幣', disabled: false, isLoading: false };
            case 'approving': return { text: '請求授權...', disabled: true, isLoading: true };
            case 'approveConfirming': return { text: '等待授權確認...', disabled: true, isLoading: true };
            case 'readyToMint': return { text: '鑄造', disabled: false, isLoading: false };
            case 'minting': return { text: '請求鑄造...', disabled: true, isLoading: true };
            case 'mintConfirming': return { text: '等待鑄造確認...', disabled: true, isLoading: true };
            default: return { text: '載入中...', disabled: true, isLoading: true };
        }
    };

    const buttonState = getButtonState();

    return (
        <div className="card-bg p-6 rounded-xl shadow-lg flex flex-col items-center">
            <h3 className="section-title">招募{title}</h3>
            <div className="text-center mb-4 min-h-[72px]">
                {isLoadingPrice ? <LoadingSpinner color="border-gray-500" /> : (
                    <>
                        <p>固定成本: <span className="font-bold text-lg">{priceData?.[0]?.result ? formatEther(priceData[0].result) : '--'}</span> USD</p>
                        <p className="text-gray-600">當前需支付: <span className="font-bold text-yellow-600">{requiredAmount ? parseFloat(formatEther(requiredAmount)).toFixed(4) : '讀取中...'}</span> $SoulShard</p>
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

export const MintPage: React.FC = () => {
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
