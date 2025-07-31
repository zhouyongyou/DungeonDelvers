// src/components/ui/PartyDetailsModal.tsx

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from './Modal';
import { LoadingSpinner } from './LoadingSpinner';
import { NftCard } from './NftCard';
import type { PartyNft, HeroNft, RelicNft } from '../../types/nft';
import { logger } from '../../utils/logger';

import { THE_GRAPH_API_URL } from '../../config/graphConfig';
import { getContractWithABI } from '../../config/contractsWithABI';

interface PartyDetailsModalProps {
  party: PartyNft | null;
  isOpen: boolean;
  onClose: () => void;
}

// GraphQL query to fetch party member details
const GET_PARTY_MEMBERS_QUERY = `
  query GetPartyMembers($heroIds: [String!]!, $relicIds: [String!]!) {
    heros(where: { id_in: $heroIds }) {
      id
      tokenId
      power
      rarity
      contractAddress
    }
    relics(where: { id_in: $relicIds }) {
      id
      tokenId
      capacity
      rarity
      contractAddress
    }
  }
`;

export const PartyDetailsModal: React.FC<PartyDetailsModalProps> = ({
  party,
  isOpen,
  onClose
}) => {
  // Fetch party member details from subgraph
  const { data: members, isLoading } = useQuery({
    queryKey: ['partyMembers', party?.id.toString()],
    queryFn: async () => {
      if (!party || !THE_GRAPH_API_URL) return null;

      // 需要轉換為 contractAddress-tokenId 格式
      const heroContract = getContractWithABI('HERO');
      const relicContract = getContractWithABI('RELIC');
      
      if (!heroContract || !relicContract) {
        logger.error('Failed to get contract addresses');
        return null;
      }
      
      // 如果沒有成員，直接返回空數據
      if (party.heroIds.length === 0 && party.relicIds.length === 0) {
        return { heros: [], relics: [] };
      }
      
      const heroIdStrings = party.heroIds.length > 0 
        ? party.heroIds.map(id => `${heroContract.address.toLowerCase()}-${id.toString()}`)
        : [];
      const relicIdStrings = party.relicIds.length > 0
        ? party.relicIds.map(id => `${relicContract.address.toLowerCase()}-${id.toString()}`)
        : [];

      try {
        const response = await fetch(THE_GRAPH_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: GET_PARTY_MEMBERS_QUERY,
            variables: {
              heroIds: heroIdStrings.length > 0 ? heroIdStrings : ["none"],
              relicIds: relicIdStrings.length > 0 ? relicIdStrings : ["none"]
            }
          })
        });

        const result = await response.json();
        
        if (result.errors) {
          logger.error('GraphQL errors:', result.errors);
          // 不要拋出錯誤，返回空數據
          return { heros: [], relics: [] };
        }

        return result.data || { heros: [], relics: [] };
      } catch (error) {
        logger.error('Failed to fetch party members:', error);
        // 返回空數據而不是拋出錯誤
        return { heros: [], relics: [] };
      }
    },
    enabled: !!party && isOpen,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Process members data
  const { heroes, relics } = useMemo(() => {
    if (!members) return { heroes: [], relics: [] };

    const heroesData: HeroNft[] = (members.heros || []).map((hero: any) => ({
      id: BigInt(hero.tokenId),
      tokenId: BigInt(hero.tokenId),
      name: `英雄 #${hero.tokenId}`,
      image: `/images/hero/hero-${hero.rarity}.png`,
      description: 'A brave hero',
      attributes: [
        { trait_type: 'Power', value: hero.power },
        { trait_type: 'Rarity', value: hero.rarity }
      ],
      contractAddress: hero.contractAddress,
      type: 'hero',
      power: Number(hero.power),
      rarity: Number(hero.rarity)
    }));

    const relicsData: RelicNft[] = (members.relics || []).map((relic: any) => ({
      id: BigInt(relic.tokenId),
      tokenId: BigInt(relic.tokenId),
      name: `聖物 #${relic.tokenId}`,
      image: `/images/relic/relic-${relic.rarity}.png`,
      description: 'An ancient relic',
      attributes: [
        { trait_type: 'Capacity', value: relic.capacity },
        { trait_type: 'Rarity', value: relic.rarity }
      ],
      contractAddress: relic.contractAddress,
      type: 'relic',
      capacity: Number(relic.capacity),
      rarity: Number(relic.rarity)
    }));

    return { heroes: heroesData, relics: relicsData };
  }, [members]);

  if (!party) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${party.name} - 隊伍詳情`}
      onConfirm={onClose}
      confirmText="關閉"
    >
      <div className="space-y-6">
        {/* Party Stats */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">總戰力:</span>
              <span className="ml-2 text-white font-semibold">
                {party.totalPower.toString()}
              </span>
            </div>
            <div>
              <span className="text-gray-400">總容量:</span>
              <span className="ml-2 text-white font-semibold">
                {party.totalCapacity.toString()}
              </span>
            </div>
            <div>
              <span className="text-gray-400">稀有度:</span>
              <span className="ml-2 text-yellow-400">
                {'★'.repeat(Math.min(5, party.partyRarity))}
              </span>
            </div>
            <div>
              <span className="text-gray-400">成員數量:</span>
              <span className="ml-2 text-white font-semibold">
                {party.heroIds.length} 英雄, {party.relicIds.length} 聖物
              </span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="large" />
          </div>
        )}

        {/* Heroes Section */}
        {!isLoading && heroes.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              英雄成員 ({heroes.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {heroes.map((hero) => (
                <NftCard
                  key={hero.id.toString()}
                  nft={hero}
                  selected={false}
                  onClick={() => {}}
                  disabled={true}
                  showDetails={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Relics Section */}
        {!isLoading && relics.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              聖物成員 ({relics.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {relics.map((relic) => (
                <NftCard
                  key={relic.id.toString()}
                  nft={relic}
                  selected={false}
                  onClick={() => {}}
                  disabled={true}
                  showDetails={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* No Members Message */}
        {!isLoading && heroes.length === 0 && relics.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            無法載入隊伍成員資料，請稍後再試
          </div>
        )}
      </div>
    </Modal>
  );
};