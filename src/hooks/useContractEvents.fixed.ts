// src/hooks/useContractEvents.fixed.ts
// 🔧 修復 filter not found 錯誤的版本

import { useAccount, useWatchContractEvent, usePublicClient } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState, useEffect, useRef } from 'react';
import { decodeEventLog, type Log, type Abi } from 'viem';
import { getContract } from '../config/contracts';
import { useAppToast } from './useAppToast';
import { useExpeditionResult } from '../contexts/ExpeditionContext';
import type { AllNftCollections, PartyNft } from '../types/nft';
import { bsc } from 'wagmi/chains';
import { logger } from '../utils/logger';

type DecodedLogWithArgs = {
    eventName: string;
    args: Record<string, unknown>;
};

// 🔧 修復：減少併發監聽器數量，增加錯誤處理
const OPTIMIZED_POLLING_INTERVALS = {
  connected: 45_000,    // 錢包連接時：45秒（避免過於頻繁）
  background: 120_000,  // 背景模式：2分鐘
} as const;

// 🔧 修復：統一的錯誤處理機制
const handleEventError = (eventName: string, error: unknown) => {
  if (error instanceof Error) {
    // 過濾掉常見的 filter not found 錯誤，避免過度日誌記錄
    if (error.message.includes('filter not found')) {
      logger.debug(`Event filter reset for ${eventName}: ${error.message}`);
      return; // 這是正常的，不需要報錯
    }
    
    // 其他錯誤才記錄
    logger.warn(`Event listening error for ${eventName}:`, error.message);
  }
};

// 🔧 修復：簡化的用戶活動檢測
const useUserActivity = () => {
  const [isBackground, setIsBackground] = useState(false);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsBackground(document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  return isBackground ? 'background' : 'connected';
};

/**
 * 🔧 修復版本：改進的事件處理器，包含更好的錯誤恢復
 */
function createEventHandler(
    contract: ReturnType<typeof getContract>,
    eventName: string,
    userAddress: `0x${string}` | undefined,
    callback: (decodedLog: DecodedLogWithArgs) => void,
    checkPartyOwnership: boolean = false,
    queryClient?: ReturnType<typeof useQueryClient>
) {
    return (logs: Log[]) => {
        if (!contract || !userAddress) return;

        try {
            // 如果需要檢查隊伍所有權，先從快取中獲取
            const myPartyIds = checkPartyOwnership && queryClient
                ? (queryClient.getQueryData<AllNftCollections>(['ownedNfts', userAddress, contract.chainId])?.parties.map((p: PartyNft) => p.id) ?? [])
                : [];

            logs.forEach(log => {
                try {
                    const decodedLog = decodeEventLog({ abi: contract.abi as Abi, ...log });
                    
                    if (decodedLog.eventName === eventName) {
                        const args = (decodedLog.args as unknown) as Record<string, unknown>;
                        
                        const typedLog: DecodedLogWithArgs = {
                            eventName: decodedLog.eventName,
                            args: args
                        };

                        // 檢查隊伍所有權
                        if (checkPartyOwnership) {
                            if (args.partyId && myPartyIds.includes(args.partyId as bigint)) {
                                callback(typedLog);
                            }
                            return;
                        }

                        // 檢查用戶地址
                        const userField = args.owner || args.player || args.user;
                        if (userField && userField.toString().toLowerCase() === userAddress.toLowerCase()) {
                            callback(typedLog);
                        }
                    }
                } catch (error) {
                    handleEventError(`${eventName}-decode`, error);
                }
            });
        } catch (error) {
            handleEventError(`${eventName}-process`, error);
        }
    };
}

/**
 * 🔧 修復版本：大幅減少同時監聽的事件數量，改善錯誤處理
 */
export const useContractEventsFixed = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { showExpeditionResult } = useExpeditionResult();
    const queryClient = useQueryClient();
    const publicClient = usePublicClient();
    
    const userActivity = useUserActivity();
    const pollingInterval = OPTIMIZED_POLLING_INTERVALS[userActivity];
    
    // 🔧 修復：只在有錢包連接且在正確網路時啟用
    const isEnabled = chainId === bsc.id && !!address && !!publicClient;
    
    // 🔧 修復：節流處理，避免過於頻繁的查詢刷新
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const throttledRefresh = useCallback((queryKeys: string[][], delay: number = 2000) => {
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
        }
        
        refreshTimeoutRef.current = setTimeout(() => {
            Promise.all(
                queryKeys.map(key => queryClient.invalidateQueries({ queryKey: key }))
            ).catch(error => {
                logger.error('Failed to refresh queries:', error);
            });
        }, delay);
    }, [queryClient]);
    
    // 精簡的刷新函數
    const invalidateNftsAndBalance = useCallback(() => {
        showToast('🔄 資產數據更新中...', 'info');
        throttledRefresh([
            ['ownedNfts', address, chainId],
            ['balance', address, chainId]
        ]);
    }, [address, chainId, showToast, throttledRefresh]);

    const invalidateProfile = useCallback(() => {
        throttledRefresh([
            ['profileTokenOf', address],
            ['playerExperience'],
            ['getLevel', address]
        ]);
    }, [address, throttledRefresh]);
    
    // 合約實例
    const heroContract = getContract(bsc.id, 'hero');
    const relicContract = getContract(bsc.id, 'relic');
    const partyContract = getContract(bsc.id, 'party');
    const dungeonMasterContract = getContract(bsc.id, 'dungeonMaster');
    const playerVaultContract = getContract(bsc.id, 'playerVault');
    
    // 🔧 修復：只監聽最重要的事件，減少併發數量
    
    // 1. NFT 鑄造事件（高優先級）
    useWatchContractEvent({ 
        ...heroContract, 
        chainId: bsc.id, 
        eventName: 'HeroMinted', 
        pollingInterval,
        enabled: isEnabled,
        onError: (error) => handleEventError('HeroMinted', error),
        onLogs: createEventHandler(heroContract, 'HeroMinted', address, (log) => { 
            showToast(`英雄 #${log.args.tokenId?.toString()} 鑄造成功！`, 'success'); 
            invalidateNftsAndBalance(); 
        }) 
    });
    
    useWatchContractEvent({ 
        ...relicContract, 
        chainId: bsc.id, 
        eventName: 'RelicMinted', 
        pollingInterval,
        enabled: isEnabled,
        onError: (error) => handleEventError('RelicMinted', error),
        onLogs: createEventHandler(relicContract, 'RelicMinted', address, (log) => { 
            showToast(`聖物 #${log.args.tokenId?.toString()} 鑄造成功！`, 'success'); 
            invalidateNftsAndBalance(); 
        }) 
    });
    
    useWatchContractEvent({ 
        ...partyContract, 
        chainId: bsc.id, 
        eventName: 'PartyCreated', 
        pollingInterval,
        enabled: isEnabled,
        onError: (error) => handleEventError('PartyCreated', error),
        onLogs: createEventHandler(partyContract, 'PartyCreated', address, (log) => { 
            showToast(`隊伍 #${log.args.partyId?.toString()} 創建成功！`, 'success'); 
            invalidateNftsAndBalance(); 
        }) 
    });
    
    // 2. 遠征完成事件（高優先級）
    useWatchContractEvent({ 
        ...dungeonMasterContract, 
        chainId: bsc.id, 
        eventName: 'ExpeditionFulfilled', 
        pollingInterval,
        enabled: isEnabled,
        onError: (error) => handleEventError('ExpeditionFulfilled', error),
        onLogs: createEventHandler(dungeonMasterContract, 'ExpeditionFulfilled', address, (log) => { 
            const { success, reward, expGained } = log.args; 
            showExpeditionResult({ 
                success: success as boolean, 
                reward: reward as bigint, 
                expGained: expGained as bigint 
            }); 
            invalidateProfile();
        }, true, queryClient) 
    });
    
    // 🔧 修復：移除低優先級事件監聽，減少併發負載
    // - PlayerVault 事件：用戶可以手動刷新
    // - Profile 事件：通過遠征事件間接更新
    // - 升星事件：用戶操作後手動刷新
    
    // 清理函數
    useEffect(() => {
        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current);
            }
        };
    }, []);
    
    return {
        userActivity,
        pollingInterval,
        isEnabled,
        activeEventListeners: 4 // 🔧 現在只有 4 個事件監聽器
    };
};

// 導出修復版本
export const useContractEvents = useContractEventsFixed;