import React from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { fetchAllOwnedNfts } from '../api/nfts';
import { getContract } from '../config/contracts';
import { NftCard } from '../components/ui/NftCard';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import type { VipNft } from '../types/nft';
import { Icons } from '../components/ui/icons';

// =================================================================
// Section: VipPage 主元件
// =================================================================

const VipPage: React.FC = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();

    const vipStakingContract = getContract(chainId, 'vipStaking');
    const { writeContractAsync, isPending: isTxPending } = useWriteContract();

    // 1. 獲取玩家所有擁有的 VIP 卡
    const { data: nfts, isLoading: isLoadingNfts } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => fetchAllOwnedNfts(address!, chainId!),
        enabled: !!address && !!chainId,
    });

    // 2. 檢查玩家當前的質押狀態
    const { data: userStake, isLoading: isLoadingStake, refetch: refetchStake } = useReadContract({
        ...vipStakingContract,
        functionName: 'userStakes',
        args: [address!],
        query: { enabled: !!address && !!vipStakingContract },
    });

    const stakedVipId = useMemo(() => (userStake && userStake[0] > 0n ? userStake[0] : null), [userStake]);
    const stakedVip = useMemo(() => {
        if (!stakedVipId || !nfts?.vipCards) return null;
        return nfts.vipCards.find(vip => vip.id === stakedVipId) ?? null;
    }, [stakedVipId, nfts?.vipCards]);

    const availableVips = useMemo(() => {
        if (!nfts?.vipCards) return [];
        return nfts.vipCards.filter(vip => vip.id !== stakedVipId);
    }, [nfts?.vipCards, stakedVipId]);

    const handleStake = async (tokenId: bigint) => {
        if (!vipStakingContract) return;
        try {
            const hash = await writeContractAsync({
                ...vipStakingContract,
                functionName: 'stake',
                args: [tokenId],
            });
            addTransaction({ hash, description: `質押 VIP 卡 #${tokenId}` });
            setTimeout(() => refetchStake(), 2000);
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "質押失敗", "error");
            }
        }
    };

    const handleUnstake = async () => {
        if (!vipStakingContract) return;
        try {
            const hash = await writeContractAsync({
                ...vipStakingContract,
                functionName: 'unstake',
                args: [],
            });
            addTransaction({ hash, description: `取消質押 VIP 卡` });
            setTimeout(() => refetchStake(), 2000);
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "取消質押失敗", "error");
            }
        }
    };

    const isLoading = isLoadingNfts || isLoadingStake;

    return (
        <section className="space-y-8">
            <h2 className="page-title">VIP 質押中心</h2>
            <p className="text-center text-gray-400 max-w-2xl mx-auto -mt-4">
                質押您的 VIP 卡以獲得全域的遠征成功率加成。加成效果取決於您質押的 VIP 卡等級。
            </p>

            {/* 質押狀態區 */}
            <div className="card-bg p-6 rounded-2xl flex flex-col items-center">
                <h3 className="section-title">當前質押狀態</h3>
                <div className="w-48 h-64 my-4 bg-gray-900/50 rounded-xl flex items-center justify-center border-2 border-dashed border-yellow-500/50">
                    {isLoading ? <LoadingSpinner /> : 
                     stakedVip ? <NftCard nft={stakedVip} /> : <p className="text-gray-500">無質押</p>
                    }
                </div>
                {stakedVip && (
                    <p className="mb-4 text-lg text-green-400 font-semibold">
                        遠征成功率 +{stakedVip.level}%
                    </p>
                )}
                <ActionButton 
                    onClick={handleUnstake} 
                    isLoading={isTxPending} 
                    disabled={!stakedVip || isTxPending}
                    className="w-48 h-12"
                    confirmVariant="danger"
                >
                    取消質押
                </ActionButton>
            </div>

            {/* 可用 VIP 卡列表 */}
            <div className="card-bg p-6 rounded-2xl">
                <h3 className="section-title">我擁有的 VIP 卡</h3>
                {isLoading ? <div className="flex justify-center"><LoadingSpinner /></div> :
                 availableVips.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {availableVips.map(vip => (
                            <div key={vip.id} className="text-center space-y-2">
                                <NftCard nft={vip} />
                                <ActionButton 
                                    onClick={() => handleStake(vip.id)}
                                    isLoading={isTxPending}
                                    disabled={isTxPending}
                                    className="w-full h-9 text-sm"
                                >
                                    質押
                                </ActionButton>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState message="沒有可用的 VIP 卡可供質押。" />
                )}
            </div>
        </section>
    );
};

export default VipPage;
