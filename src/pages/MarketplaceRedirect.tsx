// 市場頁面 - 根據錢包連接狀態顯示不同內容
import React from 'react';
import { useAccount } from 'wagmi';
import { ActionButton } from '../components/ui/ActionButton';
import { Icons } from '../components/ui/icons';
import { CONTRACTS } from '../config/contracts';
import { bsc } from 'wagmi/chains';

export const MarketplaceRedirect: React.FC = () => {
  const { isConnected } = useAccount();
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

  // 未連接錢包時顯示 OKX 市場介紹和預覽
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              NFT 市場
            </h1>
            <p className="text-gray-400 text-lg">
              在 OKX NFT 市場探索和交易 DungeonDelvers NFT
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* 市場介紹卡片 */}
            <div className="bg-gradient-to-br from-orange-600/20 to-orange-500/10 border border-orange-500/30 rounded-xl p-8 text-center mb-8">
              <div className="mb-6">
                <div className="w-16 h-16 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                  <Icons.ExternalLink className="w-8 h-8 text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold text-orange-400 mb-2">
                  OKX NFT 市場
                </h2>
                <p className="text-gray-300 mb-6">
                  全球領先的 NFT 交易平台，安全便捷交易 DungeonDelvers NFT
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

              {/* 三個 NFT 類型按鈕 */}
              <div className="grid md:grid-cols-3 gap-4">
                <ActionButton
                  onClick={() => handleRedirectToOKX(heroAddress)}
                  variant="primary"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-6 py-3"
                >
                  <Icons.Hero className="w-4 h-4 mr-2" />
                  交易英雄
                </ActionButton>
                <ActionButton
                  onClick={() => handleRedirectToOKX(relicAddress)}
                  variant="primary"
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 px-6 py-3"
                >
                  <Icons.Shield className="w-4 h-4 mr-2" />
                  交易聖物
                </ActionButton>
                <ActionButton
                  onClick={() => handleRedirectToOKX(partyAddress)}
                  variant="primary"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 px-6 py-3"
                >
                  <Icons.Users className="w-4 h-4 mr-2" />
                  交易隊伍
                </ActionButton>
              </div>

              <p className="text-gray-400 text-sm mt-4">
                將在新標籤頁中開啟對應的 OKX NFT 市場
              </p>
            </div>

            {/* 簡化的資訊說明 */}
            <div className="mt-8 bg-gray-800/30 border border-gray-700 rounded-xl p-6 text-center">
              <h3 className="text-lg font-semibold mb-2 text-gray-200">
                <Icons.Info className="w-5 h-5 inline mr-2 text-blue-400" />
                交易提醒
              </h3>
              <p className="text-gray-400">
                連接錢包後可獲得更多功能和更便捷的交易體驗
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 已連接錢包時顯示快速交易選項
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
          {/* 三個 NFT 類型的快速交易按鈕 */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* 英雄 NFT */}
            <div className="bg-gradient-to-br from-blue-600/20 to-blue-500/10 border border-blue-500/30 rounded-xl p-6 text-center">
              <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                <Icons.Hero className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-blue-400 mb-2">英雄 NFT</h3>
              <p className="text-gray-300 mb-4 text-sm">
                具有獨特技能和屬性的戰士
              </p>
              <ActionButton
                onClick={() => handleRedirectToOKX(heroAddress)}
                variant="primary"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
              >
                <Icons.ExternalLink className="w-4 h-4 mr-2" />
                交易英雄
              </ActionButton>
            </div>

            {/* 聖物 NFT */}
            <div className="bg-gradient-to-br from-purple-600/20 to-purple-500/10 border border-purple-500/30 rounded-xl p-6 text-center">
              <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                <Icons.Shield className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-purple-400 mb-2">聖物 NFT</h3>
              <p className="text-gray-300 mb-4 text-sm">
                強化英雄能力的神秘物品
              </p>
              <ActionButton
                onClick={() => handleRedirectToOKX(relicAddress)}
                variant="primary"
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                <Icons.ExternalLink className="w-4 h-4 mr-2" />
                交易聖物
              </ActionButton>
            </div>

            {/* 隊伍 NFT */}
            <div className="bg-gradient-to-br from-green-600/20 to-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <Icons.Users className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-green-400 mb-2">隊伍 NFT</h3>
              <p className="text-gray-300 mb-4 text-sm">
                組合英雄和聖物的戰隊
              </p>
              <ActionButton
                onClick={() => handleRedirectToOKX(partyAddress)}
                variant="primary"
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                <Icons.ExternalLink className="w-4 h-4 mr-2" />
                交易隊伍
              </ActionButton>
            </div>
          </div>

          {/* OKX 市場推薦卡片 */}
          <div className="bg-gradient-to-br from-orange-600/20 to-orange-500/10 border border-orange-500/30 rounded-xl p-6 text-center">
            <div className="mb-4">
              <h4 className="text-lg font-bold text-orange-400 mb-2">
                <Icons.ExternalLink className="w-5 h-5 inline mr-2" />
                在 OKX NFT 市場交易
              </h4>
              <p className="text-gray-300 text-sm mb-4">
                全球領先的 NFT 市場，安全便捷的交易環境
              </p>
            </div>

            <ActionButton
              onClick={() => handleRedirectToOKX()}
              variant="secondary"
              className="bg-gradient-to-r from-orange-500/20 to-orange-600/20 hover:from-orange-500/30 hover:to-orange-600/30 border border-orange-500/50"
            >
              <Icons.ExternalLink className="w-4 h-4 mr-2" />
              瀏覽所有 NFT
            </ActionButton>
          </div>

          {/* 簡化的資訊說明 */}
          <div className="mt-8 bg-gray-800/30 border border-gray-700 rounded-xl p-6 text-center">
            <h3 className="text-lg font-semibold mb-2 text-gray-200">
              <Icons.Info className="w-5 h-5 inline mr-2 text-blue-400" />
              交易提醒
            </h3>
            <p className="text-gray-400">
              目前所有 DungeonDelvers NFT 交易通過 OKX NFT 市場進行，安全便捷
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceRedirect;