// src/hooks/useContractEvents.optimized.ts
// 🔥 這是優化版本的 useContractEvents Hook
// 可以替換原有的 useContractEvents.ts 文件

import { useAccount, useWatchContractEvent } from 'wagmi';
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

// ★★★ 網路優化：自適應輪詢間隔，根據用戶活動調整 ★★★
const POLLING_INTERVALS = {
  active: 30_000,    // 用戶活躍時：30秒
  idle: 60_000,     // 用戶閒置時：60秒  
  background: 300_000, // 頁面背景時：5分鐘
} as const;

// 用戶活動狀態檢測 Hook
const useUserActivity = () => {
  const [activity, setActivity] = useState<'active' | 'idle' | 'background'>('active');
  
  useEffect(() => {
    let idleTimer: NodeJS.Timeout;
    
    const resetTimer = () => {
      clearTimeout(idleTimer);
      setActivity('active');
      idleTimer = setTimeout(() => setActivity('idle'), 30_000); // 30秒後變為閒置
    };
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setActivity('background');
        clearTimeout(idleTimer);
      } else {
        resetTimer();
      }
    };
    
    // 監聽用戶活動事件
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    resetTimer();
    
    return () => {
      clearTimeout(idleTimer);
      events.forEach(event => document.removeEventListener(event, resetTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  return activity;
};

/**
 * @notice 高階工廠函式，用於創建通用的事件處理器，避免重複程式碼。
 * 🔥 優化版本：添加了更好的錯誤處理和性能監控
 */
function createContractEventHandler(
    contract: ReturnType<typeof getContract>,
    eventName: string,
    userAddress: `0x${string}` | undefined,
    callback: (decodedLog: DecodedLogWithArgs) => void,
    checkPartyOwnership: boolean = false,
    queryClient?: ReturnType<typeof useQueryClient>
) {
    return (logs: Log[]) => {
        if (!contract || !userAddress) return;

        // 🔥 優化：性能監控
        const startTime = performance.now();
        let processedLogs = 0;

        // 如果需要檢查隊伍所有權，先從快取中獲取玩家擁有的隊伍 ID 列表
        const myPartyIds = checkPartyOwnership && queryClient
            ? (queryClient.getQueryData<AllNftCollections>(['ownedNfts', userAddress, contract.chainId])?.parties.map((p: PartyNft) => p.id) ?? [])
            : [];

        logs.forEach(log => {
            try {
                const decodedLog = decodeEventLog({ abi: contract.abi as Abi, ...log });
                
                // 只處理我們感興趣的事件
                if (decodedLog.eventName === eventName) {
                    const args = (decodedLog.args as unknown) as Record<string, unknown>;
                    
                    const typedLog: DecodedLogWithArgs = {
                        eventName: decodedLog.eventName,
                        args: args
                    };

                    // 案例1: 隊伍特定事件 (如遠征完成)，只處理屬於玩家的隊伍事件
                    if (checkPartyOwnership) {
                        if (args.partyId && myPartyIds.includes(args.partyId as bigint)) {
                            callback(typedLog);
                            processedLogs++;
                        }
                        return;
                    }

                    // 案例2: 通用事件，檢查事件參數中是否包含玩家地址
                    const userField = args.owner || args.player || args.user;
                    if (userField && userField.toString().toLowerCase() === userAddress.toLowerCase()) {
                        callback(typedLog);
                        processedLogs++;
                    }
                }
            } catch (error) {
                // 🔥 優化：更好的錯誤處理
                logger.warn(`Failed to decode log for event ${eventName}:`, error);
            }
        });

        // 🔥 優化：性能監控
        const processingTime = performance.now() - startTime;
        if (processingTime > 100) { // 超過100ms記錄警告
            logger.warn(`Slow event processing: ${eventName} took ${processingTime.toFixed(2)}ms to process ${processedLogs} logs`);
        }
    };
}

/**
 * @notice 優化版本的全局合約事件監聽 Hook
 * 🔥 主要優化：
 * 1. 自適應輪詢間隔 - 根據用戶活動調整請求頻率
 * 2. 更好的錯誤處理和性能監控
 * 3. 智能背景模式處理
 */
export const useContractEventsOptimized = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { showExpeditionResult } = useExpeditionResult();
    const queryClient = useQueryClient();
    
    // 🔥 優化：使用自適應輪詢間隔
    const userActivity = useUserActivity();
    const pollingInterval = POLLING_INTERVALS[userActivity];
    
    // 🔥 優化：在背景模式時完全停止事件監聽
    const isEnabled = chainId === bsc.id && !!address && userActivity !== 'background';
    
    // --- 精準的 Query Invalidation 函式 ---
    
    // 當 NFT 資產或代幣餘額發生變化時呼叫
    const invalidateNftsAndBalance = useCallback(() => {
        showToast('🔄 偵測到資產變動，正在同步最新數據...', 'info');
        
        Promise.all([
            queryClient.invalidateQueries({ queryKey: ['ownedNfts', address, chainId] }),
            queryClient.invalidateQueries({ queryKey: ['balance', address, chainId] })
        ]).then(() => {
            showToast('✅ 資產數據已更新！', 'success');
        }).catch((error) => {
            logger.error('Failed to invalidate queries:', error);
            showToast('❌ 資產同步失敗，請重試', 'error');
        });
    }, [address, chainId, queryClient, showToast]);

    // 🔥 優化：使用節流版本的金庫刷新
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const throttledVaultRefresh = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['playerInfo', address, chainId] });
        }, 1000);
    }, [address, chainId, queryClient]);
    
    const invalidateVaultAndTax = useCallback(() => {
        showToast('金庫資料已更新！', 'success');
        throttledVaultRefresh();
        queryClient.invalidateQueries({ queryKey: ['taxParams', address, chainId] });
        queryClient.invalidateQueries({ queryKey: ['balance', address, chainId] });
    }, [address, chainId, queryClient, showToast, throttledVaultRefresh]);
    
    // 其他 invalidate 函式保持不變...
    const invalidateProfile = useCallback(() => {
        showToast('經驗值已更新！', 'info');
        queryClient.invalidateQueries({ queryKey: ['profileTokenOf', address] });
        queryClient.invalidateQueries({ queryKey: ['playerExperience'] });
        queryClient.invalidateQueries({ queryKey: ['getLevel', address] });
    }, [address, queryClient, showToast]);
    
    const invalidatePartyStatus = useCallback((partyId?: bigint) => {
        queryClient.invalidateQueries({ queryKey: ['getPartyStatus', partyId?.toString()] });
    }, [queryClient]);

    // --- 合約實例 ---
    const heroContract = getContract(bsc.id, 'hero');
    const relicContract = getContract(bsc.id, 'relic');
    const partyContract = getContract(bsc.id, 'party');
    const dungeonMasterContract = getContract(bsc.id, 'dungeonMaster');
    const playerVaultContract = getContract(bsc.id, 'playerVault');
    const altarOfAscensionContract = getContract(bsc.id, 'altarOfAscension');
    const playerProfileContract = getContract(bsc.id, 'playerProfile');

    // 🔥 優化：顯示當前輪詢狀態（開發階段可用）
    useEffect(() => {

    }, [userActivity, pollingInterval]);

    // --- 事件監聽設定 (使用自適應輪詢間隔) ---
    
    // NFT 鑄造/創建事件 -> 刷新 NFT 列表和餘額
    useWatchContractEvent({ 
        ...heroContract, 
        chainId: bsc.id, 
        eventName: 'HeroMinted', 
        pollingInterval, // 🔥 使用自適應間隔
        enabled: isEnabled, // 🔥 背景模式時停用
        onLogs: createContractEventHandler(heroContract, 'HeroMinted', address, (log) => { 
            showToast(`英雄 #${log.args.tokenId?.toString()} 鑄造成功！`, 'success'); 
            invalidateNftsAndBalance(); 
        }) 
    });
    
    useWatchContractEvent({ 
        ...relicContract, 
        chainId: bsc.id, 
        eventName: 'RelicMinted', 
        pollingInterval, // 🔥 使用自適應間隔
        enabled: isEnabled, // 🔥 背景模式時停用
        onLogs: createContractEventHandler(relicContract, 'RelicMinted', address, (log) => { 
            showToast(`聖物 #${log.args.tokenId?.toString()} 鑄造成功！`, 'success'); 
            invalidateNftsAndBalance(); 
        }) 
    });
    
    useWatchContractEvent({ 
        ...partyContract, 
        chainId: bsc.id, 
        eventName: 'PartyCreated', 
        pollingInterval, // 🔥 使用自適應間隔
        enabled: isEnabled, // 🔥 背景模式時停用
        onLogs: createContractEventHandler(partyContract, 'PartyCreated', address, (log) => { 
            showToast(`隊伍 #${log.args.partyId?.toString()} 創建成功！`, 'success'); 
            invalidateNftsAndBalance(); 
        }) 
    });
    
    // 金庫事件 -> 刷新金庫相關數據
    useWatchContractEvent({ 
        ...playerVaultContract, 
        chainId: bsc.id, 
        eventName: 'Deposited', 
        pollingInterval, // 🔥 使用自適應間隔
        enabled: isEnabled, // 🔥 背景模式時停用
        onLogs: createContractEventHandler(playerVaultContract, 'Deposited', address, () => { 
            invalidateVaultAndTax(); 
        }) 
    });
    
    useWatchContractEvent({ 
        ...playerVaultContract, 
        chainId: bsc.id, 
        eventName: 'Withdrawn', 
        pollingInterval, // 🔥 使用自適應間隔
        enabled: isEnabled, // 🔥 背景模式時停用
        onLogs: createContractEventHandler(playerVaultContract, 'Withdrawn', address, () => { 
            invalidateVaultAndTax(); 
        }) 
    });

    // 玩家檔案事件 -> 刷新個人檔案數據
    useWatchContractEvent({ 
        ...playerProfileContract, 
        chainId: bsc.id, 
        eventName: 'ExperienceAdded', 
        pollingInterval, // 🔥 使用自適應間隔
        enabled: isEnabled, // 🔥 背景模式時停用
        onLogs: createContractEventHandler(playerProfileContract, 'ExperienceAdded', address, () => { 
            invalidateProfile(); 
        }) 
    });

    // 隊伍遠征相關事件 -> 刷新特定隊伍的狀態和玩家檔案
    useWatchContractEvent({ 
        ...dungeonMasterContract, 
        chainId: bsc.id, 
        eventName: 'ExpeditionFulfilled', 
        pollingInterval, // 🔥 使用自適應間隔
        enabled: isEnabled, // 🔥 背景模式時停用
        onLogs: createContractEventHandler(dungeonMasterContract, 'ExpeditionFulfilled', address, (log) => { 
            const { success, reward, expGained } = log.args; 
            showExpeditionResult({ 
                success: success as boolean, 
                reward: reward as bigint, 
                expGained: expGained as bigint 
            }); 
            invalidatePartyStatus(log.args.partyId as bigint); 
            invalidateProfile(); 
        }, true, queryClient) 
    });
    
    useWatchContractEvent({ 
        ...dungeonMasterContract, 
        chainId: bsc.id, 
        eventName: 'PartyRested', 
        pollingInterval, // 🔥 使用自適應間隔
        enabled: isEnabled, // 🔥 背景模式時停用
        onLogs: createContractEventHandler(dungeonMasterContract, 'PartyRested', address, (log) => { 
            showToast(`隊伍 #${log.args.partyId?.toString()} 已恢復活力！`, 'success'); 
            invalidatePartyStatus(log.args.partyId as bigint); 
        }, true, queryClient) 
    });
    
    
    // 升星祭壇事件 -> 刷新 NFT 列表和餘額
    useWatchContractEvent({ 
        ...altarOfAscensionContract, 
        chainId: bsc.id, 
        eventName: 'UpgradeProcessed', 
        pollingInterval, // 🔥 使用自適應間隔
        enabled: isEnabled, // 🔥 背景模式時停用
        onLogs: createContractEventHandler(altarOfAscensionContract, 'UpgradeProcessed', address, (log) => {
            const { outcome } = log.args;
            const outcomeMessages: Record<number, string> = { 
                3: `⚜️ 大成功！獲得 2 個更高星級的 NFT！`, 
                2: `✨ 升星成功！獲得 1 個更高星級的 NFT！`, 
                1: `💔 升星失敗，但返還了部分材料。`, 
                0: `💀 升星完全失敗，所有材料已銷毀。` 
            };
            const message = outcomeMessages[outcome as number] || "升星處理完成。";
            const type = (outcome as number) >= 2 ? 'success' : 'info';
            showToast(message, type);
            invalidateNftsAndBalance();
        })
    });
    
    // 🔥 優化：返回當前狀態，方便調試
    return {
        userActivity,
        pollingInterval,
        isEnabled
    };
};

// 為了保持向後兼容性，導出一個別名
export const useContractEvents = useContractEventsOptimized;
