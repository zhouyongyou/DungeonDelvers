import React from 'react';
import { useAccount, useChainId, useReadContract } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { Card } from '../components/ui/Card';
import { ConnectWallet } from '../components/ui/ConnectWallet';
import { getContractConfig } from '../config/contracts';

const MyAssetsPage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // 讀取各種 NFT 的餘額
  const { data: heroBalance } = useReadContract({
    ...getContractConfig(chainId, 'hero'),
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: relicBalance } = useReadContract({
    ...getContractConfig(chainId, 'relic'),
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: partyBalance } = useReadContract({
    ...getContractConfig(chainId, 'party'),
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <ConnectWallet />
      </div>
    );
  }

  if (chainId !== bsc.id) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">錯誤的網路</h2>
          <p className="text-gray-300">請切換到 BSC 網路</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">我的資產</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="text-center">
            <div className="text-4xl mb-4">⚔️</div>
            <h3 className="text-xl font-bold text-white mb-2">英雄</h3>
            <p className="text-3xl font-bold text-yellow-400">
              {heroBalance ? heroBalance.toString() : '0'}
            </p>
            <p className="text-gray-400 mt-2">擁有的英雄數量</p>
          </Card>

          <Card className="text-center">
            <div className="text-4xl mb-4">🏺</div>
            <h3 className="text-xl font-bold text-white mb-2">遺物</h3>
            <p className="text-3xl font-bold text-yellow-400">
              {relicBalance ? relicBalance.toString() : '0'}
            </p>
            <p className="text-gray-400 mt-2">擁有的遺物數量</p>
          </Card>

          <Card className="text-center">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-bold text-white mb-2">隊伍</h3>
            <p className="text-3xl font-bold text-yellow-400">
              {partyBalance ? partyBalance.toString() : '0'}
            </p>
            <p className="text-gray-400 mt-2">擁有的隊伍數量</p>
          </Card>
        </div>

        <Card>
          <h2 className="text-2xl font-bold text-white mb-4">資產詳情</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-700/50 rounded-lg">
              <span className="text-gray-300">錢包地址</span>
              <span className="text-white font-mono">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '未連接'}
              </span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-gray-700/50 rounded-lg">
              <span className="text-gray-300">網路</span>
              <span className="text-white">BSC 主網</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-gray-700/50 rounded-lg">
              <span className="text-gray-300">總 NFT 數量</span>
              <span className="text-white font-bold">
                {((heroBalance || 0n) + (relicBalance || 0n) + (partyBalance || 0n)).toString()}
              </span>
            </div>
          </div>
        </Card>

        <Card className="mt-6">
          <h2 className="text-2xl font-bold text-white mb-4">功能狀態</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-green-400">✅</span>
              <span className="text-gray-300">NFT 餘額查詢</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">🔄</span>
              <span className="text-gray-300">NFT 詳細資訊（重構中）</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">🔄</span>
              <span className="text-gray-300">NFT 圖片顯示（重構中）</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400">🔄</span>
              <span className="text-gray-300">NFT 交易功能（重構中）</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MyAssetsPage;
