import React from 'react';
import { useAccount, useChainId } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { Card } from '../components/ui/Card';
import { ConnectWallet } from '../components/ui/ConnectWallet';

const DungeonPage: React.FC = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();

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
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">地城探險</h1>
        
        <Card className="text-center">
          <div className="text-6xl mb-6">🏰</div>
          <h2 className="text-2xl font-bold text-white mb-4">探險系統</h2>
          <p className="text-gray-300 mb-6">
            地城探險功能正在重構中，敬請期待！
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <span className="text-yellow-400">🔄</span>
              <span className="text-gray-300">隊伍選擇系統</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-yellow-400">🔄</span>
              <span className="text-gray-300">探險啟動功能</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-yellow-400">🔄</span>
              <span className="text-gray-300">戰鬥結果顯示</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DungeonPage;
