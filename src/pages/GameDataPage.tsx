// src/pages/GameDataPage.tsx - 遊戲數據與排行榜頁面

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatEther, isAddress } from 'viem';
import { Leaderboards } from '../components/leaderboards';
import { THE_GRAPH_API_URL, isGraphConfigured } from '../config/graphConfig';

// =================================================================
// Section: GraphQL 查詢與數據獲取
// =================================================================

// 檢查 Graph 是否已配置
if (!isGraphConfigured()) {
    console.warn('[GameDataPage] The Graph is not properly configured');
}

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

// 查詢特定 ID 的隊伍
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

// 查詢玩家基本資料
const GET_PLAYER_BASIC_INFO_QUERY = `
  query GetPlayerBasicInfo($address: ID!) {
    player(id: $address) {
      id
      heros(first: 1000) {
        id
        tokenId
        rarity
        power
      }
      relics(first: 1000) {
        id
        tokenId
        rarity
        capacity
      }
      parties(first: 1000) {
        id
        tokenId
        totalPower
        totalCapacity
        partyRarity
      }
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

const QuerySection: React.FC<QuerySectionProps> = ({ 
  title, 
  inputType, 
  inputPlaceholder, 
  onQuery, 
  isLoading = false, 
  children 
}) => {
    const [inputValue, setInputValue] = useState('');
    const inputId = `gamedata-${title.replace(/\s+/g, '-').toLowerCase()}`;
    
    return (
        <div className="bg-gray-800/50 backdrop-blur-sm p-4 sm:p-5 md:p-6 rounded-xl shadow-md border border-gray-700/50">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-200 mb-3 sm:mb-4">{title}</h3>
            <div className="flex gap-2 mb-3 sm:mb-4">
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
                        className="w-full px-2 sm:px-3 py-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none h-8 sm:h-10 text-sm sm:text-base bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-400"
                        min={inputType === 'number' ? "0" : undefined}
                    />
                </div>
                <ActionButton 
                    onClick={() => onQuery(inputValue)} 
                    className="px-3 sm:px-6 py-2 rounded-lg whitespace-nowrap w-16 sm:w-24 h-8 sm:h-10 text-sm sm:text-base"
                >
                    查詢
                </ActionButton>
            </div>
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-900/50 rounded-md min-h-[80px] sm:min-h-[100px] text-xs sm:text-sm space-y-2">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <LoadingSpinner size="h-6 w-6" />
                    </div>
                ) : children}
            </div>
        </div>
    );
};

// =================================================================
// Section: 查詢組件
// =================================================================

// 英雄查詢組件
const HeroQuery: React.FC = () => {
    const [submittedId, setSubmittedId] = useState<string | null>(null);
    
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['gamedata', 'hero', submittedId],
        queryFn: async () => {
            if (!submittedId) return null;
            const result = await fetchFromGraph(GET_HERO_BY_ID_QUERY, { id: submittedId });
            return result.hero;
        },
        enabled: !!submittedId,
    });
    
    const renderResult = () => {
        if (!submittedId) return <p className="text-gray-500">請輸入英雄 ID 進行查詢。</p>;
        if (isError) return <p className="text-red-500">查詢失敗: {(error as Error).message}</p>;
        if (!data) return <p className="text-yellow-500">查無此英雄，請確認 ID 是否正確。</p>;
        
        const rarityNames = ["", "Common", "Uncommon", "Rare", "Epic", "Legendary"];
        
        return (
            <div className="space-y-2">
                <p><span className="text-gray-400">Token ID:</span> <span className="text-white">{data.tokenId}</span></p>
                <p><span className="text-gray-400">擁有者:</span> <span className="text-blue-400 font-mono text-xs">{data.owner.id}</span></p>
                <p><span className="text-gray-400">稀有度:</span> <span className="text-purple-400">{rarityNames[data.rarity] || data.rarity}</span></p>
                <p><span className="text-gray-400">戰力:</span> <span className="text-green-400">{data.power}</span></p>
            </div>
        );
    };
    
    return (
        <QuerySection
            title="🗡️ 英雄查詢"
            inputType="number"
            inputPlaceholder="輸入英雄 Token ID"
            onQuery={setSubmittedId}
            isLoading={isLoading}
        >
            {renderResult()}
        </QuerySection>
    );
};

// 聖物查詢組件
const RelicQuery: React.FC = () => {
    const [submittedId, setSubmittedId] = useState<string | null>(null);
    
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['gamedata', 'relic', submittedId],
        queryFn: async () => {
            if (!submittedId) return null;
            const result = await fetchFromGraph(GET_RELIC_BY_ID_QUERY, { id: submittedId });
            return result.relic;
        },
        enabled: !!submittedId,
    });
    
    const renderResult = () => {
        if (!submittedId) return <p className="text-gray-500">請輸入聖物 ID 進行查詢。</p>;
        if (isError) return <p className="text-red-500">查詢失敗: {(error as Error).message}</p>;
        if (!data) return <p className="text-yellow-500">查無此聖物，請確認 ID 是否正確。</p>;
        
        const rarityNames = ["", "Common", "Uncommon", "Rare", "Epic", "Legendary"];
        
        return (
            <div className="space-y-2">
                <p><span className="text-gray-400">Token ID:</span> <span className="text-white">{data.tokenId}</span></p>
                <p><span className="text-gray-400">擁有者:</span> <span className="text-blue-400 font-mono text-xs">{data.owner.id}</span></p>
                <p><span className="text-gray-400">稀有度:</span> <span className="text-purple-400">{rarityNames[data.rarity] || data.rarity}</span></p>
                <p><span className="text-gray-400">容量:</span> <span className="text-orange-400">{data.capacity}</span></p>
            </div>
        );
    };
    
    return (
        <QuerySection
            title="💎 聖物查詢"
            inputType="number"
            inputPlaceholder="輸入聖物 Token ID"
            onQuery={setSubmittedId}
            isLoading={isLoading}
        >
            {renderResult()}
        </QuerySection>
    );
};

// 隊伍查詢組件
const PartyQuery: React.FC = () => {
    const [submittedId, setSubmittedId] = useState<string | null>(null);
    
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['gamedata', 'party', submittedId],
        queryFn: async () => {
            if (!submittedId) return null;
            const result = await fetchFromGraph(GET_PARTY_BY_ID_QUERY, { id: submittedId });
            return result.party;
        },
        enabled: !!submittedId,
    });
    
    const renderResult = () => {
        if (!submittedId) return <p className="text-gray-500">請輸入隊伍 ID 進行查詢。</p>;
        if (isError) return <p className="text-red-500">查詢失敗: {(error as Error).message}</p>;
        if (!data) return <p className="text-yellow-500">查無此隊伍，請確認 ID 是否正確。</p>;
        
        const rarityNames = ["", "Common", "Uncommon", "Rare", "Epic", "Legendary"];
        
        return (
            <div className="space-y-2">
                <p><span className="text-gray-400">Token ID:</span> <span className="text-white">{data.tokenId}</span></p>
                <p><span className="text-gray-400">擁有者:</span> <span className="text-blue-400 font-mono text-xs">{data.owner.id}</span></p>
                <p><span className="text-gray-400">隊伍稀有度:</span> <span className="text-purple-400">{rarityNames[data.partyRarity] || data.partyRarity}</span></p>
                <p><span className="text-gray-400">總戰力:</span> <span className="text-green-400">{data.totalPower}</span></p>
                <p><span className="text-gray-400">總容量:</span> <span className="text-orange-400">{data.totalCapacity}</span></p>
            </div>
        );
    };
    
    return (
        <QuerySection
            title="⚔️ 隊伍查詢"
            inputType="number"
            inputPlaceholder="輸入隊伍 Token ID"
            onQuery={setSubmittedId}
            isLoading={isLoading}
        >
            {renderResult()}
        </QuerySection>
    );
};

// 玩家查詢組件
const PlayerQuery: React.FC = () => {
    const [submittedAddress, setSubmittedAddress] = useState<string | null>(null);
    
    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ['gamedata', 'player', submittedAddress],
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
            <div className="space-y-2">
                <p><span className="text-gray-400">地址:</span> <span className="text-blue-400 font-mono text-xs">{data.id}</span></p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                    <div className="bg-gray-800/30 p-2 rounded">
                        <p className="text-gray-400 text-xs">英雄數量</p>
                        <p className="text-green-400 font-bold">{data.heros?.length || 0}</p>
                        <p className="text-gray-400 text-xs">總戰力: {totalHeroPower}</p>
                    </div>
                    <div className="bg-gray-800/30 p-2 rounded">
                        <p className="text-gray-400 text-xs">聖物數量</p>
                        <p className="text-orange-400 font-bold">{data.relics?.length || 0}</p>
                        <p className="text-gray-400 text-xs">總容量: {totalRelicCapacity}</p>
                    </div>
                    <div className="bg-gray-800/30 p-2 rounded">
                        <p className="text-gray-400 text-xs">隊伍數量</p>
                        <p className="text-purple-400 font-bold">{data.parties?.length || 0}</p>
                        <p className="text-gray-400 text-xs">總戰力: {totalPartyPower}</p>
                    </div>
                </div>
            </div>
        );
    };
    
    return (
        <QuerySection
            title="👤 玩家查詢"
            inputType="text"
            inputPlaceholder="輸入玩家錢包地址 (0x...)"
            onQuery={handleQuery}
            isLoading={isLoading}
        >
            {renderResult()}
        </QuerySection>
    );
};

// =================================================================
// Section: 主頁面組件
// =================================================================

const GameDataPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'leaderboard' | 'query'>('leaderboard');
    
    const tabs = [
        { id: 'leaderboard', label: '🏆 排行榜', icon: '📊' },
        { id: 'query', label: '🔍 數據查詢', icon: '🔍' }
    ];
    
    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
            {/* 頁面標題 */}
            <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                    遊戲數據中心
                </h1>
                <p className="text-gray-400 text-sm md:text-base">
                    查看排行榜、查詢遊戲數據，探索 Dungeon Delvers 的世界
                </p>
            </div>
            
            {/* 標籤切換 */}
            <div className="flex justify-center mb-8">
                <div className="bg-gray-800/50 rounded-xl p-1 backdrop-blur-sm border border-gray-700/50">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as 'leaderboard' | 'query')}
                            className={`px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium text-sm md:text-base transition-all ${
                                activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                            }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* 內容區域 */}
            <div className="space-y-6">
                {activeTab === 'leaderboard' && (
                    <div>
                        <Leaderboards />
                    </div>
                )}
                
                {activeTab === 'query' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <PlayerQuery />
                        <HeroQuery />
                        <RelicQuery />
                        <PartyQuery />
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameDataPage;