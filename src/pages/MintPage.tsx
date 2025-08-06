// src/pages/MintPage.tsx (優化後最終版)

import React, { useState, useMemo, useEffect, memo } from 'react';
import { useAccount, useBalance, usePublicClient, useReadContract } from 'wagmi';
import { formatEther, maxUint256, decodeEventLog } from 'viem';
import type { Abi } from 'viem';
import { useQueryClient } from '@tanstack/react-query';
import { useAppToast } from '../contexts/SimpleToastContext';
import { useTransactionWithProgress } from '../hooks/useTransactionWithProgress';
import { TransactionProgressModal } from '../components/ui/TransactionProgressModal';
import { useOptimisticUpdate } from '../hooks/useOptimisticUpdate';
import { getContractWithABI } from '../config/contractsWithABI';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { bsc } from 'wagmi/chains';
import { Modal } from '../components/ui/Modal';
import { NftCard } from '../components/ui/NftCard';
import type { AnyNft, NftAttribute } from '../types/nft';
import { fetchMetadata } from '../api/nfts';
import { PRICE_OVERRIDE, logPriceOverride } from '../config/priceOverride';
import { invalidationStrategies } from '../config/queryConfig';
import { MintPagePreview } from '../components/mint/MintPagePreview';
import { FeaturedNftsGallery } from '../components/mint/FeaturedNftsGallery';

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
    const contractConfig = getContractWithABI(type === 'hero' ? 'HERO' : 'RELIC');
    const soulShardContract = getContractWithABI('SOULSHARD');
    const playerVaultContract = getContractWithABI('PLAYERVAULT');

    // ★★★【核心修復】★★★
    // 改用與管理頁面相同的 Oracle 直接查詢方式，避免 Hero 合約的問題
    // 每個 NFT 價格為 2 USD，需要轉換為 SoulShard
    const dungeonCoreContract = getContractWithABI('DUNGEONCORE');
    
    // 計算總 USD 金額（每個 NFT 2 USD）
    const totalUSDAmount = useMemo(() => {
        return BigInt(quantity * 2) * BigInt(10) ** BigInt(18); // 2 USD per NFT, 18 decimals
    }, [quantity]);
    
    // 通過 DungeonCore 獲取價格（與管理頁面邏輯一致）
    const { data: contractRequiredAmount, isLoading: isLoadingPrice, isError, error, refetch: refetchPrice } = useReadContract({
        ...dungeonCoreContract,
        functionName: 'getSoulShardAmountForUSD',
        args: [totalUSDAmount],
        query: { 
            enabled: !!dungeonCoreContract && quantity > 0 && !PRICE_OVERRIDE.enabled,
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
            
            console.log(`[MintPage] ${type} 價格調試 (通過 DungeonCore):`, {
                requiredAmount: requiredAmount.toString(),
                requiredAmountHex: '0x' + requiredAmount.toString(16),
                requiredAmountDecimal: requiredAmount.toString(),
                priceInEther,
                pricePerUnit,
                quantity,
                totalUSDAmount: totalUSDAmount.toString(),
                dungeonCoreAddress: dungeonCoreContract?.address,
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

    // 獲取錢包和金庫餘額的邏輯
    const { data: soulBalance } = useBalance({ address, token: soulShardContract?.address });
    const { data: bnbBalance } = useBalance({ address });
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
        balance: paymentSource === 'wallet' ? (soulBalance?.value ?? 0n) : vaultBalance,
        bnbBalance: bnbBalance?.value ?? 0n,
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


// 稀有度相關常量
const RARITY_LABELS = ['一星 ⭐', '二星 ⭐⭐', '三星 ⭐⭐⭐', '四星 ⭐⭐⭐⭐', '五星 ⭐⭐⭐⭐⭐'];
const RARITY_COLORS = ['text-gray-400', 'text-green-400', 'text-blue-400', 'text-purple-400', 'text-orange-400'];

// 統一的稀有度機率 (基於 Chainlink VRF 的公平亂數)
const UNIFIED_RARITY_PROBABILITIES = [44, 35, 15, 5, 1]; // 百分比，與 MintPagePreviewResponsive.tsx 一致

// 動態稀有度機率顯示組件 - 簡化版
const RarityProbabilities = memo<{ quantity: number }>(({ quantity }) => {
    // 不再依賴批量等級，顯示統一的機率分布
    return (
        <div className="w-full text-xs text-gray-400 mt-4">
            <div className="text-center mb-3">
                <h4 className="font-bold text-gray-300 mb-1">🎲 統一稀有度機率</h4>
                <p className="text-xs text-gray-500">所有數量都享有相同的公平機率分布</p>
            </div>
            <div className="grid grid-cols-5 gap-1 text-center">
                {RARITY_LABELS.map((label, index) => {
                    const probability = UNIFIED_RARITY_PROBABILITIES[index];
                    const [name, stars] = label.split(' ');
                    
                    return (
                        <div 
                            key={index}
                            className="p-2 rounded transition-all overflow-hidden bg-black/40 border border-gray-600/50"
                        >
                            <div className={`text-xs ${RARITY_COLORS[index]}`}>
                                <div className="truncate">{name}</div>
                                <div className="text-[10px] leading-tight break-all">{stars}</div>
                            </div>
                            <div className="font-bold text-sm mt-1 text-white">
                                {probability}%
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-3 p-2 bg-purple-900/20 border border-purple-600/50 rounded text-center">
                <p className="text-xs text-purple-300">
                    ⚡ 採用 Chainlink VRF 亂數系統確保公平，所有玩家享有相同機率
                </p>
            </div>
        </div>
    );
});
RarityProbabilities.displayName = 'RarityProbabilities';

// 批量鑄造結果數據結構
interface BatchMintResult {
    type: 'hero' | 'relic';
    quantity: number;
    bestNft?: AnyNft;  // 最高稀有度的 NFT
    allTokenIds?: bigint[];  // 所有鑄造的 Token ID
    totalValue?: number;  // 總價值 (USD)
}

const MintResultModal = memo<{ 
    result: BatchMintResult | AnyNft | null; 
    onClose: () => void 
}>(({ result, onClose }) => {
    if (!result) return null;
    
    // 檢查是否為批量鑄造結果
    const isBatchResult = result && 'quantity' in result;
    const isSingleNft = result && 'id' in result;
    
    if (isBatchResult) {
        const batchResult = result as BatchMintResult;
        const { type, quantity, bestNft, allTokenIds } = batchResult;
        const typeLabel = type === 'hero' ? '英雄' : '聖物';
        
        return (
            <Modal 
                isOpen={!!result} 
                onClose={onClose} 
                title={`鑄造成功！恭喜您獲得了 ${quantity} 個新的${typeLabel}！`} 
                confirmText="查看我的資產" 
                onConfirm={() => {
                    onClose();
                    window.location.hash = '/myAssets';
                }}
            >
                <div className="flex flex-col items-center">
                    <div className="text-center mb-4">
                        <div className="text-2xl mb-2">🎉</div>
                        <p className="text-green-400 font-bold text-lg">
                            批量鑄造完成！
                        </p>
                        <p className="text-gray-300 text-sm">
                            成功鑄造 {quantity} 個{typeLabel}
                        </p>
                    </div>
                    
                    {/* 批量鑄造的簡化顯示 - 只顯示佔位圖和數量 */}
                    <div className="w-64 mb-4 p-6 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg border-2 border-dashed border-amber-400/30">
                        <div className="text-center">
                            <div className="text-5xl mb-4">🎁</div>
                            <div className="text-2xl font-bold text-amber-400 mb-2">
                                {quantity}x {typeLabel}
                            </div>
                            <p className="text-gray-400 font-medium mb-1">批量鑄造完成</p>
                            <p className="text-xs text-gray-500">
                                請前往資產頁面查看詳細內容
                            </p>
                        </div>
                    </div>
                    
                    {allTokenIds && allTokenIds.length > 0 && (
                        <div className="mb-4 p-3 bg-gray-900/50 rounded-lg w-full max-w-sm">
                            <h5 className="text-sm font-semibold text-gray-300 mb-2 text-center">
                                獲得的 NFT ID 範圍
                            </h5>
                            <p className="text-center text-yellow-400 font-mono">
                                #{allTokenIds[0].toString()} - #{allTokenIds[allTokenIds.length - 1].toString()}
                            </p>
                        </div>
                    )}
                    
                    <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg w-full">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-blue-400">ℹ️</span>
                            <span className="text-sm font-medium text-blue-300">溫馨提示</span>
                        </div>
                        <ul className="text-xs text-gray-400 space-y-1">
                            <li>• 您的 NFT 將在 <strong className="text-blue-300">2-3 分鐘</strong> 後可用於組隊</li>
                            <li>• 需等待區塊鏈確認和數據同步完成</li>
                            <li>• 建議您可以 <strong className="text-yellow-300">手動刷新頁面</strong> 以更新資料</li>
                            <li>• 或前往 <strong className="text-yellow-300">「隊伍」頁面</strong> 等待片刻後刷新查看</li>
                            <li>• 可在<strong className="text-green-300">「我的資產」頁面</strong>查看最新狀態</li>
                        </ul>
                    </div>
                </div>
            </Modal>
        );
    }
    
    // 單個 NFT 鑄造的原有邏輯
    if (isSingleNft) {
        const nft = result as AnyNft;
        return (
            <Modal isOpen={!!result} onClose={onClose} title="鑄造成功！" confirmText="太棒了！" onConfirm={onClose}>
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
    }
    
    return null;
});
MintResultModal.displayName = 'MintResultModal';

interface MintCardProps {
    type: 'hero' | 'relic';
    options: number[];
    chainId: typeof bsc.id;
}

const MintCard = memo<MintCardProps>(({ type, options, chainId }) => {
    const { address } = useAccount();
    const { showToast } = useAppToast();
    const publicClient = usePublicClient();
    const queryClient = useQueryClient();
    
    // 定義 title 變數，避免 TDZ 錯誤 - 必須在所有使用它的 hooks 之前
    const title = type === 'hero' ? '英雄' : '聖物';
    
    const [quantity, setQuantity] = useState(50); // 默認 50 個，符合大多数用户的批量铸造需求
    const [paymentSource, setPaymentSource] = useState<PaymentSource>('wallet');
    const [mintingResult, setMintingResult] = useState<BatchMintResult | AnyNft | null>(null);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [isCheckingApproval, setIsCheckingApproval] = useState(false);
    
    // 樂觀授權狀態：用於立即更新 UI，無需等待鏈上確認
    const [optimisticApprovalGranted, setOptimisticApprovalGranted] = useState(false);
    
    // 授權處理狀態 - 用於更精確的 UI 反饋
    const [isApprovalProcessing, setIsApprovalProcessing] = useState(false);

    const debouncedQuantity = useDebounce(quantity, 300);
    
    const { requiredAmount, balance, bnbBalance, needsApproval: baseNeedsApproval, isLoading, isError, error, platformFee, refetchAllowance, allowance } = useMintLogic(type, debouncedQuantity, paymentSource, chainId);
    
    // 合併實際授權狀態與樂觀狀態
    const needsApproval = baseNeedsApproval && !optimisticApprovalGranted;
    
    // 當支付方式改變時，重置樂觀授權狀態
    useEffect(() => {
        if (paymentSource === 'vault') {
            setOptimisticApprovalGranted(false);
            setIsApprovalProcessing(false);
        }
    }, [paymentSource]);
    
    // 當實際授權狀態更新且滿足需求時，可以重置樂觀狀態
    useEffect(() => {
        if (allowance && requiredAmount && allowance >= requiredAmount) {
            setOptimisticApprovalGranted(false); // 重置，因為實際授權已經足够
            setIsApprovalProcessing(false); // 也重置處理狀態
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
    
    // 樂觀更新 Hook - 針對批量鑄造優化
    const { optimisticUpdate, confirmUpdate, rollback } = useOptimisticUpdate({
        queryKey: ['ownedNfts', address, chainId],
        updateFn: (oldData: any) => {
            if (!oldData) return oldData;
            
            // 為批量鑄造創建多個臨時 NFT
            const tempNfts: AnyNft[] = Array.from({ length: quantity }, (_, index) => ({
                id: BigInt(Date.now() + index), // 臨時 ID，避免重複
                type,
                contractAddress: contractConfig?.address || '',
                name: `載入中... ${type === 'hero' ? '英雄' : '聖物'} #${index + 1}`,
                description: '正在鏈上確認...',
                image: '',
                attributes: [],
                ...(type === 'hero' ? { power: 0, rarity: 0 } : { capacity: 0, rarity: 0 })
            }));
            
            // 更新對應的 NFT 列表
            return {
                ...oldData,
                [type === 'hero' ? 'heroes' : 'relics']: [
                    ...(oldData[type === 'hero' ? 'heroes' : 'relics'] || []),
                    ...tempNfts
                ]
            };
        },
        revertDelay: 120000 // 增加到 2 分鐘，給批量鑄造更多時間
    });
    
    // 使用新的交易進度 Hook - 優化授權體驗
    const { execute: executeApprove, progress: approveProgress, reset: resetApprove } = useTransactionWithProgress({
        onSuccess: async () => {
            setShowProgressModal(false);
            showToast('授權完成！可以開始鑄造了 ⚡', 'success');
            
            // 授權成功後樂觀更新
            setOptimisticApprovalGranted(true);
            setIsApprovalProcessing(false);
            setIsCheckingApproval(false);
            
            // 在背景中更新實際授權狀態
            setTimeout(async () => {
                try {
                    await refetchAllowance();
                } catch (error) {
                    console.log('背景更新授權狀態失敗，但不影響用戶操作:', error);
                }
            }, 500);
        },
        successMessage: '授權成功！',
        errorMessage: '授權失敗',
        onError: () => {
            // 錯誤時清理所有狀態
            setOptimisticApprovalGranted(false);
            setIsApprovalProcessing(false);
            setShowProgressModal(false);
        }
    });
    
    const { execute: executeMint, progress: mintProgress, reset: resetMint } = useTransactionWithProgress({
        onSuccess: async (receipt) => {
            // 確認樂觀更新
            confirmUpdate();
            
            // 處理鑄造成功邏輯
            const mintEventName = type === 'hero' ? 'HeroMinted' : 'RelicMinted';
            const allMintLogs = receipt.logs.filter((log: any) => {
                try {
                    return decodeEventLog({ abi: contractConfig.abi, ...log }).eventName === mintEventName;
                } catch {
                    return false;
                }
            });
            
            if (allMintLogs.length > 0 && contractConfig) {
                // 提取所有 token ID
                const allTokenIds: bigint[] = [];
                const allNfts: AnyNft[] = [];
                
                // 如果是批量鑄造（超過1個），使用新的批量結果格式
                if (quantity > 1) {
                    // 對於批量鑄造，我們先創建基本的批量結果
                    const batchResult: BatchMintResult = {
                        type,
                        quantity,
                        allTokenIds: allMintLogs.map(log => {
                            const decoded = decodeEventLog({ abi: contractConfig.abi, ...log });
                            const tokenId = (decoded.args as { tokenId?: bigint }).tokenId;
                            return tokenId!;
                        }).filter(Boolean),
                        totalValue: quantity * 2 // 每個 NFT 2 USD
                    };
                    
                    // 批量鑄造策略：為提高效率，不嘗試獲取具體 NFT 詳情
                    // bestNft 保持 undefined，直接顯示佔位符和數量信息
                    
                    setMintingResult(batchResult);
                } else {
                    // 單個鑄造的原有邏輯
                    const mintLog = allMintLogs[0];
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
                    }
                }
                
                // 清理多個相關快取，確保數據更新  
                queryClient.invalidateQueries({ queryKey: ['ownedNfts'] });
                queryClient.invalidateQueries({ queryKey: ['dashboardSimpleStats'] });
                queryClient.invalidateQueries({ queryKey: ['explorer'] });
                // 使用統一的失效策略
                if (address) {
                    invalidationStrategies.onNftMinted(queryClient, address);
                }
                // 提示用戶數據同步（子圖可能有延遲）
                showToast(
                    quantity > 1 
                        ? `批量鑄造成功！${quantity} 個 ${title} 已添加到您的資產` 
                        : '鑄造成功！子圖數據同步可能需要 1-2 分鐘', 
                    'success'
                );
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
    
    // 每次 needsApproval 狀態變化時記錄（只在 DEBUG 模式下）
    useEffect(() => {
        if (import.meta.env.VITE_ENABLE_DEBUG === 'true') {
            console.log('[MintPage] 授權狀態:', {
                needsApproval,
                allowance: allowance?.toString(),
                requiredAmount: requiredAmount?.toString(),
                paymentSource
            });
        }
    }, [needsApproval, allowance, requiredAmount, paymentSource]);

    // 決定使用哪個進度狀態 - 修復樂觀更新後的進度顯示問題
    const currentProgress = (needsApproval && paymentSource === 'wallet' && !optimisticApprovalGranted) 
        ? approveProgress 
        : mintProgress;
    const isProcessing = currentProgress.status !== 'idle' && currentProgress.status !== 'error';
    
    const contractConfig = getContractWithABI(type === 'hero' ? 'HERO' : 'RELIC');
    const soulShardContract = getContractWithABI('SOULSHARD');

    if (!contractConfig || !soulShardContract) {
        return <div className="card-bg p-6 rounded-xl shadow-lg flex flex-col items-center justify-center h-full text-center"><h3 className="text-xl font-bold text-red-500">設定錯誤</h3><p className="text-gray-400 mt-2">找不到 '{type}' 或 '$SoulShard' 的合約地址。</p><p className="text-gray-400 text-xs mt-1">請檢查您的 <code>.env</code> 環境變數設定是否正確。</p></div>;
    }

    const handleApprove = async () => {
        if (!soulShardContract || !contractConfig) return;
        
        // 快速響應：立即更新 UI 狀態
        setIsApprovalProcessing(true);
        
        // 延遲顯示模態框，先給用戶按鈕反饋
        setTimeout(() => {
            setShowProgressModal(true);
        }, 100);
        
        resetApprove();
        
        try {
            const result = await executeApprove(
                {
                    address: soulShardContract.address,
                    abi: soulShardContract.abi,
                    functionName: 'approve',
                    args: [contractConfig.address, maxUint256]
                },
                `批准 ${title} 合約使用代幣`
            );
            
            // 如果交易成功發送，立即進行樂觀更新
            if (result) {
                setTimeout(() => {
                    setOptimisticApprovalGranted(true);
                    setIsApprovalProcessing(false);
                }, 1500); // 1.5秒後切換到招募按鈕
            }
        } catch (error) {
            setIsApprovalProcessing(false);
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
    
    const isInsufficientBalance = balance < requiredAmount;
    // 授權按鈕不應該因為餘額不足而禁用
    const isApproveDisabled = !address || isLoading || isError || requiredAmount === 0n || isProcessing || isCheckingApproval || isApprovalProcessing;
    // 鑄造按鈕需要檢查餘額
    const isMintDisabled = !address || isLoading || isError || isInsufficientBalance || requiredAmount === 0n || isProcessing || isCheckingApproval || isApprovalProcessing;

    const getButtonText = () => {
        if (!address) return '請先連接錢包';
        if (isApprovalProcessing) return '授權處理中...';
        if (isProcessing) {
            // 根據當前流程提供更具體的狀態
            if (needsApproval && paymentSource === 'wallet') {
                return '授權處理中...';
            }
            return '招募處理中...';
        }
        if (isCheckingApproval) return '檢查授權狀態...';
        // 授權按鈕優先顯示授權文本，即使餘額不足
        if (paymentSource === 'wallet' && needsApproval) return '授權代幣使用';
        // 只有在不需要授權時才顯示餘額不足
        if (isInsufficientBalance) return '餘額不足';
        // 樂觀更新生效後，立即顯示招募按鈕
        return `招募 ${quantity} 個${quantity >= 50 ? ' ⚡' : ''}`;
    };

    const actionButton = (paymentSource === 'wallet' && needsApproval)
        ? <ActionButton 
            onClick={handleApprove} 
            isLoading={isProcessing || isCheckingApproval || isApprovalProcessing} 
            className={`w-full sm:w-48 h-10 sm:h-12 text-sm sm:text-base ${isInsufficientBalance ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`} 
            disabled={isApproveDisabled}
          >
            {getButtonText()}
          </ActionButton>
        : <ActionButton 
            onClick={handleMint} 
            isLoading={isProcessing || isLoading || isCheckingApproval} 
            disabled={isMintDisabled} 
            className="w-full sm:w-48 h-10 sm:h-12 text-sm sm:text-base"
          >
            {getButtonText()}
          </ActionButton>;

    return (
        <div className="card-bg p-4 sm:p-5 md:p-6 rounded-xl shadow-lg flex flex-col items-center h-full">
            <MintResultModal result={mintingResult} onClose={() => setMintingResult(null)} />
            <TransactionProgressModal
                isOpen={showProgressModal}
                onClose={() => setShowProgressModal(false)}
                progress={currentProgress}
                title={(needsApproval && paymentSource === 'wallet' && !optimisticApprovalGranted) ? '授權進度' : '鑄造進度'}
            />
            <h3 className="section-title">招募{title}</h3>
            <div className="my-3 sm:my-4">
                <div className="flex items-center justify-center gap-1 sm:gap-2 mb-2">
                    {options.map(q => {
                        return (
                            <div key={q} className="flex flex-col items-center">
                                <button 
                                    onClick={() => setQuantity(q)} 
                                    className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full font-bold text-base sm:text-lg transition-all flex items-center justify-center border-2 ${
                                        quantity === q 
                                            ? 'border-indigo-500 bg-indigo-500 text-white scale-110 shadow-lg' 
                                            : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-gray-300'
                                    }`}
                                >
                                    {q}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* 稀有度機率顯示 */}
            <RarityProbabilities quantity={quantity} />
            
            <div className="w-full my-3 sm:my-4">
                <label className="block text-sm font-medium mb-2 text-center text-gray-400">選擇支付方式</label>
                <div className="grid grid-cols-2 gap-1 sm:gap-2 p-1 bg-gray-900/50 rounded-lg">
                    <button onClick={() => setPaymentSource('wallet')} className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition ${paymentSource === 'wallet' ? 'bg-gray-700 text-white shadow' : 'text-gray-300'}`}>錢包支付</button>
                    <button onClick={() => setPaymentSource('vault')} className={`px-2 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-semibold transition ${paymentSource === 'vault' ? 'bg-gray-700 text-white shadow' : 'text-gray-300'}`}>金庫支付 (免稅)</button>
                </div>
                <div className="text-xs text-center mt-2 space-y-1">
                    <p className="text-gray-500">
                        {paymentSource === 'wallet' ? '錢包餘額' : '金庫餘額'}: 
                        <span className={isInsufficientBalance ? 'text-red-400' : 'text-gray-300'}>
                            {address ? formatPriceDisplay(balance) : '0.00'} SOUL
                        </span>
                    </p>
                    {paymentSource === 'wallet' && (
                        <p className="text-gray-600">
                            BNB: {address ? Number(formatEther(bnbBalance)).toFixed(10) : '0.00'}
                        </p>
                    )}
                    {isInsufficientBalance && (
                        <>
                            <p className="text-red-400 font-medium">
                                需要 {formatPriceDisplay(requiredAmount)} SOUL
                            </p>
                            {paymentSource === 'wallet' && needsApproval && (
                                <p className="text-yellow-400 text-xs animate-pulse">
                                    💡 您可以先完成授權，等有餘額後即可直接鑄造
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
            <div className="text-center mb-3 sm:mb-4 min-h-[60px] sm:min-h-[72px] flex-grow flex flex-col justify-center">
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
                    <p className="text-base sm:text-lg text-gray-400">總價:</p>
                    <p className="font-bold text-yellow-400 text-xl sm:text-2xl">
                        {formatPriceDisplay(requiredAmount)}
                    </p>
                    <p className="text-xs text-gray-500">$SoulShard + {formatEther(typeof platformFee === 'bigint' ? platformFee * BigInt(quantity) : 0n)} BNB</p>
                    <p className="text-xs text-gray-400 mt-1">
                        (約 ${(2 * quantity).toFixed(0)} USD，每個 $2 USD)
                    </p>
                </div>)}
            </div>
            {actionButton}
            <div className="flex items-center justify-center gap-2 mt-4">
                <a href={contractConfig.address ? `https://web3.okx.com/zh-hant/nft/collection/bsc/${contractConfig.address}` : '#'} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-500 dark:text-orange-400 hover:underline">
                    🌐 OKX 市場
                </a>
            </div>
            {contractConfig.address && (
                <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-2">
                    <span>{type === 'hero' ? '英雄' : '聖物'}合約地址:</span>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(contractConfig.address);
                            showToast('地址已複製！', 'success');
                        }}
                        className="hover:text-gray-400 font-mono flex items-center gap-1 group transition-colors"
                        title="點擊複製地址"
                    >
                        <span>{contractConfig.address.slice(0, 6)}...{contractConfig.address.slice(-4)}</span>
                        <svg className="w-3 h-3 opacity-70 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
});
MintCard.displayName = 'MintCard';

const MintingInterface = memo<{ chainId: typeof bsc.id }>(({ chainId }) => {
    const heroMintOptions = [50, 20, 10, 5, 1]; // 批量鑄造優先，鼓勵更好的用戶體驗
    const relicMintOptions = [50, 20, 10, 5, 1]; // 批量鑄造優先，鼓勵更好的用戶體驗
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                <MintCard type="hero" options={heroMintOptions} chainId={chainId} />
                <MintCard type="relic" options={relicMintOptions} chainId={chainId} />
            </div>
        </>
    );
});
MintingInterface.displayName = 'MintingInterface';

const MintPage: React.FC = memo(() => {
    const { chainId, address } = useAccount();
    
    // 如果未連接錢包，顯示預覽模式
    if (!address) {
        return <MintPagePreview />;
    }
    
    return (
        <section>
            <h2 className="page-title">鑄造工坊</h2>
            
            {chainId === bsc.id ? <MintingInterface chainId={chainId} /> : <div className="card-bg p-10 rounded-xl text-center text-gray-400"><p>請先連接到支援的網路 (BSC 主網) 以使用鑄造功能。</p></div>}
            
            {/* 收益最大化建議 */}
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 sm:p-4 mt-6 sm:mt-8 mb-4 sm:mb-6 max-w-4xl mx-auto">
                <div className="flex flex-col gap-2">
                    <p className="text-xs sm:text-sm text-purple-300 font-semibold">
                        收益最大化策略
                    </p>
                    <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
                            <li>專注培養 <strong className="text-purple-200">精華隊伍</strong>（可以是一個或多個）</li>
                            <li>隊伍戰力應達到 <strong className="text-purple-200">3000 以上</strong>，以挑戰較高收益的「混沌深淵」地下城</li>
                            <li>一般需要鑄造約 <strong className="text-purple-200">100 個聖物</strong> 和 <strong className="text-purple-200">200 個英雄</strong>，才能組建出幾個強力隊伍</li>
                            <li>優先選擇高容量聖物（4-5 星）和高戰力英雄進行組隊</li>
                            <li>記得：品質優於數量，一個強力隊伍勝過多個弱隊</li>
                            <li className="text-orange-300">⚠️ <strong>技術限制</strong>：為確保系統穩定性，建議單一地址擁有的英雄和聖物數量各不超過 1000 個</li>
                        </ul>
                </div>
            </div>
            
            {/* VRF 隨機性機制說明 */}
            <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg p-4 sm:p-5 md:p-6 mb-6 sm:mb-8 max-w-4xl mx-auto">
                <div>
                    <div className="bg-purple-900/20 border border-purple-600/50 rounded-lg p-3 sm:p-4">
                        <h3 className="text-base sm:text-lg font-bold text-purple-300 mb-3">🎲 Chainlink VRF 可驗證隨機性</h3>
                        <ul className="text-xs sm:text-sm text-gray-300 space-y-2">
                            <li>• <strong>自動揭示</strong>：鑄造後自動完成，無需手動操作</li>
                            <li>• <strong>可驗證隨機性</strong>：使用 Chainlink VRF 確保絕對公平</li>
                            <li>• <strong>統一機率分布</strong>：所有批量享有相同的稀有度機會</li>
                            <li>• <strong>防止操縱</strong>：鏈上可驗證的隨機數無法預測或操控</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            {/* 精選NFT展示 */}
            <div className="mt-12 mb-8">
                <FeaturedNftsGallery />
            </div>
        </section>
    );
});

export default MintPage;
