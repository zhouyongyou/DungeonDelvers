// src/components/mint/MintPagePreviewResponsive.tsx
// 響應式優化的鑄造頁預覽

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { THE_GRAPH_API_URL } from '../../config/graphConfig';
import { graphQLRateLimiter } from '../../utils/rateLimiter';
import { logger } from '../../utils/logger';
import { BATCH_TIERS } from '../../utils/batchMintConfig';
import { FeaturedNftsGallery } from './FeaturedNftsGallery';
import { PreviewFooterNote } from '../common/PreviewFooterNote';
import { previewResponsiveClasses as rc } from '../../hooks/useResponsive';

const GET_MINT_STATS_QUERY = `
  query GetMintStats {
    recentHeroes: heros(
      first: 10
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      tokenId
      power
      rarity
      createdAt
    }
    
    recentRelics: relics(
      first: 10
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      tokenId
      capacity
      rarity
      createdAt
    }
  }
`;

const fetchFromGraph = async (query: string, variables = {}) => {
  return graphQLRateLimiter.execute(async () => {
    const response = await fetch(THE_GRAPH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    
    const data = await response.json();
    if (data.errors) {
      logger.error('GraphQL query failed:', data.errors);
      return null;
    }
    return data.data;
  });
};

const RARITY_COLORS: Record<number, string> = {
  1: 'text-gray-400',
  2: 'text-green-400',
  3: 'text-blue-400',
  4: 'text-purple-400',
  5: 'text-orange-400',
};

const RARITY_LABELS: Record<number, string> = {
  1: '普通',
  2: '罕見',
  3: '稀有',
  4: '史詩',
  5: '傳說',
};

interface MintPreviewCardProps {
  type: 'hero' | 'relic';
  recentItems: any[];
}

const MintPreviewCard: React.FC<MintPreviewCardProps> = ({ type, recentItems }) => {
  const [selectedQuantity, setSelectedQuantity] = useState(50);
  const options = [50, 20, 10, 5, 1];

  return (
    <div className={`bg-gray-800/50 rounded-xl border border-gray-700 ${rc.padding}`}>
      <div className="text-center mb-4 md:mb-6">
        <h3 className={`font-bold text-white mb-2 ${rc.cardTitle}`}>
          {type === 'hero' ? '🦸 召喚英雄' : '🔮 鑄造聖物'}
        </h3>
        <p className={`text-gray-400 ${rc.cardText}`}>
          {type === 'hero' 
            ? '召喚強大的英雄加入您的冒險隊伍' 
            : '鑄造神秘聖物增強您的戰鬥力量'
          }
        </p>
      </div>

      {/* 數量選擇 - 手機版顯示3個選項 */}
      <div className="mb-4 md:mb-6">
        <label className={`block font-medium text-gray-300 mb-2 md:mb-3 ${rc.cardText}`}>
          選擇數量 (統一機率分布)
        </label>
        <div className="grid grid-cols-3 md:grid-cols-5 gap-1 md:gap-2">
          {options.map((option, index) => (
            <button
              key={option}
              onClick={() => setSelectedQuantity(option)}
              className={`p-2 rounded-lg font-medium transition-all ${
                selectedQuantity === option
                  ? 'bg-indigo-600 text-white border-2 border-indigo-400'
                  : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
              } ${rc.cardText} ${index >= 3 ? 'hidden md:block' : ''}`}
            >
              {option}個
            </button>
          ))}
        </div>
        <div className="md:hidden mt-2 text-center">
          <button 
            className="text-xs text-gray-500 hover:text-gray-400"
            onClick={() => {/* 可以實現展開更多選項 */}}
          >
            更多選項 →
          </button>
        </div>
      </div>

      {/* 價格預覽 */}
      <div className={`mb-4 md:mb-6 bg-gray-900/50 rounded-lg ${rc.padding}`}>
        <div className="flex justify-between items-center mb-1">
          <span className={`text-gray-400 ${rc.cardText}`}>預估費用:</span>
          <span className={`text-green-400 font-bold ${rc.cardText}`}>
            ~${(selectedQuantity * 2).toFixed(0)} USD
          </span>
        </div>
        <div className="text-xs text-gray-500">
          實際價格基於即時匯率計算
        </div>
      </div>

      {/* 稀有度機率展示 - 手機版簡化 */}
      <div className="mb-4 md:mb-6">
        <h4 className={`font-semibold text-white mb-2 md:mb-3 ${rc.cardText}`}>
          📊 稀有度機率
        </h4>
        
        <div className="grid grid-cols-3 md:grid-cols-5 gap-1 md:gap-2">
          {[1, 2, 3, 4, 5].map((rarity, index) => {
            const rates = [44, 35, 15, 5, 1]; // V26: 統一機率
            return (
              <div 
                key={rarity} 
                className={`text-center p-1 md:p-2 bg-gray-900/30 rounded ${
                  index >= 3 ? 'hidden md:block' : ''
                }`}
              >
                <div className={`text-xs md:text-sm font-bold ${RARITY_COLORS[rarity]}`}>
                  {RARITY_LABELS[rarity]}
                </div>
                <div className="text-xs text-gray-400">
                  {rates[rarity - 1]}%
                </div>
              </div>
            );
          })}
        </div>
        
        <p className="text-xs text-yellow-400 text-center mt-2 md:mt-3">
          💡 Commit-Reveal 機制，統一機率分布
        </p>
      </div>

      {/* 行動按鈕 */}
      <div className="flex justify-center">
        <ActionButton
          onClick={() => {
            const connectButton = document.querySelector('[data-testid="rk-connect-button"]') as HTMLButtonElement;
            if (connectButton) {
              connectButton.click();
            } else {
              alert('請點擊右上角的「連接錢包」按鈕');
            }
          }}
          className={`w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-semibold ${rc.button}`}
        >
          🔗 連接錢包開始{type === 'hero' ? '召喚' : '鑄造'}
        </ActionButton>
      </div>
    </div>
  );
};

export const MintPagePreview: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'mechanics' | 'strategy'>('overview');

  const { data: mintData, isLoading } = useQuery({
    queryKey: ['mintPreview'],
    queryFn: () => fetchFromGraph(GET_MINT_STATS_QUERY),
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
        <p className={`text-gray-400 ml-4 ${rc.cardText}`}>載入鑄造數據中...</p>
      </div>
    );
  }

  return (
    <div className={rc.spacing}>
      {/* Header */}
      <div className="text-center space-y-2 md:space-y-4">
        <h1 className={`font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent ${rc.mainTitle}`}>
          ⚒️ 鑄造工坊
        </h1>
        <p className={`text-gray-300 px-4 ${rc.subtitle}`}>
          召喚英雄與鑄造聖物，打造您的專屬戰鬥隊伍
        </p>
      </div>

      {/* Tab Navigation - 可滾動 */}
      <div className="flex justify-center overflow-x-auto">
        <div className="bg-gray-800 rounded-lg p-1 flex min-w-max">
          {[
            { key: 'overview', label: '🎯 鑄造體驗' },
            { key: 'mechanics', label: '⚙️ 機制說明' },
            { key: 'strategy', label: '💡 策略指南' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`rounded-md font-medium transition-all whitespace-nowrap ${rc.tabButton} ${
                selectedTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content based on selected tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-4 md:space-y-6">
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <MintPreviewCard type="hero" recentItems={mintData?.recentHeroes || []} />
            <MintPreviewCard type="relic" recentItems={mintData?.recentRelics || []} />
          </div>
        </div>
      )}

      {selectedTab === 'mechanics' && (
        <MechanicsTab />
      )}

      {selectedTab === 'strategy' && (
        <StrategyTab />
      )}

      {/* Call to Action */}
      <div className={`text-center space-y-4 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 rounded-lg border border-indigo-500/20 ${rc.padding}`}>
        <h3 className={`font-semibold text-white ${rc.cardTitle}`}>
          ⚒️ 開始您的鑄造之旅
        </h3>
        <p className={`text-gray-300 max-w-2xl mx-auto px-4 ${rc.cardText}`}>
          連接錢包即可開始召喚英雄和鑄造聖物
        </p>
        <div className="flex justify-center">
          <ActionButton
            onClick={() => {
              const connectButton = document.querySelector('[data-testid="rk-connect-button"]') as HTMLButtonElement;
              if (connectButton) {
                connectButton.click();
              } else {
                alert('請點擊右上角的「連接錢包」按鈕');
              }
            }}
            className={`bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-semibold ${rc.button}`}
          >
            🔗 連接錢包開始鑄造
          </ActionButton>
        </div>
      </div>

      {/* 精選NFT展示 */}
      <div className="mt-8 md:mt-12">
        <FeaturedNftsGallery />
      </div>

      {/* 底部備註 */}
      <PreviewFooterNote />
    </div>
  );
};

// 機制說明標籤頁
const MechanicsTab: React.FC = () => (
  <div className={rc.spacing}>
    <div className="text-center">
      <h3 className={`font-semibold text-white mb-2 ${rc.cardTitle}`}>⚙️ Commit-Reveal 機制</h3>
      <p className={`text-gray-400 ${rc.cardText}`}>統一機率，延遲揭示</p>
    </div>

    {/* 機制說明 - 手機版簡化 */}
    <div className={`bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg border border-yellow-500/20 ${rc.padding}`}>
      <h4 className={`font-semibold text-yellow-400 mb-3 ${rc.cardText}`}>🎯 Commit-Reveal 防撞庫機制</h4>
      <div className="space-y-2">
        <p className={`text-gray-300 ${rc.cardText}`}>
          • <strong>延遲揭示</strong>：鑄造後需等待 3 個區塊才能揭示，使用未來區塊哈希作為隨機來源
        </p>
        <p className={`text-gray-300 ${rc.cardText}`}>
          • <strong>防止操縱</strong>：科學家無法預測未來區塊哈希，無法通過 MEV 或其他手段操縱結果
        </p>
        <p className={`text-gray-300 ${rc.cardText}`}>
          • <strong>公平透明</strong>：所有數量享受相同機率，結果完全隨機且可驗證
        </p>
      </div>
    </div>
  </div>
);

// 策略指南標籤頁
const StrategyTab: React.FC = () => (
  <div className={rc.spacing}>
    <div className="text-center">
      <h3 className={`font-semibold text-white mb-2 ${rc.cardTitle}`}>💡 收益最大化策略</h3>
      <p className={`text-gray-400 ${rc.cardText}`}>專業玩家的建議</p>
    </div>

    <div className={`grid md:grid-cols-2 gap-4 md:gap-6`}>
      {/* 核心策略 */}
      <div className={`bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg border border-purple-500/20 ${rc.padding}`}>
        <h4 className={`font-semibold text-purple-400 mb-3 ${rc.cardText}`}>
          🎯 核心策略
        </h4>
        <ul className={`space-y-2 text-gray-300 ${rc.cardText}`}>
          <li>1. 專注培養 1-2 個精華隊伍</li>
          <li>2. 目標戰力 3000+ 挑戰高收益地城</li>
          <li>3. 建議投入 100 聖物 + 200 英雄</li>
        </ul>
      </div>

      {/* 投資建議 */}
      <div className={`bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg border border-green-500/20 ${rc.padding}`}>
        <h4 className={`font-semibold text-green-400 mb-3 ${rc.cardText}`}>
          💰 投資建議
        </h4>
        <ul className={`space-y-2 text-gray-300 ${rc.cardText}`}>
          <li>• 新手：$200-400 體驗基礎</li>
          <li>• 進階：$500-1000 建立優勢</li>
          <li>• 專業：$1000+ 追求頂級</li>
        </ul>
      </div>
    </div>
  </div>
);

export default MintPagePreview;