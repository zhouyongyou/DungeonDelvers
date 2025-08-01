// src/components/marketplace/MarketplacePreview.tsx
// 市場頁未連錢包時的預覽展示

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatEther } from 'viem';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ActionButton } from '../ui/ActionButton';
import { Icons } from '../ui/icons';
import { THE_GRAPH_API_URL } from '../../config/graphConfig';
import { graphQLRateLimiter } from '../../utils/rateLimiter';
import { logger } from '../../utils/logger';
import type { NftType } from '../../types/nft';

// GraphQL 查詢 - 獲取最近交易和市場統計
const GET_MARKET_PREVIEW_QUERY = `
  query GetMarketPreview {
    listings(
      first: 8
      where: { status: "active" }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      seller
      nftType
      tokenId
      price
      createdAt
      hero {
        id
        tokenId
        power
        element
        class
      }
      relic {
        id
        tokenId
        category
        capacity
      }
      party {
        id
        tokenId
        heroes {
          tokenId
          power
        }
      }
    }
    
    recentSales: listings(
      first: 5
      where: { status: "sold" }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      nftType
      tokenId
      price
      createdAt
      hero { power element class }
      relic { category capacity }
      party { heroes { power } }
    }
  }
`;

interface MarketStats {
  totalListings: number;
  avgPrice: string;
  recentSales: number;
  topSale: string;
}

// 使用模擬數據避免 GraphQL 依賴
const getMockMarketData = () => {
  return {
    listings: [
      {
        id: '1',
        seller: '0xabc123',
        nftType: 'hero',
        tokenId: '1234',
        price: '150000000000000000000', // 150 USD in wei (約 0.3 BNB)
        createdAt: Date.now() / 1000 - 3600,
        hero: { id: '1234', tokenId: '1234', power: 2800, element: 'fire', class: 'warrior' }
      },
      {
        id: '2',
        seller: '0xdef456',
        nftType: 'hero',
        tokenId: '5678',
        price: '300000000000000000000', // 300 USD
        createdAt: Date.now() / 1000 - 7200,
        hero: { id: '5678', tokenId: '5678', power: 3200, element: 'water', class: 'mage' }
      },
      {
        id: '3',
        seller: '0xghi789',
        nftType: 'relic',
        tokenId: '9012',
        price: '100000000000000000000', // 100 USD
        createdAt: Date.now() / 1000 - 1800,
        relic: { id: '9012', tokenId: '9012', category: 'weapon', capacity: 180 }
      },
      {
        id: '4',
        seller: '0xjkl012',
        nftType: 'party',
        tokenId: '3456',
        price: '800000000000000000000', // 800 USD
        createdAt: Date.now() / 1000 - 5400,
        party: { id: '3456', tokenId: '3456', heroes: [{ tokenId: '101', power: 1500 }, { tokenId: '102', power: 1800 }] }
      }
    ],
    recentSales: [
      {
        id: 's1',
        nftType: 'hero',
        tokenId: '7890',
        price: '250000000000000000000', // 250 USD
        createdAt: Date.now() / 1000 - 86400,
        hero: { power: 2950, element: 'earth', class: 'archer' }
      },
      {
        id: 's2',
        nftType: 'relic',
        tokenId: '2468',
        price: '120000000000000000000', // 120 USD
        createdAt: Date.now() / 1000 - 172800,
        relic: { category: 'armor', capacity: 200 }
      }
    ]
  };
};

const fetchFromGraph = async (query: string, variables = {}) => {
  // 如果 GraphQL 可用則嘗試獲取真實數據，否則返回模擬數據
  if (!THE_GRAPH_API_URL) {
    return getMockMarketData();
  }
  
  try {
    return await graphQLRateLimiter.execute(async () => {
      const response = await fetch(THE_GRAPH_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      });
      
      const data = await response.json();
      if (data.errors) {
        logger.warn('GraphQL query failed, using mock data:', data.errors);
        return getMockMarketData();
      }
      return data.data;
    });
  } catch (error) {
    logger.warn('GraphQL request failed, using mock data:', error);
    return getMockMarketData();
  }
};

const NFT_TYPE_LABELS: Record<NftType, string> = {
  hero: '英雄',
  relic: '聖物', 
  party: '隊伍'
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

export const MarketplacePreview: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'listings' | 'guide'>('overview');

  const { data: marketData, isLoading } = useQuery({
    queryKey: ['marketPreview'],
    queryFn: () => fetchFromGraph(GET_MARKET_PREVIEW_QUERY),
    staleTime: 30000, // 30秒緩存
  });

  const calculateStats = (): MarketStats => {
    if (!marketData) return { totalListings: 0, avgPrice: '0', recentSales: 0, topSale: '0' };
    
    const { listings, recentSales } = marketData;
    // 將 wei 轉換為 USD (假設 1 ETH ≈ 500 USD)
    const weiToUsd = (wei: string) => parseFloat(formatEther(BigInt(wei))) * 500;
    
    const prices = listings?.map((l: any) => weiToUsd(l.price)) || [];
    const salesPrices = recentSales?.map((s: any) => weiToUsd(s.price)) || [];
    
    return {
      totalListings: listings?.length || 0,
      avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length).toString() : '0',
      recentSales: recentSales?.length || 0,
      topSale: salesPrices.length > 0 ? Math.round(Math.max(...salesPrices)).toString() : '0'
    };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
        <p className="text-gray-400 ml-4">載入市場數據中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          🏪 DungeonDelvers 內部市場
        </h1>
        <p className="text-lg text-gray-300">
          玩家之間直接交易英雄、聖物和隊伍的去中心化市場
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="bg-gray-800 rounded-lg p-1 flex">
          {[
            { key: 'overview', label: '📊 市場概覽', icon: '📊' },
            { key: 'listings', label: '🛍️ 掛單展示', icon: '🛍️' },
            { key: 'guide', label: '📖 交易指南', icon: '📖' }
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
          {/* Market Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg p-4 border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-400">{stats.totalListings}</div>
              <div className="text-sm text-gray-400">活躍掛單</div>
            </div>
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-4 border border-green-500/20">
              <div className="text-2xl font-bold text-green-400">${stats.avgPrice}</div>
              <div className="text-sm text-gray-400">平均價格 (USD)</div>
            </div>
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg p-4 border border-purple-500/20">
              <div className="text-2xl font-bold text-purple-400">{stats.recentSales}</div>
              <div className="text-sm text-gray-400">最近成交</div>
            </div>
            <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 rounded-lg p-4 border border-orange-500/20">
              <div className="text-2xl font-bold text-orange-400">${stats.topSale}</div>
              <div className="text-sm text-gray-400">最高成交 (USD)</div>
            </div>
          </div>

          {/* Recent Sales */}
          {marketData?.recentSales?.length > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Icons.TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                最近成交記錄
              </h3>
              <div className="space-y-3">
                {marketData.recentSales.slice(0, 5).map((sale: any, index: number) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-gray-300">
                        {NFT_TYPE_LABELS[sale.nftType as NftType]} #{sale.tokenId}
                        {sale.hero && (
                          <span className="text-sm text-gray-400 ml-2">
                            ({ELEMENT_LABELS[sale.hero.element]} {CLASS_LABELS[sale.hero.class]} | {sale.hero.power}⚔️)
                          </span>
                        )}
                        {sale.relic && (
                          <span className="text-sm text-gray-400 ml-2">
                            ({sale.relic.category} | {sale.relic.capacity}📦)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="text-green-400 font-semibold">
                      ${Math.round(parseFloat(formatEther(BigInt(sale.price))) * 500)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'listings' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">🛍️ 當前掛單展示</h3>
            <p className="text-gray-400">以下是市場上的部分掛單，連接錢包後可進行交易</p>
          </div>

          {marketData?.listings?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {marketData.listings.slice(0, 8).map((listing: any) => (
                <div key={listing.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-indigo-500/50 transition-all">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-indigo-400 font-medium">
                        {NFT_TYPE_LABELS[listing.nftType as NftType]} #{listing.tokenId}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(listing.createdAt * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {listing.hero && (
                      <div className="space-y-1">
                        <div className="text-sm text-gray-300">
                          🔥 {ELEMENT_LABELS[listing.hero.element]} {CLASS_LABELS[listing.hero.class]}
                        </div>
                        <div className="text-sm text-orange-400">
                          ⚔️ 戰力: {listing.hero.power}
                        </div>
                      </div>
                    )}
                    
                    {listing.relic && (
                      <div className="space-y-1">
                        <div className="text-sm text-gray-300">
                          📿 {listing.relic.category}
                        </div>
                        <div className="text-sm text-blue-400">
                          📦 容量: {listing.relic.capacity}
                        </div>
                      </div>
                    )}
                    
                    {listing.party && (
                      <div className="space-y-1">
                        <div className="text-sm text-gray-300">
                          👥 隊伍 ({listing.party.heroes?.length || 0} 英雄)
                        </div>
                        <div className="text-sm text-purple-400">
                          ⚔️ 總戰力: {listing.party.heroes?.reduce((sum: number, h: any) => sum + h.power, 0) || 0}
                        </div>
                      </div>
                    )}
                    
                    <div className="border-t border-gray-700 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-green-400">
                          ${Math.round(parseFloat(formatEther(BigInt(listing.price))) * 500)}
                        </span>
                        <button className="px-3 py-1 bg-gray-600 text-gray-400 rounded text-sm cursor-not-allowed">
                          需連接錢包
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-gray-400">暫無掛單數據，請稍後重試</p>
            </div>
          )}
        </div>
      )}

      {selectedTab === 'guide' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">📖 交易指南</h3>
            <p className="text-gray-400">了解如何在 DungeonDelvers 市場中進行安全交易</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-indigo-900/30 to-indigo-800/20 rounded-lg p-6 border border-indigo-500/20">
              <h4 className="text-lg font-semibold text-indigo-400 mb-3 flex items-center">
                🛒 如何購買
              </h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2">1.</span>
                  連接您的 Web3 錢包 (MetaMask/TrustWallet)
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2">2.</span>
                  確保錢包中有足夠的 BNB 用於購買和手續費
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2">3.</span>
                  瀏覽市場並選擇心儀的 NFT
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2">4.</span>
                  點擊「立即購買」並確認交易
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-6 border border-green-500/20">
              <h4 className="text-lg font-semibold text-green-400 mb-3 flex items-center">
                💰 如何出售
              </h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">1.</span>
                  前往「我的資產」頁面查看您的 NFT
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">2.</span>
                  選擇要出售的 NFT 並點擊「出售」
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">3.</span>
                  設定合理的價格 (參考市場行情)
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">4.</span>
                  確認授權並創建掛單
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 rounded-lg p-6 border border-yellow-500/20">
              <h4 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center">
                ⚠️ 安全提醒
              </h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2">•</span>
                  所有交易都在區塊鏈上進行，無法撤銷
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2">•</span>
                  購買前請仔細檢查 NFT 的屬性和稀有度
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2">•</span>
                  建議參考近期成交價格來判斷合理價格
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-400 mr-2">•</span>
                  保護好您的私鑰，不要分享給任何人
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg p-6 border border-purple-500/20">
              <h4 className="text-lg font-semibold text-purple-400 mb-3 flex items-center">
                💎 交易手續費
              </h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  平台手續費：2.5% (從售價中扣除)
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  區塊鏈 Gas 費：由買方支付
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  VIP 用戶享有手續費優惠
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  手續費用於維護平台運營和獎勵機制
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Call to Action */}
      <div className="text-center space-y-4 py-8 bg-gradient-to-r from-indigo-900/20 to-purple-900/20 rounded-lg border border-indigo-500/20">
        <h3 className="text-xl font-semibold text-white">
          🚀 準備開始交易了嗎？
        </h3>
        <p className="text-gray-300 max-w-2xl mx-auto">
          連接您的錢包即可參與 DungeonDelvers 的去中心化市場，與全球玩家直接交易您的數位資產
        </p>
        <div className="flex justify-center">
          <ActionButton
            onClick={() => {
              // 觸發錢包連接
              const connectButton = document.querySelector('[data-testid="rk-connect-button"]') as HTMLButtonElement;
              if (connectButton) {
                connectButton.click();
              } else {
                // 備用方案：顯示提示
                alert('請點擊右上角的「連接錢包」按鈕');
              }
            }}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-8 py-3 text-lg font-semibold"
          >
            🔗 連接錢包開始交易
          </ActionButton>
        </div>
      </div>
    </div>
  );
};