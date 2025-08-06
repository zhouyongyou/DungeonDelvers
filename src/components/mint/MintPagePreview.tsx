// src/components/mint/MintPagePreview.tsx
// 鑄造頁未連錢包時的預覽展示

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { THE_GRAPH_API_URL } from '../../config/graphConfig';
import { graphQLRateLimiter } from '../../utils/rateLimiter';
import { logger } from '../../utils/logger';
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


      {/* 統計資訊 */}
      <div className="text-center text-sm text-gray-400">
        最近 24 小時已鑄造 {recentItems.length > 0 ? `${recentItems.length}+` : '多個'} {type === 'hero' ? '英雄' : '聖物'}
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
            <p className="text-gray-400">使用 Chainlink VRF 可驗證隨機性，自動完成鑄造確保公平</p>
          </div>


          {/* 防撞庫機制詳解 */}
          <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-6 border border-purple-500/20">
            <h4 className="text-lg font-semibold text-purple-400 mb-4">🎲 Chainlink VRF 可驗證隨機性</h4>
            <div className="space-y-4 text-gray-300">
              <div>
                <p className="font-semibold text-purple-300 mb-2">⚡ 自動揭示流程</p>
                <p className="text-sm">鑄造後自動請求 VRF 隨機數，無需手動操作。Chainlink VRF 提供鏈上可驗證的隨機性。</p>
              </div>
              <div>
                <p className="font-semibold text-purple-300 mb-2">🎲 可驗證隨機性</p>
                <p className="text-sm">使用 Chainlink VRF 作為隨機源，確保結果公平可驗證。每個 NFT 的屬性完全由 VRF 隨機數決定。</p>
              </div>
              <div>
                <p className="font-semibold text-purple-300 mb-2">🛡️ 為什麼我們不會被撞庫？</p>
                <p className="text-sm mb-2">許多項目雖然使用區塊 hash，但會加入其他可變參數，給了撞庫者機會。</p>
                <p className="text-sm"><strong className="text-green-400">我們的優勢</strong>：使用 Chainlink VRF 提供真正的鏈上隨機性，無法被預測或操控。每個隨機數都有加密證明，徹底杜絕了撞庫行為。</p>
              </div>
              <div>
                <p className="font-semibold text-purple-300 mb-2">💰 經濟保護機制</p>
                <p className="text-sm">防止惡意玩家只挑選高稀有度 NFT，確保遊戲經濟的長期健康和所有玩家的公平性。</p>
              </div>
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
                  <span>價格受市場波動影響，請注意匯率變化</span>
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
                  <span><strong>深淵挑戰者</strong>：隊伍戰力 3000+（成本約 $200），日收益 $200+<br/>
                  <span className="text-sm text-gray-400">高難度副本挑戰成功率約 45%，幸運的話一天即可回本</span></span>
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
          ⚒️ 準備開始您的冒險之旅？
        </h3>
        <p className="text-gray-300 max-w-2xl mx-auto">
          連接錢包即可開始召喚英雄和鑄造聖物，打造屬於您的專屬戰鬥隊伍
        </p>
        <p className="text-sm text-gray-400">
          請點擊右上角的「連接錢包」按鈕開始
        </p>
      </div>

      {/* 底部備註 */}
      <PreviewFooterNote />
    </div>
  );
};