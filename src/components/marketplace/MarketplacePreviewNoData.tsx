// src/components/marketplace/MarketplacePreviewNoData.tsx
// 市場頁未連錢包時的預覽展示 - 不包含假數據

import React, { useState } from 'react';
import { ActionButton } from '../ui/ActionButton';
import { PreviewFooterNote } from '../common/PreviewFooterNote';

export const MarketplacePreview: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'features' | 'guide'>('overview');

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
            { key: 'overview', label: '📊 市場特色', icon: '📊' },
            { key: 'features', label: '🛍️ 交易功能', icon: '🛍️' },
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
          {/* Market Features */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg p-6 border border-blue-500/20">
              <h4 className="text-lg font-semibold text-blue-400 mb-4 flex items-center">
                🏪 去中心化交易
              </h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>點對點直接交易，無需中介</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>智能合約保障交易安全</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>即時結算，無需等待</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span>透明的鏈上交易記錄</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-6 border border-green-500/20">
              <h4 className="text-lg font-semibold text-green-400 mb-4 flex items-center">
                💎 多樣化資產
              </h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span><strong>英雄 NFT</strong>：不同元素和職業的戰士</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span><strong>聖物 NFT</strong>：增強戰鬥力的裝備</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span><strong>隊伍 NFT</strong>：完整配置的探險隊</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span>所有資產都有獨特屬性和稀有度</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg p-6 border border-purple-500/20">
              <h4 className="text-lg font-semibold text-purple-400 mb-4 flex items-center">
                📊 智能定價
              </h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  <span>基於稀有度和屬性的價值評估</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  <span>歷史交易數據趨勢分析</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  <span>市場供需關係動態調整</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  <span>公平透明的價格發現機制</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 rounded-lg p-6 border border-orange-500/20">
              <h4 className="text-lg font-semibold text-orange-400 mb-4 flex items-center">
                🔒 安全保障
              </h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-orange-400 mr-2">•</span>
                  <span>智能合約經過專業審計</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-400 mr-2">•</span>
                  <span>多重簽名和時間鎖保護</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-400 mr-2">•</span>
                  <span>防MEV攻擊和搶跑機制</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-400 mr-2">•</span>
                  <span>24/7 監控和風險預警</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Market Statistics */}
          <div className="bg-gray-800/50 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
              📈 市場優勢
            </h4>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">2.5%</div>
                <div className="text-sm text-gray-400">平台手續費</div>
                <div className="text-xs text-gray-500 mt-1">公平透明的收費</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">24/7</div>
                <div className="text-sm text-gray-400">全天候交易</div>
                <div className="text-xs text-gray-500 mt-1">無時區限制</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">秒級</div>
                <div className="text-sm text-gray-400">交易確認</div>
                <div className="text-xs text-gray-500 mt-1">BSC 高速網路</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'features' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">🛍️ 強大的交易功能</h3>
            <p className="text-gray-400">為玩家提供完整的交易生態系統</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 買方功能 */}
            <div className="bg-gradient-to-br from-indigo-900/30 to-indigo-800/20 rounded-lg p-6 border border-indigo-500/20">
              <h4 className="text-lg font-semibold text-indigo-400 mb-4 flex items-center">
                🛒 購買功能
              </h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2">•</span>
                  <span><strong>即時購買</strong>：一鍵購買心儀的NFT</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2">•</span>
                  <span><strong>智能篩選</strong>：按類型、稀有度、價格篩選</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2">•</span>
                  <span><strong>詳細信息</strong>：查看完整的NFT屬性和歷史</span>
                </li>
                <li className="flex items-start">
                  <span className="text-indigo-400 mr-2">•</span>
                  <span><strong>價格追蹤</strong>：監控心儀NFT的價格變化</span>
                </li>
              </ul>
            </div>

            {/* 賣方功能 */}
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-6 border border-green-500/20">
              <h4 className="text-lg font-semibold text-green-400 mb-4 flex items-center">
                💰 出售功能
              </h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span><strong>快速上架</strong>：簡單幾步創建掛單</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span><strong>價格建議</strong>：基於市場數據的定價建議</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span><strong>批量管理</strong>：同時管理多個掛單</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-2">•</span>
                  <span><strong>銷售分析</strong>：查看您的銷售統計和收益</span>
                </li>
              </ul>
            </div>

            {/* 高級功能 */}
            <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg p-6 border border-purple-500/20">
              <h4 className="text-lg font-semibold text-purple-400 mb-4 flex items-center">
                ⚡ 高級功能
              </h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  <span><strong>出價系統</strong>：對心儀NFT進行出價</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  <span><strong>拍賣功能</strong>：限時拍賣稀有物品</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  <span><strong>收藏夾</strong>：收藏感興趣的NFT</span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-2">•</span>
                  <span><strong>交易歷史</strong>：完整的個人交易記錄</span>
                </li>
              </ul>
            </div>

            {/* 社群功能 */}
            <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 rounded-lg p-6 border border-orange-500/20">
              <h4 className="text-lg font-semibold text-orange-400 mb-4 flex items-center">
                🤝 社群功能
              </h4>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start">
                  <span className="text-orange-400 mr-2">•</span>
                  <span><strong>玩家評價</strong>：查看賣家的信譽評分</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-400 mr-2">•</span>
                  <span><strong>交易排行</strong>：頂級玩家和熱門NFT榜單</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-400 mr-2">•</span>
                  <span><strong>市場動態</strong>：實時的市場新聞和趨勢</span>
                </li>
                <li className="flex items-start">
                  <span className="text-orange-400 mr-2">•</span>
                  <span><strong>推薦系統</strong>：個性化的NFT推薦</span>
                </li>
              </ul>
            </div>
          </div>
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

      {/* 底部備註 */}
      <PreviewFooterNote />
    </div>
  );
};