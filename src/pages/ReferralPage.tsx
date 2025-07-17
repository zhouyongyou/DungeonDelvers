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

// =================================================================
// Section: GraphQL 查詢與數據獲取 Hook
// =================================================================

const THE_GRAPH_API_URL = import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL;

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
            const response = await fetch(THE_GRAPH_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: GET_REFERRAL_DATA_QUERY,
                    variables: { owner: address.toLowerCase() },
                }),
            });
            if (!response.ok) throw new Error('GraphQL Network response was not ok');
            const { data } = await response.json();
            // ★★★ 核心修正：確保在找不到資料時回傳 null 而不是 undefined ★★★
            return data.player?.vault ?? null;
        },
        enabled: !!address && chainId === bsc.id,
    });
};


// =================================================================
// Section: 主頁面元件
// =================================================================

const ReferralPage: React.FC = () => {
    console.log('ReferralPage 組件被渲染');
    const { address, chainId, isConnected } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const queryClient = useQueryClient();

    const [referrerInput, setReferrerInput] = useState('');
    const [copied, setCopied] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [autoDetectedRef, setAutoDetectedRef] = useState<string | null>(null);
    const [urlRefParam, setUrlRefParam] = useState<string | null>(null);

    // ★ 核心改造：使用新的 Hook 獲取數據
    const { data: referralData, isLoading } = useReferralData();
    
    const currentReferrer = referralData?.referrer;
    const totalCommission = referralData?.totalCommissionPaid ? BigInt(referralData.totalCommissionPaid) : 0n;

    const playerVaultContract = getContract(chainId === bsc.id ? chainId : bsc.id, 'playerVault');
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
        console.log('檢測到 ref 參數:', ref); // 調試用
        
        if (ref && isAddress(ref)) {
            setUrlRefParam(ref);
            setReferrerInput(ref);
            logger.debug('檢測到推薦連結', { ref });
        }
    }, []); // 只在組件掛載時執行一次

    // 第二個：處理自動顯示確認彈窗
    useEffect(() => {
        console.log('isConnected:', isConnected); // 調試用
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

    // 調試信息
    console.log('ReferralPage 渲染條件:', {
        isConnected,
        urlRefParam,
        chainId,
        address,
        hasReferrer,
        currentReferrer
    });

    // 如果未連接錢包且有推薦參數，顯示推薦落地頁
    if (!isConnected && urlRefParam) {
        console.log('顯示推薦落地頁');
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
        <section className="space-y-8 max-w-4xl mx-auto">
            <h2 className="page-title">邀請與佣金中心</h2>
            
            {/* 邀請收益展示 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-bg p-6 rounded-xl text-center">
                    <Icons.Copy className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                    <h3 className="font-bold text-lg text-white mb-2">我的邀請收益</h3>
                    {isLoading ? <LoadingSpinner size="h-8 w-8" /> : (
                        <p className="text-2xl font-bold text-yellow-400">
                            {formatEther(totalCommission)} $SoulShard
                        </p>
                    )}
                    <p className="text-sm text-gray-400 mt-2">累計佣金總額</p>
                </div>
                
                <div className="card-bg p-6 rounded-xl text-center">
                    <Icons.ExternalLink className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <h3 className="font-bold text-lg text-white mb-2">佣金比例</h3>
                    <p className="text-2xl font-bold text-green-400">5%</p>
                    <p className="text-sm text-gray-400 mt-2">好友提領時的佣金</p>
                </div>
                
                <div className="card-bg p-6 rounded-xl text-center">
                    <Icons.Hero className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                    <h3 className="font-bold text-lg text-white mb-2">邀請人好處</h3>
                    <p className="text-2xl font-bold text-blue-400">終身收益</p>
                    <p className="text-sm text-gray-400 mt-2">持續獲得佣金</p>
                </div>
            </div>

            {/* 邀請系統說明 */}
            <div className="card-bg p-6 rounded-xl">
                <h3 className="section-title text-xl mb-4">邀請系統說明</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold text-lg text-yellow-400 mb-3">邀請人收益</h4>
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
                        <h4 className="font-semibold text-lg text-blue-400 mb-3">被邀請人好處</h4>
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
            <div className="card-bg p-6 rounded-xl shadow-lg">
                <h3 className="section-title">我的邀請連結</h3>
                <p className="text-sm text-gray-400 mb-4">分享您的專屬連結，當被邀請的好友從金庫提領獎勵時，您將獲得他們提領金額 5% 的佣金作為獎勵！</p>
                <div className="flex flex-col sm:flex-row items-center gap-2 bg-black/20 p-2 rounded-lg">
                    <div className="flex-1 w-full">
                        <label htmlFor="referral-link" className="sr-only">我的邀請連結</label>
                        <input 
                            id="referral-link"
                            name="referral-link"
                            type="text" 
                            readOnly 
                            value={referralLink} 
                            className="w-full bg-transparent text-gray-300 font-mono text-sm p-2" 
                        />
                    </div>
                    <ActionButton onClick={handleCopyLink} className="w-full sm:w-auto flex-shrink-0">
                        {copied ? '已複製!' : <><Icons.Copy className="w-4 h-4 mr-2" />複製連結</>}
                    </ActionButton>
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
            <div className="card-bg p-6 rounded-xl shadow-lg">
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
                            <p className="text-sm text-gray-400 mb-4">如果您是透過好友的連結來到這裡，請在此輸入他的錢包地址以綁定邀請關係。此操作只能進行一次。</p>
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
                                        className="w-full p-2 border rounded-lg bg-gray-800 border-gray-600 text-white font-mono" 
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
