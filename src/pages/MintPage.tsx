// src/pages/MintPage.tsx (優化後最終版)

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useWriteContract, useBalance, usePublicClient, useReadContract } from 'wagmi';
import { formatEther, maxUint256, type Abi, decodeEventLog } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { useAppToast } from '../contexts/SimpleToastContext';
import { useTransactionWithProgress } from '../hooks/useTransactionWithProgress';
import { TransactionProgressModal } from '../components/ui/TransactionProgressModal';
import { useOptimisticUpdate } from '../hooks/useOptimisticUpdate';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useTransactionStore } from '../stores/useTransactionStore';
import { bsc } from 'wagmi/chains';
import { Modal } from '../components/ui/Modal';
import { NftCard } from '../components/ui/NftCard';
import type { AnyNft, NftAttribute } from '../types/nft';
import { fetchMetadata } from '../api/nfts';

// =================================================================
// Section: 數據獲取 Hooks
// =================================================================

// Debounce Hook 用於延遲處理用戶輸入，避免過多請求
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

type PaymentSource = 'wallet' | 'vault';

/**
 * @notice 處理鑄造邏輯的核心 Hook (優化版)
 * @dev 此版本將價格查詢合併為單一 RPC 呼叫，提升效率並降低錯誤機率。
 */
const useMintLogic = (type: 'hero' | 'relic', quantity: number, paymentSource: PaymentSource, chainId: typeof bsc.id) => {
    const { address } = useAccount();
    const contractConfig = getContract(chainId, type);
    const soulShardContract = getContract(chainId, 'soulShard');
    const playerVaultContract = getContract(chainId, 'playerVault');

    // ★★★【核心優化】★★★
    // 直接呼叫 Hero/Relic 合約的 getRequiredSoulShardAmount 函式。
    // 這個函式內部會處理所有 USD 到 SoulShard 的轉換，將兩次鏈上讀取合併為一次。
    const { data: requiredAmount, isLoading: isLoadingPrice, isError, error, refetch: refetchPrice } = useReadContract({
        address: contractConfig?.address,
        abi: contractConfig?.abi,
        functionName: 'getRequiredSoulShardAmount',
        args: [BigInt(quantity)],
        query: { 
            enabled: !!contractConfig && quantity > 0,
            staleTime: 1000 * 60 * 2, // 2分鐘 - 縮短快取時間，平衡性能與準確性
            gcTime: 1000 * 60 * 10,   // 10分鐘
            refetchOnWindowFocus: false,
            retry: 2,
            // 🔄 價格查詢失敗時的重試策略
            retryDelay: (attemptIndex) => {
                // 第一次重試立即執行，第二次重試等待1秒
                return attemptIndex === 0 ? 0 : 1000;
            },
        },
    });
    
    // 平台費用 (platformFee) 的讀取
    const { data: platformFee, isLoading: isLoadingFee } = useReadContract({
        address: contractConfig?.address,
        abi: contractConfig?.abi,
        functionName: 'platformFee',
        query: {
            staleTime: 1000 * 60 * 30, // 30分鐘 - 平台費用變更頻率很低
            gcTime: 1000 * 60 * 60,    // 60分鐘
            refetchOnWindowFocus: false,
            retry: 2,
        },
    });

    // 獲取錢包和金庫餘額的邏輯保持不變
    const { data: walletBalance } = useBalance({ address, token: soulShardContract?.address });
    const { data: vaultInfo } = useReadContract({
        address: playerVaultContract?.address,
        abi: playerVaultContract?.abi,
        functionName: 'playerInfo',
        args: [address!],
        query: { 
            enabled: !!address && !!playerVaultContract,
            staleTime: 1000 * 60 * 2, // 2分鐘 - 金庫餘額需要較新
            gcTime: 1000 * 60 * 10,   // 10分鐘
            refetchOnWindowFocus: false,
            retry: 2,
        }
    });
    const vaultBalance = useMemo(() => (vaultInfo && Array.isArray(vaultInfo) ? vaultInfo[0] : 0n), [vaultInfo]);

    // 獲取授權狀態的邏輯
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: soulShardContract?.address,
        abi: soulShardContract?.abi,
        functionName: 'allowance',
        args: [address!, contractConfig?.address as `0x${string}`],
        query: { 
            enabled: !!address && !!contractConfig && paymentSource === 'wallet',
            staleTime: 1000 * 60 * 5, // 5分鐘 - 授權狀態需要較新
            gcTime: 1000 * 60 * 15,   // 15分鐘
            refetchOnWindowFocus: false,
            retry: 2,
        },
    });

    const finalRequiredAmount = requiredAmount ?? 0n;
    const finalPlatformFee = platformFee ?? 0n;

    const needsApproval = useMemo(() => {
        if (paymentSource !== 'wallet' || typeof allowance !== 'bigint' || typeof finalRequiredAmount !== 'bigint') return false;
        return allowance < finalRequiredAmount;
    }, [paymentSource, allowance, finalRequiredAmount]);

    return {
        requiredAmount: finalRequiredAmount,
        balance: paymentSource === 'wallet' ? (walletBalance?.value ?? 0n) : vaultBalance,
        needsApproval,
        isLoading: isLoadingPrice || isLoadingFee, // 簡化後的載入狀態
        isError,
        error,
        platformFee: finalPlatformFee,
        refetchAllowance,
    };
};

// =================================================================
// Section: 子元件與主頁面
// =================================================================

const RarityProbabilities: React.FC = () => (
    <div className="w-full text-xs text-gray-400 mt-4">
        <h4 className="font-bold text-center mb-1 text-gray-500 dark:text-gray-300">稀有度機率</h4>
        <div className="grid grid-cols-5 gap-1 text-center">
            <div className="bg-black/20 p-1 rounded"><div>普通</div><div className="font-bold text-white">44%</div></div>
            <div className="bg-black/20 p-1 rounded"><div>罕見</div><div className="font-bold text-white">35%</div></div>
            <div className="bg-black/20 p-1 rounded"><div>稀有</div><div className="font-bold text-white">15%</div></div>
            <div className="bg-black/20 p-1 rounded"><div>史詩</div><div className="font-bold text-white">5%</div></div>
            <div className="bg-black/20 p-1 rounded"><div>傳說</div><div className="font-bold text-white">1%</div></div>
        </div>
    </div>
);

const MintResultModal: React.FC<{ nft: AnyNft | null; onClose: () => void }> = ({ nft, onClose }) => {
    if (!nft) return null;
    return (
        <Modal isOpen={!!nft} onClose={onClose} title="鑄造成功！" confirmText="太棒了！" onConfirm={onClose}>
            <div className="flex flex-col items-center">
                <p className="mb-4 text-center text-gray-300">恭喜您獲得了新的{nft.type === 'hero' ? '英雄' : '聖物'}！</p>
                <div className="w-64"><NftCard nft={nft} /></div>
                <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-blue-400">ℹ️</span>
                        <span className="text-sm font-medium text-blue-300">溫馨提示</span>
                    </div>
                    <ul className="text-xs text-gray-400 space-y-1">
                        <li>• 您的 NFT 將在 <strong className="text-blue-300">2-3 分鐘</strong> 後可用於組隊</li>
                        <li>• 需等待區塊鏈確認和數據同步完成</li>
                        <li>• 可在「我的資產」頁面查看最新狀態</li>
                    </ul>
                </div>
            </div>
        </Modal>
    );
};

const MintCard: React.FC<{ type: 'hero' | 'relic'; options: number[]; chainId: typeof bsc.id }> = ({ type, options, chainId }) => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const publicClient = usePublicClient();
    const queryClient = useQueryClient();
    
    // 定義 title 變數，避免 TDZ 錯誤 - 必須在所有使用它的 hooks 之前
    const title = type === 'hero' ? '英雄' : '聖物';
    
    const [quantity, setQuantity] = useState(1);
    const [paymentSource, setPaymentSource] = useState<PaymentSource>('wallet');
    const [mintingResult, setMintingResult] = useState<AnyNft | null>(null);
    const [showProgressModal, setShowProgressModal] = useState(false);

    const debouncedQuantity = useDebounce(quantity, 300);
    
    const { requiredAmount, balance, needsApproval, isLoading, isError, error, platformFee, refetchAllowance } = useMintLogic(type, debouncedQuantity, paymentSource, chainId);
    
    // 樂觀更新 Hook
    const { optimisticUpdate, confirmUpdate, rollback } = useOptimisticUpdate({
        queryKey: ['ownedNfts', address, chainId],
        updateFn: (oldData: any) => {
            if (!oldData) return oldData;
            
            // 創建臨時 NFT 數據
            const tempNft: AnyNft = {
                id: BigInt(Date.now()), // 臨時 ID
                type,
                contractAddress: contractConfig?.address || '',
                name: `載入中... ${type === 'hero' ? '英雄' : '聖物'}`,
                description: '正在鏈上確認...',
                image: '',
                attributes: [],
                ...(type === 'hero' ? { power: 0, rarity: 0 } : { capacity: 0, rarity: 0 })
            };
            
            // 更新對應的 NFT 列表
            return {
                ...oldData,
                [type === 'hero' ? 'heroes' : 'relics']: [
                    ...(oldData[type === 'hero' ? 'heroes' : 'relics'] || []),
                    tempNft
                ]
            };
        }
    });
    
    // 使用新的交易進度 Hook
    const { execute: executeApprove, progress: approveProgress, reset: resetApprove } = useTransactionWithProgress({
        onSuccess: () => {
            refetchAllowance();
            setShowProgressModal(false);
        },
        successMessage: '授權成功！',
        errorMessage: '授權失敗',
    });
    
    const { execute: executeMint, progress: mintProgress, reset: resetMint } = useTransactionWithProgress({
        onSuccess: async (receipt) => {
            // 確認樂觀更新
            confirmUpdate();
            // 處理鑄造成功邏輯
            const mintEventName = type === 'hero' ? 'HeroMinted' : 'RelicMinted';
            const mintLog = receipt.logs.find((log: any) => {
                try {
                    return decodeEventLog({ abi: contractConfig.abi, ...log }).eventName === mintEventName;
                } catch {
                    return false;
                }
            });
            
            if (mintLog && contractConfig) {
                const decodedLog = decodeEventLog({ abi: contractConfig.abi, ...mintLog });
                const tokenId = (decodedLog.args as { tokenId?: bigint }).tokenId;
                
                if (tokenId) {
                    const tokenUri = await publicClient?.readContract({
                        address: contractConfig.address,
                        abi: contractConfig.abi,
                        functionName: 'tokenURI',
                        args: [tokenId]
                    }) as string;

                    const metadata = await fetchMetadata(tokenUri, tokenId.toString(), contractConfig.address);
                    const findAttr = (trait: string, defaultValue: string | number = 0) => 
                        metadata.attributes?.find((a: NftAttribute) => a.trait_type === trait)?.value ?? defaultValue;
                    
                    let nftData: AnyNft;
                    if (type === 'hero') {
                        nftData = {
                            ...metadata,
                            id: tokenId,
                            type,
                            contractAddress: contractConfig.address,
                            power: Number(findAttr('Power')),
                            rarity: Number(findAttr('Rarity'))
                        };
                    } else {
                        nftData = {
                            ...metadata,
                            id: tokenId,
                            type,
                            contractAddress: contractConfig.address,
                            capacity: Number(findAttr('Capacity')),
                            rarity: Number(findAttr('Rarity'))
                        };
                    }
                    setMintingResult(nftData);
                    queryClient.invalidateQueries({ queryKey: ['ownedNfts'] });
                }
            }
            setShowProgressModal(false);
        },
        onError: () => {
            // 回滾樂觀更新
            rollback();
        },
        successMessage: `鑄造 ${quantity} 個${title}成功！`,
        errorMessage: '鑄造失敗',
    });
    
    // 決定使用哪個進度狀態
    const currentProgress = needsApproval && paymentSource === 'wallet' ? approveProgress : mintProgress;
    const isProcessing = currentProgress.status !== 'idle' && currentProgress.status !== 'error';
    
    const contractConfig = getContract(chainId, type);
    const soulShardContract = getContract(chainId, 'soulShard');

    if (!contractConfig || !soulShardContract) {
        return <div className="card-bg p-6 rounded-xl shadow-lg flex flex-col items-center justify-center h-full text-center"><h3 className="text-xl font-bold text-red-500">設定錯誤</h3><p className="text-gray-400 mt-2">找不到 '{type}' 或 '$SoulShard' 的合約地址。</p><p className="text-gray-400 text-xs mt-1">請檢查您的 <code>.env</code> 環境變數設定是否正確。</p></div>;
    }

    const handleApprove = async () => {
        if (!soulShardContract || !contractConfig) return;
        
        setShowProgressModal(true);
        resetApprove();
        
        try {
            await executeApprove(
                {
                    address: soulShardContract.address,
                    abi: soulShardContract.abi,
                    functionName: 'approve',
                    args: [contractConfig.address, maxUint256]
                },
                `批准 ${title} 合約使用代幣`
            );
        } catch (error) {
            // 錯誤已在 hook 中處理
        }
    };

    const handleMint = async () => {
        if (!contractConfig || !publicClient) return showToast('客戶端尚未準備好，請稍後再試', 'error');
        if (isError) return showToast('價格讀取失敗，無法鑄造', 'error');
        if (balance < requiredAmount) return showToast(`${paymentSource === 'wallet' ? '錢包' : '金庫'}餘額不足`, 'error');
        if (paymentSource === 'wallet' && needsApproval) return showToast(`請先完成授權`, 'error');

        // 直接使用已經獲取的價格開始鑄造
        showToast('開始鑄造...', 'info');

        setShowProgressModal(true);
        resetMint();
        
        // 立即執行樂觀更新
        optimisticUpdate();
        
        try {
            await executeMint(
                {
                    address: contractConfig.address,
                    abi: contractConfig.abi as Abi,
                    functionName: paymentSource === 'wallet' ? 'mintFromWallet' : 'mintFromVault',
                    args: [BigInt(quantity)],
                    value: (typeof platformFee === 'bigint' ? platformFee : 0n) * BigInt(quantity)
                },
                `從${paymentSource === 'wallet' ? '錢包' : '金庫'}鑄造 ${quantity} 個${title}`
            );
        } catch (error) {
            // 錯誤已在 hook 中處理
        }
    };
    
    const isButtonDisabled = !address || isLoading || isError || balance < requiredAmount || requiredAmount === 0n || isProcessing;

    const actionButton = (paymentSource === 'wallet' && needsApproval)
        ? <ActionButton onClick={handleApprove} isLoading={isProcessing} className="w-48 h-12">授權</ActionButton>
        : <ActionButton onClick={handleMint} isLoading={isProcessing || isLoading} disabled={isButtonDisabled} className="w-48 h-12">{isProcessing ? '處理中...' : (address ? `招募 ${quantity} 個` : '請先連接錢包')}</ActionButton>;

    return (
        <div className="card-bg p-6 rounded-xl shadow-lg flex flex-col items-center h-full">
            <MintResultModal nft={mintingResult} onClose={() => setMintingResult(null)} />
            <TransactionProgressModal
                isOpen={showProgressModal}
                onClose={() => setShowProgressModal(false)}
                progress={currentProgress}
                title={needsApproval && paymentSource === 'wallet' ? '授權進度' : '鑄造進度'}
            />
            <div className="w-full h-48 bg-gray-800/50 rounded-lg mb-4 flex items-center justify-center relative overflow-hidden"><p className="text-6xl opacity-80">{type === 'hero' ? '⚔️' : '💎'}</p></div>
            <h3 className="section-title">招募{title}</h3>
            <div className="flex items-center justify-center gap-2 my-4">{options.map(q => <button key={q} onClick={() => setQuantity(q)} className={`w-12 h-12 rounded-full font-bold text-lg transition-all flex items-center justify-center border-2 ${quantity === q ? 'bg-indigo-500 text-white border-transparent scale-110' : 'bg-gray-700 hover:bg-gray-600 border-gray-600'}`}>{q}</button>)}</div>
            <div className="w-full my-4">
                <label className="block text-sm font-medium mb-2 text-center text-gray-400">選擇支付方式</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-900/50 rounded-lg">
                    <button onClick={() => setPaymentSource('wallet')} className={`px-4 py-2 rounded-md text-sm font-semibold transition ${paymentSource === 'wallet' ? 'bg-gray-700 text-white shadow' : 'text-gray-300'}`}>錢包支付</button>
                    <button onClick={() => setPaymentSource('vault')} className={`px-4 py-2 rounded-md text-sm font-semibold transition ${paymentSource === 'vault' ? 'bg-gray-700 text-white shadow' : 'text-gray-300'}`}>金庫支付 (免稅)</button>
                </div>
                <p className="text-xs text-center mt-2 text-gray-500">{paymentSource === 'wallet' ? '錢包餘額' : '金庫餘額'}: {address ? parseFloat(formatEther(balance)).toFixed(4) : '0.00'} $SoulShard</p>
            </div>
            <div className="text-center mb-4 min-h-[72px] flex-grow flex flex-col justify-center">
                {isLoading ? <div className="flex flex-col items-center justify-center"><LoadingSpinner color="border-gray-500" /><p className="text-sm text-gray-400 mt-2">讀取價格中...</p></div>
                : isError ? <div className="text-red-500 text-center"><p className="font-bold">價格讀取失敗</p><p className="text-xs mt-1">{(error as { shortMessage?: string })?.shortMessage || '請檢查合約狀態或網路連線。'}</p></div>
                : (<div><p className="text-lg text-gray-400">總價:</p><p className="font-bold text-yellow-400 text-2xl">{parseFloat(formatEther(typeof requiredAmount === 'bigint' ? requiredAmount : 0n)).toFixed(4)}</p><p className="text-xs text-gray-500">$SoulShard + {formatEther(typeof platformFee === 'bigint' ? platformFee * BigInt(quantity) : 0n)} BNB</p></div>)}
            </div>
            {actionButton}
            <a href={contractConfig.address ? `https://www.okx.com/web3/nft/markets/collection/bscn/${contractConfig.address}` : '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline mt-2">前往市場交易</a>
            <RarityProbabilities />
        </div>
    );
};

const MintingInterface: React.FC<{ chainId: typeof bsc.id }> = ({ chainId }) => {
    const heroMintOptions = [1, 5, 10, 20, 50];
    const relicMintOptions = [1, 5, 10, 20, 50];
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <MintCard type="hero" options={heroMintOptions} chainId={chainId} />
            <MintCard type="relic" options={relicMintOptions} chainId={chainId} />
        </div>
    );
};

const MintPage: React.FC = () => {
    const { chainId } = useAccount();
    return (
        <section>
            <h2 className="page-title">鑄造工坊</h2>
            {chainId === bsc.id ? <MintingInterface chainId={chainId} /> : <div className="card-bg p-10 rounded-xl text-center text-gray-400"><p>請先連接到支援的網路 (BSC 主網) 以使用鑄造功能。</p></div>}
        </section>
    );
};

export default MintPage;
