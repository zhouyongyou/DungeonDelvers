// 市場頁面 - 重定向到 OKX NFT 市場
import React from 'react';
import { ActionButton } from '../components/ui/ActionButton';
import { Icons } from '../components/ui/icons';
import { CONTRACTS } from '../config/contracts';
import { bsc } from 'wagmi/chains';

export const MarketplaceRedirect: React.FC = () => {
  const bscChainId = bsc.id;
  const heroAddress = CONTRACTS[bscChainId].HERO.toLowerCase();
  const relicAddress = CONTRACTS[bscChainId].RELIC.toLowerCase();
  const partyAddress = CONTRACTS[bscChainId].PARTY.toLowerCase();
  
  const okxBaseUrl = 'https://web3.okx.com/zh-hant/nft/collection/bsc/';
  
  const handleRedirectToOKX = (contractAddress?: string) => {
    const url = contractAddress 
      ? `${okxBaseUrl}${contractAddress}`
      : `${okxBaseUrl}${heroAddress}`; // 預設顯示英雄
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* 頁面標題 */}
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            NFT 市場
          </h1>
          <p className="text-gray-400 text-lg">
            探索和交易 DungeonDelvers NFT
          </p>
        </div>

        {/* 主要內容區域 */}
        <div className="max-w-4xl mx-auto">
          {/* OKX 市場推薦卡片 */}
          <div className="bg-gradient-to-br from-orange-600/20 to-orange-500/10 border border-orange-500/30 rounded-xl p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                <Icons.ExternalLink className="w-8 h-8 text-orange-400" />
              </div>
              <h2 className="text-2xl font-bold text-orange-400 mb-2">
                訪問 OKX NFT 市場
              </h2>
              <p className="text-gray-300 mb-6">
                在全球領先的 NFT 市場上買賣 DungeonDelvers NFT
              </p>
            </div>

            {/* 功能特色 */}
            <div className="grid md:grid-cols-3 gap-4 mb-8 text-sm">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <Icons.Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <div className="font-semibold text-blue-400">安全交易</div>
                <div className="text-gray-400">多重安全保障</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <Icons.TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
                <div className="font-semibold text-green-400">流動性高</div>
                <div className="text-gray-400">活躍的交易社群</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <Icons.Zap className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                <div className="font-semibold text-yellow-400">交易便利</div>
                <div className="text-gray-400">簡單易用的介面</div>
              </div>
            </div>

            {/* 行動按鈕 */}
            <div className="flex justify-center">
              <ActionButton
                onClick={() => handleRedirectToOKX()}
                variant="primary"
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-8 py-3 text-lg font-semibold"
              >
                <Icons.ExternalLink className="w-5 h-5 mr-2" />
                前往 OKX NFT 市場
              </ActionButton>
            </div>

            <p className="text-gray-400 text-sm mt-4">
              將在新標籤頁中開啟 OKX NFT 市場
            </p>
          </div>

          {/* 資訊說明 */}
          <div className="mt-8 bg-gray-800/30 border border-gray-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">
              <Icons.Info className="w-5 h-5 inline mr-2 text-blue-400" />
              市場功能升級中
            </h3>
            <div className="text-gray-400 space-y-2">
              <p>
                • 我們正在優化內部市場系統以提供更好的用戶體驗
              </p>
              <p>
                • 在此期間，建議使用 OKX NFT 市場進行交易
              </p>
              <p>
                • 所有 DungeonDelvers NFT 都可在 OKX 上正常交易
              </p>
            </div>
          </div>

          {/* NFT 類型快速連結 */}
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <div className="bg-gray-800/20 border border-gray-700 rounded-lg p-4">
              <div className="text-center mb-3">
                <Icons.Sword className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-200">英雄 NFT</h4>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                具有獨特技能和屬性的戰士
              </p>
              <ActionButton
                onClick={() => handleRedirectToOKX(heroAddress)}
                variant="secondary"
                size="sm"
                className="w-full"
              >
                查看英雄市場
              </ActionButton>
            </div>
            
            <div className="bg-gray-800/20 border border-gray-700 rounded-lg p-4">
              <div className="text-center mb-3">
                <Icons.Shield className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-200">聖物 NFT</h4>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                強化英雄能力的神秘物品
              </p>
              <ActionButton
                onClick={() => handleRedirectToOKX(relicAddress)}
                variant="secondary"
                size="sm"
                className="w-full"
              >
                查看聖物市場
              </ActionButton>
            </div>
            
            <div className="bg-gray-800/20 border border-gray-700 rounded-lg p-4">
              <div className="text-center mb-3">
                <Icons.Users className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <h4 className="font-semibold text-gray-200">隊伍 NFT</h4>
              </div>
              <p className="text-gray-400 text-sm mb-3">
                組合英雄和聖物的戰隊
              </p>
              <ActionButton
                onClick={() => handleRedirectToOKX(partyAddress)}
                variant="secondary"
                size="sm"
                className="w-full"
              >
                查看隊伍市場
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceRedirect;