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

// 查詢特定 ID 的隊伍 - 只查詢真正靜態的基本信息
const GET_PARTY_BY_ID_QUERY = `
  query GetPartyById($id: ID!) {
    party(id: $id) {
      id
      tokenId
      owner { id }
      totalPower
      totalCapacity
      partyRarity
    }
  }
`;

// 通用的 GraphQL 請求函式
const fetchFromGraph = async (query: string, variables: Record<string, unknown>) => {
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
    const inputId = `explorer-${title.replace(/\s+/g, '-').toLowerCase()}`;
    
    return (
        <div className="card-bg p-6 rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-gray-200 mb-4">{title}</h3>
            <div className="flex gap-2 mb-4">
                <div className="flex-1">
                    <label htmlFor={inputId} className="sr-only">
                        {inputPlaceholder}
                    </label>
                    <input
                        id={inputId}
                        name={inputId}
                        type={inputType}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        placeholder={inputPlaceholder}
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none h-10 bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-400"
                        min={inputType === 'number' ? "0" : undefined}
                    />
                </div>
                <ActionButton onClick={() => onQuery(inputValue)} className="px-6 py-2 rounded-lg whitespace-nowrap w-24 h-10">查詢</ActionButton>
            </div>
            <div className="mt-4 p-4 bg-gray-800/50 rounded-md min-h-[100px] text-sm space-y-2">
                {isLoading ? <div className="flex justify-center items-center h-full"><LoadingSpinner size="h-6 w-6" color="border-gray-500" /></div> : children}
            </div>
        </div>
    );
};

// 添加玩家基本資料查詢 - 修正字段名稱
const GET_PLAYER_BASIC_INFO_QUERY = `
  query GetPlayerBasicInfo($address: ID!) {
    player(id: $address) {
      id
      heros {
        id
        tokenId
        rarity
        power
      }
      relics {
        id
        tokenId
        rarity
        capacity
      }
      parties {
        id
        tokenId
        totalPower
        totalCapacity
        partyRarity
      }
    }
  }
`;

const PlayerSearchQuery: React.FC = () => {
    const [submittedAddress, setSubmittedAddress] = useState<string | null>(null);
    
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['explorer', 'player', submittedAddress],
        queryFn: async () => {
            if (!submittedAddress) return null;
            const result = await fetchFromGraph(GET_PLAYER_BASIC_INFO_QUERY, { address: submittedAddress.toLowerCase() });
            return result.player;
        },
        enabled: !!submittedAddress,
    });
    
    const handleQuery = (address: string) => {
        if (isAddress(address)) {
            setSubmittedAddress(address);
        } else {
            setSubmittedAddress(null);
        }
    };
    
    const renderResult = () => {
        if (!submittedAddress) return <p className="text-gray-500">請輸入玩家地址進行查詢。</p>;
        if (!isAddress(submittedAddress)) return <p className="text-red-500">無效的錢包地址，請重新輸入。</p>;
        if (isError) {
            const errorMessage = (error as Error).message;
            // 檢查是否是 GraphQL schema 錯誤
            if (errorMessage.includes('no field')) {
                return <p className="text-yellow-500">⚠️ 子圖正在同步新合約，暫時無法查詢玩家資料。請稍後再試。</p>;
            }
            return <p className="text-red-500">查詢失敗: {errorMessage}</p>;
        }
        if (!data) return <p className="text-yellow-500">查無此玩家的資料，可能尚未參與遊戲。</p>;
        
        const totalHeroPower = data.heros?.reduce((sum: number, hero: any) => sum + Number(hero.power), 0) || 0;
        const totalRelicCapacity = data.relics?.reduce((sum: number, relic: any) => sum + Number(relic.capacity), 0) || 0;
        const totalPartyPower = data.parties?.reduce((sum: number, party: any) => sum + Number(party.totalPower), 0) || 0;
        
        return (
            <>
                <p><b>玩家地址:</b> <span className="font-mono text-xs break-all">{data.id}</span></p>
                <p><b>擁有英雄:</b> {data.heros?.length || 0} 個 {totalHeroPower > 0 && `(總戰力: ${totalHeroPower})`}</p>
                <p><b>擁有聖物:</b> {data.relics?.length || 0} 個 {totalRelicCapacity > 0 && `(總容量: ${totalRelicCapacity})`}</p>
                <p><b>擁有隊伍:</b> {data.parties?.length || 0} 個 {totalPartyPower > 0 && `(總戰力: ${totalPartyPower})`}</p>
                
                {data.heros && data.heros.length > 0 && (
                    <div className="mt-2">
                        <p><b>英雄列表:</b></p>
                        <div className="text-xs text-gray-400 ml-2">
                            {data.heros.slice(0, 5).map((hero: any) => (
                                <div key={hero.tokenId}>
                                    #{hero.tokenId} - {hero.rarity}★ ({hero.power}戰力)
                                </div>
                            ))}
                            {data.heros.length > 5 && <div>...還有 {data.heros.length - 5} 個英雄</div>}
                        </div>
                    </div>
                )}
                
                <div className="mt-2">
                    <button
                        onClick={() => window.location.hash = `#/profile?address=${submittedAddress}`}
                        className="text-blue-400 hover:text-blue-300 text-sm underline"
                    >
                        查看完整檔案 →
                    </button>
                </div>
            </>
        );
    };
    
    return (
        <QuerySection title="玩家檔案搜尋" inputType="text" inputPlaceholder="輸入玩家地址" onQuery={handleQuery} isLoading={isLoading}>
            {renderResult()}
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
        if (id && /^\d+$/.test(id)) {
            const numId = parseInt(id, 10);
            if (numId >= 0) {
                setSubmittedId(id);
            } else {
                setSubmittedId(null);
            }
        } else {
            setSubmittedId(null);
        }
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
                    {/* 🎯 移除不可靠的數據顯示 */}
                    <p className="text-gray-500 text-xs mt-2">
                        ⚠️ 注意：疲勞度、儲備、獎勵、英雄/聖物列表需要從實時合約讀取，子圖只記錄靜態的鑄造信息
                    </p>
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
