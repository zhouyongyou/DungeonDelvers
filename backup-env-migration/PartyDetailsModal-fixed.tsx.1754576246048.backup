// src/components/ui/PartyDetailsModal.tsx - 修復版本
// 使用強化的 GraphQL 查詢解決 indexer 問題和隊伍成員顯示問題

import React, { useMemo } from 'react';
import { Modal } from './Modal';
import { LoadingSpinner } from './LoadingSpinner';
import { NftCard } from './NftCard';
import type { PartyNft, HeroNft, RelicNft } from '../../types/nft';
import { logger } from '../../utils/logger';
import { usePartyDetails } from '../../hooks/useRobustGraphQLQuery';
import { getContractWithABI } from '../../config/contractsWithABI';

interface PartyDetailsModalProps {
  party: PartyNft | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PartyDetailsModal: React.FC<PartyDetailsModalProps> = ({
  party,
  isOpen,
  onClose
}) => {
  // 使用強化的隊伍詳情查詢（自動處理 indexer 錯誤、重試和緩存）
  const { data: partyData, isLoading, error } = usePartyDetails(
    party?.id.toString(),
    {
      enabled: !!party && isOpen,
      maxRetries: 5, // 隊伍詳情很重要，多重試
      cacheSeconds: 120 // 緩存 2 分鐘
    }
  );

  // 處理數據並轉換為前端需要的格式
  const { heroes, relics, memberCount, hasData } = useMemo(() => {
    if (!partyData?.party) {
      return { heroes: [], relics: [], memberCount: 0, hasData: false };
    }

    const partyInfo = partyData.party;
    
    // 從子圖數據創建英雄列表
    const heroesData: HeroNft[] = (partyInfo.heroes || []).map((hero: any) => ({
      id: BigInt(hero.tokenId),
      tokenId: BigInt(hero.tokenId),
      name: `英雄 #${hero.tokenId}`,
      image: `/images/hero/hero-${hero.rarity}.png`,
      description: 'A brave hero',
      attributes: [
        { trait_type: 'Power', value: hero.power },
        { trait_type: 'Rarity', value: hero.rarity }
      ],
      contractAddress: hero.owner?.id || party?.contractAddress || '',
      type: 'hero',
      power: Number(hero.power),
      rarity: Number(hero.rarity)
    }));

    // 從子圖數據創建聖物列表
    const relicsData: RelicNft[] = (partyInfo.relics || []).map((relic: any) => ({
      id: BigInt(relic.tokenId),
      tokenId: BigInt(relic.tokenId),
      name: `聖物 #${relic.tokenId}`,
      image: `/images/relic/relic-${relic.rarity}.png`,
      description: 'An ancient relic',
      attributes: [
        { trait_type: 'Capacity', value: relic.capacity },
        { trait_type: 'Rarity', value: relic.rarity }
      ],
      contractAddress: relic.owner?.id || party?.contractAddress || '',
      type: 'relic',
      capacity: Number(relic.capacity),
      rarity: Number(relic.rarity)
    }));

    const memberCount = heroesData.length + relicsData.length;
    const hasData = memberCount > 0 || (partyInfo.heroIds?.length > 0) || (partyInfo.relicIds?.length > 0);

    logger.info('🎯 隊伍成員數據處理完成', {
      partyId: party?.id.toString(),
      heroesCount: heroesData.length,
      relicsCount: relicsData.length,
      heroIdsCount: partyInfo.heroIds?.length || 0,
      relicIdsCount: partyInfo.relicIds?.length || 0,
      hasData
    });

    return { heroes: heroesData, relics: relicsData, memberCount, hasData };
  }, [partyData, party]);

  // 計算出征統計
  const expeditionStats = useMemo(() => {
    if (!partyData?.party?.expeditions) {
      return { total: 0, successful: 0, successRate: 0 };
    }

    const expeditions = partyData.party.expeditions;
    const total = expeditions.length;
    const successful = expeditions.filter((exp: any) => exp.success).length;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    return { total, successful, successRate };
  }, [partyData]);

  if (!party) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`隊伍詳情 - ${party.name}`}
      size="large"
    >
      <div className="space-y-6">
        {/* 隊伍基本信息 */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">隊伍編號:</span>
              <div className="text-white font-medium">#{party.tokenId.toString()}</div>
            </div>
            <div>
              <span className="text-gray-400">總戰力:</span>
              <div className="text-blue-400 font-medium">{party.totalPower || partyData?.party?.totalPower || 'N/A'}</div>
            </div>
            <div>
              <span className="text-gray-400">成員數量:</span>
              <div className="text-green-400 font-medium">
                {isLoading ? (
                  <LoadingSpinner size="h-4 w-4" />
                ) : (
                  `${heroes.length} 英雄, ${relics.length} 聖物`
                )}
              </div>
            </div>
            <div>
              <span className="text-gray-400">出征成功率:</span>
              <div className="text-purple-400 font-medium">
                {expeditionStats.total > 0 ? `${expeditionStats.successRate.toFixed(1)}%` : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* 成員顯示區域 */}
        <div>
          <h3 className="text-lg font-semibold text-white mb-4">隊伍成員</h3>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <LoadingSpinner size="h-8 w-8" />
                <p className="text-gray-400 mt-2">載入隊伍成員中...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
              <p className="text-red-400 mb-2">⚠️ 載入成員資料時發生錯誤</p>
              <p className="text-sm text-gray-400">
                {error instanceof Error ? error.message : '未知錯誤'}
              </p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm transition-colors"
              >
                重新載入
              </button>
            </div>
          ) : !hasData ? (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 text-center">
              <p className="text-yellow-400 mb-2">🔍 隊伍成員資料暫時無法顯示</p>
              <p className="text-sm text-gray-400 mb-3">
                這可能是子圖正在同步新的合約數據
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• 隊伍總戰力：{party.totalPower || partyData?.party?.totalPower || 'N/A'}</p>
                <p>• 預期成員數：{partyData?.party?.heroIds?.length || 0} 英雄 + {partyData?.party?.relicIds?.length || 0} 聖物</p>
                <p>• 建議稍後重新查看或重新載入頁面</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 英雄區域 */}
              {heroes.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-300 mb-3">
                    英雄 ({heroes.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {heroes.map((hero) => (
                      <NftCard key={hero.id.toString()} nft={hero} />
                    ))}
                  </div>
                </div>
              )}

              {/* 聖物區域 */}
              {relics.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-300 mb-3">
                    聖物 ({relics.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {relics.map((relic) => (
                      <NftCard key={relic.id.toString()} nft={relic} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 最近出征記錄 */}
        {partyData?.party?.expeditions && partyData.party.expeditions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">最近出征記錄</h3>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="space-y-3">
                {partyData.party.expeditions.slice(0, 5).map((expedition: any) => (
                  <div key={expedition.id} className="flex justify-between items-center p-3 bg-gray-700 rounded-lg">
                    <div>
                      <span className="text-white font-medium">{expedition.dungeonName}</span>
                      <div className="text-xs text-gray-400">
                        {new Date(parseInt(expedition.timestamp) * 1000).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs ${
                        expedition.success 
                          ? 'bg-green-600 text-white' 
                          : 'bg-red-600 text-white'
                      }`}>
                        {expedition.success ? '成功' : '失敗'}
                      </span>
                      {expedition.success && expedition.reward && (
                        <div className="text-xs text-green-400 mt-1">
                          +{expedition.reward} SOUL
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 調試信息（僅開發環境） */}
        {import.meta.env.DEV && partyData?.party && (
          <details className="bg-gray-900 rounded-lg p-4">
            <summary className="text-sm text-gray-400 cursor-pointer">🔧 調試信息</summary>
            <pre className="text-xs text-gray-500 mt-2 overflow-auto">
              {JSON.stringify({
                heroIds: partyData.party.heroIds,
                relicIds: partyData.party.relicIds,
                heroesLength: partyData.party.heroes?.length,
                relicsLength: partyData.party.relics?.length,
                totalPower: partyData.party.totalPower
              }, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </Modal>
  );
};