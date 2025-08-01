// src/components/altar/AltarPagePreview.tsx
// 升星祭壇未連錢包時的預覽展示

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { THE_GRAPH_API_URL } from '../../config/graphConfig';
import { graphQLRateLimiter } from '../../utils/rateLimiter';
import { logger } from '../../utils/logger';

// GraphQL 查詢 - 獲取升星統計數據
const GET_ALTAR_STATS_QUERY = `
  query GetAltarStats {
    recentUpgrades: upgradeEvents(
      first: 20
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      player
      nftType
      tokenId
      fromRarity
      toRarity
      success
      timestamp
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
  2: '稀有',
  3: '史詩',
  4: '傳說',
  5: '神話',
};

const NFT_TYPE_LABELS: Record<string, string> = {
  hero: '英雄',
  relic: '聖物'
};

interface UpgradeSimulatorProps {
  fromRarity: number;
  onRarityChange: (rarity: number) => void;
}

const UpgradeSimulator: React.FC<UpgradeSimulatorProps> = ({ fromRarity, onRarityChange }) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{
    success: boolean;
    toRarity: number;
    cost: number;
  } | null>(null);

  // 升星成功率（模擬數據）
  const successRates: Record<number, number> = {
    1: 85, // 1星升2星
    2: 70, // 2星升3星  
    3: 50, // 3星升4星
    4: 25, // 4星升5星
  };

  // 升星成本（模擬數據）
  const costs: Record<number, number> = {
    1: 10,
    2: 25, 
    3: 50,
    4: 100,
  };

  const handleSimulate = async () => {
    if (fromRarity >= 5) return;
    
    setIsSimulating(true);
    
    // 模擬升星過程
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const success = Math.random() * 100 < successRates[fromRarity];
    setSimulationResult({
      success,
      toRarity: success ? fromRarity + 1 : fromRarity,
      cost: costs[fromRarity]
    });
    
    setIsSimulating(false);
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
      <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
        ⚗️ 升星模擬器
      </h4>
      
      {/* 稀有度選擇 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          選擇起始稀有度
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(rarity => (
            <button
              key={rarity}
              onClick={() => onRarityChange(rarity)}
              className={`px-4 py-2 rounded font-medium transition-all ${
                fromRarity === rarity
                  ? `bg-gradient-to-r from-indigo-600 to-purple-600 text-white`
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {rarity}★
            </button>
          ))}
        </div>
      </div>

      {/* 升星信息 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-900/50 rounded p-3">
          <div className="text-sm text-gray-400">成功率</div>
          <div className="text-lg font-bold text-green-400">
            {fromRarity < 5 ? `${successRates[fromRarity]}%` : '已滿級'}
          </div>
        </div>
        <div className="bg-gray-900/50 rounded p-3">
          <div className="text-sm text-gray-400">所需材料</div>
          <div className="text-lg font-bold text-yellow-400">
            {fromRarity < 5 ? `${costs[fromRarity]} 材料` : '無需材料'}
          </div>
        </div>
      </div>

      {/* 升星按鈕 */}
      <ActionButton
        onClick={handleSimulate}
        disabled={isSimulating || fromRarity >= 5}
        className={`w-full py-3 font-semibold ${
          fromRarity >= 5 
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500'
        }`}
      >
        {isSimulating ? (
          <div className="flex items-center justify-center">
            <LoadingSpinner size="sm" className="mr-2" />
            升星儀式進行中...
          </div>
        ) : fromRarity >= 5 ? (
          '已達最高稀有度'
        ) : (
          `🌟 模擬升星 (${fromRarity}★ → ${fromRarity + 1}★)`
        )}
      </ActionButton>

      {/* 模擬結果 */}
      {simulationResult && (
        <div className={`mt-4 p-4 rounded-lg border ${
          simulationResult.success 
            ? 'bg-green-900/30 border-green-500/50'
            : 'bg-red-900/30 border-red-500/50'
        }`}>
          <div className="text-center">
            <div className="text-2xl mb-2">
              {simulationResult.success ? '🎉' : '💥'}
            </div>
            <div className={`font-bold ${
              simulationResult.success ? 'text-green-400' : 'text-red-400'
            }`}>
              {simulationResult.success ? '升星成功！' : '升星失敗'}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {simulationResult.success 
                ? `恭喜！您的 NFT 已升級至 ${simulationResult.toRarity}★`
                : `很遺憾，NFT 依然是 ${fromRarity}★，材料已消耗`
              }
            </div>
            <button
              onClick={() => setSimulationResult(null)}
              className="mt-2 text-xs text-gray-500 hover:text-gray-400"
            >
              重新模擬
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const AltarPagePreview: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'simulator' | 'mechanics' | 'stats'>('simulator');
  const [simulatorRarity, setSimulatorRarity] = useState(1);

  const { data: altarData, isLoading } = useQuery({
    queryKey: ['altarPreview'],
    queryFn: () => fetchFromGraph(GET_ALTAR_STATS_QUERY),
    staleTime: 60000, // 1分鐘緩存
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
        <p className="text-gray-400 ml-4">載入升星數據中...</p>
      </div>
    );
  }

  const calculateStats = () => {
    if (!altarData?.recentUpgrades) return { totalAttempts: 0, successRate: 0, avgRarity: 0 };
    
    const upgrades = altarData.recentUpgrades;
    const successful = upgrades.filter((u: any) => u.success);
    
    return {
      totalAttempts: upgrades.length,
      successRate: upgrades.length > 0 ? (successful.length / upgrades.length * 100) : 0,
      avgRarity: upgrades.length > 0 ? upgrades.reduce((acc: number, u: any) => acc + u.fromRarity, 0) / upgrades.length : 0
    };
  };

  const stats = calculateStats();

  return (
    <section className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900 relative overflow-hidden">
      {/* 背景粒子效果 */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            ⭐ 升星祭壇
          </h1>
          <p className="text-lg text-gray-300">
            提升您的 NFT 稀有度，解鎖更強大的力量
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center">
          <div className="bg-gray-800 rounded-lg p-1 flex">
            {[
              { key: 'simulator', label: '⚗️ 升星模擬', icon: '⚗️' },
              { key: 'mechanics', label: '⚙️ 機制說明', icon: '⚙️' },
              { key: 'stats', label: '📊 升星統計', icon: '📊' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key as any)}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  selectedTab === tab.key
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content based on selected tab */}
        {selectedTab === 'simulator' && (
          <div className="max-w-2xl mx-auto">
            <UpgradeSimulator 
              fromRarity={simulatorRarity} 
              onRarityChange={setSimulatorRarity}
            />
          </div>
        )}

        {selectedTab === 'mechanics' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">⚙️ 升星機制說明</h3>
              <p className="text-gray-400">了解升星祭壇的核心機制與策略</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* 升星規則 */}
              <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg p-6 border border-purple-500/20">
                <h4 className="text-lg font-semibold text-purple-400 mb-4 flex items-center">
                  📜 升星規則
                </h4>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>需要<strong className="text-purple-200"> 2 個同稀有度 NFT</strong> 才能嘗試升星</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>升星<strong className="text-purple-200"> 有成功率限制</strong>，失敗會消耗材料</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>成功升星獲得<strong className="text-purple-200"> 1 個更高稀有度 NFT</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2">•</span>
                    <span>最高可升級至<strong className="text-purple-200"> 5★ 神話級</strong></span>
                  </li>
                </ul>
              </div>

              {/* 成功率表 */}
              <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg p-6 border border-blue-500/20">
                <h4 className="text-lg font-semibold text-blue-400 mb-4 flex items-center">
                  📊 成功率參考
                </h4>
                <div className="space-y-3">
                  {[
                    { from: 1, to: 2, rate: '85%', color: 'text-green-400' },
                    { from: 2, to: 3, rate: '70%', color: 'text-yellow-400' },
                    { from: 3, to: 4, rate: '50%', color: 'text-orange-400' },
                    { from: 4, to: 5, rate: '25%', color: 'text-red-400' },
                  ].map(item => (
                    <div key={item.from} className="flex justify-between items-center p-2 bg-gray-900/30 rounded">
                      <span className="text-gray-300">
                        {item.from}★ → {item.to}★
                      </span>
                      <span className={`font-bold ${item.color}`}>
                        {item.rate}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 升星策略 */}
              <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-6 border border-green-500/20">
                <h4 className="text-lg font-semibold text-green-400 mb-4 flex items-center">
                  💡 升星策略
                </h4>
                <ul className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">•</span>
                    <span><strong>分散風險</strong>：不要把所有材料用在一次升星</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">•</span>
                    <span><strong>優先低星級</strong>：1-2星成功率高，先積累經驗</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">•</span>
                    <span><strong>VIP 優勢</strong>：VIP 用戶享有成功率加成</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">•</span>
                    <span><strong>時機選擇</strong>：高價值 NFT 考慮市場時機</span>
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
                    <span><strong>升星失敗會消耗材料</strong>，無法退回</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-400 mr-2">•</span>
                    <span><strong>高稀有度成功率較低</strong>，謹慎決策</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-400 mr-2">•</span>
                    <span><strong>考慮市場價值</strong>，避免虧本升星</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-400 mr-2">•</span>
                    <span><strong>合理分配資源</strong>，不要孤注一擲</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'stats' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-white mb-2">📊 升星統計數據</h3>
              <p className="text-gray-400">查看最近的升星活動和成功率統計</p>
            </div>

            {/* 統計卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg p-6 border border-blue-500/20">
                <div className="text-3xl font-bold text-blue-400">{stats.totalAttempts}</div>
                <div className="text-sm text-gray-400">最近嘗試次數</div>
              </div>
              <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-6 border border-green-500/20">
                <div className="text-3xl font-bold text-green-400">{stats.successRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-400">整體成功率</div>
              </div>
              <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg p-6 border border-purple-500/20">
                <div className="text-3xl font-bold text-purple-400">{stats.avgRarity.toFixed(1)}★</div>
                <div className="text-sm text-gray-400">平均起始稀有度</div>
              </div>
            </div>

            {/* 最近升星記錄 */}
            {altarData?.recentUpgrades && altarData.recentUpgrades.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                  📈 最近升星記錄
                </h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {altarData.recentUpgrades.slice(0, 10).map((upgrade: any, index: number) => (
                    <div 
                      key={upgrade.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        upgrade.success 
                          ? 'bg-green-900/20 border-green-500/30'
                          : 'bg-red-900/20 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          upgrade.success ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                        <span className="text-gray-300">
                          {NFT_TYPE_LABELS[upgrade.nftType]} #{upgrade.tokenId}
                        </span>
                        <span className="text-sm text-gray-400">
                          {upgrade.fromRarity}★ → {upgrade.success ? upgrade.toRarity : upgrade.fromRarity}★
                        </span>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          upgrade.success ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {upgrade.success ? '成功' : '失敗'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(upgrade.timestamp * 1000).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Call to Action */}
        <div className="text-center space-y-4 py-8 bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg border border-purple-500/20">
          <h3 className="text-xl font-semibold text-white">
            ⭐ 開始您的升星之旅
          </h3>
          <p className="text-gray-300 max-w-2xl mx-auto">
            連接錢包即可使用升星祭壇，將您的 NFT 提升至更高稀有度，解鎖強大力量
          </p>
          <ActionButton
            onClick={() => {
              const connectButton = document.querySelector('[data-testid="rk-connect-button"]') as HTMLButtonElement;
              if (connectButton) {
                connectButton.click();
              } else {
                alert('請點擊右上角的「連接錢包」按鈕');
              }
            }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 px-8 py-3 text-lg font-semibold"
          >
            🔗 連接錢包開始升星
          </ActionButton>
        </div>
      </div>
    </section>
  );
};