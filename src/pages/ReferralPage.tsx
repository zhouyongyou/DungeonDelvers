// src/pages/ReferralPage.tsx (The Graph 改造版)

import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getContract } from '../config/contracts';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import { ActionButton } from '../components/ui/ActionButton';
import { isAddress, formatEther } from 'viem';
import { bsc } from 'wagmi/chains';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Icons } from '../components/ui/icons';

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
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const queryClient = useQueryClient();

    const [referrerInput, setReferrerInput] = useState('');
    const [copied, setCopied] = useState(false);

    // ★ 核心改造：使用新的 Hook 獲取數據
    const { data: referralData, isLoading } = useReferralData();
    
    const currentReferrer = referralData?.referrer;
    const totalCommission = referralData?.totalCommissionPaid ? BigInt(referralData.totalCommissionPaid) : 0n;

    const playerVaultContract = getContract(chainId === bsc.id ? chainId : bsc.id, 'playerVault');
    const { writeContractAsync, isPending: isSettingReferrer } = useWriteContract();

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
        const ref = urlParams.get('ref');
        if (ref && isAddress(ref)) {
            setReferrerInput(ref);
        }
    }, []);

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
        return `${window.location.origin}${window.location.pathname}#/?ref=${address}`;
    }, [address]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const hasReferrer = useMemo(() => {
        return currentReferrer && currentReferrer !== '0x0000000000000000000000000000000000000000';
    }, [currentReferrer]);
    
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
        </section>
    );
};

export default ReferralPage;
