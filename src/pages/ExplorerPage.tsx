// src/pages/ExplorerPage.tsx (The Graph 改造版)

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatEther, isAddress } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContract } from '../config/contracts';

// =================================================================
// Section: GraphQL 查詢與數據獲取
// =================================================================

const THE_GRAPH_API_URL = import.meta.env.VITE_THE_GRAPH_STUDIO_API_URL;

// 查詢特定 ID 的英雄
const GET_HERO_BY_ID_QUERY = `
  query GetHeroById($id: ID!) {
    hero(id: $id) {
      id
      tokenId
      owner { id }
      rarity
      power
    }
  }
`;

// 查詢特定 ID 的聖物
const GET_RELIC_BY_ID_QUERY = `
  query GetRelicById($id: ID!) {
    relic(id: $id) {
      id
      tokenId
      owner { id }
      rarity
      capacity
    }
  }
`;

// 查詢特定 ID 的隊伍及其詳細組成
const GET_PARTY_BY_ID_QUERY = `
  query GetPartyById($id: ID!) {
    party(id: $id) {
      id
      tokenId
      owner { id }
      totalPower
      totalCapacity
      partyRarity
      provisionsRemaining
      cooldownEndsAt
      unclaimedRewards
      fatigueLevel
      heroes {
        id
        tokenId
      }
      relics {
        id
        tokenId
      }
    }
  }
`;

// 通用的 GraphQL 請求函式
const fetchFromGraph = async (query: string, variables: Record<string, any>) => {
    if (!THE_GRAPH_API_URL) throw new Error("The Graph API URL is not configured.");
    const response = await fetch(THE_GRAPH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) throw new Error('GraphQL Network response was not ok');
    const { data, errors } = await response.json();
    if (errors) throw new Error(`GraphQL errors: ${JSON.stringify(errors)}`);
    return data;
};

// =================================================================
// Section: 可重用的 UI 子元件
// =================================================================

interface QuerySectionProps {
  title: string;
  inputType: 'number' | 'text';
  inputPlaceholder: string;
  onQuery: (value: string) => void;
  isLoading?: boolean;
  children: React.ReactNode;
}

const QuerySection: React.FC<QuerySectionProps> = ({ title, inputType, inputPlaceholder, onQuery, isLoading = false, children }) => {
    const [inputValue, setInputValue] = useState('');
    return (
        <div className="card-bg p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-gray-200 mb-4">{title}</h3>
            <div className="flex gap-2 mb-4">
                <input
                    id={`explorer-${title.replace(/\s+/g, '-')}`}
                    name={`explorer-${title.replace(/\s+/g, '-')}`}
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

const PlayerSearchQuery: React.FC = () => {
    const [message, setMessage] = useState('請輸入玩家地址進行查詢。');
    const handleQuery = (address: string) => {
        if (isAddress(address)) {
            window.location.hash = `#/profile?address=${address}`;
        } else {
            setMessage('無效的錢包地址，請重新輸入。');
        }
    };
    return (
        <QuerySection title="玩家檔案搜尋" inputType="text" inputPlaceholder="輸入玩家地址" onQuery={handleQuery}>
            <p className="text-gray-500">{message}</p>
        </QuerySection>
    );
};

// =================================================================
// Section: 各類查詢邏輯與顯示 (The Graph 改造版)
// =================================================================

// ★ 核心改造：一個通用的 NFT 查詢元件
const NftQuery: React.FC<{ type: 'hero' | 'relic' | 'party' }> = ({ type }) => {
    useAccount();
    const [submittedId, setSubmittedId] = useState<string | null>(null);

    const contractAddress = getContract(bsc.id, type)?.address;

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['explorer', type, submittedId],
        queryFn: async () => {
            if (!submittedId || !contractAddress) return null;
            const id = `${contractAddress.toLowerCase()}-${submittedId}`;
            const queryMap = {
                hero: GET_HERO_BY_ID_QUERY,
                relic: GET_RELIC_BY_ID_QUERY,
                party: GET_PARTY_BY_ID_QUERY,
            };
            const result = await fetchFromGraph(queryMap[type], { id });
            return result[type];
        },
        enabled: !!submittedId && !!contractAddress,
    });

    const handleQuery = (id: string) => {
        if (id && /^\d+$/.test(id)) setSubmittedId(id);
        else setSubmittedId(null);
    };

    const renderResult = () => {
        if (!submittedId) return <p className="text-gray-500">請輸入 ID 進行查詢。</p>;
        if (isError) return <p className="text-red-500">查詢失敗: {(error as Error).message}</p>;
        if (!data) return <p className="text-red-500">查無此 ID 的資料。</p>;

        return (
            <>
                <p><b>擁有者:</b> <span className="font-mono text-xs break-all">{data.owner?.id}</span></p>
                {type === 'hero' && <><p><b>稀有度:</b> {"★".repeat(data.rarity)}{"☆".repeat(5 - data.rarity)}</p><p><b>戰力:</b> {data.power.toString()}</p></>}
                {type === 'relic' && <><p><b>稀有度:</b> {"★".repeat(data.rarity)}{"☆".repeat(5 - data.rarity)}</p><p><b>容量:</b> {data.capacity.toString()}</p></>}
                {type === 'party' && <>
                    <p><b>隊伍稀有度:</b> {"★".repeat(data.partyRarity)}{"☆".repeat(5 - data.partyRarity)}</p>
                    <p><b>總戰力:</b> {data.totalPower.toString()}</p>
                    <p><b>總容量:</b> {data.totalCapacity.toString()}</p>
                    <p><b>剩餘儲備:</b> {data.provisionsRemaining.toString()}</p>
                    <p><b>疲勞度:</b> {data.fatigueLevel.toString()}</p>
                    <p><b>未領取獎勵:</b> {formatEther(BigInt(data.unclaimedRewards))} $SoulShard</p>
                    <p><b>英雄列表 (ID):</b> {data.heroes?.map((h: any) => h.tokenId).join(', ') || '無'}</p>
                    <p><b>聖物列表 (ID):</b> {data.relics?.map((r: any) => r.tokenId).join(', ') || '無'}</p>
                </>}
            </>
        );
    };

    const title = { hero: '英雄', relic: '聖物', party: '隊伍' }[type];
    return (
        <QuerySection title={`${title}查詢`} inputType="number" inputPlaceholder={`輸入${title} NFT ID`} onQuery={handleQuery} isLoading={isLoading}>
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
          <PlayerSearchQuery />
          <NftQuery type="hero" />
        </div>
        <div className="space-y-8">
          <NftQuery type="party" />
          <NftQuery type="relic" />
        </div>
      </div>
    </section>
  );
};

export default ExplorerPage;
