// src/pages/MintPage.tsx (優化後最終版)

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useWriteContract, useBalance, usePublicClient, useReadContract } from 'wagmi';
import { formatEther, maxUint256, type Abi, decodeEventLog } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { useAppToast } from '../contexts/SimpleToastContext';
import { useTransactionWithProgress } from '../hooks/useTransactionWithProgress';
import { TransactionProgressModal } from '../components/ui/TransactionProgressModal';
import { useOptimisticUpdate } from '../hooks/useOptimisticUpdate';
import { getContractLegacy } from '../config/contractsWithABI';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useTransactionStore } from '../stores/useTransactionStore';
import { bsc } from 'wagmi/chains';
import { Modal } from '../components/ui/Modal';
import { NftCard } from '../components/ui/NftCard';
import type { AnyNft, NftAttribute } from '../types/nft';
import { fetchMetadata } from '../api/nfts';
import { PRICE_OVERRIDE, logPriceOverride } from '../config/priceOverride';
import { invalidationStrategies } from '../config/queryConfig';
import { BATCH_TIERS, RARITY_LABELS, RARITY_COLORS, getBatchTierForQuantity, type BatchTier } from '../utils/batchMintConfig';

// =================================================================
// Section: 工具函數
// =================================================================

// 格式化價格顯示，避免科學記數法
function formatPriceDisplay(amount: bigint | undefined | null): string {
    if (!amount) return '0';
    
    const amountInEther = Number(formatEther(amount));
    
    // 對於所有數字，使用逗號分隔並顯示四位小數
    // 不使用 M 縮寫，保持完整數字顯示
    return amountInEther.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
    });
}

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
    const contractConfig = getContractLegacy(chainId, type);
    const soulShardContract = getContractLegacy(chainId, 'soulShard');
    const playerVaultContract = getContractLegacy(chainId, 'playerVault');

    // ★★★【核心優化】★★★
    // 直接呼叫 Hero/Relic 合約的 getRequiredSoulShardAmount 函式。
    // 這個函式內部會處理所有 USD 到 SoulShard 的轉換，將兩次鏈上讀取合併為一次。
    const { data: contractRequiredAmount, isLoading: isLoadingPrice, isError, error, refetch: refetchPrice } = useReadContract({
        address: contractConfig?.address,
        abi: contractConfig?.abi,
        functionName: 'getRequiredSoulShardAmount',
        args: [BigInt(quantity)],
        query: { 
            enabled: !!contractConfig && quantity > 0 && !PRICE_OVERRIDE.enabled,
            staleTime: 1000 * 60 * 2, // 2分鐘 - 縮短快取時間，平衡性能與準確性
            gcTime: 1000 * 60 * 10,   // 10分鐘
            refetchOnWindowFocus: false,
            retry: 3, // 增加重試次數
            // 🔄 價格查詢失敗時的重試策略
            retryDelay: (attemptIndex) => {
                // 遞增延遲：0ms, 500ms, 1500ms
                return attemptIndex * 500;
            },
        },
    });
    
    // 使用價格覆蓋（當 Oracle 失敗時）
    const requiredAmount = useMemo(() => {
        if (PRICE_OVERRIDE.enabled) {
            logPriceOverride(type, quantity);
            return PRICE_OVERRIDE.calculateSoulRequired(quantity);
        }
        
        // 價格合理性檢查 - 防止顯示異常數值
        if (contractRequiredAmount) {
            const priceInEther = Number(formatEther(contractRequiredAmount));
            const pricePerUnit = priceInEther / quantity;
            
            // 如果單價超過 100 萬 SOUL，很可能是錯誤
            if (pricePerUnit > 1000000) {
                console.error(`[MintPage] 價格異常檢測！${type} 單價: ${pricePerUnit} SOUL`);
                // 使用備用價格
                const fallbackPrice = type === 'hero' ? 33000 : 13000;
                const fallbackTotal = BigInt(Math.floor(fallbackPrice * quantity * 1e18));
                return fallbackTotal;
            }
        }
        
        return contractRequiredAmount;
    }, [contractRequiredAmount, quantity, type]);
    
    // 🔍 價格調試信息
    useEffect(() => {
        if (isError && error) {
            console.error(`[MintPage] 價格讀取錯誤:`, {
                type,
                quantity,
                contractAddress: contractConfig?.address,
                error: error,
                errorMessage: (error as any)?.message || 'Unknown error',
                errorCode: (error as any)?.code,
                errorDetails: (error as any)?.details,
            });
        }
        
        if (requiredAmount) {
            const priceInEther = Number(formatEther(requiredAmount));
            const pricePerUnit = priceInEther / quantity;
            
            console.log(`[MintPage] ${type} 價格調試:`, {
                requiredAmount: requiredAmount.toString(),
                requiredAmountHex: '0x' + requiredAmount.toString(16),
                requiredAmountDecimal: requiredAmount.toString(),
                priceInEther,
                pricePerUnit,
                quantity,
                contractAddress: contractConfig?.address,
                // 顯示計算過程
                calculation: {
                    raw: requiredAmount.toString(),
                    divided_by_1e18: (Number(requiredAmount) / 1e18).toString(),
                    per_unit: (Number(requiredAmount) / 1e18 / quantity).toString()
                }
            });
            
            // 價格異常警告 - 根據用戶反饋調整閾值
            // 英雄約 33000 SOUL，聖物也約 33000 SOUL
            const expectedRange = type === 'hero' ? { min: 20000, max: 50000 } : { min: 15000, max: 40000 };
            
            if (pricePerUnit < expectedRange.min || pricePerUnit > expectedRange.max) {
                console.warn(`[MintPage] ⚠️ 價格可能異常！${type} 單價: ${pricePerUnit.toFixed(2)} SoulShard`, {
                    expectedRange,
                    actualPrice: pricePerUnit,
                    possibleIssue: pricePerUnit > 1e18 ? 'Oracle 可能返回了錯誤的值' : '價格計算可能有誤'
                });
            }
        }
    }, [requiredAmount, quantity, type, contractConfig]);
    
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
            staleTime: 1000 * 30, // 30秒 - 授權後需要快速更新
            gcTime: 1000 * 60 * 5,   // 5分鐘
            refetchOnWindowFocus: true, // 開啟視窗焦點刷新
            refetchInterval: false, // 預設不自動刷新
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
        allowance: allowance ?? 0n,
    };
};

// =================================================================
// Section: 子元件與主頁面
// =================================================================

// 動態稀有度機率顯示組件
const RarityProbabilities: React.FC<{ quantity: number }> = ({ quantity }) => {
    const currentTier = getBatchTierForQuantity(quantity);
    
    if (!currentTier) {
        return (
            <div className="w-full text-xs text-gray-400 mt-4">
                <h4 className="font-bold text-center mb-1 text-red-400">⚠️ 數量無效</h4>
                <p className="text-center text-red-300">請輸入有效的數量</p>
            </div>
        );
    }

    return (
        <div className="w-full text-xs text-gray-400 mt-4">
            <div className="text-center mb-2">
                <h4 className="font-bold text-gray-300">{currentTier.tierName} - 稀有度機率</h4>
                <p className="text-xs text-gray-500">{currentTier.description}</p>
            </div>
            <div className="grid grid-cols-5 gap-1 text-center">
                {RARITY_LABELS.map((label, index) => {
                    const probability = currentTier.probabilities[index];
                    const isDisabled = probability === 0;
                    
                    return (
                        <div 
                            key={index}
                            className={`p-2 rounded transition-all ${
                                isDisabled 
                                    ? 'bg-gray-800/30 opacity-40' 
                                    : 'bg-black/40 border border-gray-600/50'
                            }`}
                        >
                            <div className={`text-xs ${isDisabled ? 'text-gray-600' : RARITY_COLORS[index]}`}>
                                {label}
                            </div>
                            <div className={`font-bold ${isDisabled ? 'text-gray-600' : 'text-white'}`}>
                                {probability}%
                            </div>
                            {isDisabled && (
                                <div className="text-xs text-red-400 mt-1">鎖定</div>
                            )}
                        </div>
                    );
                })}
            </div>
            {quantity < 50 && (
                <div className="mt-2 p-2 bg-orange-900/20 border border-orange-500/30 rounded">
                    <p className="text-xs text-orange-300 text-center">
                        🛡️ 防撞庫機制啟動 - 數量越多，稀有度上限越高
                    </p>
                </div>
            )}
        </div>
    );
};

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
                        <li>• 建議您可以 <strong className="text-yellow-300">手動刷新頁面</strong> 以更新資料</li>
                        <li>• 或前往 <strong className="text-yellow-300">「隊伍」頁面</strong> 等待片刻後刷新查看</li>
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
    
    const [quantity, setQuantity] = useState(1); // 默認從1個開始
    const [paymentSource, setPaymentSource] = useState<PaymentSource>('wallet');
    const [mintingResult, setMintingResult] = useState<AnyNft | null>(null);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [isCheckingApproval, setIsCheckingApproval] = useState(false);
    
    // 樂觀授權狀態：用於立即更新 UI，無需等待鏈上確認
    const [optimisticApprovalGranted, setOptimisticApprovalGranted] = useState(false);

    const debouncedQuantity = useDebounce(quantity, 300);
    
    const { requiredAmount, balance, needsApproval: baseNeedsApproval, isLoading, isError, error, platformFee, refetchAllowance, allowance } = useMintLogic(type, debouncedQuantity, paymentSource, chainId);
    
    // 合併實際授權狀態與樂觀狀態
    const needsApproval = baseNeedsApproval && !optimisticApprovalGranted;
    
    // 當支付方式改變時，重置樂觀授權狀態
    useEffect(() => {
        if (paymentSource === 'vault') {
            setOptimisticApprovalGranted(false);
        }
    }, [paymentSource]);
    
    // 當實際授權狀態更新且滿足需求時，可以重置樂觀狀態
    useEffect(() => {
        if (allowance && requiredAmount && allowance >= requiredAmount) {
            setOptimisticApprovalGranted(false); // 重置，因為實際授權已經足够
        }
    }, [allowance, requiredAmount]);
    
    // 計算價格合理性
    const pricePerUnit = useMemo(() => {
        if (!requiredAmount || quantity === 0) return 0;
        return Number(formatEther(requiredAmount)) / quantity;
    }, [requiredAmount, quantity]);
    
    const isPriceAbnormal = useMemo(() => {
        if (pricePerUnit === 0) return false;
        const expectedRange = type === 'hero' ? { min: 20000, max: 50000 } : { min: 15000, max: 40000 };
        return pricePerUnit < expectedRange.min || pricePerUnit > expectedRange.max;
    }, [pricePerUnit, type]);
    
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
    
    // 使用新的交易進度 Hook - 優化授權體驗
    const { execute: executeApprove, progress: approveProgress, reset: resetApprove } = useTransactionWithProgress({
        onSuccess: async () => {
            setShowProgressModal(false);
            showToast('授權完成！可以開始鑄造了 ⚡', 'success');
            
            // 🚀 樂觀更新：立即認為授權成功，無需等待鏈上確認
            // 這樣用戶可以立即看到「招募」按鈕，提升體驗
            setOptimisticApprovalGranted(true);
            setIsCheckingApproval(false);
            
            // 在背景中更新實際授權狀態，但不阻塞 UI
            setTimeout(async () => {
                try {
                    await refetchAllowance();
                } catch (error) {
                    console.log('背景更新授權狀態失敗，但不影響用戶操作:', error);
                }
            }, 500); // 500ms 後在背景更新
            
            // 為了保險起見，在 2-3 秒後再次檢查
            setTimeout(() => {
                refetchAllowance().catch(() => {
                    // 如果還是失敗，手動觸發頁面刷新提示
                    console.log('授權狀態檢查失敗，但用戶體驗不受影響');
                });
            }, 2500);
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
                    // 清理多個相關快取，確保數據更新
                    queryClient.invalidateQueries({ queryKey: ['ownedNfts'] });
                    queryClient.invalidateQueries({ queryKey: ['dashboardSimpleStats'] });
                    queryClient.invalidateQueries({ queryKey: ['explorer'] });
                    // 使用統一的失效策略
                    if (address) {
                        invalidationStrategies.onNftMinted(queryClient, address);
                    }
                    // 提示用戶數據同步（子圖可能有延遲）
                    showToast('鑄造成功！子圖數據同步可能需要 1-2 分鐘', 'success');
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
    
    // 每次 needsApproval 狀態變化時記錄
    useEffect(() => {
        console.log('[MintPage] 授權狀態:', {
            needsApproval,
            allowance: allowance?.toString(),
            requiredAmount: requiredAmount?.toString(),
            paymentSource
        });
    }, [needsApproval, allowance, requiredAmount, paymentSource]);

    // 決定使用哪個進度狀態
    const currentProgress = needsApproval && paymentSource === 'wallet' ? approveProgress : mintProgress;
    const isProcessing = currentProgress.status !== 'idle' && currentProgress.status !== 'error';
    
    const contractConfig = getContractLegacy(chainId, type);
    const soulShardContract = getContractLegacy(chainId, 'soulShard');

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
        // 移除最少5個的限制，允許單個鑄造
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
    
    const isButtonDisabled = !address || isLoading || isError || balance < requiredAmount || requiredAmount === 0n || isProcessing || isCheckingApproval;

    const getButtonText = () => {
        if (!address) return '請先連接錢包';
        if (isProcessing) return '處理中...';
        if (isCheckingApproval) return '檢查授權狀態...';
        if (paymentSource === 'wallet' && needsApproval) return '授權代幣使用';
        if (optimisticApprovalGranted && paymentSource === 'wallet') return `招募 ${quantity} 個 ⚡`;
        return `招募 ${quantity} 個`;
    };

    const actionButton = (paymentSource === 'wallet' && needsApproval)
        ? <ActionButton onClick={handleApprove} isLoading={isProcessing || isCheckingApproval} className="w-48 h-12">{getButtonText()}</ActionButton>
        : <ActionButton onClick={handleMint} isLoading={isProcessing || isLoading || isCheckingApproval} disabled={isButtonDisabled} className="w-48 h-12">{getButtonText()}</ActionButton>;

    return (
        <div className="card-bg p-6 rounded-xl shadow-lg flex flex-col items-center h-full">
            <MintResultModal nft={mintingResult} onClose={() => setMintingResult(null)} />
            <TransactionProgressModal
                isOpen={showProgressModal}
                onClose={() => setShowProgressModal(false)}
                progress={currentProgress}
                title={needsApproval && paymentSource === 'wallet' ? '授權進度' : '鑄造進度'}
            />
            <h3 className="section-title">招募{title}</h3>
            <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg px-3 py-2 mb-3 mx-4">
                <p className="text-xs text-amber-400 text-center font-medium">
                    ⚡ 數量越多，稀有度越高！單個最高2★，50個可達5★
                </p>
            </div>
            <div className="my-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                    {options.map(q => {
                        const tier = getBatchTierForQuantity(q);
                        const tierColors = {
                            "青銅包": "border-orange-600 bg-orange-600",
                            "白銀包": "border-gray-400 bg-gray-400", 
                            "黃金包": "border-yellow-500 bg-yellow-500",
                            "鉑金包": "border-purple-500 bg-purple-500"
                        };
                        const tierColor = tier ? tierColors[tier.tierName as keyof typeof tierColors] : "border-gray-600 bg-gray-600";
                        
                        return (
                            <div key={q} className="flex flex-col items-center">
                                <button 
                                    onClick={() => setQuantity(q)} 
                                    className={`w-14 h-14 rounded-full font-bold text-lg transition-all flex items-center justify-center border-2 ${
                                        quantity === q 
                                            ? `${tierColor} text-white scale-110 shadow-lg` 
                                            : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-300'
                                    }`}
                                >
                                    {q}
                                </button>
                                {tier && (
                                    <div className="text-xs mt-1 text-center">
                                        <div className={`font-medium ${quantity === q ? 'text-white' : 'text-gray-400'}`}>
                                            {tier.tierName}
                                        </div>
                                        <div className="text-gray-500">
                                            最高{tier.maxRarity}★
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="w-full my-4">
                <label className="block text-sm font-medium mb-2 text-center text-gray-400">選擇支付方式</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-900/50 rounded-lg">
                    <button onClick={() => setPaymentSource('wallet')} className={`px-4 py-2 rounded-md text-sm font-semibold transition ${paymentSource === 'wallet' ? 'bg-gray-700 text-white shadow' : 'text-gray-300'}`}>錢包支付</button>
                    <button onClick={() => setPaymentSource('vault')} className={`px-4 py-2 rounded-md text-sm font-semibold transition ${paymentSource === 'vault' ? 'bg-gray-700 text-white shadow' : 'text-gray-300'}`}>金庫支付 (免稅)</button>
                </div>
                <p className="text-xs text-center mt-2 text-gray-500">{paymentSource === 'wallet' ? '錢包餘額' : '金庫餘額'}: {address ? formatPriceDisplay(balance) : '0.00'} $SoulShard</p>
            </div>
            <div className="text-center mb-4 min-h-[72px] flex-grow flex flex-col justify-center">
                {isLoading ? <div className="flex flex-col items-center justify-center"><LoadingSpinner color="border-gray-500" /><p className="text-sm text-gray-400 mt-2">讀取價格中...</p></div>
                : isError ? <div className="text-red-500 text-center">
                    <p className="font-bold">價格讀取失敗</p>
                    <p className="text-xs mt-1">{(error as { shortMessage?: string })?.shortMessage || '請檢查合約狀態或網路連線。'}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="mt-2 px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors"
                    >
                        重新載入
                    </button>
                </div>
                : (<div>
                    <p className="text-lg text-gray-400">總價:</p>
                    <p className="font-bold text-yellow-400 text-2xl">
                        {formatPriceDisplay(requiredAmount)}
                    </p>
                    <p className="text-xs text-gray-500">$SoulShard + {formatEther(typeof platformFee === 'bigint' ? platformFee * BigInt(quantity) : 0n)} BNB</p>
                    <p className="text-xs text-gray-400 mt-1">
                        (約 ${(2 * quantity).toFixed(0)} USD，每個 $2 USD)
                    </p>
                </div>)}
            </div>
            {actionButton}
            <div className="text-xs text-gray-400 mt-2 text-center">
                <span className="inline-flex items-center gap-1">
                    <span>💡</span>
                    <span>價格基於 Oracle 即時匯率計算</span>
                </span>
            </div>
            <a href={contractConfig.address ? `https://www.okx.com/web3/nft/markets/collection/bscn/${contractConfig.address}` : '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline mt-2">前往市場交易</a>
            {contractConfig.address && (
                <p className="text-xs text-gray-500 mt-1">
                    {type === 'hero' ? '英雄' : '聖物'}合約地址: 
                    <a href={`https://bscscan.com/address/${contractConfig.address}`} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="ml-1 hover:text-gray-400 font-mono">
                        {contractConfig.address.slice(0, 6)}...{contractConfig.address.slice(-4)}
                    </a>
                </p>
            )}
            <RarityProbabilities quantity={quantity} />
        </div>
    );
};

const MintingInterface: React.FC<{ chainId: typeof bsc.id }> = ({ chainId }) => {
    const heroMintOptions = [1, 5, 10, 20, 50]; // 恢復單個鑄造選項
    const relicMintOptions = [1, 5, 10, 20, 50]; // 恢復單個鑄造選項
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <MintCard type="hero" options={heroMintOptions} chainId={chainId} />
                <MintCard type="relic" options={relicMintOptions} chainId={chainId} />
            </div>
        </>
    );
};

const MintPage: React.FC = () => {
    const { chainId } = useAccount();
    return (
        <section>
            <h2 className="page-title">鑄造工坊</h2>
            
            {chainId === bsc.id ? <MintingInterface chainId={chainId} /> : <div className="card-bg p-10 rounded-xl text-center text-gray-400"><p>請先連接到支援的網路 (BSC 主網) 以使用鑄造功能。</p></div>}
            
            {/* 收益最大化建議 */}
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mt-8 mb-6 max-w-4xl mx-auto">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center mt-0.5">
                        <span className="text-white text-sm">💡</span>
                    </div>
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-purple-300 font-semibold">
                            收益最大化策略
                        </p>
                        <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                            <li>建議每個帳號專注培養 <strong className="text-purple-200">一個精華隊伍</strong></li>
                            <li>隊伍戰力應達到 <strong className="text-purple-200">3000 以上</strong>，以挑戰最高收益的「混沌深淵」地下城</li>
                            <li>一般需要鑄造約 <strong className="text-purple-200">100 個聖物</strong> 和 <strong className="text-purple-200">200 個英雄</strong>，才能組建出幾個強力隊伍</li>
                            <li>優先選擇高容量聖物（4-5 星）和高戰力英雄進行組隊</li>
                            <li>記得：品質優於數量，一個強力隊伍勝過多個弱隊</li>
                            <li className="text-orange-300">⚠️ <strong>技術限制</strong>：為確保系統穩定性，建議單一地址擁有的英雄和聖物數量各不超過 1000 個</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            {/* 防撞庫機制說明 */}
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg p-6 mb-8 max-w-4xl mx-auto">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xl">🛡️</span>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-blue-300 mb-3">
                            防撞庫機制 - 批量越大，稀有度越高
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                            {BATCH_TIERS.map((tier, index) => (
                                <div key={index} className="bg-black/30 rounded-lg p-3 border border-gray-600/50">
                                    <div className="text-center">
                                        <div className="text-sm font-bold text-white mb-1">{tier.tierName}</div>
                                        <div className="text-xs text-gray-400 mb-2">{tier.minQuantity}個起</div>
                                        <div className="text-xs text-gray-300 mb-2">最高 {tier.maxRarity}★</div>
                                        <div className="text-xs text-green-400">
                                            約 ${tier.minQuantity * 2} USD
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-3">
                            <h4 className="text-yellow-300 font-semibold mb-2">💡 設計理念</h4>
                            <ul className="text-sm text-gray-300 space-y-1">
                                <li>• <strong>提高撞庫成本</strong>：科學家必須投入更多資金才能嘗試獲得高稀有度</li>
                                <li>• <strong>鼓勵大額投入</strong>：50個批量享受完整機率，獲得最佳遊戲體驗</li>
                                <li>• <strong>機率透明化</strong>：每個批量等級的稀有度機率完全公開</li>
                                <li>• <strong>經濟平衡</strong>：防止小額頻繁交易對經濟的影響</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default MintPage;
