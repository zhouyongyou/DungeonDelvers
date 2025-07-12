import React from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { FatigueDisplay } from './FatigueDisplay';
import { getContractConfig } from '../../config/contracts';
import { bsc } from 'wagmi/chains';

interface Party {
  id: bigint;
  heroes: readonly bigint[];
  relic: bigint;
  fatigue: bigint;
  lastActionTimestamp: bigint;
}

interface PartySelectorProps {
  onPartySelect: (partyId: bigint) => void;
  selectedPartyId?: bigint;
}

export const PartySelector: React.FC<PartySelectorProps> = ({ onPartySelect, selectedPartyId }) => {
  const { address } = useAccount();
  
  // 讀取用戶擁有的隊伍
  const { data: userParties, isLoading: isLoadingParties } = useReadContract({
    ...getContractConfig(bsc.id, 'party'),
    functionName: 'getPartiesByOwner',
    args: [address!],
  } as const);

  // 讀取每個隊伍的詳細信息
  const { data: partiesDetails, isLoading: isLoadingDetails } = useReadContract({
    ...getContractConfig(bsc.id, 'party'),
    functionName: 'getPartiesDetails',
    args: [userParties || []],
  } as const);

  // 讀取選中隊伍的組成信息（包含總戰力）
  const { data: selectedPartyComposition } = useReadContract({
    ...getContractConfig(bsc.id, 'party'),
    functionName: 'getPartyComposition',
    args: [selectedPartyId || 0n],
  } as const);

  // 檢查隊伍是否被鎖定（正在遠征中）
  const { data: partyLocked, isLoading: isLoadingLocks } = useReadContract({
    ...getContractConfig(bsc.id, 'dungeonMaster'),
    functionName: 'isPartyLocked',
    args: [userParties?.[0] || 0n],
  } as const);

  const isLoading = isLoadingParties || isLoadingDetails || isLoadingLocks;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner size="h-8 w-8" />
      </div>
    );
  }

  if (!userParties || userParties.length === 0) {
    return (
      <Card className="text-center p-6">
        <div className="text-4xl mb-4">🏰</div>
        <h3 className="text-xl font-bold mb-2">沒有可用的隊伍</h3>
        <p className="text-gray-400">
          您需要先創建一個隊伍才能開始探險。
        </p>
        <a 
          href="/mint" 
          className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
        >
          前往鑄造
        </a>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 隊伍列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {partiesDetails?.map((party: Party) => {
          const isLocked = partyLocked && party.id === userParties[0];
          const isSelected = selectedPartyId === party.id;
          
          return (
            <Card 
              key={party.id.toString()}
              className={`cursor-pointer transition ${
                isSelected
                  ? 'ring-2 ring-primary' 
                  : isLocked
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:ring-1 hover:ring-primary/50'
              }`}
              onClick={() => !isLocked && onPartySelect(party.id)}
            >
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">
                    隊伍 #{party.id.toString()}
                  </h3>
                  <div className="text-sm text-gray-400">
                    {party.heroes.length} 位英雄
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>疲勞度</span>
                    <span className={Number(party.fatigue) > 50 ? 'text-red-400' : 'text-green-400'}>
                      {party.fatigue.toString()}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>上次行動</span>
                    <span className="text-gray-400">
                      {new Date(Number(party.lastActionTimestamp) * 1000).toLocaleString()}
                    </span>
                  </div>

                  {isLocked && (
                    <div className="mt-2 text-center text-yellow-400 text-sm">
                      ⚔️ 正在遠征中...
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 選中隊伍的詳細疲勞度信息 */}
      {selectedPartyId && selectedPartyComposition && partiesDetails && (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-white mb-4">隊伍詳細信息</h3>
          {(() => {
            const selectedParty = partiesDetails.find(party => party.id === selectedPartyId);
            if (selectedParty) {
              return (
                <FatigueDisplay
                  key={selectedParty.id.toString()}
                  fatigue={selectedParty.fatigue}
                  totalPower={selectedPartyComposition.totalPower}
                />
              );
            }
            return null;
          })()}
        </div>
      )}
    </div>
  );
}; 