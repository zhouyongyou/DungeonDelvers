// src/pages/AltarPage.tsx (數據讀取修正版)

import React, { useState, useMemo, useEffect, memo } from 'react';
import { useAccount, useReadContracts, useWriteContract, usePublicClient, useReadContract } from 'wagmi';
import { useContractBatchRead, usePriceSettingsBatchRead } from '../hooks/useContractBatchRead';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatEther, decodeEventLog, type Abi } from 'viem';
import { fetchMetadata } from '../api/nfts';
import { getContractWithABI } from '../config/contractsWithABI';
import altarOfAscensionABI from '../abis/AltarOfAscension.json';
import heroABI from '../abis/Hero.json';
import relicABI from '../abis/Relic.json';
import { NftCard } from '../components/ui/NftCard';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { LocalErrorBoundary, LoadingState, ErrorState } from '../components/ui/ErrorBoundary';
import { useAppToast } from '../contexts/SimpleToastContext';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useTransactionWithProgress } from '../hooks/useTransactionWithProgress';
import { TransactionProgressModal } from '../components/ui/TransactionProgressModal';
import { useOptimisticUpdate } from '../hooks/useOptimisticUpdate';
import type { AnyNft, HeroNft, NftAttribute, RelicNft, NftType } from '../types/nft';
import { bsc } from 'wagmi/chains';
import { Modal } from '../components/ui/Modal';
import { logger } from '../utils/logger';

// 新增的祭壇專用組件
import { AltarRulesVisualization } from '../components/altar/AltarRulesVisualization';
import { AltarRitualAnimation } from '../components/altar/AltarRitualAnimation';
import { AltarTutorial } from '../components/altar/AltarTutorial';
import { AltarHistoryStats } from '../components/altar/AltarHistoryStats';
import { AltarVipBonus } from '../components/altar/AltarVipBonus';

// =================================================================
// Section: GraphQL 查詢與數據獲取 Hooks
// =================================================================

import { THE_GRAPH_API_URL } from '../config/graphConfig';

// ★ 核心修正: 查詢語句現在直接查詢頂層的 heroes 和 relics，並使用正確的變數類型
const GET_FILTERED_NFTS_QUERY = `
  query GetFilteredNfts($owner: String!, $rarity: Int!) {
    heros(where: { owner: $owner, rarity: $rarity }, first: 1000) {
      id
      tokenId
      power
      rarity
      owner {
        id
      }
    }
    relics(where: { owner: $owner, rarity: $rarity }, first: 1000) {
      id
      tokenId
      capacity
      rarity
      owner {
        id
      }
    }
  }
`;

const useAltarMaterials = (nftType: NftType, rarity: number) => {
    const { address, chainId } = useAccount();

    return useQuery({
        queryKey: ['altarMaterials', address, chainId, nftType, rarity],
        queryFn: async (): Promise<AnyNft[]> => {
            if (!address || !THE_GRAPH_API_URL) return [];
            
            try {
                const result = await fetchFromGraph(GET_FILTERED_NFTS_QUERY, { owner: address.toLowerCase(), rarity });
                
                // 添加調試信息

                // 檢查 result 是否存在
                if (!result) {
                    logger.warn('GraphQL查詢返回空結果 - 可能是子圖正在同步新合約');
                    return [];
                }
                
                const assets = nftType === 'hero' ? result.heros : result.relics;

                if (!assets || !Array.isArray(assets)) {
                    logger.warn(`${nftType} 資產數組為空或不是數組:`, assets, '- 可能是子圖數據尚未同步');
                    return [];
                }

                const contractAddress = nftType === 'hero' ? getContractWithABI('HERO')?.address : getContractWithABI('RELIC')?.address;
                if (!contractAddress) {
                    logger.error(`找不到 ${nftType} 合約地址`);
                    return [];
                }

                const filteredAssets = assets
                    .filter((asset: { tokenId: string; power?: string; capacity?: string; rarity?: string }) => {
                        // 嚴格檢查稀有度是否匹配查詢條件
                        const assetRarity = asset.rarity ? Number(asset.rarity) : null;
                        if (assetRarity !== rarity) {
                            logger.warn(`NFT #${asset.tokenId} 稀有度不匹配: 期望 ${rarity}，實際 ${assetRarity}`);
                            return false; // 過濾掉不匹配的 NFT
                        }
                        return true;
                    })
                    .map((asset: { tokenId: string; power?: string; capacity?: string; rarity?: string }) => {
                        const assetRarity = Number(asset.rarity);
                        const baseNft = {
                            id: BigInt(asset.tokenId),
                            name: `${nftType === 'hero' ? '英雄' : '聖物'} #${asset.tokenId}`,
                            image: `/images/${nftType}/${nftType}-${assetRarity}.png`,  // 根據稀有度設定正確的圖片
                            description: '',
                            attributes: [],
                            contractAddress: contractAddress,
                            tokenId: BigInt(asset.tokenId),
                            source: 'subgraph' as const,
                        };

                        if (nftType === 'hero') {
                            return {
                                ...baseNft,
                                type: 'hero' as const,
                                power: asset.power ? Number(asset.power) : 0,
                                rarity: assetRarity
                            } as HeroNft;
                        } else {
                            return {
                                ...baseNft,
                                type: 'relic' as const,
                                capacity: asset.capacity ? Number(asset.capacity) : 0,
                                rarity: assetRarity
                            } as RelicNft;
                        }
                    });
                
                // 排序：戰力/容量從低到高（方便選擇弱的材料來升級）
                const sortedAssets = filteredAssets.sort((a, b) => {
                    if (nftType === 'hero') {
                        return (a as HeroNft).power - (b as HeroNft).power;
                    } else {
                        return (a as RelicNft).capacity - (b as RelicNft).capacity;
                    }
                });
                
                return sortedAssets;
            } catch (error) {
                logger.error(`獲取 ${nftType} 材料失敗:`, error);
                return [];
            }
        },
        enabled: !!address && chainId === bsc.id && rarity > 0 && !!THE_GRAPH_API_URL,
        staleTime: 1000 * 30,
        retry: 2,
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 5000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
    });
};

// 獨立的 GraphQL 請求函式
const fetchFromGraph = async (query: string, variables: Record<string, unknown>) => {
    if (!THE_GRAPH_API_URL) throw new Error("The Graph API URL is not configured.");
    const response = await fetch(THE_GRAPH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) throw new Error('GraphQL Network response was not ok');
    const { data, errors } = await response.json();
    if (errors) throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`);
    return data;
};

// =================================================================
// Section: 子元件 (保持不變)
// =================================================================

type UpgradeOutcomeStatus = 'great_success' | 'success' | 'partial_fail' | 'total_fail';

type UpgradeOutcome = {
  status: UpgradeOutcomeStatus;
  nfts: AnyNft[];
  message: string;
};

const UpgradeResultModal: React.FC<{ result: UpgradeOutcome | null; onClose: () => void }> = ({ result, onClose }) => {
    if (!result) return null;
    const titleMap: Record<UpgradeOutcomeStatus, string> = {
        great_success: '⚜️ 大成功！', success: '✨ 升星成功！',
        partial_fail: '💔 部分失敗...', total_fail: '💀 完全失敗',
    };
    return (
        <Modal isOpen={!!result} onClose={onClose} title={titleMap[result.status]} confirmText="太棒了！" onConfirm={onClose}>
            <div className="flex flex-col items-center">
                <p className="mb-4 text-center text-gray-300">{result.message}</p>
                {result.nfts.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                        {result.nfts.map(nft => ( <div key={nft.id.toString()} className="w-40"><NftCard nft={nft} /></div> ))}
                    </div>
                )}
            </div>
        </Modal>
    );
};

// VIP 加成顯示元件
const VipBonusDisplay: React.FC<{ address: string | undefined }> = ({ address }) => {
  const altarContract = getContractWithABI('ALTAROFASCENSION');
  
  const { data: vipInfo } = useReadContract({
    address: altarContract?.address as `0x${string}`,
    abi: altarContract?.abi,
    functionName: 'getPlayerVipInfo',
    args: address ? [address] : undefined,
    query: { 
      enabled: !!altarContract && !!address,
      staleTime: 1000 * 60 * 5, // 5分鐘
    }
  });
  
  if (!vipInfo || !address) return null;
  
  const [currentVipLevel, additionalBonus, totalVipBonus, effectiveTotalBonus] = vipInfo as [number, number, number, number];
  
  if (effectiveTotalBonus === 0) return null;
  
  return (
    <div className="mt-3 p-3 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg text-sm">
      <div className="flex items-center justify-between">
        <span className="text-purple-300">🎆 升星加成</span>
        <span className="font-bold text-purple-200">+{effectiveTotalBonus}%</span>
      </div>
      <div className="mt-2 text-xs text-gray-400 space-y-1">
        {currentVipLevel > 0 && (
          <div>VIP{currentVipLevel} 加成：+{currentVipLevel}%</div>
        )}
        {additionalBonus > 0 && (
          <div>神秘加成：+{additionalBonus}%</div>
        )}
      </div>
    </div>
  );
};

// 手機版簡化的升星規則卡片
const UpgradeInfoCard: React.FC<{ 
  rule: { materialsRequired: number; nativeFee: bigint; greatSuccessChance: number; successChance: number; partialFailChance: number } | null; 
  isLoading: boolean; 
  address?: string;
  showDetails?: boolean;
  onToggleDetails?: () => void;
}> = ({ rule, isLoading, address, showDetails = false, onToggleDetails }) => {
  if (isLoading) return <div className="card-bg p-3 sm:p-4 rounded-xl animate-pulse h-32 sm:h-48"><LoadingSpinner /></div>;
  if (!rule || !rule.materialsRequired) return <div className="card-bg p-3 sm:p-4 rounded-xl text-center text-gray-500">請先選擇要升級的星級</div>;
  
  // 顯示調整後的中間值機率
  const optimizedRules = {
    1: { greatSuccessChance: 8, successChance: 77, partialFailChance: 13, completeFailChance: 2 },
    2: { greatSuccessChance: 6, successChance: 69, partialFailChance: 20, completeFailChance: 5 },
    3: { greatSuccessChance: 4, successChance: 41, partialFailChance: 40, completeFailChance: 15 },
    4: { greatSuccessChance: 3, successChance: 22, partialFailChance: 50, completeFailChance: 25 }
  };
  
  const rarity = rule.materialsRequired === 5 ? 1 : 
                 rule.materialsRequired === 4 ? 2 :
                 rule.materialsRequired === 3 ? 3 : 4;
  const displayRule = optimizedRules[rarity as 1 | 2 | 3 | 4] || { 
    greatSuccessChance: rule.greatSuccessChance, 
    successChance: rule.successChance,
    partialFailChance: rule.partialFailChance || 0,
    completeFailChance: 0
  };
  
  const totalSuccessRate = displayRule.greatSuccessChance + displayRule.successChance;
  
  return (
    <div className="card-bg p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl text-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm sm:text-base md:text-lg font-semibold text-white">
          <span className="hidden sm:inline">⚜️ </span>升星規則
        </h4>
        <button 
          onClick={onToggleDetails}
          className="sm:hidden text-xs text-gray-400 hover:text-white transition-colors"
        >
          {showDetails ? '收縮' : '詳情'}
        </button>
      </div>
      
      {/* 基本信息 - 手機版只顯示核心數據 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">所需材料:</span>
          <span className="font-bold text-white">{rule.materialsRequired} 個</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">成功率:</span>
          <span className="font-bold text-green-400">{totalSuccessRate}%</span>
        </div>
        
        {/* 手機版簡化或詳細信息 */}
        {(showDetails || window.innerWidth >= 640) && (
          <>
            <hr className="border-gray-700 my-3" />
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-purple-400">
                  <span className="hidden sm:inline">⚜️ </span>神跡降臨
                </span>
                <span className="font-bold">{displayRule.greatSuccessChance}%</span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-green-400">
                  <span className="hidden sm:inline">✨ </span>祝福成功
                </span>
                <span className="font-bold">{displayRule.successChance}%</span>
              </div>
              {displayRule.partialFailChance > 0 && (
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-yellow-400">
                    <span className="hidden sm:inline">⚡ </span>部分返還
                  </span>
                  <span className="font-bold">{displayRule.partialFailChance}%</span>
                </div>
              )}
              {displayRule.completeFailChance > 0 && (
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-red-400">
                    <span className="hidden sm:inline">💀 </span>升星失敗
                  </span>
                  <span className="font-bold">{displayRule.completeFailChance}%</span>
                </div>
              )}
            </div>
            <div className="mt-3 p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-blue-300 text-center">
                {rarity <= 2 ? 
                  `✨ 總成功率：${totalSuccessRate}% (新手友好)` : 
                  `⚔️ 總成功率：${totalSuccessRate}% (挑戰升級)`
                }
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// =================================================================
// Section: AltarPage 主元件
// =================================================================

const AltarPage = memo(() => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const publicClient = usePublicClient();
    const queryClient = useQueryClient();
    const { writeContract } = useWriteContract();

    const [nftType, setNftType] = useState<NftType>('hero');
    const [rarity, setRarity] = useState<number>(1);
    const [selectedNfts, setSelectedNfts] = useState<bigint[]>([]);
    const [upgradeResult, setUpgradeResult] = useState<UpgradeOutcome | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    
    // 新增的 UI 狀態
    const [showTutorial, setShowTutorial] = useState(false);
    const [showHistoryStats, setShowHistoryStats] = useState(false);
    const [ritualStage, setRitualStage] = useState<'idle' | 'preparing' | 'ritual' | 'success' | 'great_success' | 'failed'>('idle');

    // Always call hooks unconditionally - move early returns after all hooks
    const altarContract = getContractWithABI('ALTAROFASCENSION');
    const heroContract = getContractWithABI('HERO');
    const relicContract = getContractWithABI('RELIC');

    // 檢查當前 NFT 類型的授權狀態
    const currentNftContract = nftType === 'hero' ? heroContract : relicContract;
    
    // 批量讀取合約數據
    const { results: altarBatchResults } = useContractBatchRead({
        chainId: bsc.id,
        reads: [
            ...(address && currentNftContract && altarContract ? [
                { 
                    contractName: nftType === 'hero' ? 'hero' : 'relic', 
                    functionName: 'isApprovedForAll', 
                    args: [address, altarContract.address] 
                },
            ] : []),
        ],
    });
    
    const [approvalResult] = altarBatchResults;
    const isApprovedForAll = approvalResult?.data as boolean | undefined;
    
    // 單獨的 refetch hook
    const { refetch: refetchApproval } = useReadContract({
        address: currentNftContract?.address as `0x${string}`,
        abi: currentNftContract?.abi,
        functionName: 'isApprovedForAll',
        args: address && altarContract ? [address, altarContract.address] : undefined,
        query: {
            enabled: false, // 只用於 refetch
        }
    });

    // 使用交易進度 Hook
    const { execute: executeUpgrade, progress: upgradeProgress, reset: resetProgress } = useTransactionWithProgress({
        onSuccess: async (receipt) => {
            try {
                // 設定儀式為成功狀態
                setRitualStage('ritual');
                
                const upgradeLog = receipt.logs.find((log: any) => log.address.toLowerCase() === altarContract?.address.toLowerCase());
                if (!upgradeLog) throw new Error("找不到升級事件");

                const decodedUpgradeLog = decodeEventLog({ abi: altarOfAscensionABI, ...upgradeLog });
                if (decodedUpgradeLog.eventName !== 'UpgradeAttempted') throw new Error("事件名稱不符");

                const outcome = Number(((decodedUpgradeLog.args as unknown) as Record<string, unknown>).outcome);
                const tokenContract = nftType === 'hero' ? heroContract : relicContract;
                const tokenContractAbi = nftType === 'hero' ? heroABI : relicABI;
                const mintEventName = nftType === 'hero' ? 'HeroMinted' : 'RelicMinted';
                
                const mintedLogs = receipt.logs
                    .filter((log: any) => log.address.toLowerCase() === tokenContract?.address.toLowerCase())
                    .map((log: any) => { try { return decodeEventLog({ abi: tokenContractAbi, ...log }); } catch { return null; } })
                    .filter((log): log is NonNullable<typeof log> => log !== null && log.eventName === mintEventName);

                const newNfts: AnyNft[] = await Promise.all(mintedLogs.map(async (log) => {
                    const tokenId = ((log.args as unknown) as Record<string, unknown>).tokenId as bigint;
                    const tokenUri = await publicClient?.readContract({ 
                        address: tokenContract!.address, 
                        abi: tokenContract!.abi as Abi, 
                        functionName: 'tokenURI', 
                        args: [tokenId] 
                    }) as string;
                    const metadata = await fetchMetadata(tokenUri, tokenId.toString(), tokenContract!.address);
                    const findAttr = (trait: string, defaultValue = 0) => metadata.attributes?.find((a: NftAttribute) => a.trait_type === trait)?.value ?? defaultValue;
                    if (nftType === 'hero') return { ...metadata, id: tokenId, type: 'hero', contractAddress: tokenContract!.address, power: Number(findAttr('Power')), rarity: Number(findAttr('Rarity')) };
                    return { ...metadata, id: tokenId, type: 'relic', contractAddress: tokenContract!.address, capacity: Number(findAttr('Capacity')), rarity: Number(findAttr('Rarity')) };
                }));

                // 根據結果設定儀式狀態
                const statusMap: UpgradeOutcomeStatus[] = ['total_fail', 'partial_fail', 'success', 'great_success'];
                const resultStatus = statusMap[outcome] || 'total_fail';
                
                // 延遲顯示結果，讓動畫播放完整
                setTimeout(() => {
                    if (resultStatus === 'great_success') {
                        setRitualStage('great_success');
                    } else if (resultStatus === 'success') {
                        setRitualStage('success');
                    } else {
                        setRitualStage('failed');
                    }
                    
                    const outcomeMessages: Record<number, string> = { 
                        3: `大成功！您獲得了 ${newNfts.length} 個更高星級的 NFT！`, 
                        2: `恭喜！您成功獲得了 1 個更高星級的 NFT！`, 
                        1: `可惜，升星失敗了，但我們為您保留了 ${newNfts.length} 個材料。`, 
                        0: '升星失敗，所有材料已銷毀。再接再厲！' 
                    };
                    
                    setUpgradeResult({ status: resultStatus, nfts: newNfts, message: outcomeMessages[outcome] || "發生未知錯誤" });
                    
                    // 重置狀態
                    setTimeout(() => {
                        setRitualStage('idle');
                        resetSelections();
                        queryClient.invalidateQueries({ queryKey: ['ownedNfts'] });
                        queryClient.invalidateQueries({ queryKey: ['altarMaterials'] });
                        setShowProgressModal(false);
                    }, 2000);
                }, 3000);
                
                // 確認樂觀更新
                confirmUpdate();
            } catch (error) {
                logger.error('處理升級結果時出錯', error);
                showToast('處理升級結果時出錯', 'error');
                setRitualStage('failed');
                setTimeout(() => setRitualStage('idle'), 2000);
            }
        },
        onError: () => {
            // 回滾樂觀更新
            rollback();
        },
        successMessage: `升星 ${rarity}★ ${nftType === 'hero' ? '英雄' : '聖物'} 成功！`,
        errorMessage: '升星失敗',
    });

    const isTxPending = upgradeProgress.status !== 'idle' && upgradeProgress.status !== 'error';

    const { data: availableNfts, isLoading: isLoadingNfts } = useAltarMaterials(nftType, rarity);
    
    // 樂觀更新 Hook - 移除已升星的 NFT
    const { optimisticUpdate, confirmUpdate, rollback } = useOptimisticUpdate({
        queryKey: ['altarMaterials', address, chainId, nftType, rarity],
        updateFn: (oldData: any) => {
            if (!oldData || !Array.isArray(oldData)) return oldData;
            
            // 移除已選中的 NFT（它們將被銷毀或升級）
            return oldData.filter((nft: AnyNft) => !selectedNfts.includes(nft.id));
        }
    });

    const { data: upgradeRulesData, isLoading: isLoadingRules } = useReadContracts({
        contracts: [1, 2, 3, 4].map(r => ({ ...altarContract, functionName: 'upgradeRules', args: [r] })),
        query: { enabled: !!altarContract && chainId === bsc.id },
    });
    
    const currentRule = useMemo(() => {
        if (!upgradeRulesData || rarity < 1 || rarity > 4) return null;
        const ruleResult = upgradeRulesData[rarity - 1];
        if (ruleResult.status === 'success' && Array.isArray(ruleResult.result)) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const [materialsRequired, nativeFee, greatSuccessChance, successChance, partialFailChance] = ruleResult.result as unknown as [number, bigint, number, number, number];
            return { materialsRequired, nativeFee, greatSuccessChance, successChance, partialFailChance };
        }
        return null;
    }, [upgradeRulesData, rarity]);

    const handleSelectNft = (id: bigint) => {
        setSelectedNfts(prev => {
            if (prev.includes(id)) {
                // 如果取消選擇，關閉可能打開的確認窗口
                setShowConfirmModal(false);
                return prev.filter(i => i !== id);
            }
            if (currentRule && prev.length < currentRule.materialsRequired) {
                const newSelection = [...prev, id];
                // 當選滿材料時自動彈出確認窗口
                if (newSelection.length === currentRule.materialsRequired) {
                    // 使用 setTimeout 避免在渲染期間更新狀態
                    setTimeout(() => setShowConfirmModal(true), 0);
                }
                return newSelection;
            }
            // 使用 setTimeout 避免在渲染期間調用 showToast
            setTimeout(() => showToast(`最多只能選擇 ${currentRule?.materialsRequired} 個材料`, 'error'), 0);
            return prev;
        });
    };
    
    const resetSelections = () => setSelectedNfts([]);
    
    useEffect(() => {
        resetSelections();
        setRitualStage('idle');
    }, [nftType, rarity]);

    // 更新儀式階段
    useEffect(() => {
        if (selectedNfts.length === 0) {
            setRitualStage('idle');
        } else if (selectedNfts.length === currentRule?.materialsRequired) {
            setRitualStage('preparing');
        } else {
            setRitualStage('idle');
        }
    }, [selectedNfts, currentRule]);

    const handleApproval = async () => {
        if (!currentNftContract || !altarContract || !address) return;
        
        try {
            showToast('正在授權祭壇合約...', 'info');
            
            await writeContract({
                address: currentNftContract.address as `0x${string}`,
                abi: currentNftContract.abi,
                functionName: 'setApprovalForAll',
                args: [altarContract.address, true],
            });
            
            showToast('授權交易已發送，請等待確認', 'success');
            
            // 等待一段時間後刷新授權狀態
            setTimeout(() => {
                refetchApproval();
            }, 3000);
        } catch (error) {
            logger.error('授權失敗:', error);
            showToast('授權失敗，請重試', 'error');
        }
    };

    const handleUpgrade = async () => {
        if (!currentRule || !altarContract || !publicClient) return;
        if (selectedNfts.length !== currentRule.materialsRequired) return showToast(`需要 ${currentRule.materialsRequired} 個材料`, 'error');

        const tokenContract = nftType === 'hero' ? heroContract : relicContract;
        if (!tokenContract) return showToast('合約地址未設定', 'error');

        // 檢查授權狀態
        if (!isApprovedForAll) {
            showToast('請先授權祭壇合約', 'error');
            return;
        }

        // 調試信息：檢查選中的 NFT 稀有度
        logger.debug('升星操作調試信息:', {
            nftType,
            targetRarity: rarity,
            selectedNfts: selectedNfts.map(id => id.toString()),
            availableNfts: availableNfts?.map(nft => ({
                id: nft.id.toString(),
                rarity: 'rarity' in nft ? nft.rarity : 'N/A',
                type: nft.type
            }))
        });

        setShowProgressModal(true);
        resetProgress();
        setRitualStage('ritual');
        
        // 立即執行樂觀更新 - 移除選中的 NFT
        optimisticUpdate();

        try {
            await executeUpgrade(
                {
                    address: altarContract.address as `0x${string}`,
                    abi: altarContract.abi,
                    functionName: 'upgradeNFTs',
                    args: [tokenContract.address, selectedNfts],
                    value: currentRule.nativeFee as bigint
                },
                `升星 ${rarity}★ ${nftType === 'hero' ? '英雄' : '聖物'}`
            );
        } catch (error) {
            // 錯誤已在 hook 中處理
        }
    };

    const isLoading = isLoadingNfts || isLoadingRules;

    // Move early return after all hooks
    if (!chainId || chainId !== bsc.id) {
        return <section><h2 className="page-title">升星祭壇</h2><div className="card-bg p-10 rounded-xl text-center text-gray-400"><p>請先連接到支援的網路 (BSC) 以使用升星祭壇。</p></div></section>;
    }

    return (
        <section className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900 relative overflow-hidden">
            {/* 背景粒子效果 */}
            <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 30 }).map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-purple-400/20 rounded-full animate-pulse"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${3 + Math.random() * 4}s`
                        }}
                    />
                ))}
            </div>

            <div className="relative z-10 container mx-auto px-2 sm:px-4 py-3 sm:py-4 md:py-6 space-y-3 sm:space-y-4 md:space-y-6">
                {/* 彈窗組件 */}
                <UpgradeResultModal result={upgradeResult} onClose={() => setUpgradeResult(null)} />
                <TransactionProgressModal
                    isOpen={showProgressModal}
                    onClose={() => setShowProgressModal(false)}
                    progress={upgradeProgress}
                    title="神秘儀式進行中"
                />
                <AltarTutorial isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
                <AltarHistoryStats isOpen={showHistoryStats} onClose={() => setShowHistoryStats(false)} />

                {/* 強化確認窗口 */}
                <Modal 
                    isOpen={showConfirmModal} 
                    onClose={() => setShowConfirmModal(false)}
                    title="🔮 確認神秘儀式"
                    onConfirm={() => {
                        setShowConfirmModal(false);
                        handleUpgrade();
                    }}
                    confirmText="開始儀式"
                    cancelText="取消"
                    confirmButtonClass="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500"
                    className="max-w-md"
                >
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="text-4xl mb-3">⚡</div>
                            <p className="text-xl font-semibold text-white mb-2">
                                升級 {rarity}★ {nftType === 'hero' ? '英雄' : '聖物'}
                            </p>
                            <p className="text-sm text-gray-400">
                                已選擇 {selectedNfts.length} 個祭品
                            </p>
                        </div>
                        
                        {currentRule && (
                            <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-lg p-4">
                                <h4 className="font-semibold text-purple-300 mb-3 text-center">神諭預言</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-purple-400">⚜️ 神跡降臨</span>
                                        <span className="font-bold text-purple-300">{
                                            rarity === 1 ? 8 : 
                                            rarity === 2 ? 6 :
                                            rarity === 3 ? 4 : 3
                                        }%</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-green-400">✨ 祝福成功</span>
                                        <span className="font-bold text-green-300">{
                                            rarity === 1 ? 77 : 
                                            rarity === 2 ? 69 :
                                            rarity === 3 ? 41 : 22
                                        }%</span>
                                    </div>
                                    {rarity <= 4 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-yellow-400">⚡ 部分返還</span>
                                            <span className="font-bold text-yellow-300">{
                                                rarity === 1 ? 13 : 
                                                rarity === 2 ? 20 :
                                                rarity === 3 ? 40 : 50
                                            }%</span>
                                        </div>
                                    )}
                                    {rarity <= 4 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-red-400">💀 升星失敗</span>
                                            <span className="font-bold text-red-300">{
                                                rarity === 1 ? 2 : 
                                                rarity === 2 ? 5 :
                                                rarity === 3 ? 15 : 25
                                            }%</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                                    <p className="text-xs text-blue-300 text-center">
                                        {rarity <= 2 ? 
                                            `✨ 總成功率：${rarity === 1 ? 85 : 75}% (新手友好)` : 
                                            `⚔️ 總成功率：${rarity === 3 ? 45 : 25}% (挑戰升級)`
                                        }
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="text-center">
                            <p className="text-xs text-gray-500 italic">
                                "一旦儀式開始，就無法回頭..."
                            </p>
                        </div>
                    </div>
                </Modal>

                {/* 頁面標題區域 - 手機版優化 */}
                <div className="text-center space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-center gap-2 sm:gap-4">
                        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">
                            <span className="hidden sm:inline">🏛️ </span>升星祭壇
                        </h1>
                    </div>
                    <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto leading-relaxed px-4">
                        <span className="hidden sm:inline">在這座古老的神秘祭壇中，</span>將同星級的 NFT 作為祭品獻上，
                        <span className="hidden sm:inline">透過鏈上隨機數決定的神聖儀式，</span>有機會獲得更高星級的寶物。
                    </p>
                    
                    {/* 快捷操作按鈕 - 手機版緊湊 */}
                    <div className="flex items-center justify-center gap-2 sm:gap-3 mt-3 sm:mt-4">
                        <button
                            onClick={() => setShowTutorial(true)}
                            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 rounded-lg hover:bg-blue-600/30 transition-all text-sm"
                        >
                            <span className="hidden sm:inline">📚 </span>教學
                        </button>
                        <button
                            onClick={() => setShowHistoryStats(true)}
                            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-600/30 transition-all text-sm"
                        >
                            <span className="hidden sm:inline">📊 </span>統計
                        </button>
                    </div>
                </div>

                {/* 主要內容區域 */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 md:gap-8 items-start">
                    {/* 左側控制面板 */}
                    <div className="xl:col-span-1 space-y-4 sm:space-y-5 md:space-y-6">
                        {/* 目標選擇 - 手機版優化 */}
                        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-md border border-gray-600/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6">
                            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2">
                                <span className="hidden sm:inline">🎯 </span>升級目標
                            </h3>
                            <div className="space-y-3 sm:space-y-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">NFT 類型</label>
                                    <div className="flex gap-2 bg-gray-900/50 p-1 rounded-lg">
                                        {(['hero', 'relic'] as const).map(t => (
                                            <button 
                                                key={t} 
                                                onClick={() => setNftType(t)} 
                                                className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium rounded-md transition-all ${
                                                    nftType === t 
                                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' 
                                                        : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                                }`}
                                            >
                                                <span className="hidden sm:inline">{t === 'hero' ? '🦸 ' : '🏺 '}</span>
                                                {t === 'hero' ? '英雄' : '聖物'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">當前星級</label>
                                    <div className="grid grid-cols-4 gap-2 bg-gray-900/50 p-1 rounded-lg">
                                        {[1, 2, 3, 4].map(r => (
                                            <button 
                                                key={r} 
                                                onClick={() => setRarity(r)} 
                                                className={`py-2 sm:py-3 px-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                                                    rarity === r 
                                                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' 
                                                        : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                                                }`}
                                            >
                                                {r}★
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 規則視覺化 - 手機版簡化 */}
                        <UpgradeInfoCard 
                            rule={currentRule} 
                            isLoading={isLoadingRules}
                            address={address}
                            showDetails={showSuccessDetails}
                            onToggleDetails={() => setShowSuccessDetails(!showSuccessDetails)}
                        />

                        {/* VIP 加成顯示 - 手機版可收縮 */}
                        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-md border border-gray-600/30 rounded-xl p-3 sm:p-4">
                            <button 
                                onClick={() => setShowVipBonus(!showVipBonus)}
                                className="w-full flex items-center justify-between text-sm sm:text-base font-medium text-white"
                            >
                                <span>
                                    <span className="hidden sm:inline">🎆 </span>VIP 加成
                                </span>
                                <span className={`transform transition-transform ${
                                    showVipBonus ? 'rotate-180' : ''
                                }`}>▼</span>
                            </button>
                            {(showVipBonus || window.innerWidth >= 768) && (
                                <div className="mt-3">
                                    <AltarVipBonus />
                                </div>
                            )}
                        </div>

                        {/* 授權檢查 */}
                        {!isApprovedForAll && currentRule && (
                            <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-xl p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="text-2xl">⚠️</div>
                                    <div>
                                        <h4 className="font-semibold text-yellow-300">需要授權</h4>
                                        <p className="text-sm text-yellow-200">授權祭壇合約操作您的 NFT</p>
                                    </div>
                                </div>
                                <ActionButton
                                    onClick={handleApproval}
                                    isLoading={false}
                                    className="w-full h-12"
                                >
                                    🔓 授權 {nftType === 'hero' ? '英雄' : '聖物'} NFT
                                </ActionButton>
                            </div>
                        )}

                        {/* 升星按鈕 */}
                        <ActionButton 
                            onClick={() => setShowConfirmModal(true)} 
                            isLoading={isTxPending} 
                            disabled={isTxPending || !currentRule || selectedNfts.length !== currentRule.materialsRequired || !isApprovedForAll} 
                            className="w-full h-16 text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-gray-600 disabled:to-gray-700 shadow-xl"
                        >
                            {isTxPending ? '⚡ 神秘儀式進行中...' : '🔮 開始升星儀式'}
                        </ActionButton>
                    </div>

                    {/* 右側內容區域 */}
                    <div className="xl:col-span-2 space-y-4 sm:space-y-5 md:space-y-6">
                        {/* 祭壇動畫 */}
                        <div className="bg-gradient-to-br from-gray-800/50 to-purple-900/30 backdrop-blur-md border border-purple-500/20 rounded-2xl p-4 sm:p-6 md:p-8">
                            <AltarRitualAnimation
                                isActive={ritualStage !== 'idle'}
                                stage={ritualStage}
                                selectedCount={selectedNfts.length}
                                requiredCount={currentRule?.materialsRequired || 5}
                                onAnimationComplete={() => {
                                    // 動畫完成回調
                                }}
                            />
                        </div>

                        {/* 材料選擇區域 */}
                        <LocalErrorBoundary 
                            fallback={
                                <ErrorState 
                                    message="材料載入失敗" 
                                    onRetry={() => queryClient.invalidateQueries({ queryKey: ['altarMaterials'] })}
                                />
                            }
                        >
                            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-md border border-gray-600/30 rounded-2xl p-4 sm:p-5 md:p-6">
                                <div className="flex justify-between items-center mb-3 sm:mb-4 md:mb-6">
                                    <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white flex items-center gap-1 sm:gap-2">
                                        <span className="hidden sm:inline">🎴 </span>選擇祭品 ({selectedNfts.length}/{currentRule?.materialsRequired ?? '...'})
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {selectedNfts.length > 0 && (
                                            <button
                                                onClick={() => {
                                                    setSelectedNfts([]);
                                                    setShowConfirmModal(false);
                                                }}
                                                className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-all"
                                            >
                                                🗑️ 清除選擇
                                            </button>
                                        )}
                                        {currentRule && selectedNfts.length === currentRule.materialsRequired - 1 && (
                                            <span className="text-sm text-yellow-400 animate-pulse flex items-center gap-1">
                                                ✨ 再選 1 個將自動彈出確認窗口
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                {isLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <LoadingSpinner />
                                        <span className="ml-3 text-gray-400">載入祭品材料中...</span>
                                    </div>
                                ) : availableNfts && availableNfts.length > 0 ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 sm:gap-2 md:gap-3">
                                        {availableNfts.map(nft => (
                                            <div 
                                                key={nft.id.toString()} 
                                                onClick={() => handleSelectNft(nft.id)}
                                                className={`relative cursor-pointer transition-all duration-300 ${
                                                    selectedNfts.includes(nft.id) 
                                                        ? 'ring-2 ring-yellow-400 scale-105 shadow-2xl shadow-yellow-400/40 transform -translate-y-1' 
                                                        : 'hover:scale-105 hover:shadow-xl hover:transform hover:-translate-y-0.5'
                                                }`}
                                            >
                                                {/* 選中時的光暈效果 */}
                                                {selectedNfts.includes(nft.id) && (
                                                    <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/20 to-transparent rounded-xl blur-xl"></div>
                                                )}
                                                
                                                <NftCard 
                                                    nft={nft} 
                                                    selected={selectedNfts.includes(nft.id)}
                                                />
                                                
                                                {/* 選中狀態指示器 */}
                                                {selectedNfts.includes(nft.id) && (
                                                    <div className="absolute top-2 left-2 bg-gradient-to-br from-yellow-400 to-yellow-600 text-gray-900 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-xl border-2 border-yellow-300">
                                                        {selectedNfts.indexOf(nft.id) + 1}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 sm:py-12 md:py-16">
                                        <div className="text-4xl sm:text-5xl md:text-6xl mb-3 sm:mb-4">🔮</div>
                                        <EmptyState message={`沒有可用的 ${rarity}★ ${nftType === 'hero' ? '英雄' : '聖物'}`} />
                                        <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg backdrop-blur-sm max-w-sm sm:max-w-md mx-auto">
                                            <p className="text-xs sm:text-sm text-blue-200">
                                                <span className="hidden sm:inline">📊 </span><strong>數據同步中</strong>
                                            </p>
                                            <p className="text-xs text-blue-300 mt-1">
                                                合約已升級，子圖正在同步。請稍後再試。
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </LocalErrorBoundary>
                    </div>
                </div>

                {/* 底部提示信息 - 手機版簡化 */}
                <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 backdrop-blur-md border border-indigo-500/20 rounded-xl p-3 sm:p-4 md:p-6 text-center">
                    <p className="text-sm sm:text-base text-gray-300 mb-2">
                        <span className="hidden sm:inline">💫 <strong>神秘預言：</strong></span>
                        <span className="sm:hidden"><strong>提示：</strong></span>
                        結果由區塊鏈隨機數決定，確保公平。
                    </p>
                    <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">
                        祭壇已見證無數冒險者的夢想與希望，願星辰指引您獲得傳說級的寶物！
                    </p>
                </div>
            </div>
        </section>
    );
});
AltarPage.displayName = 'AltarPage';

export default AltarPage;
