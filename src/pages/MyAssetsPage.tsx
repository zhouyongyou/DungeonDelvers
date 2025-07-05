import React, { useState, useMemo, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllOwnedNfts } from '../api/nfts';
import { NftCard } from '../components/ui/NftCard';
import { Modal } from '../components/ui/Modal';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { getContract } from '../config/contracts';
import { useAppToast } from '../hooks/useAppToast';
import { useTransactionStore } from '../stores/useTransactionStore';
import type { Page } from '../types/page';
import type { AnyNft, HeroNft, RelicNft, NftType, PartyNft } from '../types/nft';
import { Icons } from '../components/ui/icons';
import { formatEther } from 'viem';

// =================================================================
// Section: TeamBuilder 子元件
// =================================================================

interface TeamBuilderProps {
  heroes: HeroNft[];
  relics: RelicNft[];
  onCreateParty: (heroIds: bigint[], relicIds: bigint[]) => void;
  isCreating: boolean;
  platformFee?: bigint;
}

const TeamBuilder: React.FC<TeamBuilderProps> = ({ heroes, relics, onCreateParty, isCreating, platformFee = 0n }) => {
    const [selectedHeroes, setSelectedHeroes] = useState<bigint[]>([]);
    const [selectedRelics, setSelectedRelics] = useState<bigint[]>([]);

    const toggleSelection = (id: bigint, type: 'hero' | 'relic') => {
        const list = type === 'hero' ? selectedHeroes : selectedRelics;
        const setList = type === 'hero' ? setSelectedHeroes : setSelectedRelics;
        const limit = 5; // Both hero and relic have a limit of 5

        if (list.includes(id)) {
            setList(list.filter(i => i !== id));
        } else if (list.length < limit) {
            setList([...list, id]);
        }
    };

    const { totalPower, totalCapacity } = useMemo(() => {
        const power = selectedHeroes.reduce((acc, id) => {
            const hero = heroes.find(h => h.id === id);
            return acc + (hero ? hero.power : 0);
        }, 0);
        const capacity = selectedRelics.reduce((acc, id) => {
            const relic = relics.find(r => r.id === id);
            return acc + (relic ? relic.capacity : 0);
        }, 0);
        return { totalPower: power, totalCapacity: capacity };
    }, [selectedHeroes, selectedRelics, heroes, relics]);

    const canCreate = selectedHeroes.length > 0 && selectedRelics.length > 0 && selectedHeroes.length <= totalCapacity;

    return (
        <div className="card-bg p-6 rounded-2xl shadow-xl">
            <h3 className="section-title">創建新隊伍</h3>
            <p className="text-sm text-gray-400 mb-4">選擇英雄和聖物來組建你的冒險隊伍。隊伍的英雄數量不能超過聖物的總容量。</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                {/* 英雄選擇區 */}
                <div>
                    <h4 className="font-semibold text-lg mb-2 text-white">選擇英雄 ({selectedHeroes.length})</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 bg-black/20 p-2 rounded-lg min-h-[100px]">
                        {heroes.map(hero => (
                            <NftCard 
                                key={`select-${hero.id}`} 
                                nft={hero} 
                                onSelect={() => toggleSelection(hero.id, 'hero')} 
                                isSelected={selectedHeroes.includes(hero.id)} 
                            />
                        ))}
                         {heroes.length === 0 && <div className="col-span-full"><EmptyState message="沒有可用的英雄" /></div>}
                    </div>
                </div>
                {/* 聖物選擇區 */}
                <div>
                    <h4 className="font-semibold text-lg mb-2 text-white">選擇聖物 ({selectedRelics.length})</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 bg-black/20 p-2 rounded-lg min-h-[100px]">
                        {relics.map(relic => (
                            <NftCard 
                                key={`select-${relic.id}`} 
                                nft={relic} 
                                onSelect={() => toggleSelection(relic.id, 'relic')} 
                                isSelected={selectedRelics.includes(relic.id)} 
                            />
                        ))}
                        {relics.length === 0 && <div className="col-span-full"><EmptyState message="沒有可用的聖物" /></div>}
                    </div>
                </div>
            </div>

            {/* 隊伍總結與創建按鈕 */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-900/50 p-4 rounded-lg">
                <div className="flex gap-6 text-center">
                    <div>
                        <p className="text-sm text-gray-400">總戰力</p>
                        <p className="text-2xl font-bold text-indigo-400">{totalPower}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-400">英雄/容量</p>
                        <p className={`text-2xl font-bold ${selectedHeroes.length > totalCapacity ? 'text-red-500' : 'text-teal-400'}`}>
                            {selectedHeroes.length}/{totalCapacity}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-center sm:items-end">
                    <ActionButton 
                        onClick={() => onCreateParty(selectedHeroes, selectedRelics)} 
                        isLoading={isCreating}
                        disabled={!canCreate || isCreating}
                        className="w-full sm:w-48 h-12 mt-4 sm:mt-0"
                    >
                        創建隊伍
                    </ActionButton>
                    <p className="text-xs text-gray-500 mt-1">費用: {formatEther(platformFee)} BNB</p>
                </div>
            </div>
        </div>
    );
};

// =================================================================
// Section: NftGrid 子元件 (保持不變)
// =================================================================

interface NftGridProps {
    nfts: AnyNft[];
    onDisband?: (id: bigint) => void;
}

const NftGrid: React.FC<NftGridProps> = ({ nfts, onDisband }) => {
    if (nfts.length === 0) {
        return <EmptyState message="這裡空空如也..." />;
    }
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {nfts.map(nft => <NftCard key={nft.id} nft={nft} onDisband={onDisband} />)}
        </div>
    );
};

// =================================================================
// Section: MyAssetsPage 主元件
// =================================================================

const MyAssetsPage: React.FC<{ setActivePage: (page: Page) => void }> = () => {
    const { address, chainId } = useAccount();
    const { showToast } = useAppToast();
    const { addTransaction } = useTransactionStore();

    const [filter, setFilter] = useState<NftType>('party');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [partyToDisband, setPartyToDisband] = useState<bigint | null>(null);

    const heroContract = getContract(chainId, 'hero');
    const relicContract = getContract(chainId, 'relic');
    const partyContract = getContract(chainId, 'party');

    const { writeContractAsync, isPending: isTxPending } = useWriteContract();

    const { data: nfts, isLoading } = useQuery({
        queryKey: ['ownedNfts', address, chainId],
        queryFn: () => fetchAllOwnedNfts(address!, chainId!),
        enabled: !!address && !!chainId,
    });
    
    // 從 Party 合約讀取平台費用
    const { data: platformFee } = useReadContract({
        ...partyContract,
        functionName: 'platformFee',
        query: { enabled: !!partyContract }
    });

    const filteredNfts = useMemo(() => {
        if (!nfts) return [];
        switch (filter) {
            case 'hero': return nfts.heroes;
            case 'relic': return nfts.relics;
            case 'party': return nfts.parties;
            case 'vip': return nfts.vipCards;
            default: return [];
        }
    }, [filter, nfts]);

    const handleCreateParty = async (heroIds: bigint[], relicIds: bigint[]) => {
        if (!partyContract || !heroContract || !relicContract || !address) return;
        
        try {
            // 檢查並請求授權
            const isHeroApproved = await new (window as any).ethers.Contract(heroContract.address, heroContract.abi, new (window as any).ethers.providers.Web3Provider(window.ethereum).getSigner()).isApprovedForAll(address, partyContract.address);
            if (!isHeroApproved) {
                showToast('需要授權英雄合約', 'info');
                const approveHeroHash = await writeContractAsync({ ...heroContract, functionName: 'setApprovalForAll', args: [partyContract.address, true] });
                addTransaction({ hash: approveHeroHash, description: '授權隊伍合約使用英雄' });
                await new (window as any).ethers.providers.Web3Provider(window.ethereum).waitForTransaction(approveHeroHash);
                showToast('英雄授權成功！', 'success');
            }

            const isRelicApproved = await new (window as any).ethers.Contract(relicContract.address, relicContract.abi, new (window as any).ethers.providers.Web3Provider(window.ethereum).getSigner()).isApprovedForAll(address, partyContract.address);
            if (!isRelicApproved) {
                showToast('需要授權聖物合約', 'info');
                const approveRelicHash = await writeContractAsync({ ...relicContract, functionName: 'setApprovalForAll', args: [partyContract.address, true] });
                addTransaction({ hash: approveRelicHash, description: '授權隊伍合約使用聖物' });
                await new (window as any).ethers.providers.Web3Provider(window.ethereum).waitForTransaction(approveRelicHash);
                showToast('聖物授權成功！', 'success');
            }

            // 執行創建
            const hash = await writeContractAsync({
                ...partyContract,
                functionName: 'createParty',
                args: [heroIds, relicIds],
                value: platformFee, // 【核心修改】附加平台費用
            });
            addTransaction({ hash, description: `創建新隊伍` });

        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "創建隊伍失敗", "error");
            }
        }
    };
    
    const handleDisbandParty = async () => {
        if (!partyContract || partyToDisband === null) return;
        try {
            const hash = await writeContractAsync({
                ...partyContract,
                functionName: 'disbandParty',
                args: [partyToDisband],
            });
            addTransaction({ hash, description: `解散隊伍 #${partyToDisband.toString()}` });
        } catch (e: any) {
            if (!e.message.includes('User rejected the request')) {
                showToast(e.shortMessage || "解散隊伍失敗", "error");
            }
        } finally {
            setIsModalOpen(false);
            setPartyToDisband(null);
        }
    };

    const openDisbandModal = (id: bigint) => {
        setPartyToDisband(id);
        setIsModalOpen(true);
    };

    const filterOptions: { key: NftType; label: string }[] = [
        { key: 'party', label: '我的隊伍' },
        { key: 'hero', label: '我的英雄' },
        { key: 'relic', label: '我的聖物' },
        { key: 'vip', label: '我的VIP卡' },
    ];

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
    }

    return (
        <section className="space-y-8">
            <h2 className="page-title">我的資產與隊伍</h2>
            
            <TeamBuilder 
                heroes={nfts?.heroes.filter(h => !(nfts.parties.flatMap(p => p.heroIds) as bigint[]).includes(h.id)) ?? []} 
                relics={nfts?.relics.filter(r => !(nfts.parties.flatMap(p => p.relicIds) as bigint[]).includes(r.id)) ?? []}
                onCreateParty={handleCreateParty}
                isCreating={isTxPending}
                platformFee={platformFee}
            />

            <div className="card-bg p-6 rounded-2xl shadow-xl">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                    <h3 className="section-title">我的收藏</h3>
                    <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-lg mt-2 sm:mt-0">
                        {filterOptions.map(({ key, label }) => (
                            <button 
                                key={key}
                                onClick={() => setFilter(key)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${filter === key ? 'bg-indigo-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700/50'}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <NftGrid nfts={filteredNfts} onDisband={openDisbandModal} />
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleDisbandParty}
                title="確認解散隊伍"
                confirmText="確認解散"
                isConfirming={isTxPending}
                confirmVariant="danger"
            >
                <p>您確定要解散隊伍 #{partyToDisband?.toString()} 嗎？</p>
                <p className="mt-2 text-sm text-yellow-500">解散後，隊伍中的所有英雄和聖物將會返回您的收藏，但隊伍本身將被銷毀。</p>
            </Modal>
        </section>
    );
};

export default MyAssetsPage;
