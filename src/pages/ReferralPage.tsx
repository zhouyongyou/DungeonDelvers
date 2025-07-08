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

    const playerVaultContract = getContract(chainId as any, 'playerVault');
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
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) showToast(e.shortMessage || "設定邀請人失敗", "error");
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
        <section className="space-y-8 max-w-3xl mx-auto">
            <h2 className="page-title">邀請與佣金中心</h2>

            <div className="card-bg p-6 rounded-xl shadow-lg">
                <h3 className="section-title">我的邀請連結</h3>
                <p className="text-sm text-gray-400 mb-4">分享您的專屬連結，當被邀請的好友從金庫提領獎勵時，您將獲得他們提領金額 5% 的佣金作為獎勵！</p>
                <div className="flex flex-col sm:flex-row items-center gap-2 bg-black/20 p-2 rounded-lg">
                    <input type="text" readOnly value={referralLink} className="w-full bg-transparent text-gray-300 font-mono text-sm p-2" />
                    <ActionButton onClick={handleCopyLink} className="w-full sm:w-auto flex-shrink-0">
                        {copied ? '已複製!' : <><Icons.Copy className="w-4 h-4 mr-2" />複製連結</>}
                    </ActionButton>
                </div>
                <div className="mt-4 text-center">
                    <p className="text-gray-400">我賺取的總佣金</p>
                    {isLoading ? <LoadingSpinner size="h-8 w-8" /> : (
                        <p className="text-3xl font-bold text-yellow-400">
                            {formatEther(totalCommission)} $SoulShard
                        </p>
                    )}
                </div>
            </div>

            <div className="card-bg p-6 rounded-xl shadow-lg">
                <h3 className="section-title">設定我的邀請人</h3>
                {isLoading ? <LoadingSpinner /> : (
                    hasReferrer ? (
                        <div>
                            <p className="text-gray-400">您目前的邀請人是:</p>
                            <p className="font-mono text-lg text-green-400 bg-black/20 p-2 rounded break-all">{currentReferrer}</p>
                            <p className="text-xs text-gray-500 mt-2">注意：邀請人一經設定，便無法更改。</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm text-gray-400 mb-4">如果您是透過好友的連結來到這裡，請在此輸入他的錢包地址以綁定邀請關係。此操作只能進行一次。</p>
                            <div className="flex flex-col sm:flex-row items-center gap-2">
                                <input type="text" value={referrerInput} onChange={(e) => setReferrerInput(e.target.value)} placeholder="貼上邀請人的錢包地址" className="w-full p-2 border rounded-lg bg-gray-800 border-gray-600 text-white font-mono" />
                                <ActionButton onClick={handleSetReferrer} isLoading={isSettingReferrer} disabled={!isAddress(referrerInput)} className="w-full sm:w-auto flex-shrink-0">確認綁定</ActionButton>
                            </div>
                        </div>
                    )
                )}
            </div>
        </section>
    );
};

export default ReferralPage;
