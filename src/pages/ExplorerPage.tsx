import React, { useState, useMemo } from 'react';
import { useAccount, useReadContracts, useReadContract } from 'wagmi';
import { getContract } from '../config/contracts';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import type { NftType } from '../types/nft';
import { formatEther, type Address } from 'viem';

// =================================================================
// Section: 可重用的查詢元件
// =================================================================

interface QuerySectionProps {
  title: string;
  inputType: 'number' | 'text';
  inputPlaceholder: string;
  onQuery: (id: string) => void;
  isLoading: boolean;
  children: React.ReactNode;
}

const QuerySection: React.FC<QuerySectionProps> = ({ title, inputType, inputPlaceholder, onQuery, isLoading, children }) => {
    const [inputValue, setInputValue] = useState('');

    return (
        <div className="card-bg p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-gray-200 mb-4">{title}</h3>
            <div className="flex gap-2 mb-4">
                <input
                    type={inputType}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder={inputPlaceholder}
                    className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none h-10 bg-gray-800 border-gray-700"
                />
                <ActionButton onClick={() => onQuery(inputValue)} className="px-6 py-2 rounded-lg whitespace-nowrap w-24 h-10">查詢</ActionButton>
            </div>
            <div className="mt-4 p-4 bg-gray-800/50 rounded-md min-h-[100px] text-sm space-y-2">
                {isLoading ? <div className="flex justify-center items-center h-full"><LoadingSpinner size="h-6 w-6" color="border-gray-500" /></div> : children}
            </div>
        </div>
    );
};

// =================================================================
// Section: NFT 查詢邏輯與顯示
// =================================================================

const NftQuery: React.FC<{ type: 'hero' | 'relic' | 'party' }> = ({ type }) => {
    const { chainId } = useAccount();
    const [submittedId, setSubmittedId] = useState<bigint | null>(null);

    const contract = getContract(chainId, type);
    const title = { hero: '英雄', relic: '聖物', party: '隊伍' }[type];

    const contractsToQuery = useMemo(() => {
        if (!submittedId || !contract) return [];
        const { address, abi } = contract;
        const ownerCall = { address, abi, functionName: 'ownerOf', args: [submittedId] };
        
        const functionNameMap = {
            hero: 'getHeroProperties',
            relic: 'getRelicProperties',
            party: 'getPartyComposition'
        };

        return [ownerCall, { address, abi, functionName: functionNameMap[type], args: [submittedId] }];
    }, [submittedId, contract, type]);

    const { data, isLoading, isError, error, refetch } = useReadContracts({
        contracts: contractsToQuery as any,
        query: { enabled: false } // 手動觸發
    });

    const handleQuery = (id: string) => {
        if (id) {
            setSubmittedId(BigInt(id));
            setTimeout(() => refetch(), 100);
        }
    };

    const renderResult = () => {
        if (!submittedId) return <p className="text-gray-500">請輸入 ID 進行查詢。</p>;
        if (isError) return <p className="text-red-500">查詢失敗: {error?.message.split('\n')[0]}</p>;
        if (!data || data.some(d => d.status === 'failure')) return <p className="text-red-500">查詢失敗: ID 可能不存在或網路錯誤。</p>;

        const [ownerResult, propsResult] = data;
        const owner = ownerResult.result as Address;
        const props = propsResult.result as any;

        return (
            <>
                <p><b>擁有者:</b> <span className="font-mono text-xs break-all">{owner}</span></p>
                {type === 'hero' && props && <>
                    <p><b>稀有度:</b> {"★".repeat(props.rarity)}{"☆".repeat(5 - props.rarity)}</p>
                    <p><b>戰力:</b> {props.power.toString()}</p>
                </>}
                {type === 'relic' && props && <>
                    <p><b>稀有度:</b> {"★".repeat(props.rarity)}{"☆".repeat(5 - props.rarity)}</p>
                    <p><b>容量:</b> {props.capacity.toString()}</p>
                </>}
                {type === 'party' && props && <>
                    <p><b>隊伍稀有度:</b> {"★".repeat(props.partyRarity)}{"☆".repeat(5 - props.partyRarity)}</p>
                    <p><b>總戰力:</b> {props.totalPower.toString()}</p>
                    <p><b>總容量:</b> {props.totalCapacity.toString()}</p>
                    <p><b>英雄列表 (ID):</b> {props.heroIds?.join(', ') || '無'}</p>
                    <p><b>聖物列表 (ID):</b> {props.relicIds?.join(', ') || '無'}</p>
                </>}
            </>
        );
    };

    return (
        <QuerySection title={`${title}查詢`} inputType="number" inputPlaceholder={`輸入${title} NFT ID`} onQuery={handleQuery} isLoading={isLoading}>
            {renderResult()}
        </QuerySection>
    );
};


// =================================================================
// Section: 新增的查詢元件
// =================================================================

const PlayerProfileQuery: React.FC = () => {
    const { chainId } = useAccount();
    const [submittedAddress, setSubmittedAddress] = useState<Address | null>(null);
    const contract = getContract(chainId, 'playerProfile');

    const { data, isLoading, isError, refetch } = useReadContracts({
        contracts: [
            { ...contract, functionName: 'profileTokenOf', args: [submittedAddress!] },
            { ...contract, functionName: 'getLevel', args: [submittedAddress!] },
        ],
        query: { enabled: false }
    });

    const handleQuery = (address: string) => {
        if (address) {
            setSubmittedAddress(address as Address);
            setTimeout(() => refetch(), 100);
        }
    };

    const renderResult = () => {
        if (!submittedAddress) return <p className="text-gray-500">請輸入玩家地址查詢。</p>;
        if (isError || !data || data.some(d => d.status === 'failure')) return <p className="text-red-500">查詢失敗或該玩家無檔案。</p>;
        
        const [tokenId, level] = data.map(d => d.result);
        return (
            <>
                <p><b>檔案 SBT ID:</b> {tokenId?.toString()}</p>
                <p><b>玩家等級:</b> {level?.toString()}</p>
            </>
        );
    };

    return (
        <QuerySection title="玩家檔案查詢" inputType="text" inputPlaceholder="輸入玩家地址" onQuery={handleQuery} isLoading={isLoading}>
            {renderResult()}
        </QuerySection>
    );
};

const PartyStatusQuery: React.FC = () => {
    const { chainId } = useAccount();
    const [submittedId, setSubmittedId] = useState<bigint | null>(null);
    const contract = getContract(chainId, 'dungeonStorage');

    const { data, isLoading, isError, refetch } = useReadContract({
        ...contract,
        functionName: 'getPartyStatus',
        args: [submittedId!],
        query: { enabled: false }
    });
    
    const handleQuery = (id: string) => {
        if (id) {
            setSubmittedId(BigInt(id));
            setTimeout(() => refetch(), 100);
        }
    };

    const renderResult = () => {
        if (!submittedId) return <p className="text-gray-500">請輸入隊伍 ID 查詢。</p>;
        if (isError || !data) return <p className="text-red-500">查詢失敗或隊伍不存在。</p>;
        
        const [provisions, cooldown, rewards, fatigue] = data as readonly [bigint, bigint, bigint, number];
        const cooldownDate = new Date(Number(cooldown) * 1000);

        return (
            <>
                <p><b>剩餘儲備:</b> {provisions.toString()}</p>
                <p><b>疲勞度:</b> {fatigue.toString()}</p>
                <p><b>未領取獎勵:</b> {formatEther(rewards)} $SoulShard</p>
                <p><b>冷卻結束於:</b> {cooldown > 0 ? cooldownDate.toLocaleString() : '未在冷卻中'}</p>
            </>
        );
    };

    return (
        <QuerySection title="隊伍狀態查詢" inputType="number" inputPlaceholder="輸入隊伍 NFT ID" onQuery={handleQuery} isLoading={isLoading}>
            {renderResult()}
        </QuerySection>
    );
};

// =================================================================
// Section: ExplorerPage 主頁面
// =================================================================

const ExplorerPage: React.FC = () => {
  return (
    <section>
      <h2 className="page-title">遊戲數據瀏覽器</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8">
          <PartyStatusQuery />
          <NftQuery type="party" />
          <NftQuery type="hero" />
        </div>
        <div className="space-y-8">
          <PlayerProfileQuery />
          <NftQuery type="relic" />
        </div>
      </div>
    </section>
  );
};

export default ExplorerPage;
