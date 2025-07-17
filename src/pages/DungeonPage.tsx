// src/pages/DungeonPage.tsx (The Graph 改造版)

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSimpleReadContracts } from '../hooks/useSimpleReadContracts';
import { formatEther, parseEther } from 'viem';
// 不再需要從 nfts.ts 獲取數據
// import { fetchAllOwnedNfts } from '../api/nfts';
import { getContract } from '../config/contracts';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ActionButton } from '../components/ui/ActionButton';
import { useAppToast } from '../contexts/SimpleToastContext';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useTransactionWithProgress } from '../hooks/useTransactionWithProgress';
import { TransactionProgressModal } from '../components/ui/TransactionProgressModal';
import { useOptimisticUpdate } from '../hooks/useOptimisticUpdate';
import type { Page } from '../types/page';
import type { PartyNft } from '../types/nft';
import { Modal } from '../components/ui/Modal';
import ProvisionsPage from './ProvisionsPage';
import { bsc } from 'wagmi/chains';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
// import { useGlobalLoading } from '../components/core/GlobalLoadingProvider'; // 移除未使用的 Provider
import { logger } from '../utils/logger';

// =================================================================
// Section: 型別定義與 GraphQL 查詢
// =================================================================

const THE_GRAPH_API_URL = import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL;

interface Dungeon {
  id: number;
  name: string;
  requiredPower: bigint;
  rewardAmountUSD: bigint;
  baseSuccessRate: number;
  isInitialized: boolean;
}

// 查詢玩家擁有的隊伍及其詳細狀態
const GET_PLAYER_PARTIES_QUERY = `
  query GetPlayerParties($owner: ID!) {
    player(id: $owner) {
      parties {
        id
        tokenId
        totalPower
        totalCapacity
        partyRarity
        provisionsRemaining
        cooldownEndsAt
        unclaimedRewards
        fatigueLevel
        heros {
          id
          tokenId
        }
        relics {
          id
          tokenId
        }
      }
    }
  }
`;

// =================================================================
// Section: 數據獲取 Hooks
// =================================================================

// 新的 Hook，用於從 The Graph 獲取所有隊伍的數據
const usePlayerParties = () => {
    const { address, chainId } = useAccount();
    // const { setLoading } = useGlobalLoading(); // 移除未使用的 hook
    
    return useQuery<PartyNft[]>({
        queryKey: ['playerParties', address, chainId],
        queryFn: async () => {
            // setLoading(true, '載入你的隊伍資料...'); // 移除未使用的 loading
            if (!address || !THE_GRAPH_API_URL) return [];
            
            // 嘗試從多個來源獲取資料
            const sources = [
                // 主要來源：The Graph
                fetch(THE_GRAPH_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: GET_PLAYER_PARTIES_QUERY,
                        variables: { owner: address.toLowerCase() },
                    }),
                }),
                // 備用來源：我們的metadata server（已移除，因為經常連線失敗）
                // fetch(`${import.meta.env.VITE_METADATA_SERVER_URL || 'https://dungeon-delvers-metadata-server.onrender.com'}/api/player/${address.toLowerCase()}/assets?type=party`, {
                //     headers: { 'Content-Type': 'application/json' },
                // }).catch(() => null), // 忽略錯誤
            ];
            
            const [graphqlResponse] = await Promise.allSettled(sources);
            
            let parties: any[] = [];
            
            // 使用 GraphQL 資料
            if (graphqlResponse.status === 'fulfilled' && graphqlResponse.value?.ok) {
                const { data } = await graphqlResponse.value.json();
                parties = data?.player?.parties || [];
            }
            
            // 將資料轉換為前端格式
            // setLoading(false); // 移除未使用的 loading
            return parties.map((p: { tokenId: string; [key: string]: unknown }) => ({
                id: BigInt(p.tokenId),
                tokenId: BigInt(p.tokenId),
                name: `隊伍 #${p.tokenId}`,
                image: '', 
                description: '',
                attributes: [],
                contractAddress: getContract(bsc.id, 'party')?.address ?? '0x',
                type: 'party',
                totalPower: BigInt(p.totalPower || '0'),
                totalCapacity: BigInt(p.totalCapacity || '0'),
                heroIds: (p.heros || []).map((h: { tokenId: string }) => BigInt(h.tokenId)),
                relicIds: (p.relics || []).map((r: { tokenId: string }) => BigInt(r.tokenId)),
                partyRarity: p.partyRarity || '1',
                // 這些數據需要從合約讀取，不在子圖中
                provisionsRemaining: 0n,  // 將從 getPartyStatus 獲取
                cooldownEndsAt: 0n,       // 將從 getPartyStatus 獲取
                unclaimedRewards: 0n,     // 將從 getPartyStatus 獲取
                fatigueLevel: 0,          // 將從 getPartyStatus 獲取
            }));
        },
        enabled: !!address && chainId === bsc.id,
        // 🔥 更積極的快取策略
        staleTime: 1000 * 30, // 30秒內認為資料新鮮
        gcTime: 1000 * 60 * 5, // 5分鐘垃圾回收
        refetchOnWindowFocus: true, // 視窗聚焦時重新獲取
        refetchOnMount: true, // 組件掛載時重新獲取
        refetchOnReconnect: true, // 重新連接時重新獲取
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    });
};

// =================================================================
// Section: 子元件 (簡化後)
// =================================================================

// PartyStatusCard 現在是一個純粹的 UI 元件
interface PartyStatusCardProps {
  party: PartyNft & { provisionsRemaining: bigint; cooldownEndsAt: bigint; fatigueLevel: number; };
  dungeons: Dungeon[];
  onStartExpedition: (partyId: bigint, dungeonId: bigint, fee: bigint) => void;
  onRest: (partyId: bigint) => void;
  onBuyProvisions: (partyId: bigint) => void;
  isTxPending: boolean;
  isAnyTxPendingForThisParty: boolean;
  chainId: number;
}

const PartyStatusCard: React.FC<PartyStatusCardProps> = ({ party, dungeons, onStartExpedition, onRest, onBuyProvisions, isTxPending, isAnyTxPendingForThisParty, chainId }) => {
    // 🎯 智能選擇最高可挑戰的地城作為預設值
    const getHighestChallengeableDungeon = () => {
        if (!dungeons.length) return 1n;
        
        // 按難度排序並找到最高可挑戰的地城
        const sortedDungeons = [...dungeons].sort((a, b) => Number(b.requiredPower) - Number(a.requiredPower));
        const highestChallengeable = sortedDungeons.find(dungeon => 
            BigInt(party.totalPower) >= dungeon.requiredPower
        );
        
        return highestChallengeable ? BigInt(highestChallengeable.id) : 1n;
    };
    
    const [selectedDungeonId, setSelectedDungeonId] = useState<bigint>(getHighestChallengeableDungeon());
    const dungeonMasterContract = getContract(chainId, 'dungeonMaster');
    const dungeonStorageContract = getContract(chainId, 'dungeonStorage');
    const dungeonCoreContract = getContract(chainId, 'dungeonCore');
    
    // 🎯 當地城數據加載完成後，更新預設選擇
    React.useEffect(() => {
        if (dungeons.length > 0) {
            setSelectedDungeonId(getHighestChallengeableDungeon());
        }
    }, [dungeons, party.totalPower]);
    
    const { data: explorationFee } = useReadContract({
        address: dungeonMasterContract?.address as `0x${string}`,
        abi: dungeonMasterContract?.abi,
        functionName: 'explorationFee',
        query: { enabled: !!dungeonMasterContract }
    });

    // 🎯 一次性讀取 USD 到 SOUL 的匯率（使用 1 USD 作為基準）
    const { data: usdToSoulRate } = useReadContract({
        address: dungeonCoreContract?.address as `0x${string}`,
        abi: dungeonCoreContract?.abi,
        functionName: 'getSoulShardAmountForUSD',
        args: [parseEther('1')], // 1 USD 可以換多少 SOUL
        query: { 
            enabled: !!dungeonCoreContract,
            staleTime: 1000 * 60 * 5, // 5分鐘緩存
            gcTime: 1000 * 60 * 30,   // 30分鐘垃圾回收
        }
    });

    // 🧮 計算獎勵的輔助函數
    const calculateSoulReward = (usdAmount: bigint): bigint => {
        if (!usdToSoulRate) return 0n;
        // 公式：SOUL 獎勵 = (USD 金額 * 1 USD 對應的 SOUL 數量) / 1 USD
        return (usdAmount * usdToSoulRate) / parseEther('1');
    };
    
    // 從 RPC 讀取實時的隊伍狀態
    const { data: partyStatus } = useReadContract({
        address: dungeonStorageContract?.address as `0x${string}`,
        abi: dungeonStorageContract?.abi,
        functionName: 'getPartyStatus',
        args: [party.id],
        query: { 
            enabled: !!dungeonStorageContract,
            refetchInterval: 10000, // 每10秒刷新一次
        }
    });

    // 使用 RPC 數據或回退到原始數據
    const provisionsRemaining = partyStatus && partyStatus[0] !== undefined 
        ? BigInt(partyStatus[0]) 
        : party.provisionsRemaining || 0n;
    const cooldownEndsAt = partyStatus && partyStatus[1] !== undefined 
        ? BigInt(partyStatus[1]) 
        : party.cooldownEndsAt || 0n;
    const fatigueLevel = partyStatus && partyStatus[3] !== undefined 
        ? Number(partyStatus[3]) 
        : party.fatigueLevel || 0;
    
    const { isOnCooldown, effectivePower, fatigueColorClass } = useMemo(() => {
        const power = BigInt(party.totalPower);
        const effPower = power * (100n - BigInt(fatigueLevel) * 2n) / 100n;
        
        // 疲勞度顏色邏輯：0-15 綠色（健康），16-30 黃色（疲勞），31-45 紅色（非常疲勞）
        let fatigueColor = 'text-green-400';
        if (party.fatigueLevel > 30) {
            fatigueColor = 'text-red-400';
        } else if (party.fatigueLevel > 15) {
            fatigueColor = 'text-yellow-400';
        }
        
        return {
            isOnCooldown: BigInt(Math.floor(Date.now() / 1000)) < cooldownEndsAt,
            effectivePower: effPower,
            fatigueColorClass: fatigueColor,
        };
    }, [party.totalPower, cooldownEndsAt, fatigueLevel]);

    const renderStatus = () => {
        if (isAnyTxPendingForThisParty) return <span className="px-3 py-1 text-sm font-medium text-purple-300 bg-purple-900/50 rounded-full flex items-center gap-2"><LoadingSpinner size="h-3 w-3" />遠征中</span>;
        if (isOnCooldown) return <span className="px-3 py-1 text-sm font-medium text-yellow-300 bg-yellow-900/50 rounded-full">冷卻中...</span>;
        if (provisionsRemaining === 0n) return <span className="px-3 py-1 text-sm font-medium text-orange-400 bg-orange-900/50 rounded-full">需要儲備</span>;
        if (party.fatigueLevel > 30) return <span className="px-3 py-1 text-sm font-medium text-red-300 bg-red-900/50 rounded-full">急需休息</span>;
        if (party.fatigueLevel > 15) return <span className="px-3 py-1 text-sm font-medium text-yellow-300 bg-yellow-900/50 rounded-full">建議休息</span>;
        return <span className="px-3 py-1 text-sm font-medium text-green-300 bg-green-900/50 rounded-full">準備就緒</span>;
    };

    const renderAction = () => {
        if (isOnCooldown || isAnyTxPendingForThisParty) return <ActionButton disabled className="w-full h-10">{isAnyTxPendingForThisParty ? '遠征中' : '冷卻中'}</ActionButton>;
        if (provisionsRemaining === 0n) return <ActionButton onClick={() => onBuyProvisions(party.id)} className="w-full h-10 bg-orange-600 hover:bg-orange-500">購買儲備</ActionButton>;
        if (party.fatigueLevel > 30) return <ActionButton onClick={() => onRest(party.id)} isLoading={isTxPending} className="w-full h-10 bg-red-600 hover:bg-red-500">休息</ActionButton>;
        if (party.fatigueLevel > 15) return <ActionButton onClick={() => onRest(party.id)} isLoading={isTxPending} className="w-full h-10 bg-yellow-600 hover:bg-yellow-500">建議休息</ActionButton>;
        
        const fee = typeof explorationFee === 'bigint' ? explorationFee : 0n;
        return <ActionButton onClick={() => onStartExpedition(party.id, selectedDungeonId, fee)} isLoading={isTxPending} className="w-full h-10">開始遠征</ActionButton>;
    };

    return (
        <div className={`card-bg p-4 rounded-2xl flex flex-col h-full border-2 transition-all ${isAnyTxPendingForThisParty ? 'border-purple-500/50' : isOnCooldown ? 'border-yellow-500/50' : 'border-transparent'}`}>
            <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-lg text-white truncate pr-2">{party.name}</h4>
                {renderStatus()}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4 text-center">
                <div><p className="text-sm text-gray-400">有效戰力</p><p className="font-bold text-2xl text-indigo-400">{effectivePower.toString()}</p></div>
                <div><p className="text-sm text-gray-400">疲勞度</p><p className={`font-bold text-xl ${fatigueColorClass}`}>{party.fatigueLevel} / 45</p></div>
            </div>
            <p className="text-center text-xs text-gray-400 mb-2">剩餘儲備: {provisionsRemaining.toString()}</p>
            <div className="mb-4">
                <label className="text-xs text-gray-400">選擇地城:</label>
                <select 
                    value={selectedDungeonId.toString()} 
                    onChange={(e) => setSelectedDungeonId(BigInt(e.target.value))}
                    className="w-full p-2 border rounded-lg bg-gray-900/80 border-gray-700 text-white mt-1"
                    disabled={provisionsRemaining === 0n || isOnCooldown || isAnyTxPendingForThisParty}
                >
                    {dungeons.length === 0 ? (
                        <option value="0">載入地下城中...</option>
                    ) : (
                        // 反向排序：高級地城在前
                        [...dungeons].reverse().map(d => <option key={d.id} value={d.id.toString()}>{d.id}. {d.name} (要求: {d.requiredPower.toString()})</option>)
                    )}
                </select>
            </div>
            {renderAction()}
        </div>
    );
};

const DungeonInfoCard: React.FC<{ dungeon: Dungeon; calculateSoulReward: (usdAmount: bigint) => bigint }> = ({ dungeon, calculateSoulReward }) => (
    <div className="card-bg rounded-xl shadow-lg overflow-hidden bg-gray-800/50 hover:transform hover:scale-105 transition-transform duration-200">
        {/* 地下城圖片 */}
        <div className="relative h-48 overflow-hidden bg-gray-900">
            <img 
                src={`/dungeon/${dungeon.id.toString().padStart(2, '0')}.png`} 
                alt={dungeon.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                    // 如果圖片載入失敗，使用預設背景
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.style.background = 'linear-gradient(to bottom, #1a1a2e, #0f0f23)';
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
            <div className="absolute bottom-2 left-3 right-3">
                <h4 className="text-lg font-bold font-serif text-yellow-300 drop-shadow-lg">{dungeon.name}</h4>
            </div>
        </div>
        
        {/* 地下城資訊 */}
        <div className="p-4 space-y-1 text-sm">
            <p className="text-gray-300">要求戰力: <span className="font-semibold text-white">{dungeon.requiredPower.toString()}</span></p>
            <p className="text-gray-300">基礎獎勵: 
                <span className="font-semibold text-white">
                    ~{parseFloat(formatEther(calculateSoulReward(dungeon.rewardAmountUSD))).toFixed(0)} SOUL
                </span>
                <span className="text-gray-400 text-sm ml-2">
                    (${parseFloat(formatEther(dungeon.rewardAmountUSD)).toFixed(2)})
                </span>
            </p>
            <p className="text-gray-300">成功率: <span className="font-semibold text-white">{dungeon.baseSuccessRate}%</span></p>
            <p className="font-bold text-sky-400">預計經驗: +{dungeon.id * 5 + 20} EXP</p>
        </div>
    </div>
);


// =================================================================
// Section: 主頁面元件
// =================================================================

const DungeonPageContent: React.FC<{ setActivePage: (page: Page) => void; }> = ({ setActivePage }) => {
    // const { setLoading } = useGlobalLoading(); // 移除未使用的 hook
    const { chainId } = useAccount();
    const { showToast } = useAppToast();
    const { transactions } = useTransactionStore();
    const queryClient = useQueryClient();

    const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
    const [selectedPartyForProvision, setSelectedPartyForProvision] = useState<bigint | null>(null);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [currentAction, setCurrentAction] = useState<'expedition' | 'rest'>('expedition');

    // ✅ 將所有Hooks調用移到組件頂部，在任何條件語句之前
    const dungeonMasterContract = getContract(bsc.id, 'dungeonMaster');
    const dungeonCoreContract = getContract(bsc.id, 'dungeonCore');

    // 🎯 一次性讀取 USD 到 SOUL 的匯率（用於所有地城獎勵顯示）
    const { data: usdToSoulRate } = useReadContract({
        address: dungeonCoreContract?.address as `0x${string}`,
        abi: dungeonCoreContract?.abi,
        functionName: 'getSoulShardAmountForUSD',
        args: [parseEther('1')], // 1 USD 可以換多少 SOUL
        query: { 
            enabled: !!dungeonCoreContract,
            staleTime: 1000 * 60 * 5, // 5分鐘緩存
            gcTime: 1000 * 60 * 30,   // 30分鐘垃圾回收
        }
    });

    // 🧮 計算獎勵的輔助函數
    const calculateSoulReward = (usdAmount: bigint): bigint => {
        if (!usdToSoulRate) return 0n;
        return (usdAmount * usdToSoulRate) / parseEther('1');
    };

    // ★ 核心改造：使用新的 Hook 獲取隊伍數據
    const { data: parties, isLoading: isLoadingParties, refetch: refetchParties, error: partiesError } = usePlayerParties();

    // 交易進度 Hooks
    const { execute: executeExpedition, progress: expeditionProgress, reset: resetExpedition } = useTransactionWithProgress({
        onSuccess: () => {
            showToast('遠征請求已發送！隊伍正在前往地下城...', 'success');
            queryClient.invalidateQueries({ queryKey: ['playerParties'] });
            setTimeout(() => refetchParties(), 3000);
            setShowProgressModal(false);
            confirmExpeditionUpdate();
        },
        onError: () => {
            rollbackExpeditionUpdate();
        },
        successMessage: '遠征開始成功！',
        errorMessage: '遠征請求失敗',
    });

    const { execute: executeRest, progress: restProgress, reset: resetRest } = useTransactionWithProgress({
        onSuccess: () => {
            showToast('隊伍開始休息，疲勞度正在恢復...', 'success');
            queryClient.invalidateQueries({ queryKey: ['playerParties'] });
            setTimeout(() => refetchParties(), 3000);
            setShowProgressModal(false);
            confirmRestUpdate();
        },
        onError: () => {
            rollbackRestUpdate();
        },
        successMessage: '休息成功！',
        errorMessage: '休息失敗',
    });

    // 樂觀更新 - 遠征
    const { optimisticUpdate: optimisticExpeditionUpdate, confirmUpdate: confirmExpeditionUpdate, rollback: rollbackExpeditionUpdate } = useOptimisticUpdate({
        queryKey: ['playerParties'],
        updateFn: (oldData: any) => {
            if (!oldData || !currentPartyId) return oldData;
            
            // 更新隊伍狀態為遠征中
            return oldData.map((party: any) => {
                if (party.id === currentPartyId) {
                    return {
                        ...party,
                        cooldownEndsAt: BigInt(Math.floor(Date.now() / 1000) + 300), // 假設5分鐘冷卻
                        provisionsRemaining: party.provisionsRemaining - 1n,
                    };
                }
                return party;
            });
        }
    });

    // 樂觀更新 - 休息
    const { optimisticUpdate: optimisticRestUpdate, confirmUpdate: confirmRestUpdate, rollback: rollbackRestUpdate } = useOptimisticUpdate({
        queryKey: ['playerParties'],
        updateFn: (oldData: any) => {
            if (!oldData || !currentPartyId) return oldData;
            
            // 更新隊伍疲勞度
            return oldData.map((party: any) => {
                if (party.id === currentPartyId) {
                    return {
                        ...party,
                        fatigueLevel: 0, // 休息後疲勞度歸零
                    };
                }
                return party;
            });
        }
    });

    const [currentPartyId, setCurrentPartyId] = useState<bigint | null>(null);
    
    const currentProgress = currentAction === 'expedition' ? expeditionProgress : restProgress;
    const isTxPending = currentProgress.status !== 'idle' && currentProgress.status !== 'error';

    // 獲取地城資訊的邏輯保持不變，因為這是全域數據
    const dungeonStorageContract = getContract(bsc.id, 'dungeonStorage');
    const dungeonContracts = useMemo(() => {
        if (!dungeonStorageContract) {
            logger.warn('[DungeonPage] dungeonStorageContract is null');
            return [];
        }
        if (chainId !== bsc.id) {
            logger.debug('[DungeonPage] Not on BSC chain');
            return [];
        }
        return Array.from({ length: 10 }, (_, i) => ({
            address: dungeonStorageContract.address as `0x${string}`,
            abi: dungeonStorageContract.abi as any,
            functionName: 'getDungeon',
            args: [BigInt(i + 1)],
        }));
    }, [dungeonStorageContract, chainId]);

    const { data: dungeonsData, isLoading: isLoadingDungeons } = useSimpleReadContracts(dungeonContracts);

    const dungeons: Dungeon[] = useMemo(() => {
        const getDungeonName = (id: number) => ["", "新手礦洞", "哥布林洞穴", "食人魔山谷", "蜘蛛巢穴", "石化蜥蜴沼澤", "巫妖墓穴", "奇美拉之巢", "惡魔前哨站", "巨龍之巔", "混沌深淵"][id] || "未知地城";
        
        logger.info('[DungeonPage] useMemo triggered:', {
            hasData: !!dungeonsData,
            isLoading: isLoadingDungeons,
            contractsLength: dungeonContracts.length,
            dataType: typeof dungeonsData
        });
        if (!dungeonsData) {
            logger.debug('[DungeonPage] dungeonsData is null/undefined - waiting for data');
            return [];
        }
        
        if (!Array.isArray(dungeonsData)) {
            logger.warn('[DungeonPage] dungeonsData is not an array:', typeof dungeonsData);
            return [];
        }
        
        logger.info('[DungeonPage] Processing dungeons data:', dungeonsData);
        
        const processedDungeons = dungeonsData.map((d: any, i: number) =>  {
            if (d.status !== 'success') {
                logger.warn(`[DungeonPage] Dungeon ${i + 1} status is not success:`, d.status);
                return null;
            }
            
            if (!d.result) {
                logger.warn(`[DungeonPage] Dungeon ${i + 1} has no result`);
                return null;
            }
            
            const result = d.result as any;
            // 處理不同格式的返回值
            const requiredPower = result.requiredPower || result[0];
            const rewardAmountUSD = result.rewardAmountUSD || result[1];
            const baseSuccessRate = result.baseSuccessRate || result[2];
            const isInitialized = result.isInitialized !== undefined ? result.isInitialized : result[3];
            
            logger.info(`[DungeonPage] Dungeon ${i + 1}:`, { requiredPower, rewardAmountUSD, baseSuccessRate, isInitialized });
            
            return { 
                id: i + 1, 
                name: getDungeonName(i + 1), 
                requiredPower: BigInt(requiredPower || 0), 
                rewardAmountUSD: BigInt(rewardAmountUSD || 0), 
                baseSuccessRate: Number(baseSuccessRate || 0), 
                isInitialized: Boolean(isInitialized) 
            };
        }).filter((d): d is Dungeon => {
            const isValid = d !== null;
            if (!isValid && d) {
                logger.warn(`[DungeonPage] Filtering out null dungeon`);
            }
            // 移除 isInitialized 檢查，因為部署腳本已經初始化所有地城
            return isValid;
        });
        
        logger.info(`[DungeonPage] Final dungeons count: ${processedDungeons.length}`);
        return processedDungeons;
    }, [dungeonsData, isLoadingDungeons]);

    // ✅ 條件渲染移到所有Hooks之後
    if (chainId !== bsc.id) {
        return <div className="flex justify-center items-center h-64"><p className="text-lg text-gray-500">請連接到支援的網路</p></div>;
    }
    
    const checkPendingTxForParty = (partyId: bigint) => {
        return transactions.some(tx => tx.status === 'pending' && tx.description.includes(`隊伍 #${partyId.toString()}`));
    };

    const handleStartExpedition = async (partyId: bigint, dungeonId: bigint, fee: bigint) => {
        if (!dungeonMasterContract) return;
        
        setCurrentPartyId(partyId);
        setCurrentAction('expedition');
        setShowProgressModal(true);
        resetExpedition();
        
        // 立即執行樂觀更新
        optimisticExpeditionUpdate();
        
        try {
            await executeExpedition(
                {
                    address: dungeonMasterContract.address as `0x${string}`,
                    abi: dungeonMasterContract.abi,
                    functionName: 'requestExpedition',
                    args: [partyId, dungeonId],
                    value: fee
                },
                `隊伍 #${partyId.toString()} 遠征地城 #${dungeonId}`
            );
        } catch (error) {
            // 錯誤已在 hook 中處理
        }
    };

    const handleRest = async (partyId: bigint) => {
        if (!dungeonMasterContract) return;
        
        setCurrentPartyId(partyId);
        setCurrentAction('rest');
        setShowProgressModal(true);
        resetRest();
        
        // 立即執行樂觀更新
        optimisticRestUpdate();
        
        try {
            await executeRest(
                {
                    address: dungeonMasterContract.address as `0x${string}`,
                    abi: dungeonMasterContract.abi,
                    functionName: 'restParty',
                    args: [partyId]
                },
                `隊伍 #${partyId.toString()} 正在休息`
            );
        } catch (error) {
            // 錯誤已在 hook 中處理
        }
    };

    const handleBuyProvisions = (partyId: bigint) => {
        setSelectedPartyForProvision(partyId);
        setIsProvisionModalOpen(true);
    };

    const isLoading = isLoadingParties || isLoadingDungeons;

    if (partiesError) {
        return (
            <EmptyState 
                message="載入隊伍失敗" 
                description={(partiesError as Error).message}
            >
                <ActionButton onClick={() => refetchParties()} className="mt-4">
                    重新載入
                </ActionButton>
            </EmptyState>
        );
    }

    if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

    return (
        <section className="space-y-8">
            <TransactionProgressModal
                isOpen={showProgressModal}
                onClose={() => setShowProgressModal(false)}
                progress={currentProgress}
                title={currentAction === 'expedition' ? '遠征進度' : '休息進度'}
            />
            <Modal isOpen={isProvisionModalOpen} onClose={() => setIsProvisionModalOpen(false)} title="購買遠征儲備" onConfirm={() => {}} confirmText="關閉">
                <ProvisionsPage preselectedPartyId={selectedPartyForProvision} onPurchaseSuccess={() => setIsProvisionModalOpen(false)} />
            </Modal>
            <div>
                <h2 className="page-title">遠征指揮中心</h2>
                {(!parties || parties.length === 0) ? (
                    <EmptyState message="您還沒有任何隊伍可以派遣。">
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
                            <ActionButton onClick={() => setActivePage('party')} className="w-48 h-12">前往創建隊伍</ActionButton>
                            <ActionButton onClick={() => setActivePage('mint')} className="w-48 h-12 bg-teal-600 hover:bg-teal-500">前往鑄造</ActionButton>
                        </div>
                    </EmptyState>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {parties.map((party: unknown) => (
                            <PartyStatusCard
                                key={party.id.toString()}
                                party={party as PartyNft & { provisionsRemaining: bigint; cooldownEndsAt: bigint; fatigueLevel: number; }}
                                dungeons={dungeons}
                                onStartExpedition={handleStartExpedition}
                                onRest={handleRest}
                                onBuyProvisions={handleBuyProvisions}
                                isTxPending={isTxPending}
                                isAnyTxPendingForThisParty={checkPendingTxForParty(party.id)}
                                chainId={bsc.id}
                            />
                        ))}
                    </div>
                )}
            </div>
            <div>
                <h2 className="page-title">可挑戰的地下城</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[...dungeons].reverse().map(dungeon => ( <DungeonInfoCard key={dungeon.id} dungeon={dungeon} calculateSoulReward={calculateSoulReward} /> ))}
                </div>
            </div>
        </section>
    );
};

const DungeonPage: React.FC<{ setActivePage: (page: Page) => void; }> = ({ setActivePage }) => {
    return (
        <ErrorBoundary>
            <DungeonPageContent setActivePage={setActivePage} />
        </ErrorBoundary>
    );
};

export default DungeonPage;
