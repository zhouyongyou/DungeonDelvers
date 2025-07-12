import React, { useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { Card } from '../components/ui/Card';
import { ConnectWallet } from '../components/ui/ConnectWallet';
import { PartySelector } from '../components/dungeon/PartySelector';
import { ExpeditionActions } from '../components/dungeon/ExpeditionActions';

const DungeonPage: React.FC = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [selectedPartyId, setSelectedPartyId] = useState<bigint>();

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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：隊伍選擇 */}
          <div className="lg:col-span-2">
            <Card className="p-4">
              <h2 className="text-xl font-bold text-white mb-4">選擇隊伍</h2>
              <PartySelector
                selectedPartyId={selectedPartyId}
                onPartySelect={setSelectedPartyId}
              />
            </Card>
          </div>

          {/* 右側：操作面板 */}
          <div>
            <Card className="p-4">
              <h2 className="text-xl font-bold text-white mb-4">探險操作</h2>
              {selectedPartyId ? (
                <ExpeditionActions
                  partyId={selectedPartyId}
                  onSuccess={() => {
                    // 重置選擇的隊伍，強制重新加載數據
                    setSelectedPartyId(undefined);
                  }}
                />
              ) : (
                <div className="text-center text-gray-400">
                  請先選擇一個隊伍
                </div>
              )}
            </Card>

            {/* 探險規則說明 */}
            <Card className="mt-4 p-4">
              <h2 className="text-xl font-bold text-white mb-4">探險規則</h2>
              <div className="space-y-2 text-sm text-gray-300">
                <p>• 每次探險消耗 1 次儲備</p>
                <p>• 探險成功可獲得 SoulShard 獎勵</p>
                <p>• 探險失敗不消耗儲備，但會增加疲勞</p>
                <p>• 疲勞度超過 50% 時建議休息</p>
                <p>• 休息需要消耗 SoulShard</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DungeonPage;
