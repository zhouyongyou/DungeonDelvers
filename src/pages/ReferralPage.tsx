// src/pages/ReferralPage.tsx (The Graph 改造版)

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getContractWithABI } from '../config/contractsWithABI';
import { useAppToast } from '../contexts/SimpleToastContext';
import { useContractError } from '../hooks/useContractError';
import { useTransactionStore } from '../stores/useTransactionStore';
import { ActionButton } from '../components/ui/ActionButton';
import { Modal } from '../components/ui/Modal';
import { isAddress, formatEther } from 'viem';
import { bsc } from 'wagmi/chains';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Icons } from '../components/ui/icons';
import { logger } from '../utils/logger';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { formatLargeNumber } from '../utils/formatters';
import { CommissionManager } from '../components/referral/CommissionManager';

// =================================================================
// Section: GraphQL 查詢與數據獲取 Hook
// =================================================================

import { THE_GRAPH_API_URL } from '../config/graphConfig';

// 查詢玩家的邀請人與佣金數據
const GET_REFERRAL_DATA_QUERY = `
  query GetReferralData($owner: ID!) {
    playerProfile(id: $owner) {
      id
      inviter
      commissionEarned
      invitees
    }
  }
`;

// 查詢推薦人基本信息（用於落地頁）
const GET_REFERRER_INFO_QUERY = `
  query GetReferrerInfo($address: ID!) {
    player(id: $address) {
      id
      heros {
        id
      }
      parties {
        id
        totalPower
      }
    }
  }
`;

// ★ 核心改造：混合數據源 Hook - 合約直讀 + GraphQL 統計
const useReferralData = () => {
    const { address, chainId } = useAccount();
    
    // 1. 合約直讀 - 獲取準確的推薦人和佣金數據
    const playerVaultContract = getContractWithABI('PLAYERVAULT');
    
    // 1a. 讀取推薦人
    const { data: contractReferrer, isLoading: isLoadingReferrer } = useReadContract({
        address: playerVaultContract.address as `0x${string}`,
        abi: playerVaultContract.abi,
        functionName: 'referrers',
        args: [address],
        enabled: !!address && chainId === bsc.id,
        staleTime: 1000 * 30, // 30秒內認為數據是新鮮的
        gcTime: 1000 * 60 * 2, // 2分鐘後垃圾回收
    });
    
    // 1b. 讀取總佣金收益
    const { data: contractTotalCommission, isLoading: isLoadingCommission } = useReadContract({
        address: playerVaultContract.address as `0x${string}`,
        abi: playerVaultContract.abi,
        functionName: 'getTotalCommissionPaid',
        args: [address],
        enabled: !!address && chainId === bsc.id,
        staleTime: 1000 * 10, // 10秒內認為數據是新鮮的（佣金數據更新較頻繁）
        gcTime: 1000 * 60 * 2, // 2分鐘後垃圾回收
    });
    
    // 合併合約載入狀態
    const isLoadingContract = isLoadingReferrer || isLoadingCommission;
    
    // 2. GraphQL 查詢 - 獲取統計數據（佣金、推薦人數等）
    const { data: graphqlProfile, isLoading: isLoadingGraphql } = useQuery({
        queryKey: ['referralData', address],
        queryFn: async () => {
            console.log('🔄 執行 referralData 查詢:', { 
                address, 
                chainId, 
                THE_GRAPH_API_URL,
                query: 'playerProfile'
            });
            
            if (!address || !THE_GRAPH_API_URL) {
                console.log('❌ 缺少必要參數:', { address, THE_GRAPH_API_URL });
                return null;
            }
            
            // 使用限流器來避免 429 錯誤
            const { graphQLRateLimiter } = await import('../utils/rateLimiter');
            
            const response = await graphQLRateLimiter.execute(async () => {
                return fetch(THE_GRAPH_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: GET_REFERRAL_DATA_QUERY,
                        variables: { owner: address.toLowerCase() },
                    }),
                });
            });
            
            if (!response.ok) {
                if (response.status === 429) {
                    console.warn('⚠️ GraphQL API 請求過於頻繁，將依賴合約數據');
                } else {
                    console.warn(`⚠️ GraphQL 請求失敗: ${response.status}, 將依賴合約數據`);
                }
                return null; // 失敗時返回 null，不拋出錯誤
            }
            const result = await response.json();
            console.log('📊 GraphQL 返回數據:', { 
                result, 
                playerProfile: result.data?.playerProfile,
                errors: result.errors 
            });
            
            if (result.errors) {
                console.error('❌ GraphQL 查詢錯誤:', result.errors);
                return null;
            }
            
            return result.data?.playerProfile ?? null;
        },
        enabled: !!address && chainId === bsc.id,
        staleTime: 1000 * 60 * 2, // 2分鐘緩存（縮短以便更快獲取統計數據）
        gcTime: 1000 * 60 * 5, // 5分鐘垃圾回收
        refetchOnWindowFocus: false,
        retry: 1, // 減少重試次數，避免拖慢頁面
        retryDelay: 1000,
    });
    
    // 3. 合併數據 - 合約數據優先，GraphQL 提供統計
    const combinedData = useMemo(() => {
        console.log('🔄 合併推薦數據:', {
            contractReferrer,
            contractTotalCommission,
            graphqlReferrer: graphqlProfile?.inviter,
            graphqlCommission: graphqlProfile?.commissionEarned,
            graphqlInvitees: graphqlProfile?.invitees?.length
        });
        
        // 合約讀取的推薦人（最準確）
        const validContractReferrer = contractReferrer && contractReferrer !== '0x0000000000000000000000000000000000000000' 
            ? contractReferrer 
            : null;
        
        // 優先使用合約數據，備用 GraphQL 數據
        const finalReferrer = validContractReferrer || graphqlProfile?.inviter || null;
        const finalCommission = contractTotalCommission !== undefined ? contractTotalCommission.toString() : (graphqlProfile?.commissionEarned || '0');
        const finalReferralCount = graphqlProfile?.invitees?.length || 0;
        const finalInvitees = graphqlProfile?.invitees || [];
        
        console.log('✅ 最終合併數據:', {
            referrer: finalReferrer,
            commission: finalCommission,
            referralCount: finalReferralCount,
            inviteesCount: finalInvitees.length,
            dataSource: {
                referrer: validContractReferrer ? 'contract' : (graphqlProfile?.inviter ? 'graphql' : 'none'),
                commission: contractTotalCommission !== undefined ? 'contract' : 'graphql',
                referralCount: 'graphql' // 回到依賴 GraphQL 的正確做法
            }
        });
        
        return {
            inviter: finalReferrer,
            commissionEarned: finalCommission,
            invitees: finalInvitees, // 直接使用 GraphQL 數據
            referralCount: finalReferralCount,
            inviteesDetails: finalInvitees, // GraphQL 的 invitees 數組
            // 數據來源標記（用於調試）
            dataSource: {
                referrer: validContractReferrer ? 'contract' : (graphqlProfile?.inviter ? 'graphql' : 'none'),
                commission: contractTotalCommission !== undefined ? 'contract' : 'graphql',
                referralCount: 'graphql' // 正確依賴 GraphQL
            }
        };
    }, [contractReferrer, contractTotalCommission, graphqlProfile]);

    return {
        data: combinedData,
        isLoading: isLoadingContract || isLoadingGraphql,
        // 合約數據載入狀態（用於重要數據的載入提示）
        isLoadingCritical: isLoadingContract
    };
};


// =================================================================
// Section: 主頁面元件
// =================================================================

const ReferralPage: React.FC = () => {
    const { address, chainId, isConnected } = useAccount();
    const { showToast } = useAppToast();
    const { handleError } = useContractError();
    const { addTransaction } = useTransactionStore();
    const queryClient = useQueryClient();

    const [referrerInput, setReferrerInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [autoDetectedRef, setAutoDetectedRef] = useState<string | null>(null);
    const [urlRefParam, setUrlRefParam] = useState<string | null>(null);
    const [showCommissionDetails, setShowCommissionDetails] = useState(true); // 預設展開
    const [hasProcessedReferral, setHasProcessedReferral] = useState(false); // 追蹤是否已處理過推薦

    // ★ 核心改造：使用混合數據源 Hook 獲取數據
    const { data: referralData, isLoading, isLoadingCritical } = useReferralData();
    
    const currentReferrer = referralData?.inviter;
    const totalCommission = referralData?.commissionEarned ? BigInt(referralData.commissionEarned) : 0n;
    const totalReferrals = referralData?.referralCount || referralData?.invitees?.length || 0;
    
    // 添加數據來源顯示（開發環境）
    useEffect(() => {
        if (import.meta.env.DEV && referralData) {
            console.log('📈 推薦系統數據來源:', referralData.dataSource, {
                referrer: currentReferrer,
                commission: totalCommission.toString(),
                referrals: totalReferrals
            });
        }
    }, [referralData, currentReferrer, totalCommission, totalReferrals]);

    const playerVaultContract = getContractWithABI('PLAYERVAULT');
    const { writeContractAsync, isPending: isSettingReferrer } = useWriteContract();

    // 判斷是否已有邀請人 - 移到 useEffect 之前
    const hasReferrer = useMemo(() => {
        const result = currentReferrer && currentReferrer !== '0x0000000000000000000000000000000000000000';
        
        // 只在有地址且不在載入中時記錄調試資訊
        if (address && !isLoading) {
            console.log('🔍 推薦人狀態檢查:', { 
                currentReferrer, 
                hasReferrer: result,
                referralDataExists: !!referralData
            });
        }
        
        return result;
    }, [currentReferrer]);

    // 檢測 URL 中的 ref 參數 - 分成兩個 useEffect
    // 第一個：立即檢測 URL 參數
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const ref = urlParams.get('ref');
        
        if (ref && isAddress(ref)) {
            setUrlRefParam(ref);
            setReferrerInput(ref);
            logger.debug('檢測到推薦連結', { ref });
        }
    }, []); // 只在組件掛載時執行一次

    // 第二個：處理自動顯示確認彈窗
    useEffect(() => {
        console.log('🎯 彈窗邏輯執行:', { 
            urlRefParam, 
            address, 
            hasReferrer, 
            showConfirmModal, 
            hasProcessedReferral,
            isLoading,
            isLoadingCritical,
            currentReferrer,
            dataSource: referralData?.dataSource
        });
        
        // 如果有推薦連結參數且彈窗未顯示且未處理過，才考慮顯示彈窗
        if (urlRefParam && !showConfirmModal && !hasProcessedReferral) {
            let shouldShowModal = false;
            
            if (!address) {
                // 未連錢包，總是顯示彈窗
                shouldShowModal = true;
                console.log('📱 未連錢包，應顯示彈窗');
            } else if (address && urlRefParam.toLowerCase() !== address.toLowerCase()) {
                // 已連錢包且不是自己的推薦連結
                if (isLoading || isLoadingCritical) {
                    console.log('⏳ 關鍵數據載入中，暫不顯示彈窗');
                    return; // 等待合約數據載入完成，避免誤判
                } else if (!hasReferrer) {
                    shouldShowModal = true;
                    console.log('✅ 已連錢包但無推薦人，應顯示彈窗');
                } else {
                    console.log('❌ 已有推薦人，不顯示彈窗');
                    setHasProcessedReferral(true);
                    if (urlRefParam.toLowerCase() !== currentReferrer?.toLowerCase()) {
                        // 如果 URL 中的推薦人和實際推薦人不同，給予提示
                        showToast('您已有推薦人，無法更改推薦關係', 'info');
                    }
                }
            }
            
            if (shouldShowModal) {
                setAutoDetectedRef(urlRefParam);
                setShowConfirmModal(true);
                console.log('🚀 顯示彈窗');
                logger.info('自動顯示推薦確認彈窗', { 
                    ref: urlRefParam, 
                    userAddress: address,
                    connected: !!address,
                    hasReferrer,
                    shouldShowModal
                });
            }
        }
    }, [urlRefParam, address, hasReferrer, showConfirmModal, hasProcessedReferral, currentReferrer, isLoading, isLoadingCritical]);

    const handleSetReferrer = async () => {
        if (!isAddress(referrerInput)) return showToast('請輸入有效的錢包地址', 'error');
        if (!playerVaultContract) return showToast('合約尚未準備好', 'error');
        if (referrerInput.toLowerCase() === address?.toLowerCase()) return showToast('不能將自己設為邀請人', 'error');

        try {
            const hash = await writeContractAsync({
                address: playerVaultContract.address,
                abi: playerVaultContract.abi,
                functionName: 'setReferrer',
                args: [referrerInput as `0x${string}`],
            });
            
            // 交易發送成功後立即關閉彈窗並顯示成功訊息
            setShowConfirmModal(false);
            setAutoDetectedRef(null);
            setHasProcessedReferral(true); // 標記為已處理，防止重複彈窗
            showToast('推薦人綁定請求已發送！等待區塊鏈確認中', 'success');
            
            addTransaction({ hash, description: `設定邀請人為 ${referrerInput.substring(0, 6)}...` });
            
            // 延遲一段時間再刷新 The Graph 的數據
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ['referralData', address] }), 5000);
        } catch (error: unknown) {
            handleError(error, "設定邀請人失敗");
        }
    };

    const referralLink = useMemo(() => {
        if (typeof window === 'undefined' || !address) return '';
        return `${window.location.origin}${window.location.pathname}#/referral?ref=${address}`;
    }, [address]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // 複製推薦文案
    const handleCopyReferralText = () => {
        const referralText = `🎮 加入 Dungeon Delvers - 最刺激的 Web3 地城冒險遊戲！

🔥 立即體驗：
• 招募強力英雄 ⚔️
• 收集珍稀聖物 💎  
• 組建無敵隊伍 👥
• 探索神秘地城 🏰
• 賺取豐厚獎勵 💰

🎁 使用我的邀請連結註冊，一起開啟冒險之旅：
${referralLink}

#DungeonDelvers #Web3Gaming #PlayToEarn #NFT #GameFi`;
        
        navigator.clipboard.writeText(referralText);
        showToast('推薦文案已複製！可直接分享到社群', 'success');
    };

    
    // 查詢推薦人信息（用於落地頁顯示）
    const { data: referrerInfo } = useQuery({
        queryKey: ['referrerInfo', urlRefParam],
        queryFn: async () => {
            if (!urlRefParam || !THE_GRAPH_API_URL) return null;
            const response = await fetch(THE_GRAPH_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: GET_REFERRER_INFO_QUERY,
                    variables: { address: urlRefParam.toLowerCase() },
                }),
            });
            const { data } = await response.json();
            return data.player;
        },
        enabled: !!urlRefParam && !isConnected,
    });

    const referrerTotalPower = referrerInfo?.parties?.reduce((sum: number, party: any) => 
        sum + Number(party.totalPower), 0
    ) || 0;


    // 如果未連接錢包且有推薦參數，顯示推薦落地頁
    if (!isConnected && urlRefParam && !showConfirmModal) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
                <div className="container mx-auto px-4 py-8 max-w-6xl">
                    {/* 標題區 */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-purple-600 mb-4">
                            歡迎來到 Dungeon Delvers
                        </h1>
                        <p className="text-xl text-gray-300">
                            您的朋友邀請您加入這個史詩般的區塊鏈冒險！
                        </p>
                    </div>

                    {/* 推薦人信息卡片 */}
                    {referrerInfo && (
                        <div className="card-bg p-6 rounded-2xl mb-8 text-center max-w-md mx-auto">
                            <h3 className="text-lg font-bold text-yellow-400 mb-4">您的推薦人</h3>
                            <div className="space-y-3">
                                <p className="font-mono text-sm text-gray-400 break-all">
                                    {urlRefParam}
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/20 p-3 rounded-lg">
                                        <p className="text-gray-400 text-sm">擁有英雄</p>
                                        <p className="text-2xl font-bold text-white">
                                            {referrerInfo.heros?.length || 0}
                                        </p>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-lg">
                                        <p className="text-gray-400 text-sm">總戰力</p>
                                        <p className="text-2xl font-bold text-white">
                                            {referrerTotalPower}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 遊戲特色介紹 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <div className="card-bg p-6 rounded-xl text-center">
                            <Icons.Hero className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">收集英雄</h3>
                            <p className="text-gray-400">
                                鑄造獨特的 NFT 英雄，每個都有不同的稀有度和戰力
                            </p>
                        </div>
                        <div className="card-bg p-6 rounded-xl text-center">
                            <Icons.Party className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">組建隊伍</h3>
                            <p className="text-gray-400">
                                將英雄和聖物組合成強大的隊伍，征服地下城
                            </p>
                        </div>
                        <div className="card-bg p-6 rounded-xl text-center">
                            <Icons.ExternalLink className="w-16 h-16 text-green-400 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">賺取獎勵</h3>
                            <p className="text-gray-400">
                                完成遠征任務，獲得 $SoulShard 代幣獎勵
                            </p>
                        </div>
                    </div>

                    {/* 開始遊戲區塊 */}
                    <div className="card-bg p-8 rounded-2xl text-center max-w-2xl mx-auto">
                        <h2 className="text-3xl font-bold text-white mb-6">
                            準備開始您的冒險了嗎？
                        </h2>
                        <p className="text-gray-400 mb-6">
                            連接您的錢包以開始遊戲，並自動綁定推薦人關係
                        </p>
                        <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30 mb-6">
                            <p className="text-sm text-blue-300">
                                💡 提示：可以點擊下方按鈕進行推薦綁定操作
                            </p>
                        </div>
                        
                        {/* 新增：手動觸發按鈕 */}
                        <div className="space-y-4 text-center">
                            <ActionButton 
                                onClick={() => setShowConfirmModal(true)}
                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 px-8 py-3 text-lg font-semibold mx-auto"
                            >
                                🎯 確認推薦關係
                            </ActionButton>
                            <p className="text-sm text-gray-400">或者點擊右上角的錢包按鈕直接連接</p>
                        </div>
                    </div>

                    {/* 底部說明 */}
                    <div className="mt-12 text-center text-sm text-gray-500">
                        <p>邀請關係將為推薦人帶來 5% 的佣金收益</p>
                        <p>不會影響您的任何收益，還能獲得社群支持</p>
                    </div>
                </div>
            </div>
        );
    }

    // 僅支援主網
    if (chainId && chainId !== bsc.id) {
        return <div className="p-4 text-center text-gray-400">請連接到支援的網路以使用邀請功能。</div>;
    }

    return (
        <section className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
            <h2 className="page-title">邀請與佣金中心</h2>
            
            {/* 佣金管理 - 新版 PlayerVault v4.0 功能 */}
            <CommissionManager className="mb-6" />
            
            {/* 邀請收益展示 */}
            <div className="card-bg p-4 sm:p-6 rounded-xl">
                <div className="text-center">
                    <Icons.Copy className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-400 mx-auto mb-3" />
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <h3 className="font-bold text-base sm:text-lg text-white">我的邀請收益</h3>
                        <button
                            onClick={() => setShowCommissionDetails(!showCommissionDetails)}
                            className="text-gray-400 hover:text-white transition-colors p-1"
                            >
                                {showCommissionDetails ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
                            </button>
                        {/* 手動刷新按鈕 */}
                        <button
                            onClick={() => {
                                queryClient.invalidateQueries({ queryKey: ['referralData', address] });
                                // 同時刷新合約數據
                                queryClient.invalidateQueries({ 
                                    predicate: (query) => 
                                        query.queryKey[0] === 'readContract' && 
                                        (query.queryKey[1]?.includes?.('referrers') || 
                                         query.queryKey[1]?.includes?.('getTotalCommissionPaid'))
                                });
                                showToast('正在刷新數據...', 'info');
                            }}
                            className="text-gray-400 hover:text-white transition-colors p-1 ml-1"
                            title="刷新數據"
                            >
                                <Icons.RefreshCw className="w-4 h-4" />
                            </button>
                        
                        {/* 開發環境調試信息 - 僅在控制台顯示，不在 UI 顯示 */}
                    </div>
                    {isLoading ? <LoadingSpinner size="h-8 w-8" /> : (
                        <p className="text-lg sm:text-2xl font-bold text-yellow-400">
                            {formatEther(totalCommission)} $SoulShard
                        </p>
                    )}
                    <p className="text-xs sm:text-sm text-gray-400 mt-2">累計佣金總額</p>
                </div>
                
                {/* 傭金明細 */}
                {showCommissionDetails && (
                    <div className="mt-4 pt-4 border-t border-gray-700 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">累計佣金收益：</span>
                            <span className="text-gray-300 font-mono">
                                {totalCommission ? 
                                    formatLargeNumber(totalCommission) : 
                                    '0'
                                } SOUL
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">總推薦人數：</span>
                            <span className="text-gray-300">
                                {totalReferrals} 人
                            </span>
                        </div>
                        
                        {/* 佣金機制簡要說明 */}
                        <div className="mt-3 pt-3 border-t border-gray-700">
                            <p className="text-xs text-gray-400 leading-relaxed">
                                💡 當好友從金庫提領時，您將獲得 <span className="text-yellow-400">5% 佣金</span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                需等待被邀請人進行提領操作
                            </p>
                        </div>
                        
                        
                        {/* 邀請人詳細列表 */}
                        {referralData?.inviteesDetails && referralData.inviteesDetails.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-gray-600">
                                <h5 className="text-sm font-semibold text-gray-300 mb-3">📋 我的邀請列表</h5>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {referralData.inviteesDetails.map((invitee, index) => (
                                        <div key={invitee.address} className="flex items-center justify-between p-2 bg-gray-800/50 rounded text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="text-blue-400">#{index + 1}</span>
                                                <span className="font-mono text-gray-300">
                                                    {invitee.address.slice(0, 6)}...{invitee.address.slice(-4)}
                                                </span>
                                            </div>
                                            <div className="text-gray-400">
                                                {new Date(invitee.timestamp * 1000).toLocaleDateString('zh-TW', {
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {referralData.inviteesDetails.length > 3 && (
                                    <p className="text-xs text-gray-500 text-center mt-2">
                                        顯示最近 {Math.min(referralData.inviteesDetails.length, 10)} 位邀請人
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                {/* 提領收益引導 */}
                {totalCommission > 0n && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <ActionButton 
                            onClick={() => window.location.hash = '#/dashboard'}
                            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                            >
                                💰 前往金庫提領收益
                        </ActionButton>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            在總覽頁面的金庫區域提領您的佣金收益
                        </p>
                    </div>
                )}
            </div>

            {/* 邀請連結分享 */}
            <div className="card-bg p-4 sm:p-6 rounded-xl shadow-lg">
                <h3 className="section-title">我的邀請連結</h3>
                <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">分享您的專屬連結，當被邀請的好友從金庫提領獎勵時，您將獲得他們提領金額 5% 的佣金作為獎勵！</p>
                <div className="flex flex-col sm:flex-row items-center gap-2 bg-black/20 p-2 rounded-lg">
                    <div className="flex-1 w-full">
                        <label htmlFor="referral-link" className="sr-only">我的邀請連結</label>
                        <input 
                            id="referral-link"
                            name="referral-link"
                            type="text" 
                            readOnly 
                            value={referralLink} 
                            className="w-full bg-transparent text-gray-300 font-mono text-xs sm:text-sm p-2" 
                        />
                    </div>
                    <ActionButton onClick={handleCopyLink} className="w-full sm:w-auto flex-shrink-0">
                        {copied ? '已複製!' : <><Icons.Copy className="w-4 h-4 mr-2" />複製連結</>}
                    </ActionButton>
                </div>
                
                {/* 推廣工具 */}
                <div className="mt-4 sm:mt-6 space-y-3">
                    <h4 className="text-base sm:text-lg font-semibold text-blue-400">推廣工具</h4>
                    <ActionButton onClick={handleCopyReferralText} className="w-full flex items-center justify-center gap-2">
                        <Icons.Copy className="w-4 h-4" />
                        複製推薦文案
                    </ActionButton>
                </div>

            </div>

            {/* 設定邀請人 */}
            <div className="card-bg p-4 sm:p-6 rounded-xl shadow-lg">
                <h3 className="section-title">設定我的邀請人</h3>
                
                {/* 未連錢包且有推薦參數時，顯示推薦綁定區塊 */}
                {!address && urlRefParam && (
                    <div className="mb-6 p-4 rounded-lg border border-purple-500/30 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
                        <div className="flex items-start gap-3 mb-4">
                            <Icons.ExternalLink className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-purple-400 mb-2">檢測到推薦關係</h4>
                                <p className="text-sm text-gray-300 mb-3">您通過推薦連結進入，以下地址將成為您的邀請人：</p>
                                <p className="font-mono text-xs text-gray-400 bg-black/30 p-2 rounded break-all mb-3">{urlRefParam}</p>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <ActionButton 
                                onClick={() => setShowConfirmModal(true)}
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                            >
                                🔗 連接錢包並綁定推薦人
                            </ActionButton>
                            
                            <div className="text-xs text-gray-400 bg-gray-800/30 p-3 rounded-lg">
                                <p className="mb-1"><strong>提醒：</strong></p>
                                <ul className="space-y-1">
                                    <li>• 連接錢包後即可確認推薦關係</li>
                                    <li>• 推薦關係一旦建立無法更改</li>
                                    <li>• 不會影響您的任何遊戲收益</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* 標準邀請人設定區塊 */}
                {address ? (
                    isLoading ? <LoadingSpinner /> : (
                        hasReferrer ? (
                            <div className="bg-green-900/20 p-4 rounded-lg border border-green-500/30">
                                <p className="text-green-400 font-medium mb-2">✓ 您已成功綁定邀請人</p>
                                <p className="text-gray-400">您的邀請人:</p>
                                <p className="font-mono text-lg text-green-400 bg-black/20 p-2 rounded break-all">{currentReferrer}</p>
                                <p className="text-xs text-gray-500 mt-2">邀請關係已建立，您的邀請人將持續獲得您提領時的佣金分成。</p>
                            </div>
                        ) : (
                            <div>
                                <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30 mb-4">
                                    <h4 className="font-semibold text-blue-400 mb-2">為什麼要設定邀請人？</h4>
                                    <ul className="text-sm text-gray-300 space-y-1">
                                        <li>• 支持為您介紹遊戲的朋友</li>
                                        <li>• 建立長期的互助關係</li>
                                        <li>• 不影響您的任何收益</li>
                                    </ul>
                                </div>
                                <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">如果您是透過好友的連結來到這裡，請在此輸入他的錢包地址以綁定邀請關係。此操作只能進行一次。</p>
                                <div className="flex flex-col sm:flex-row items-center gap-2">
                                    <div className="flex-1 w-full">
                                        <label htmlFor="referrer-address" className="sr-only">邀請人錢包地址</label>
                                        <input 
                                            id="referrer-address"
                                            name="referrer-address"
                                            type="text" 
                                            value={referrerInput} 
                                            onChange={(e) => setReferrerInput(e.target.value)} 
                                            placeholder="貼上邀請人的錢包地址" 
                                            className="w-full p-2 border rounded-lg bg-gray-800 border-gray-600 text-white font-mono text-sm" 
                                        />
                                    </div>
                                    <ActionButton 
                                        onClick={handleSetReferrer} 
                                        isLoading={isSettingReferrer} 
                                        disabled={!isAddress(referrerInput)} 
                                        className="w-full sm:w-auto flex-shrink-0"
                                    >
                                        確認綁定
                                    </ActionButton>
                                </div>
                            </div>
                        )
                    )
                ) : (
                    // 未連錢包且沒有推薦參數的情況
                    <div className="text-center py-8">
                        <Icons.ExternalLink className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                        <h4 className="text-lg font-semibold text-gray-300 mb-2">連接錢包以管理推薦關係</h4>
                        <p className="text-sm text-gray-400 mb-4">請先連接您的 Web3 錢包以查看和設定邀請人</p>
                        <ActionButton 
                            onClick={() => {
                                const connectButton = document.querySelector('[data-testid="rk-connect-button"]') as HTMLButtonElement;
                                if (connectButton) {
                                    connectButton.click();
                                } else {
                                    // 備案邏輯
                                    const buttons = Array.from(document.querySelectorAll('button'));
                                    const connectBtn = buttons.find(btn => 
                                        btn.textContent?.includes('連接') || 
                                        btn.textContent?.includes('Connect') ||
                                        btn.textContent?.includes('連結')
                                    );
                                    if (connectBtn) {
                                        (connectBtn as HTMLButtonElement).click();
                                    } else {
                                        showToast('請手動點擊右上角連接錢包', 'info');
                                    }
                                }
                            }}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            連接錢包
                        </ActionButton>
                    </div>
                )}
            </div>

            {/* 邀請系統詳細說明 - 放在頁面最底部 */}
            <div className="card-bg p-6 sm:p-8 rounded-xl bg-gradient-to-r from-purple-900/10 to-blue-900/10 border border-purple-500/20">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 text-center">
                    🎮 邀請系統完整說明
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 邀請人收益說明 */}
                    <div className="space-y-4">
                        <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 p-5 rounded-lg border border-yellow-500/30">
                            <h4 className="text-lg font-bold text-yellow-400 mb-3">📈 邀請人收益</h4>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    <span>被邀請人每次從金庫提領時，您可獲得 <span className="text-yellow-400 font-semibold">5% 佣金</span></span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    <span>佣金以 <span className="text-purple-400 font-semibold">$SoulShard</span> 代幣形式自動發放到您的金庫</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    <span>邀請關係永久有效，持續獲得收益</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    <span>可以邀請無限數量的玩家，累積更多佣金</span>
                                </li>
                            </ul>
                        </div>
                        
                        <div className="bg-gray-800/50 p-4 rounded-lg">
                            <h5 className="text-sm font-semibold text-gray-300 mb-2">💡 收益計算範例</h5>
                            <p className="text-xs text-gray-400">
                                如果您邀請的玩家從金庫提領 1000 SOUL，您將獲得 50 SOUL (5%) 的佣金獎勵
                            </p>
                        </div>
                    </div>
                    
                    {/* 被邀請人好處說明 */}
                    <div className="space-y-4">
                        <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 p-5 rounded-lg border border-blue-500/30">
                            <h4 className="text-lg font-bold text-blue-400 mb-3">🤝 被邀請人好處</h4>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    <span>綁定邀請人後，享有社群支援和遊戲指導</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    <span><span className="text-blue-400 font-semibold">不影響您的任何收益</span>和遊戲體驗</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    <span>支持邀請人同時建立長期互助關係</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-green-400 mt-0.5">✓</span>
                                    <span>加入活躍的遊戲社群，獲得更多遊戲攻略</span>
                                </li>
                            </ul>
                        </div>
                        
                        <div className="bg-gray-800/50 p-4 rounded-lg">
                            <h5 className="text-sm font-semibold text-gray-300 mb-2">⚠️ 重要提醒</h5>
                            <p className="text-xs text-gray-400">
                                邀請關係一旦建立無法更改，請確認邀請人地址正確
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* 邀請流程說明 */}
                <div className="mt-6 p-5 bg-gradient-to-r from-purple-800/20 to-pink-800/20 rounded-lg border border-purple-500/20">
                    <h4 className="text-lg font-bold text-purple-400 mb-4">🚀 如何開始邀請</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-white font-bold">1</span>
                            </div>
                            <h5 className="text-sm font-semibold text-white mb-1">複製邀請連結</h5>
                            <p className="text-xs text-gray-400">使用上方的「複製連結」按鈕獲取您的專屬邀請連結</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-white font-bold">2</span>
                            </div>
                            <h5 className="text-sm font-semibold text-white mb-1">分享給朋友</h5>
                            <p className="text-xs text-gray-400">透過社群媒體、聊天軟體分享您的邀請連結</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-white font-bold">3</span>
                            </div>
                            <h5 className="text-sm font-semibold text-white mb-1">自動獲得佣金</h5>
                            <p className="text-xs text-gray-400">當朋友提領獎勵時，您將自動獲得 5% 佣金</p>
                        </div>
                    </div>
                </div>
                
                {/* 常見問題 */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-gray-800/30 p-4 rounded-lg">
                        <h5 className="font-semibold text-gray-300 mb-2">❓ 佣金何時發放？</h5>
                        <p className="text-gray-400">當被邀請人從金庫提領時，佣金會立即自動發放到您的金庫中</p>
                    </div>
                    <div className="bg-gray-800/30 p-4 rounded-lg">
                        <h5 className="font-semibold text-gray-300 mb-2">❓ 可以邀請多少人？</h5>
                        <p className="text-gray-400">沒有限制！您可以邀請任意數量的玩家，每個都能為您帶來佣金</p>
                    </div>
                </div>
            </div>

            {/* 自動推薦確認彈窗 */}
            <Modal
                isOpen={showConfirmModal && !!autoDetectedRef}
                onClose={() => {
                    setShowConfirmModal(false);
                    setAutoDetectedRef(null);
                    setHasProcessedReferral(true); // 用戶主動關閉後，標記為已處理
                }}
                title="🎯 確認綁定邀請人"
                onConfirm={address ? () => {
                    handleSetReferrer();
                } : () => {
                    // 不關閉彈窗，直接觸發錢包連接
                    const connectButton = document.querySelector('[data-testid="rk-connect-button"]') as HTMLButtonElement;
                    if (connectButton) {
                        connectButton.click();
                    } else {
                        // 如果找不到按鈕，嘗試其他選擇器
                        const altButton = document.querySelector('button[data-testid*="connect"]') as HTMLButtonElement;
                        if (altButton) {
                            altButton.click();
                        } else {
                            // 最後的備案：查找包含 "連接" 或 "Connect" 文字的按鈕
                            const buttons = Array.from(document.querySelectorAll('button'));
                            const connectBtn = buttons.find(btn => 
                                btn.textContent?.includes('連接') || 
                                btn.textContent?.includes('Connect') ||
                                btn.textContent?.includes('連結')
                            );
                            if (connectBtn) {
                                (connectBtn as HTMLButtonElement).click();
                            } else {
                                console.warn('找不到錢包連接按鈕');
                                setShowConfirmModal(false);
                                showToast('請手動點擊右上角連接錢包', 'info');
                            }
                        }
                    }
                }}
                confirmText={address ? (isSettingReferrer ? '綁定中...' : '確認綁定') : '連接錢包'}
                maxWidth="lg"
                disabled={isSettingReferrer}
                isLoading={isSettingReferrer}
            >
                <div className="space-y-6">
                    <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
                        <p className="text-sm text-blue-300 mb-2">檢測到推薦連結</p>
                        <p className="font-mono text-xs text-gray-400 break-all">{autoDetectedRef}</p>
                    </div>
                    {!address ? (
                        <div className="space-y-4">
                            <p className="text-gray-300">
                                🎉 歡迎加入 DungeonDelvers！
                            </p>
                            <p className="text-sm text-gray-400">
                                您通過推薦連結進入遊戲。連接錢包後，此地址將成為您的邀請人。
                            </p>
                            <div className="bg-yellow-900/20 p-3 rounded-lg border border-yellow-500/30">
                                <p className="text-sm text-yellow-300">
                                    ⚠️ 請先連接您的 Web3 錢包以繼續
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="text-gray-300">
                                您是否要將此地址設為您的邀請人？綁定後無法更改。
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                                <li>• 邀請人將獲得您提領時 5% 的佣金</li>
                                <li>• 不會影響您的收益</li>
                                <li>• 綁定關係永久有效</li>
                            </ul>
                        </>
                    )}
                </div>
            </Modal>
        </section>
    );
};

export default ReferralPage;
