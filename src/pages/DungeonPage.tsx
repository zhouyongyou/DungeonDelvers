// src/pages/DungeonPage.tsx (The Graph 改造版)

import React, { useState, useMemo, memo } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { useContractBatchRead } from '../hooks/useContractBatchRead';
import { useQuery, useQueryClient, useQueries } from '@tanstack/react-query';
import { readContract } from '@wagmi/core';
import { wagmiConfig as config } from '../wagmi';
import { useSimpleReadContracts } from '../hooks/useSimpleReadContracts';
import { formatEther, parseEther } from 'viem';
import { formatSoul, formatLargeNumber } from '../utils/formatters';
import { useNfts } from '../stores/useNftStore';
import { getContractWithABI as getContract } from '../config/contractsWithABI';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ActionButton } from '../components/ui/ActionButton';
import { useAppToast } from '../contexts/SimpleToastContext';
import { useTransactionStore } from '../stores/useTransactionStore';
import { useTransactionWithProgress } from '../hooks/useTransactionWithProgress';
import { TransactionProgressModal } from '../components/ui/TransactionProgressModal';
import { useOptimisticUpdate } from '../hooks/useOptimisticUpdate';
import { useVipStatus } from '../hooks/useVipStatus';
import type { Page } from '../types/page';
import type { PartyNft } from '../types/nft';
import { Modal } from '../components/ui/Modal';
import { bsc } from 'wagmi/chains';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
// import { useGlobalLoading } from '../components/core/GlobalLoadingProvider'; // 移除未使用的 Provider
import { logger } from '../utils/logger';
import { safeBigintToString, safeNumberConversion } from '../utils/typeGuards';
import { PageActionBar, usePageQuickActions } from '../components/ui/QuickActions';
import { RewardClaimSection } from '../components/RewardClaimSection';
import { ExpeditionHistory } from '../components/ExpeditionHistory';
import { CooldownTimer } from '../components/CooldownTimer';
import { ExpeditionTracker } from '../components/ExpeditionTracker';
import { useRealtimeExpeditions } from '../hooks/useRealtimeExpeditions';
import { usePartyValidation } from '../hooks/usePartyValidation';
import { useBatchOperations } from '../hooks/useBatchOperations';
import { Icons } from '../components/ui/icons';
import { generatePartySVG } from '../utils/svgGenerators';
import { useNftDisplayPreference } from '../hooks/useNftDisplayPreference';
import { LazyImage } from '../components/ui/LazyImage';
import { usePlayerVaultV4 } from '../hooks/usePlayerVaultV4';

// RewardClaimButton 已移至統一的 RewardClaimSection 組件

// =================================================================
// Section: 型別定義與 GraphQL 查詢
// =================================================================

import { THE_GRAPH_API_URL, isGraphConfigured } from '../config/graphConfig';

// 檢查 Graph 是否已配置
if (!isGraphConfigured()) {
    console.warn('[DungeonPage] The Graph is not properly configured');
}

interface Dungeon {
  id: number;
  name: string;
  requiredPower: bigint;
  rewardAmountUSD: bigint;
  baseSuccessRate: number;
  isInitialized: boolean;
}

// 查詢玩家擁有的隊伍基本信息（不包含動態狀態）
const GET_PLAYER_PARTIES_QUERY = `
  query GetPlayerParties($owner: Bytes!) {
    player(id: $owner) {
      id
      parties {
        id
        tokenId
        name
        totalPower
        totalCapacity
        partyRarity
        heroIds
        contractAddress
        provisionsRemaining
        cooldownEndsAt
        createdAt
        lastUpdatedAt
        unclaimedRewards
        isBurned
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
    
    return useQuery({
        queryKey: ['playerParties', address, chainId],
        queryFn: async (): Promise<PartyNft[]> => {
            logger.info(`[usePlayerParties] 開始查詢 (address: ${address?.slice(0, 6)}...${address?.slice(-4)})`);
            
            try {
            // 先檢查本地儲存（縮短快取時間，避免過期數據）
            const cacheKey = `parties_${address}_${chainId}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const { data, timestamp } = JSON.parse(cached);
                    // 縮短快取時間為 1 分鐘，確保數據新鮮
                    if (Date.now() - timestamp < 1 * 60 * 1000 && data && data.length > 0) {
                        logger.info('[usePlayerParties] 使用本地快取的隊伍資料');
                        // 反序列化時將字串轉回 BigInt
                        return data.map((party: any) => ({
                            ...party,
                            id: BigInt(party.id),
                            totalPower: BigInt(party.totalPower),
                            totalCapacity: BigInt(party.totalCapacity),
                            heroIds: party.heroIds.map((id: string) => BigInt(id)),
                            cooldownEndsAt: BigInt(party.cooldownEndsAt),
                            unclaimedRewards: BigInt(party.unclaimedRewards),
                        }));
                    } else {
                        // 清理過期快取
                        localStorage.removeItem(cacheKey);
                    }
                } catch (e) {
                    // 快取數據損壞，清理它
                    logger.warn('[usePlayerParties] 快取數據損壞，清理快取');
                    localStorage.removeItem(cacheKey);
                }
            }
            // setLoading(true, '載入你的隊伍資料...'); // 移除未使用的 loading
            if (!address || !THE_GRAPH_API_URL) return [];
            
            // 嘗試從多個來源獲取資料
            logger.info(`[usePlayerParties] 使用 Graph URL: ${THE_GRAPH_API_URL}`);
            logger.info(`[usePlayerParties] 查詢地址: ${address.toLowerCase()}`);
            
            const requestBody = {
                query: GET_PLAYER_PARTIES_QUERY,
                variables: { owner: address.toLowerCase() },
            };
            logger.debug('[usePlayerParties] GraphQL 請求:', requestBody);
            
            const sources = [
                // 主要來源：The Graph
                fetch(THE_GRAPH_API_URL, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                    },
                    mode: 'cors',
                    body: JSON.stringify(requestBody),
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
                const response = await graphqlResponse.value.json();
                logger.debug('地城頁面查詢結果:', response);
                
                if (response.errors) {
                    logger.error('GraphQL 查詢錯誤:', response.errors);
                    // 提供更詳細的錯誤信息
                    const errorMessage = response.errors.map((e: any) => e.message).join(', ');
                    
                    // 特殊處理各種錯誤
                    if (errorMessage.includes('no handler for query') || errorMessage.includes('Subgraph not found')) {
                        throw new Error('子圖尚未部署或版本不正確，請聯繫管理員');
                    }
                    if (errorMessage.includes('invalid escape') || errorMessage.includes('bad query')) {
                        throw new Error('查詢語法錯誤，請聯繫管理員');
                    }
                    
                    throw new Error(`GraphQL 查詢失敗: ${errorMessage}`);
                }
                
                parties = response.data?.player?.parties || [];
                logger.info(`地城頁面找到 ${parties.length} 個隊伍`);
                
                // 如果玩家沒有隊伍，檢查是否是新玩家
                if (parties.length === 0) {
                    if (!response.data?.player) {
                        logger.info('新玩家尚未創建任何隊伍');
                    } else {
                        logger.info('玩家存在但沒有隊伍');
                    }
                    // 返回空數組而不是拋出錯誤，讓介面顯示「沒有可用隊伍」
                    return [];
                }
            } else {
                logger.error('GraphQL 請求失敗:', graphqlResponse);
                
                // 檢查具體的錯誤類型
                if (graphqlResponse.status === 'rejected') {
                    const error = graphqlResponse.reason;
                    logger.error('請求被拒絕:', error);
                    
                    // 網路錯誤
                    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
                        throw new Error('網路連接失敗，請檢查您的網路連接');
                    }
                    
                    // CORS 錯誤
                    if (error.message?.includes('CORS')) {
                        throw new Error('跨域請求被拒絕，請聯繫管理員');
                    }
                }
                
                // 429 錯誤時，使用空數據但不要使查詢失敗
                // 這樣 React Query 會自動重試
                if (graphqlResponse.status === 'fulfilled' && graphqlResponse.value?.status === 429) {
                    throw new Error('子圖 API 請求頻率限制，請稍後再試');
                }
                
                // 404 錯誤
                if (graphqlResponse.status === 'fulfilled' && graphqlResponse.value?.status === 404) {
                    throw new Error('子圖端點不存在，請檢查配置');
                }
                
                // 500 錯誤
                if (graphqlResponse.status === 'fulfilled' && graphqlResponse.value?.status >= 500) {
                    throw new Error('子圖服務器錯誤，請稍後再試');
                }
                
                // 使用更友好的錯誤信息
                logger.warn('GraphQL 查詢失敗');
                throw new Error('無法載入隊伍數據，請檢查網路連接或稍後再試');
            }
            
            // 將資料轉換為前端格式
            // setLoading(false); // 移除未使用的 loading
            logger.debug('[usePlayerParties] 轉換隊伍數據:', parties);
            const formattedParties = parties.map((p: { tokenId: string; [key: string]: unknown }) => {
                logger.debug(`[usePlayerParties] 轉換隊伍 #${p.tokenId}:`, {
                    raw: p,
                    unclaimedRewards: p.unclaimedRewards,
                    heroIds: p.heroIds
                });
                return {
                id: BigInt(p.tokenId),
                tokenId: BigInt(p.tokenId),
                entityId: p.id as string, // 子圖中的完整 ID，用於查詢歷史
                name: `隊伍 #${p.tokenId}`,
                image: '', 
                description: '',
                attributes: [],
                contractAddress: getContract('PARTY')?.address ?? '0x',
                type: 'party',
                totalPower: BigInt(p.totalPower || p.power || '0'),
                totalCapacity: BigInt(p.totalCapacity || '0'),
                heroIds: (p.heroIds || []).map((id: string) => BigInt(id)),
                relicIds: [], // 聖物數據需要從其他查詢獲取
                partyRarity: Number(p.partyRarity || 1),
                // 這些數據需要從合約讀取，不在子圖中
                cooldownEndsAt: 0n,       // 將從 getPartyStatus 獲取
                unclaimedRewards: BigInt(p.unclaimedRewards || '0'), // 從子圖獲取
                // fatigueLevel: 0,       // 已禁用疲勞度系統
            }
            });
            
            // 只有在有有效數據時才儲存到本地快取
            if (address && formattedParties.length > 0) {
                try {
                    const cacheKey = `parties_${address}_${chainId}`;
                    // 轉換 BigInt 為字串以便序列化
                    const serializableParties = formattedParties.map(party => ({
                        ...party,
                        id: safeBigintToString(party.id),
                        totalPower: safeBigintToString(party.totalPower),
                        totalCapacity: safeBigintToString(party.totalCapacity),
                        heroIds: party.heroIds.map(id => safeBigintToString(id)),
                        cooldownEndsAt: safeBigintToString(party.cooldownEndsAt),
                        unclaimedRewards: safeBigintToString(party.unclaimedRewards),
                    }));
                    
                    localStorage.setItem(cacheKey, JSON.stringify({
                        data: serializableParties,
                        timestamp: Date.now()
                    }, (key, value) => {
                        // BigInt 序列化處理
                        if (typeof value === 'bigint') {
                            return value.toString();
                        }
                        return value;
                    }));
                    logger.info(`已儲存 ${formattedParties.length} 個隊伍資料到本地快取`);
                } catch (e) {
                    logger.warn('無法儲存到本地快取:', e);
                }
            }
            
            return formattedParties;
            } catch (error) {
                logger.error('[usePlayerParties] 查詢失敗:', error);
                throw error;
            }
        },
        enabled: !!address && chainId === bsc.id,
        // 🔥 更保守的快取策略以減少 429 錯誤
        staleTime: 1000 * 60 * 10, // 10分鐘內認為資料新鮮（大幅增加）
        gcTime: 1000 * 60 * 30, // 30分鐘垃圾回收（大幅增加）
        refetchOnWindowFocus: false, // 關閉視窗聚焦重新獲取
        // 智能重試策略
        retry: (failureCount, error) => {
            // 429 錯誤：使用指數退避
            if (error.message.includes('429') || error.message.includes('頻率限制')) {
                return failureCount < 3;
            }
            // 其他錯誤：重試一次
            return failureCount < 1;
        },
        retryDelay: (attemptIndex, error) => {
            // 429 錯誤：指數退避
            if (error.message.includes('429') || error.message.includes('頻率限制')) {
                return Math.min(1000 * 2 ** attemptIndex, 30000); // 2s, 4s, 8s...最多30s
            }
            return 1000; // 其他錯誤：1秒後重試
        },
        refetchOnMount: false, // 關閉組件掛載重新獲取
        refetchOnReconnect: true, // 重新連接時重新獲取
    });
};

// =================================================================
// Section: 子元件 (簡化後)
// =================================================================

// PartyStatusCard 現在是一個純粹的 UI 元件
interface PartyStatusCardProps {
  party: PartyNft & { cooldownEndsAt: bigint; };
  dungeons: Dungeon[];
  onStartExpedition: (partyId: bigint, dungeonId: bigint, fee: bigint) => void;
  // onRest: (partyId: bigint) => void; // 已移除休息功能
  isTxPending: boolean;
  isAnyTxPendingForThisParty: boolean;
  chainId: number;
}

const PartyStatusCard = memo<PartyStatusCardProps>(({ party, dungeons, onStartExpedition, /* onRest, */ isTxPending, isAnyTxPendingForThisParty, chainId }) => {
    const { address } = useAccount();
    const queryClient = useQueryClient();
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
    const dungeonMasterContract = getContract('DUNGEONMASTER');
    const dungeonStorageContract = getContract('DUNGEONSTORAGE');
    const dungeonCoreContract = getContract('DUNGEONCORE');
    const playerProfileContract = getContract('PLAYERPROFILE');
    
    // 🎯 當地城數據加載完成後，更新預設選擇
    React.useEffect(() => {
        if (dungeons.length > 0) {
            setSelectedDungeonId(getHighestChallengeableDungeon());
        }
    }, [dungeons, party.totalPower]);
    
    // 批量讀取地城相關數據
    const { results: dungeonBatchResults } = useContractBatchRead({
        chainId: bsc.id,
        reads: [
            { contractName: 'dungeonMaster', functionName: 'explorationFee' },
            { contractName: 'dungeonCore', functionName: 'getSoulShardAmountForUSD', args: [parseEther('1')] },
            { contractName: 'dungeonMaster', functionName: 'globalRewardMultiplier' },
        ],
    });
    
    const [explorationFeeResult, usdToSoulRateResult, globalRewardMultiplierResult] = dungeonBatchResults;
    const explorationFee = explorationFeeResult?.data as bigint | undefined;
    const usdToSoulRate = usdToSoulRateResult?.data as bigint | undefined;
    const globalRewardMultiplier = globalRewardMultiplierResult?.data as bigint | undefined;
    
    // 等級和經驗查詢已移除，節省資源 - 只在個人檔案頁面顯示

    // 🧮 計算獎勵的輔助函數 (這個版本在 PartyStatusCard 中使用，也需要考慮全局倍率)
    const calculateSoulReward = (usdAmount: bigint): bigint => {
        if (!usdToSoulRate) return 0n;
        
        // 應用全局獎勵倍率
        const multiplier = globalRewardMultiplier ? BigInt(globalRewardMultiplier.toString()) : 1000n; // 預設 100%
        const adjustedUsdAmount = (usdAmount * multiplier) / 1000n;
        
        // 公式：SOUL 獎勵 = (調整後 USD 金額 * 1 USD 對應的 SOUL 數量) / 1 USD
        return (adjustedUsdAmount * usdToSoulRate) / parseEther('1');
    };
    
    // 從 RPC 讀取實時的隊伍狀態
    const { data: partyStatus, error: partyStatusError } = useReadContract({
        address: dungeonStorageContract?.address as `0x${string}`,
        abi: dungeonStorageContract?.abi,
        functionName: 'getPartyStatus',
        args: [party.id],
        query: { 
            enabled: !!dungeonStorageContract,
            refetchInterval: 30000, // 減少到每30秒刷新一次
        }
    });
    
    // 調試日誌 - 僅在開發模式且有錯誤時顯示
    React.useEffect(() => {
        if (partyStatusError) {
            console.error(`[DungeonPage] 讀取隊伍 #${party.id} 狀態錯誤:`, partyStatusError);
        }
    }, [partyStatusError, party.id]);

    // 使用 RPC 數據或回退到原始數據
    // 已移除儲備檢查和疲勞度系統
    // partyStatus 返回的是一個結構體，在 JS 中可能是對象或數組
    const cooldownEndsAt = (() => {
        if (!partyStatus) {
            return party.cooldownEndsAt || 0n;
        }
        
        try {
            // partyStatus 是一個對象，直接訪問 cooldownEndsAt 屬性
            if (typeof partyStatus === 'object' && 'cooldownEndsAt' in partyStatus) {
                const cooldownValue = partyStatus.cooldownEndsAt;
                if (cooldownValue !== undefined) {
                    const cooldownBigInt = BigInt(cooldownValue.toString());
                    return cooldownBigInt;
                }
            }
            
            // 備用方案：嘗試數組訪問（加強類型安全）
            if (Array.isArray(partyStatus) && partyStatus.length > 1 && partyStatus[1] !== undefined) {
                try {
                    const cooldownStr = safeBigintToString(partyStatus[1]);
                    const cooldownBigInt = BigInt(cooldownStr);
                    return cooldownBigInt;
                } catch (error) {
                    logger.warn('[DungeonPage] 無法轉換 partyStatus[1] 為 BigInt:', error);
                }
            }
        } catch (error) {
            console.error('[DungeonPage] 解析 cooldownEndsAt 失敗:', error);
        }
        
        return party.cooldownEndsAt || 0n;
    })();
    
    const { isOnCooldown, effectivePower } = useMemo(() => {
        const power = BigInt(party.totalPower);
        // const effPower = power * (100n - BigInt(fatigueLevel) * 2n) / 100n;
        const effPower = power; // 不再計算疲勞度影響
        
        // 已移除疲勞度顏色邏輯
        // let fatigueColor = 'text-green-400';
        // if (party.fatigueLevel > 30) {
        //     fatigueColor = 'text-red-400';
        // } else if (party.fatigueLevel > 15) {
        //     fatigueColor = 'text-yellow-400';
        // }
        
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        const onCooldown = currentTime < cooldownEndsAt;
        
        
        return {
            isOnCooldown: onCooldown,
            effectivePower: effPower,
            // fatigueColorClass: fatigueColor,
        };
    }, [party.totalPower, cooldownEndsAt, party.id]);

    const renderStatus = () => {
        if (isAnyTxPendingForThisParty) return <span className="px-3 py-1 text-sm font-medium text-purple-300 bg-purple-900/50 rounded-full flex items-center gap-2"><LoadingSpinner size="h-3 w-3" />載入中...</span>;
        if (isOnCooldown) return <span className="px-3 py-1 text-sm font-medium text-yellow-300 bg-yellow-900/50 rounded-full">冷卻中...</span>;
        // 已移除儲備檢查和疲勞度檢查
        // if (party.fatigueLevel > 30) return <span className="px-3 py-1 text-sm font-medium text-red-300 bg-red-900/50 rounded-full">急需休息</span>;
        // if (party.fatigueLevel > 15) return <span className="px-3 py-1 text-sm font-medium text-yellow-300 bg-yellow-900/50 rounded-full">建議休息</span>;
        return <span className="px-3 py-1 text-sm font-medium text-green-300 bg-green-900/50 rounded-full">準備就緒</span>;
    };

    const renderAction = () => {
        // 冷卻中或載入中時不顯示按鈕
        if (isOnCooldown) return null;
        if (isAnyTxPendingForThisParty) return <ActionButton disabled className="w-full h-10">載入中...</ActionButton>;
        
        const fee = typeof explorationFee === 'bigint' ? explorationFee : 0n;
        return <ActionButton onClick={() => onStartExpedition(party.id, selectedDungeonId, fee)} isLoading={isTxPending} className="w-full h-10">開始遠征</ActionButton>;
    };

    // NFT 顯示偏好 - 統一使用 PNG
    const { displayMode } = useNftDisplayPreference();
    const partySvg = generatePartySVG(party);
    
    // 根據戰力決定使用哪張圖片
    const getPartyImagePath = (power: bigint): string => {
        const powerNum = Number(power.toString());
        if (powerNum >= 3900) return '/images/party/300-4199/3900-4199.png';
        if (powerNum >= 3600) return '/images/party/300-4199/3600-3899.png';
        if (powerNum >= 3300) return '/images/party/300-4199/3300-3599.png';
        if (powerNum >= 3000) return '/images/party/300-4199/3000-3299.png';
        if (powerNum >= 2700) return '/images/party/300-4199/2700-2999.png';
        if (powerNum >= 2400) return '/images/party/300-4199/2400-2699.png';
        if (powerNum >= 2100) return '/images/party/300-4199/2100-2399.png';
        if (powerNum >= 1800) return '/images/party/300-4199/1800-2099.png';
        if (powerNum >= 1500) return '/images/party/300-4199/1500-1799.png';
        if (powerNum >= 1200) return '/images/party/300-4199/1200-1499.png';
        if (powerNum >= 900) return '/images/party/300-4199/900-1199.png';
        if (powerNum >= 600) return '/images/party/300-4199/600-899.png';
        if (powerNum >= 300) return '/images/party/300-4199/300-599.png';
        return '/images/party/party-placeholder.png'; // 預設圖片
    };
    
    const partyImagePath = getPartyImagePath(effectivePower);

    return (
        <div className={`card-bg p-3 sm:p-4 rounded-2xl flex flex-col h-full border-2 transition-all ${isAnyTxPendingForThisParty ? 'border-purple-500/50' : isOnCooldown ? 'border-yellow-500/50' : 'border-transparent'}`}>
            {/* 隊伍圖片區域 */}
            <div className="relative mb-3 group">
                <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-900/50">
                    <LazyImage 
                        src={partyImagePath}
                        alt={party.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            // 如果 PNG 載入失敗，顯示 SVG
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const svgContainer = document.createElement('div');
                            svgContainer.innerHTML = partySvg;
                            svgContainer.className = 'w-full h-full';
                            target.parentElement?.appendChild(svgContainer);
                        }}
                    />
                </div>
                
                {/* PNG/SVG 切換已移除 - 統一使用 PNG */}
                
                {/* 隊伍戰力標籤 */}
                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded-lg backdrop-blur-sm">
                    <span className="text-xs text-white font-medium">⚔️ {effectivePower.toString()}</span>
                </div>
            </div>

            <div className="flex justify-between items-start mb-2 sm:mb-3">
                <h4 className="font-bold text-base sm:text-lg text-white truncate pr-2">{party.name}</h4>
                {renderStatus()}
            </div>
            
            {/* 等級顯示已移除，節省查詢資源 - 可在個人檔案頁面查看 */}
            
            <div className="grid grid-cols-1 gap-2 mb-3 sm:mb-4 text-center">
                <div><p className="text-xs sm:text-sm text-gray-400">戰力</p><p className="font-bold text-xl sm:text-2xl text-indigo-400">{effectivePower.toString()}</p></div>
                {/* 已移除疲勞度顯示 */}
                {/* <div><p className="text-sm text-gray-400">疲勞度</p><p className={`font-bold text-xl ${fatigueColorClass}`}>{party.fatigueLevel} / 45</p></div> */}
            </div>
            <div className="mb-3 sm:mb-4">
                <label className="text-xs text-gray-400">選擇地城:</label>
                <select 
                    value={selectedDungeonId.toString()} 
                    onChange={(e) => setSelectedDungeonId(BigInt(e.target.value))}
                    className="w-full p-2 border rounded-lg bg-gray-900/80 border-gray-700 text-white mt-1 text-sm"
                    disabled={isOnCooldown || isAnyTxPendingForThisParty}
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
            
            {/* 冷卻計時器 - 調試版本 */}
            {isOnCooldown ? (
                <CooldownTimer 
                    cooldownEndsAt={cooldownEndsAt} 
                    onCooldownEnd={() => {
                        queryClient.invalidateQueries({ queryKey: ['playerParties'] });
                    }} 
                />
            ) : null}
            
            {/* 移除獎勵領取組件 - 獎勵不記錄在隊伍身上，應該在玩家個人檔案中領取 */}
            
            {/* 出征歷史紀錄 - 只顯示此隊伍的記錄 */}
            <ExpeditionHistory 
                partyId={party.entityId} 
                playerId={address?.toLowerCase()}
                limit={10} 
                title={`${party.name} 出征歷史`}
            />
        </div>
    );
});
PartyStatusCard.displayName = 'PartyStatusCard';

const DungeonInfoCard = memo<{ dungeon: Dungeon; calculateSoulReward: (usdAmount: bigint) => bigint }>(({ dungeon, calculateSoulReward }) => {
    const { vipLevel } = useVipStatus();
    
    // 計算實際成功率（包含VIP加成）
    const actualSuccessRate = Math.min(dungeon.baseSuccessRate + (vipLevel || 0), 100);
    const hasVipBonus = (vipLevel || 0) > 0;
    
    return (
    <div className="card-bg rounded-xl shadow-lg overflow-hidden bg-gray-800/50 hover:transform hover:scale-105 transition-transform duration-200">
        {/* 地下城圖片 */}
        <div className="relative h-32 sm:h-40 md:h-48 overflow-hidden bg-gray-900">
            <LazyImage 
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
            <div className="absolute bottom-2 left-2 sm:left-3 right-2 sm:right-3">
                <h4 className="text-sm sm:text-base md:text-lg font-bold font-serif text-yellow-300 drop-shadow-lg">{dungeon.name}</h4>
            </div>
        </div>
        
        {/* 地下城資訊 */}
        <div className="p-3 sm:p-4 space-y-1 text-xs sm:text-sm">
            <p className="text-gray-300">要求戰力: <span className="font-semibold text-white">{dungeon.requiredPower.toString()}</span></p>
            <p className="text-gray-300">基礎獎勵: 
                <span className="font-semibold text-white">
                    ~{formatSoul(calculateSoulReward(dungeon.rewardAmountUSD), 0)} SOUL
                </span>
                <span className="text-gray-400 text-sm ml-2">
                    (${parseFloat(formatEther(dungeon.rewardAmountUSD)).toFixed(2)})
                </span>
            </p>
            <p className="text-gray-300">成功率: 
                <span className="font-semibold text-white">{actualSuccessRate}%</span>
                {hasVipBonus && (
                    <span className="text-xs text-purple-400 ml-1 sm:ml-2">
                        (基礎 {dungeon.baseSuccessRate}% + VIP {vipLevel} = +{vipLevel}%)
                    </span>
                )}
            </p>
            <p className="font-bold text-sky-400">預計經驗: +{Number(dungeon.requiredPower) / 10} EXP (成功)</p>
        </div>
    </div>
    );
});
DungeonInfoCard.displayName = 'DungeonInfoCard';


// =================================================================
// Section: 主頁面元件
// =================================================================

interface DungeonPageContentProps {
    setActivePage: (page: Page) => void;
}

const DungeonPageContent = memo<DungeonPageContentProps>(({ setActivePage }) => {
    // const { setLoading } = useGlobalLoading(); // 移除未使用的 hook
    const { chainId, address } = useAccount();
    const { showToast } = useAppToast();
    const { transactions } = useTransactionStore();
    const queryClient = useQueryClient();
    
    // 頁面快速操作
    const quickActions = usePageQuickActions();

    // 獲取金庫餘額用於提醒
    const { withdrawableBalance } = usePlayerVaultV4();
    
    // 使用即時遠征通知
    const { } = useRealtimeExpeditions({
        playerAddress: address || '',
        showNotifications: true,
        onNewExpedition: (expedition) => {
            // 當收到新的遠征結果時，刷新相關數據
            queryClient.invalidateQueries({ queryKey: ['playerParties'] });
            queryClient.invalidateQueries({ queryKey: ['recentExpeditions'] });
        }
    });

    // 已移除儲備 Modal 狀態
    const [showProgressModal, setShowProgressModal] = useState(false);
    // const [currentAction, setCurrentAction] = useState<'expedition' | 'rest'>('expedition'); // 已移除休息功能

    // ✅ 將所有Hooks調用移到組件頂部，在任何條件語句之前
    const dungeonMasterContract = getContract('DUNGEONMASTER');
    const dungeonCoreContract = getContract('DUNGEONCORE');

    // 批量讀取地城相關數據 - 避免重複讀取
    const { results: dungeonBatchResults2 } = useContractBatchRead({
        chainId: bsc.id,
        reads: [
            { contractName: 'dungeonCore', functionName: 'getSoulShardAmountForUSD', args: [parseEther('1')] },
            { contractName: 'dungeonMaster', functionName: 'globalRewardMultiplier' },
            { contractName: 'dungeonMaster', functionName: 'explorationFee' },
        ],
    });
    
    const [usdToSoulRateResult2, globalRewardMultiplierResult2, explorationFeeResult2] = dungeonBatchResults2;
    const usdToSoulRate = usdToSoulRateResult2?.data as bigint | undefined;
    const globalRewardMultiplier = globalRewardMultiplierResult2?.data as bigint | undefined;
    const explorationFee = explorationFeeResult2?.data as bigint | undefined;

    // 🧮 計算獎勵的輔助函數（考慮全局倍率）
    const calculateSoulReward = (usdAmount: bigint): bigint => {
        if (!usdToSoulRate) return 0n;
        
        // 應用全局獎勵倍率
        const multiplier = globalRewardMultiplier ? BigInt(globalRewardMultiplier.toString()) : 1000n; // 預設 100%
        const adjustedUsdAmount = (usdAmount * multiplier) / 1000n;
        
        return (adjustedUsdAmount * usdToSoulRate) / parseEther('1');
    };

    // ★ 核心改造：使用全局 NFT store 獲取隊伍數據
    const { nfts: nftsData, isLoading: isLoadingParties, refetch: refetchParties } = useNfts(address, chainId || 56);
    const partiesFromGraph = nftsData?.parties || [];
    
    // 獲取所有隊伍的冷卻時間
    const dungeonStorageContractForCooldown = getContract('DUNGEONSTORAGE');
    
    // 使用 useQueries 批量獲取所有隊伍的狀態
    const partyCooldownQueries = useQueries({
        queries: (partiesFromGraph || []).map(party => ({
            queryKey: ['partyStatus', party.id.toString()],
            queryFn: async () => {
                if (!dungeonStorageContractForCooldown) return null;
                try {
                    const status = await readContract(config, {
                        address: dungeonStorageContractForCooldown.address as `0x${string}`,
                        abi: dungeonStorageContractForCooldown.abi,
                        functionName: 'getPartyStatus',
                        args: [party.id],
                    });
                    return status;
                } catch (error) {
                    console.error(`Failed to get party status for ${party.id}:`, error);
                    return null;
                }
            },
            enabled: !!dungeonStorageContractForCooldown && !!party.id,
            staleTime: 30000, // 30秒緩存
        }))
    });
    
    // 合併隊伍數據和冷卻時間
    const parties = useMemo(() => {
        if (!partiesFromGraph) return [];
        
        return partiesFromGraph.map((party, index) => {
            // 優先使用子圖的冷卻時間（更可靠）
            let cooldownEndsAt = BigInt(party.cooldownEndsAt || 0);
            
            // 如果子圖沒有數據，則嘗試使用合約數據作為備用
            if (cooldownEndsAt === 0n) {
                const statusData = partyCooldownQueries[index]?.data;
                if (statusData) {
                    try {
                        // partyStatus 可能是數組或物件，取決於合約返回格式
                        if (Array.isArray(statusData)) {
                            cooldownEndsAt = BigInt(statusData[1] || 0); // 索引1是 cooldownEndsAt
                        } else if (typeof statusData === 'object' && statusData !== null) {
                            cooldownEndsAt = BigInt(statusData.cooldownEndsAt || statusData.cooldown || 0);
                        }
                    } catch (error) {
                        console.error('Failed to parse cooldown from contract:', error);
                    }
                }
            }
            
            return {
                ...party,
                cooldownEndsAt,
            };
        });
    }, [partiesFromGraph, partyCooldownQueries]);

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

    // 已移除疲勞度系統，不再需要休息功能
    // const { execute: executeRest, progress: restProgress, reset: resetRest } = useTransactionWithProgress({
    //     onSuccess: () => {
    //         showToast('隊伍開始休息，疲勞度正在恢復...', 'success');
    //         queryClient.invalidateQueries({ queryKey: ['playerParties'] });
    //         setTimeout(() => refetchParties(), 3000);
    //         setShowProgressModal(false);
    //         confirmRestUpdate();
    //     },
    //     onError: () => {
    //         rollbackRestUpdate();
    //     },
    //     successMessage: '休息成功！',
    //     errorMessage: '休息失敗',
    // });

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
                        // 已移除儲備減少邏輯
                    };
                }
                return party;
            });
        }
    });

    // 樂觀更新 - 休息
    // 已移除疲勞度系統，不再需要休息功能的樂觀更新
    // const { optimisticUpdate: optimisticRestUpdate, confirmUpdate: confirmRestUpdate, rollback: rollbackRestUpdate } = useOptimisticUpdate({
    //     queryKey: ['playerParties'],
    //     updateFn: (oldData: any) => {
    //         if (!oldData || !currentPartyId) return oldData;
    //         
    //         // 更新隊伍疲勞度
    //         return oldData.map((party: any) => {
    //             if (party.id === currentPartyId) {
    //                 return {
    //                     ...party,
    //                     fatigueLevel: 0, // 休息後疲勞度歸零
    //                 };
    //             }
    //             return party;
    //         });
    //     }
    // });

    const [currentPartyId, setCurrentPartyId] = useState<bigint | null>(null);
    
    const currentProgress = expeditionProgress; // 已移除休息功能
    const isTxPending = currentProgress.status !== 'idle' && currentProgress.status !== 'error';

    // 獲取地城資訊的邏輯保持不變，因為這是全域數據
    const dungeonStorageContract = getContract('DUNGEONSTORAGE');
    const dungeonContracts = useMemo(() => {
        if (!dungeonStorageContract) {
            logger.warn('[DungeonPage] dungeonStorageContract is null');
            return [];
        }
        if (chainId !== bsc.id) {
            logger.debug('[DungeonPage] Not on BSC chain');
            return [];
        }
        return Array.from({ length: 12 }, (_, i) => ({
            address: dungeonStorageContract.address as `0x${string}`,
            abi: dungeonStorageContract.abi as any,
            functionName: 'getDungeon',
            args: [BigInt(i + 1)],
        }));
    }, [dungeonStorageContract, chainId]);

    const { data: dungeonsData, isLoading: isLoadingDungeons } = useSimpleReadContracts(dungeonContracts);

    const dungeons: Dungeon[] = useMemo(() => {
        const getDungeonName = (id: number) => ["", "新手礦洞", "哥布林洞穴", "食人魔山谷", "蜘蛛巢穴", "石化蜥蜴沼澤", "巫妖墓穴", "奇美拉之巢", "惡魔前哨站", "巨龍之巔", "混沌深淵", "冥界之門", "虛空裂隙"][id] || "未知地城";
        
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
        // setCurrentAction('expedition'); // 已移除休息功能
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

    // 一鍵全部出征
    const handleExpediteAll = async () => {
        if (!dungeonMasterContract || !parties || parties.length === 0) return;
        
        const availableParties = parties.filter(party => {
            const cooldownEndsAt = party.cooldownEndsAt || 0n;
            const isOnCooldown = cooldownEndsAt > BigInt(Math.floor(Date.now() / 1000));
            const isPending = checkPendingTxForParty(party.id);
            return !isOnCooldown && !isPending;
        });
        
        if (availableParties.length === 0) {
            showToast('沒有可用的隊伍可以出征', 'info');
            return;
        }
        
        showToast(`正在派遣 ${availableParties.length} 支隊伍出征...`, 'info');
        
        // 為每個可用隊伍選擇適合的地城
        let successCount = 0;
        let errorCount = 0;
        
        for (const party of availableParties) {
            // 再次檢查冷卻狀態（避免競態條件）
            const currentCooldown = party.cooldownEndsAt || 0n;
            const currentTime = BigInt(Math.floor(Date.now() / 1000));
            if (currentCooldown > currentTime) {
                console.log(`[一鍵出征] 隊伍 #${party.id} 仍在冷卻中，跳過`);
                continue;
            }
            
            // 計算有效戰力
            const effectivePower = party.totalPower || 0n;
            
            // 找到適合的地城（戰力要求最接近但不超過隊伍戰力的）
            const suitableDungeon = [...dungeons]
                .filter(d => d.requiredPower <= effectivePower)
                .sort((a, b) => Number(b.requiredPower - a.requiredPower))[0];
            
            if (suitableDungeon) {
                try {
                    // 使用從合約讀取的費用
                    const fee = explorationFee || 0n;
                    await handleStartExpedition(party.id, suitableDungeon.id, fee);
                    successCount++;
                    // 短暫延遲避免太快發送交易
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    console.error(`[一鍵出征] 隊伍 #${party.id} 出征失敗:`, error);
                    errorCount++;
                }
            } else {
                console.log(`[一鍵出征] 隊伍 #${party.id} 找不到適合的地城`);
            }
        }
        
        // 顯示結果總結
        if (successCount > 0) {
            showToast(`成功派遣 ${successCount} 支隊伍出征！`, 'success');
        }
        if (errorCount > 0) {
            showToast(`${errorCount} 支隊伍出征失敗`, 'error');
        }
    };
    
    // 使用批量操作 Hook
    const { 
        claimAllRewards: batchClaimRewards, 
        hasClaimableRewards,
        isProcessing: isBatchProcessing,
        isLoadingStatuses 
    } = useBatchOperations({ parties, chainId: bsc.id });
    
    // 一鍵領取所有獎勵
    const handleClaimAllRewards = async () => {
        await batchClaimRewards();
    };
    
    // 檢查是否有可用的隊伍
    const hasAvailableParties = parties && parties.some(party => {
        const cooldownEndsAt = party.cooldownEndsAt || 0n;
        const isOnCooldown = cooldownEndsAt > BigInt(Math.floor(Date.now() / 1000));
        const isPending = checkPendingTxForParty(party.id);
        return !isOnCooldown && !isPending;
    });
    
    const isLoading = isLoadingParties || isLoadingDungeons;


    if (isLoading) return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;

    return (
        <>
            <section className="space-y-4 sm:space-y-6 md:space-y-8">
                <TransactionProgressModal
                    isOpen={showProgressModal}
                    onClose={() => setShowProgressModal(false)}
                    progress={currentProgress}
                    title={'遠征進度'} // 已移除休息功能
                />
            {/* 金庫提醒 */}
            {withdrawableBalance && withdrawableBalance > 0n && (
                <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Icons.DollarSign className="h-6 w-6 text-yellow-400" />
                            <div>
                                <h3 className="text-lg font-bold text-yellow-300">個人金庫有獎勞待提取！</h3>
                                <p className="text-sm text-gray-400">
                                    您有 <span className="text-yellow-400 font-semibold">{formatSoul(withdrawableBalance, 1)} SOUL</span> 可以提取到錢包
                                </p>
                            </div>
                        </div>
                        <ActionButton
                            onClick={() => setActivePage('dashboard')}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 text-sm"
                        >
                            前往提取 →
                        </ActionButton>
                    </div>
                </div>
            )}

            {/* 已移除儲備購買 Modal */}
            <div>
                <PageActionBar
                    title="遠征指揮中心"
                    actions={[
                        ...(parties && parties.length > 0 ? [
                            {
                                id: 'expediteAll',
                                label: '一鍵全部出征',
                                icon: Icons.Send,
                                onClick: handleExpediteAll,
                                condition: () => hasAvailableParties && !isTxPending
                            },
                            {
                                id: 'claimAll',
                                label: isLoadingStatuses ? '檢查中...' : '一鍵領取獎勵',
                                icon: Icons.DollarSign,
                                onClick: handleClaimAllRewards,
                                condition: () => hasClaimableRewards && !isTxPending && !isBatchProcessing
                            }
                        ] : []),
                        ...quickActions
                    ]}
                    showRefresh={true}
                    onRefresh={() => {
                        refetchParties();
                        queryClient.invalidateQueries({ queryKey: ['partyStatus'] });
                        showToast('正在刷新數據...', 'info');
                    }}
                />
                {parties && parties.length > 0 && (
                    <div className="hidden">
                        {/* Original buttons hidden */}
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                            <button
                                onClick={() => {
                                    refetchParties();
                                    queryClient.invalidateQueries({ queryKey: ['partyStatus'] });
                                    showToast('正在刷新數據...', 'info');
                                }}
                                disabled={isLoadingParties}
                                className="px-3 sm:px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors duration-200 flex items-center gap-1 sm:gap-2 disabled:opacity-50"
                            >
                                <span>🔄</span>
                                <span>刷新數據</span>
                            </button>
                            <button
                                onClick={handleExpediteAll}
                                disabled={isTxPending || !hasAvailableParties}
                                className="px-3 sm:px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors duration-200 flex items-center gap-1 sm:gap-2 disabled:opacity-50"
                            >
                                <span>🚀</span>
                                <span>一鍵全部出征</span>
                            </button>
                            <button
                                onClick={handleClaimAllRewards}
                                disabled={isTxPending || (!hasClaimableRewards && !isLoadingStatuses) || isBatchProcessing}
                                className="px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors duration-200 flex items-center gap-1 sm:gap-2 disabled:opacity-50"
                                title={
                                    isLoadingStatuses ? '檢查獎勵中...' :
                                    !hasClaimableRewards ? '沒有可領取的獎勵' :
                                    isBatchProcessing ? '處理中...' :
                                    '點擊領取所有獎勵'
                                }
                            >
                                <span>💰</span>
                                <span>{isLoadingStatuses ? '檢查中...' : '一鍵領取獎勵'}</span>
                            </button>
                        </div>
                    </div>
                )}
                {(!parties || parties.length === 0) ? (
                    <EmptyState message="您還沒有任何隊伍可以派遣。">
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-4">
                            <ActionButton onClick={() => setActivePage('party')} className="w-full sm:w-48 h-10 sm:h-12 text-sm sm:text-base">前往創建隊伍</ActionButton>
                            <ActionButton onClick={() => setActivePage('mint')} className="w-full sm:w-48 h-10 sm:h-12 text-sm sm:text-base bg-teal-600 hover:bg-teal-500">前往鑄造</ActionButton>
                        </div>
                    </EmptyState>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
                        {parties.map((party: unknown) => (
                            <PartyStatusCard
                                key={party.id.toString()}
                                party={party as PartyNft & { cooldownEndsAt: bigint; }}
                                dungeons={dungeons}
                                onStartExpedition={handleStartExpedition}
                                // onRest={handleRest} // 已移除休息功能
                                isTxPending={isTxPending}
                                isAnyTxPendingForThisParty={checkPendingTxForParty(party.id)}
                                chainId={bsc.id}
                            />
                        ))}
                    </div>
                )}
            </div>
            
            {/* Expedition Tracker - 移到可挑戰的地下城上方 */}
            <ExpeditionTracker />
        </section>
        
        {/* 可挑戰的地下城 - 移到隊伍檢查的外面，即使沒有隊伍也能看到 */}
        <section className="space-y-4 sm:space-y-6 md:space-y-8 mt-6 sm:mt-8">
            <div>
                <h2 className="page-title">可挑戰的地下城</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {[...dungeons].reverse().map(dungeon => (
                        <DungeonInfoCard 
                            key={dungeon.id} 
                            dungeon={dungeon} 
                            calculateSoulReward={calculateSoulReward} 
                        />
                    ))}
                </div>
            </div>
        </section>
        </>
    );
});
DungeonPageContent.displayName = 'DungeonPageContent';

const DungeonPage = memo<{ setActivePage: (page: Page) => void; }>(({ setActivePage }) => {
    return (
        <ErrorBoundary>
            <DungeonPageContent setActivePage={setActivePage} />
        </ErrorBoundary>
    );
});
DungeonPage.displayName = 'DungeonPage';

export default DungeonPage;
