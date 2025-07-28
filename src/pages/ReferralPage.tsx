// src/pages/ReferralPage.tsx (The Graph 改造版)

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getContract } from '../config/contracts';
import { useAppToast } from '../contexts/SimpleToastContext';
import { useTransactionStore } from '../stores/useTransactionStore';
import { ActionButton } from '../components/ui/ActionButton';
import { isAddress, formatEther } from 'viem';
import { bsc } from 'wagmi/chains';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Icons } from '../components/ui/icons';
import { logger } from '../utils/logger';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { formatLargeNumber } from '../utils/formatters';

// =================================================================
// Section: GraphQL 查詢與數據獲取 Hook
// =================================================================

import { THE_GRAPH_API_URL } from '../config/graphConfig';

// 查詢玩家的邀請人與佣金數據
const GET_REFERRAL_DATA_QUERY = `
  query GetReferralData($owner: ID!) {
    player(id: $owner) {
      id
      # 假設 vault entity 已經與 player 關聯
      vault {
        referrer
        totalCommissionPaid
      }
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

// ★ 核心改造：新的 Hook，用於從 The Graph 獲取邀請數據
const useReferralData = () => {
    const { address, chainId } = useAccount();

    return useQuery({
        queryKey: ['referralData', address],
        queryFn: async () => {
            if (!address || !THE_GRAPH_API_URL) return null;
            
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
                    throw new Error('子圖 API 請求過於頻繁，請稍後再試');
                }
                throw new Error(`GraphQL 請求失敗: ${response.status} ${response.statusText}`);
            }
            const { data } = await response.json();
            // ★★★ 核心修正：確保在找不到資料時回傳 null 而不是 undefined ★★★
            return data.player?.vault ?? null;
        },
        enabled: !!address && chainId === bsc.id,
        staleTime: 1000 * 60 * 10, // 10分鐘快取
        gcTime: 1000 * 60 * 30, // 30分鐘垃圾回收
        refetchOnWindowFocus: false,
        retry: 2, // 減少重試次數
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // 指數退避
    });
};


// =================================================================
// Section: 主頁面元件
// =================================================================

const ReferralPage: React.FC = () => {
    const { address, chainId, isConnected } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const queryClient = useQueryClient();

    const [referrerInput, setReferrerInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [autoDetectedRef, setAutoDetectedRef] = useState<string | null>(null);
    const [urlRefParam, setUrlRefParam] = useState<string | null>(null);
    const [showCommissionDetails, setShowCommissionDetails] = useState(false);

    // ★ 核心改造：使用新的 Hook 獲取數據
    const { data: referralData, isLoading } = useReferralData();
    
    const currentReferrer = referralData?.referrer;
    const totalCommission = referralData?.totalCommissionPaid ? BigInt(referralData.totalCommissionPaid) : 0n;

    const playerVaultContract = getContract('PLAYERVAULT');
    const { writeContractAsync, isPending: isSettingReferrer } = useWriteContract();

    // 判斷是否已有邀請人 - 移到 useEffect 之前
    const hasReferrer = useMemo(() => {
        return currentReferrer && currentReferrer !== '0x0000000000000000000000000000000000000000';
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
        if (urlRefParam && address && !hasReferrer && urlRefParam.toLowerCase() !== address.toLowerCase()) {
            setAutoDetectedRef(urlRefParam);
            setShowConfirmModal(true);
            logger.info('自動顯示推薦確認彈窗', { ref: urlRefParam, userAddress: address });
        }
    }, [urlRefParam, address, hasReferrer]);

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
            addTransaction({ hash, description: `設定邀請人為 ${referrerInput.substring(0, 6)}...` });
            // 成功後，延遲一段時間再刷新 The Graph 的數據
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ['referralData', address] }), 5000);
        } catch (e: unknown) {
            const error = e as { message?: string; shortMessage?: string };
            if (!error.message?.includes('User rejected the request')) showToast(error.shortMessage || "設定邀請人失敗", "error");
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

    // 下載宣傳圖片
    const handleDownloadImage = () => {
        // 創建 Canvas 生成宣傳圖片
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = 1200;
        canvas.height = 630;

        // 背景 - 使用更豐富的漸變效果
        const bgGradient = ctx.createRadialGradient(600, 315, 0, 600, 315, 800);
        bgGradient.addColorStop(0, '#1e293b');
        bgGradient.addColorStop(0.5, '#0f172a');
        bgGradient.addColorStop(1, '#030712');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 添加網格背景效果
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 40) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }

        // 添加裝飾性漸變圓形
        const decorGradient1 = ctx.createRadialGradient(150, 150, 0, 150, 150, 150);
        decorGradient1.addColorStop(0, 'rgba(168, 85, 247, 0.3)');
        decorGradient1.addColorStop(1, 'transparent');
        ctx.fillStyle = decorGradient1;
        ctx.fillRect(0, 0, 300, 300);

        const decorGradient2 = ctx.createRadialGradient(1050, 480, 0, 1050, 480, 150);
        decorGradient2.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        decorGradient2.addColorStop(1, 'transparent');
        ctx.fillStyle = decorGradient2;
        ctx.fillRect(900, 330, 300, 300);

        // 標題區域背景
        const titleBg = ctx.createLinearGradient(0, 50, 0, 250);
        titleBg.addColorStop(0, 'rgba(168, 85, 247, 0.1)');
        titleBg.addColorStop(1, 'transparent');
        ctx.fillStyle = titleBg;
        ctx.fillRect(0, 50, canvas.width, 200);

        // 主標題 - 使用陰影效果
        ctx.save();
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 80px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DUNGEON DELVERS', canvas.width / 2, 130);
        ctx.restore();

        // 副標題
        ctx.fillStyle = '#fbbf24';
        ctx.font = '32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('征服地下城 · 收集 NFT · 賺取獎勵', canvas.width / 2, 180);

        // 遊戲特色卡片
        const features = [
            { icon: '⚔️', title: '英雄收集', desc: '獨特 NFT 英雄' },
            { icon: '💎', title: '稀有聖物', desc: '強化你的隊伍' },
            { icon: '🏰', title: '地城探索', desc: '豐厚獎勵等你' }
        ];

        // 繪製特色卡片
        features.forEach((feature, index) => {
            const x = 150 + index * 350;
            const y = 250;
            const width = 300;
            const height = 120;

            // 卡片背景
            const cardGradient = ctx.createLinearGradient(x, y, x + width, y + height);
            cardGradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
            cardGradient.addColorStop(1, 'rgba(168, 85, 247, 0.2)');
            ctx.fillStyle = cardGradient;
            ctx.fillRect(x, y, width, height);

            // 卡片邊框
            ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            // 圖標
            ctx.font = '48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(feature.icon, x + 60, y + 65);

            // 標題
            ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText(feature.title, x + 100, y + 50);

            // 描述
            ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#9ca3af';
            ctx.fillText(feature.desc, x + 100, y + 80);
        });

        // 推薦碼區域
        const refY = 420;
        const refBg = ctx.createLinearGradient(200, refY, 1000, refY + 140);
        refBg.addColorStop(0, 'rgba(251, 191, 36, 0.1)');
        refBg.addColorStop(1, 'rgba(245, 158, 11, 0.1)');
        ctx.fillStyle = refBg;
        ctx.fillRect(200, refY, 800, 140);

        // 推薦碼邊框
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(200, refY, 800, 140);

        // 推薦碼標題
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎁 使用我的推薦碼加入遊戲', canvas.width / 2, refY + 40);

        // 推薦地址
        if (address) {
            ctx.save();
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px monospace';
            ctx.textAlign = 'center';
            const shortAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
            ctx.fillText(shortAddress, canvas.width / 2, refY + 85);
            ctx.restore();
        }

        // 底部提示
        ctx.fillStyle = '#6b7280';
        ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('推薦人可獲得 5% 永久佣金獎勵', canvas.width / 2, refY + 120);

        // 添加品牌標識
        ctx.fillStyle = '#374151';
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('dungeondelvers.io', canvas.width - 30, canvas.height - 20);
        
        // 下載圖片
        canvas.toBlob((blob) => {
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'dungeon-delvers-referral.png';
                a.click();
                URL.revokeObjectURL(url);
                showToast('宣傳圖片已下載！', 'success');
            }
        });
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
    if (!isConnected && urlRefParam) {
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
                                💡 提示：連接錢包後您可以確認綁定推薦人
                            </p>
                        </div>
                        <p className="text-2xl mb-6">👇</p>
                        <p className="text-lg text-gray-300 mb-4">請點擊右上角的錢包按鈕連接</p>
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
            
            {/* 邀請收益展示 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
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
                                <span className="text-gray-400">一級推薦收益：</span>
                                <span className="text-gray-300 font-mono">
                                    {referralData?.level1Commission ? 
                                        formatLargeNumber(BigInt(referralData.level1Commission)) : 
                                        '0'
                                    } SOUL
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">二級推薦收益：</span>
                                <span className="text-gray-300 font-mono">
                                    {referralData?.level2Commission ? 
                                        formatLargeNumber(BigInt(referralData.level2Commission)) : 
                                        '0'
                                    } SOUL
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">總推薦人數：</span>
                                <span className="text-gray-300">
                                    {referralData?.totalReferrals || 0} 人
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">活躍推薦人數：</span>
                                <span className="text-gray-300">
                                    {referralData?.activeReferrals || 0} 人
                                </span>
                            </div>
                            {/* 暫時顯示開發中提示 */}
                            <p className="text-xs text-gray-500 mt-2 italic text-center">* 明細功能開發中</p>
                        </div>
                    )}
                </div>
                
                <div className="card-bg p-4 sm:p-6 rounded-xl text-center">
                    <Icons.ExternalLink className="w-10 h-10 sm:w-12 sm:h-12 text-green-400 mx-auto mb-3" />
                    <h3 className="font-bold text-base sm:text-lg text-white mb-2">佣金比例</h3>
                    <p className="text-lg sm:text-2xl font-bold text-green-400">5%</p>
                    <p className="text-xs sm:text-sm text-gray-400 mt-2">好友提領時的佣金</p>
                </div>
                
                <div className="card-bg p-4 sm:p-6 rounded-xl text-center">
                    <Icons.Hero className="w-10 h-10 sm:w-12 sm:h-12 text-blue-400 mx-auto mb-3" />
                    <h3 className="font-bold text-base sm:text-lg text-white mb-2">邀請人好處</h3>
                    <p className="text-lg sm:text-2xl font-bold text-blue-400">終身收益</p>
                    <p className="text-xs sm:text-sm text-gray-400 mt-2">持續獲得佣金</p>
                </div>
            </div>

            {/* 邀請系統說明 */}
            <div className="card-bg p-4 sm:p-6 rounded-xl">
                <h3 className="section-title text-lg sm:text-xl mb-3 sm:mb-4">邀請系統說明</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                        <h4 className="font-semibold text-base sm:text-lg text-yellow-400 mb-2 sm:mb-3">邀請人收益</h4>
                        <ul className="space-y-2 text-sm text-gray-300">
                            <li className="flex items-start gap-2">
                                <span className="text-green-400">✓</span>
                                <span>被邀請人每次從金庫提領時，您可獲得 5% 佣金</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400">✓</span>
                                <span>佣金以 $SoulShard 代幣形式自動發放到您的金庫</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400">✓</span>
                                <span>邀請關係永久有效，持續獲得收益</span>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-base sm:text-lg text-blue-400 mb-2 sm:mb-3">被邀請人好處</h4>
                        <ul className="space-y-2 text-sm text-gray-300">
                            <li className="flex items-start gap-2">
                                <span className="text-green-400">✓</span>
                                <span>綁定邀請人後，享有社群支援和指導</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400">✓</span>
                                <span>不影響您的任何收益和遊戲體驗</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400">✓</span>
                                <span>支持邀請人同時建立長期互助關係</span>
                            </li>
                        </ul>
                    </div>
                </div>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        <ActionButton onClick={handleCopyReferralText} className="flex items-center justify-center gap-2">
                            <Icons.Copy className="w-4 h-4" />
                            複製推薦文案
                        </ActionButton>
                        <ActionButton onClick={handleDownloadImage} className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700">
                            <Icons.Download className="w-4 h-4" />
                            下載宣傳圖片
                        </ActionButton>
                    </div>
                    <div className="text-xs text-gray-400 bg-gray-800/30 p-3 rounded-lg">
                        <p className="mb-2"><strong>使用建議：</strong></p>
                        <ul className="space-y-1">
                            <li>• 複製文案可直接分享到 Discord、Telegram、Twitter 等社群平台</li>
                            <li>• 宣傳圖片適合用於群組分享，提高視覺吸引力</li>
                            <li>• 建議搭配個人介紹，提升推薦轉換率</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="bg-gray-800/50 p-3 rounded-lg">
                        <p className="text-xs text-gray-400">分享方式</p>
                        <p className="font-medium text-white">社群媒體</p>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-lg">
                        <p className="text-xs text-gray-400">分享方式</p>
                        <p className="font-medium text-white">朋友群組</p>
                    </div>
                    <div className="bg-gray-800/50 p-3 rounded-lg">
                        <p className="text-xs text-gray-400">分享方式</p>
                        <p className="font-medium text-white">個人推薦</p>
                    </div>
                </div>
            </div>

            {/* 設定邀請人 */}
            <div className="card-bg p-4 sm:p-6 rounded-xl shadow-lg">
                <h3 className="section-title">設定我的邀請人</h3>
                {isLoading ? <LoadingSpinner /> : (
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
                )}
            </div>

            {/* 自動推薦確認彈窗 */}
            {showConfirmModal && autoDetectedRef && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-gray-700">
                        <h3 className="text-xl font-bold text-white mb-4">確認綁定邀請人</h3>
                        <div className="space-y-4">
                            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500/30">
                                <p className="text-sm text-blue-300 mb-2">檢測到推薦連結</p>
                                <p className="font-mono text-xs text-gray-400 break-all">{autoDetectedRef}</p>
                            </div>
                            <p className="text-gray-300">
                                您是否要將此地址設為您的邀請人？綁定後無法更改。
                            </p>
                            <ul className="text-xs text-gray-400 space-y-1">
                                <li>• 邀請人將獲得您提領時 5% 的佣金</li>
                                <li>• 不會影響您的收益</li>
                                <li>• 綁定關係永久有效</li>
                            </ul>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <ActionButton
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    setAutoDetectedRef(null);
                                }}
                                className="flex-1 bg-gray-700 hover:bg-gray-600"
                            >
                                取消
                            </ActionButton>
                            <ActionButton
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    handleSetReferrer();
                                }}
                                isLoading={isSettingReferrer}
                                className="flex-1"
                            >
                                確認綁定
                            </ActionButton>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ReferralPage;
