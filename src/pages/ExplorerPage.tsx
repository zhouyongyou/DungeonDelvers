// src/pages/ExplorerPage.tsx (The Graph 改造版)

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatEther, isAddress } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContract, getContractWithABI } from '../config/contractsWithABI';

// =================================================================
// Section: GraphQL 查詢與數據獲取
// =================================================================

import { THE_GRAPH_API_URL, isGraphConfigured } from '../config/graphConfig';

// 檢查 Graph 是否已配置
if (!isGraphConfigured()) {
    console.warn('[ExplorerPage] The Graph is not properly configured');
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

const PlayerSearchQuery: React.FC = () => {
    const [submittedAddress, setSubmittedAddress] = useState<string | null>(null);
    const [showSyncWarning, setShowSyncWarning] = useState(false);
    
    const { data, isLoading, isError, error, refetch } = useQuery({
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
                {/* 同步提示 */}
                {showSyncWarning && (
                    <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-600/50 rounded text-xs text-yellow-400">
                        ⚠️ 數據可能有延遲，子圖同步需要時間。
                        <button 
                            onClick={() => {
                                refetch();
                                setShowSyncWarning(false);
                            }}
                            className="ml-2 underline hover:text-yellow-300"
                        >
                            重新查詢
                        </button>
                    </div>
                )}
                
                <p><b>玩家地址:</b> <span className="font-mono text-xs break-all">{data.id}</span></p>
                <p><b>擁有英雄:</b> {data.heros?.length || 0} 個 {totalHeroPower > 0 && `(總戰力: ${totalHeroPower})`}</p>
                <p><b>擁有聖物:</b> {data.relics?.length || 0} 個 {totalRelicCapacity > 0 && `(總容量: ${totalRelicCapacity})`}</p>
                <p><b>擁有隊伍:</b> {data.parties?.length || 0} 個 {totalPartyPower > 0 && `(總戰力: ${totalPartyPower})`}</p>
                
                {/* 如果剛鑄造可能沒同步 */}
                {(data.relics?.length === 0 || data.heros?.length === 0) && (
                    <p className="text-xs text-gray-500 mt-2">
                        如果您剛鑄造 NFT，請等待 1-2 分鐘讓子圖同步。
                    </p>
                )}
                
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

    const contractAddress = getContract(type.toUpperCase() as any);

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
        if (!data) {
            // 針對聖物添加特別提示
            if (type === 'relic') {
                return (
                    <div className="space-y-2">
                        <p className="text-red-500">查無此 ID 的資料。</p>
                        <p className="text-yellow-500 text-xs">
                            ⚠️ 注意：子圖可能正在同步聖物數據。如果您剛鑄造聖物，請等待 2-3 分鐘後再試。
                        </p>
                    </div>
                );
            }
            return <p className="text-red-500">查無此 ID 的資料。</p>;
        }

        
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
// Section: 合約地址展示組件
// =================================================================

const ContractAddressSection: React.FC = () => {
  // 從配置文件動態獲取所有合約地址
  const contracts = [
    {
      category: "核心合約",
      items: [
        {
          name: "DungeonCore",
          address: getContract('DUNGEONCORE') || '',
          description: "總機合約，管理所有模組的地址和權限，是整個遊戲的中央控制器"
        },
        {
          name: "Oracle",
          address: getContract('ORACLE') || '',
          description: "價格預言機 V22，自適應 TWAP 機制，永不失敗的價格查詢"
        }
      ]
    },
    {
      category: "NFT 合約",
      items: [
        {
          name: "Hero",
          address: getContract('HERO') || '',
          description: "英雄 NFT (ERC721)，每個英雄有不同的稀有度和戰力值"
        },
        {
          name: "Relic",
          address: getContract('RELIC') || '',
          description: "聖物 NFT (ERC721)，提供容量加成，用於地城探索"
        },
        {
          name: "Party",
          address: getContract('PARTY') || '',
          description: "隊伍 NFT (ERC721)，將英雄和聖物組合成隊伍進行探索"
        }
      ]
    },
    {
      category: "遊戲機制合約",
      items: [
        {
          name: "DungeonMaster",
          address: getContract('DUNGEONMASTER') || '',
          description: "地城探索邏輯 V2，處理隊伍探索、戰鬥和獎勵計算"
        },
        {
          name: "DungeonStorage",
          address: getContract('DUNGEONSTORAGE') || '',
          description: "地城數據存儲，記錄所有地城的狀態和探索記錄"
        },
        {
          name: "AltarOfAscension",
          address: getContract('ALTAROFASCENSION') || '',
          description: "升星祭壇，使用 SOUL 代幣提升英雄和聖物的稀有度"
        }
      ]
    },
    {
      category: "經濟系統合約",
      items: [
        {
          name: "PlayerVault",
          address: getContract('PLAYERVAULT') || '',
          description: "玩家金庫，管理玩家的 SOUL 代幣存取和餘額"
        },
        {
          name: "VIPStaking",
          address: getContract('VIPSTAKING') || '',
          description: "VIP 質押系統，質押 SOUL 獲得 VIP NFT 和特權"
        },
        {
          name: "PlayerProfile",
          address: getContract('PLAYERPROFILE') || '',
          description: "玩家檔案系統，管理經驗值、等級和邀請關係"
        }
      ]
    },
    {
      category: "代幣合約",
      items: [
        {
          name: "SoulShard (SOUL)",
          address: getContract('SOULSHARD') || '',
          description: "遊戲代幣 (ERC20)，用於鑄造、升級和質押等所有遊戲活動"
        },
        {
          name: "USD Token",
          address: getContract('USD') || '',
          description: "測試用 USD 代幣，用於價格計算和測試"
        }
      ]
    },
    {
      category: "相關資源",
      items: [
        {
          name: "Uniswap V3 Pool",
          address: getContract('UNISWAP_POOL') || '',
          description: "SOUL/USD 交易對，提供即時價格數據"
        },
        {
          name: "DungeonMaster Wallet",
          address: getContract('DUNGEONMASTERWALLET') || '',
          description: "遊戲營運錢包，收取平台費用"
        }
      ]
    }
  ];

  return (
    <div className="mt-12 card-bg p-6 rounded-xl shadow-md">
      <h3 className="text-2xl font-bold text-gray-200 mb-6">智能合約地址與說明</h3>
      <div className="space-y-8">
        {contracts.map((category, idx) => (
          <div key={idx}>
            <h4 className="text-lg font-semibold text-indigo-400 mb-3">{category.category}</h4>
            <div className="space-y-3">
              {category.items.map((contract, contractIdx) => (
                <div key={contractIdx} className="bg-gray-800/50 p-4 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-semibold text-gray-200">{contract.name}</h5>
                    <a 
                      href={`https://bscscan.com/address/${contract.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      查看合約
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{contract.description}</p>
                  <p className="font-mono text-xs text-gray-500 break-all">{contract.address}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
        <h4 className="font-semibold text-blue-400 mb-2">遊戲經濟模型</h4>
        <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
          <li>使用 SOUL 代幣作為主要遊戲貨幣</li>
          <li>鑄造 NFT 需要支付 SOUL 代幣和 3% 平台費</li>
          <li>地城探索可獲得 SOUL 獎勵，獎勵根據隊伍戰力和地城難度計算</li>
          <li>升星系統消耗 SOUL 提升 NFT 稀有度和屬性</li>
          <li>VIP 質押系統鎖定 SOUL 獲得特權和加成</li>
          <li>所有價格通過 Oracle 從 Uniswap V3 獲取即時報價</li>
        </ul>
      </div>
    </div>
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
      <ContractAddressSection />
    </section>
  );
};

export default ExplorerPage;
