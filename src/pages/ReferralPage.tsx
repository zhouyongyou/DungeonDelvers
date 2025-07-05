// src/pages/ReferralPage.tsx (新檔案)

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { type Address } from 'viem';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import { Icons } from '../components/ui/icons';

const ReferralPage: React.FC = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();
    const [referrerInput, setReferrerInput] = useState('');
    const [copied, setCopied] = useState(false);

    const playerVaultContract = getContract(chainId, 'playerVault');

    const { data: userReferrer, isLoading: isLoadingReferrer, refetch } = useReadContract({
        ...playerVaultContract,
        functionName: 'referrers',
        args: [address!],
        query: { enabled: !!address && !!playerVaultContract },
    });

    const { writeContractAsync, isPending } = useWriteContract();

    const myReferralLink = `${window.location.origin}${window.location.pathname}#/dashboard?ref=${address}`;

    const handleSetReferrer = async () => {
        if (!referrerInput || !playerVaultContract) return;
        try {
            const hash = await writeContractAsync({
                ...playerVaultContract,
                functionName: 'setReferrer',
                args: [referrerInput as Address],
            });
            addTransaction({ hash, description: `設定邀請人` });
            refetch();
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "設定失敗", "error");
            }
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(myReferralLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    
    // 【新增】檢查 URL 中是否有邀請碼，並自動填入
    useEffect(() => {
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const ref = params.get('ref');
        if (ref) {
            setReferrerInput(ref);
        }
    }, []);

    return (
        <section className="space-y-8 max-w-2xl mx-auto">
            <h2 className="page-title">邀請中心</h2>

            <div className="card-bg p-6 rounded-2xl shadow-lg">
                <h3 className="section-title">我的邀請資訊</h3>
                <p className="text-sm text-gray-400 mb-4">邀請朋友加入 Dungeon Delvers，當他們從金庫提領獎勵時，您將獲得佣金作為回報！</p>
                <div className="flex items-center gap-2 p-2 bg-gray-900/50 rounded-lg">
                    <input
                        type="text"
                        readOnly
                        value={myReferralLink}
                        className="w-full bg-transparent border-none text-gray-300 text-sm"
                    />
                    <button onClick={handleCopyLink} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-md text-sm whitespace-nowrap">
                        {copied ? '已複製!' : '複製連結'}
                    </button>
                </div>
            </div>

            <div className="card-bg p-6 rounded-2xl shadow-lg">
                <h3 className="section-title">綁定邀請人</h3>
                {isLoadingReferrer ? (
                    <LoadingSpinner />
                ) : userReferrer && userReferrer !== '0x0000000000000000000000000000000000000000' ? (
                    <div>
                        <p className="text-gray-400">您已綁定邀請人：</p>
                        <p className="font-mono text-green-400 bg-black/20 p-2 rounded break-all">{userReferrer}</p>
                        <p className="text-xs text-gray-500 mt-2">邀請關係一旦設定便無法更改。</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">如果您是經由他人邀請加入，請在此處輸入他們的錢包地址。此操作只能進行一次。</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={referrerInput}
                                onChange={(e) => setReferrerInput(e.target.value)}
                                placeholder="貼上邀請人的錢包地址"
                                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none h-10 bg-gray-800 border-gray-700"
                            />
                            <ActionButton onClick={handleSetReferrer} isLoading={isPending} className="h-10 w-28">
                                綁定
                            </ActionButton>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default ReferralPage;