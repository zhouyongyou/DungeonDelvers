// src/components/mint/MintPagePreview.tsx
// 鑄造頁未連錢包時的預覽展示

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

// GraphQL 查詢 - 獲取最近鑄造統計
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

const ELEMENT_LABELS: Record<string, string> = {
  fire: '火',
  water: '水',
  earth: '土',
  metal: '金',
  wood: '木'
};

const CLASS_LABELS: Record<string, string> = {
  warrior: '戰士',
  mage: '法師',
  archer: '弓手',
  priest: '牧師'
};

const RELIC_CATEGORY_LABELS: Record<string, string> = {
  weapon: '武器',
  armor: '護甲',
  accessory: '飾品',
  consumable: '消耗品'
};

interface MintPreviewCardProps {
  type: 'hero' | 'relic';
  recentItems: any[];
}

const MintPreviewCard: React.FC<MintPreviewCardProps> = ({ type, recentItems }) => {
  const [selectedQuantity, setSelectedQuantity] = useState(50);
  const options = [50, 20, 10, 5, 1];

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 md:p-6 border border-gray-700">
      <div className="text-center mb-4 md:mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
          {type === 'hero' ? '🦸 召喚英雄' : '🔮 鑄造聖物'}
        </h3>
        <p className="text-sm md:text-base text-gray-400">
          {type === 'hero' 
            ? '召喚強大的英雄加入您的冒險隊伍' 
            : '鑄造神秘聖物增強您的戰鬥力量'
          }
        </p>
      </div>

      {/* 數量選擇 */}
      <div className="mb-4 md:mb-6">
        <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2 md:mb-3">
          選擇數量
        </label>
        <div className="grid grid-cols-5 gap-2">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => setSelectedQuantity(option)}
              className={`p-2 rounded-lg text-sm font-medium transition-all ${
                selectedQuantity === option
                  ? 'bg-indigo-600 text-white border-2 border-indigo-400'
                  : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
              }`}
            >
              {option}個
            </button>
          ))}
        </div>
      </div>

      {/* 價格預覽 */}
      <div className="mb-6 p-4 bg-gray-900/50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400">預估費用:</span>
          <span className="text-green-400 font-bold">
            ~${(selectedQuantity * 2).toFixed(0)} USD
          </span>
        </div>
        <div className="text-xs text-gray-500">
          實際價格基於即時匯率計算
        </div>
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
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 py-3 font-semibold"
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
    staleTime: 60000, // 1分鐘緩存
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
        <p className="text-gray-400 ml-4">載入鑄造數據中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          ⚒️ 鑄造工坊
        </h1>
        <p className="text-base md:text-lg text-gray-300">
          召喚英雄與鑄造聖物，打造您的專屬戰鬥隊伍
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="bg-gray-800 rounded-lg p-1 flex">
          {[
            { key: 'overview', label: '🎯 鑄造體驗', icon: '🎯' },
            { key: 'mechanics', label: '⚙️ 機制說明', icon: '⚙️' },
            { key: 'strategy', label: '💡 策略指南', icon: '💡' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
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
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <MintPreviewCard type="hero" recentItems={mintData?.recentHeroes || []} />
            <MintPreviewCard type="relic" recentItems={mintData?.recentRelics || []} />
          </div>
        </div>
      )}

      {selectedTab === 'mechanics' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">⚙️ 防撞庫機制</h3>
            <p className="text-gray-400">採用 Commit-Reveal 兩步驟機制，使用區塊鏈隨機性確保公平</p>
          </div>

          {/* 簡化的批量說明 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {BATCH_TIERS.map((tier, index) => (
              <div key={index} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-4 border border-gray-600">
                <div className="text-center space-y-2">
                  <div className="text-lg font-bold text-white">{tier.tierName}</div>
                  <div className="text-sm text-gray-400">{tier.minQuantity}個起</div>
                  <div className="text-sm text-green-400">
                    約 ${tier.minQuantity * 2} USD
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 簡化的機制說明 */}
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-6 border border-purple-500/20">
            <h4 className="text-lg font-semibold text-purple-400 mb-4">⚡ Commit-Reveal 機制</h4>
            <div className="space-y-3 text-gray-300">
              <p><strong>📝 兩步驟鑄造</strong>：先提交承諾，等待 3 個區塊後揭示結果</p>
              <p><strong>🎲 區塊鏈隨機性</strong>：使用未來區塊 hash 確保結果公平可驗證</p>
              <p><strong>💰 經濟設計</strong>：防止撞庫行為，維護遊戲經濟平衡</p>
            </div>
          </div>

        </div>
      )}

      {selectedTab === 'strategy' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">💡 收益最大化策略</h3>
            <p className="text-gray-400">專業玩家的建議，助您快速建立強力隊伍</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 建議策略 */}
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg p-6 border border-purple-500/20">
              <h4 className="text-lg font-semibold text-purple-400 mb-4 flex items-center">
                🎯 核心策略
              </h4>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">1.</span>
                  <span>專注培養<strong className="text-purple-200"> 1-2 個精華隊伍</strong>，而非分散資源</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">2.</span>
                  <span>目標隊伍戰力達到<strong className="text-purple-200"> 3000 以上</strong>，可挑戰高收益地城</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">3.</span>
                  <span>建議鑄造約<strong className="text-purple-200"> 100 聖物 + 200 英雄</strong>作為基礎</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">4.</span>
                  <span>優先選擇<strong className="text-purple-200"> 4-5 星聖物</strong>和高戰力英雄組隊</span>
                </li>
              </ul>
            </div>

            {/* 投資建議 */}
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-6 border border-green-500/20">
              <h4 className="text-lg font-semibold text-green-400 mb-4 flex items-center">
                💰 投資建議
              </h4>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span><strong>新手入門</strong>：$200-400 USD 體驗基礎玩法</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span><strong>進階玩家</strong>：$500-1000 USD 建立競爭優勢</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span><strong>專業玩家</strong>：$1000+ USD 追求頂級配置</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span><strong>批量優勢</strong>：50個批量可獲得完整的稀有度範圍</span>
                </li>
              </ul>
            </div>

            {/* 風險提醒 */}
            <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 rounded-lg p-6 border border-red-500/20">
              <h4 className="text-lg font-semibold text-red-400 mb-4 flex items-center">
                ⚠️ 風險提醒
              </h4>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">•</span>
                  <span>鑄造結果基於隨機機率，存在不確定性</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">•</span>
                  <span>建議單一地址 NFT 數量各不超過 1000 個</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">•</span>
                  <span>請根據自身經濟能力合理投資</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-400 mr-2">•</span>
                  <span>Web3 遊戲存在智能合約風險</span>
                </li>
              </ul>
            </div>

            {/* 成功案例 */}
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg p-6 border border-blue-500/20">
              <h4 className="text-lg font-semibold text-blue-400 mb-4 flex items-center">
                🏆 成功案例
              </h4>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span><strong>深淵挑戰者</strong>：隊伍戰力 3000+，日收益 $200+</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span><strong>傳說收藏家</strong>：擁有多個 4-5★ 英雄和聖物</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span><strong>效率專家</strong>：多隊伍並行，持續穩定產出</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span><strong>市場達人</strong>：掌握交易時機，資產穩定增值</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="text-center space-y-4 py-8 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 rounded-lg border border-indigo-500/20">
        <h3 className="text-xl font-semibold text-white">
          ⚒️ 開始您的鑄造之旅
        </h3>
        <p className="text-gray-300 max-w-2xl mx-auto">
          連接錢包即可開始召喚英雄和鑄造聖物，打造屬於您的專屬戰鬥隊伍
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
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-8 py-3 text-lg font-semibold"
          >
            🔗 連接錢包開始鑄造
          </ActionButton>
        </div>
      </div>

      {/* 底部備註 */}
      <PreviewFooterNote />
    </div>
  );
};