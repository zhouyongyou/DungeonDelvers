// 子圖健康檢查工具 - 使用 GraphQL Code Generator 生成的類型
import { THE_GRAPH_API_URL } from '../config/graphConfig';
import type { 
  GetPartyDetailsQuery,
  GetPartyDetailsQueryVariables,
  GetPlayerPartiesQuery, 
  GetPlayerPartiesQueryVariables,
  GetExpeditionHistoryQuery,
  GetExpeditionHistoryQueryVariables 
} from '../gql/generated';

// 查詢字符串
const GET_PARTY_DETAILS_QUERY = `
  query GetPartyDetails($partyId: ID!) {
    party(id: $partyId) {
      id
      tokenId
      name
      owner { id }
      heroIds
      heroes {
        id
        tokenId
        rarity
        power
        owner { id }
      }
      relicIds  
      relics {
        id
        tokenId
        rarity
        capacity
        owner { id }
      }
      totalPower
      totalCapacity
      partyRarity
      provisionsRemaining
      unclaimedRewards
      cooldownEndsAt
      expeditions(first: 10, orderBy: timestamp, orderDirection: desc) {
        id
        dungeonId
        dungeonName
        success
        reward
        expGained
        timestamp
        player { id }
      }
      createdAt
      lastUpdatedAt
      isBurned
    }
  }
`;

const GET_PLAYER_PARTIES_QUERY = `
  query GetPlayerParties($playerId: ID!) {
    player(id: $playerId) {
      id
      parties(first: 10, orderBy: totalPower, orderDirection: desc) {
        id
        tokenId
        name
        totalPower
        heroIds
        relicIds
        heroes {
          id
          tokenId
        }
        relics {
          id  
          tokenId
        }
        expeditions(first: 1, orderBy: timestamp, orderDirection: desc) {
          id
          success
          timestamp
          dungeonName
        }
      }
    }
  }
`;

// 類型安全的查詢函數
async function executeQuery<T>(query: string, variables: any): Promise<T | null> {
  try {
    const response = await fetch(THE_GRAPH_API_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('❌ GraphQL Errors:', result.errors);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('❌ Query Error:', error);
    return null;
  }
}

// 子圖健康檢查函數
export class SubgraphChecker {
  
  // 檢查特定隊伍的詳情
  async checkPartyDetails(partyId: string): Promise<{
    success: boolean;
    issues: string[];
    data?: GetPartyDetailsQuery['party'];
  }> {
    console.log(`🔍 檢查隊伍詳情: ${partyId}`);
    
    const variables: GetPartyDetailsQueryVariables = { partyId };
    const data = await executeQuery<GetPartyDetailsQuery>(GET_PARTY_DETAILS_QUERY, variables);
    
    const issues: string[] = [];
    
    if (!data?.party) {
      issues.push('隊伍不存在或查詢失敗');
      return { success: false, issues };
    }

    const party = data.party;

    // 檢查關鍵問題
    if (party.heroIds.length === 0) {
      issues.push('⚠️ heroIds 為空數組');
    }
    
    if (party.relicIds.length === 0) {
      issues.push('⚠️ relicIds 為空數組');
    }

    if (party.heroes.length === 0) {
      issues.push('❌ heroes 陣列為空');
    }

    if (party.relics.length === 0) {
      issues.push('❌ relics 陣列為空');
    }

    // 檢查數據一致性
    if (party.heroIds.length !== party.heroes.length) {
      issues.push(`❌ heroIds (${party.heroIds.length}) 與 heroes (${party.heroes.length}) 數量不一致`);
    }

    if (party.relicIds.length !== party.relics.length) {
      issues.push(`❌ relicIds (${party.relicIds.length}) 與 relics (${party.relics.length}) 數量不一致`);
    }

    // 檢查所有權
    party.heroes.forEach((hero, index) => {
      if (hero.owner.id !== party.owner.id) {
        issues.push(`🔍 Hero ${hero.tokenId} 的擁有者 (${hero.owner.id}) 不是玩家 (${party.owner.id})`);
      }
    });

    party.relics.forEach((relic, index) => {
      if (relic.owner.id !== party.owner.id) {
        issues.push(`🔍 Relic ${relic.tokenId} 的擁有者 (${relic.owner.id}) 不是玩家 (${party.owner.id})`);
      }
    });

    console.log(`✅ 隊伍檢查完成: ${issues.length} 個問題`);
    
    return {
      success: issues.length === 0,
      issues,
      data: party
    };
  }

  // 檢查玩家的所有隊伍
  async checkPlayerParties(playerId: string): Promise<{
    success: boolean;
    issues: string[];
    partiesCount: number;
    data?: GetPlayerPartiesQuery['player'];
  }> {
    console.log(`🔍 檢查玩家隊伍: ${playerId}`);
    
    const variables: GetPlayerPartiesQueryVariables = { playerId };
    const data = await executeQuery<GetPlayerPartiesQuery>(GET_PLAYER_PARTIES_QUERY, variables);
    
    const issues: string[] = [];
    
    if (!data?.player) {
      issues.push('玩家不存在或查詢失敗');
      return { success: false, issues, partiesCount: 0 };
    }

    const player = data.player;
    const parties = player.parties || [];

    console.log(`📊 找到 ${parties.length} 支隊伍`);

    // 檢查每支隊伍
    parties.forEach((party, index) => {
      if (party.heroIds.length === 0 && party.relicIds.length === 0) {
        issues.push(`❌ 隊伍 ${party.name} (#${party.tokenId}) 沒有任何成員`);
      }

      if (party.heroes.length === 0 && party.relics.length === 0) {
        issues.push(`❌ 隊伍 ${party.name} 無法載入成員詳情`);
      }

      if (party.totalPower === '0') {
        issues.push(`⚠️ 隊伍 ${party.name} 戰力為 0`);
      }
    });

    return {
      success: issues.length === 0,
      issues,
      partiesCount: parties.length,
      data: player
    };
  }

  // 全面健康檢查
  async healthCheck(playerId: string): Promise<{
    overall: boolean;
    results: {
      playerParties: any;
      partyDetails: any[];
    };
  }> {
    console.log('🏥 開始子圖健康檢查...');
    
    // 1. 檢查玩家隊伍
    const playerPartiesResult = await this.checkPlayerParties(playerId);
    
    // 2. 檢查每支隊伍的詳情
    const partyDetailsResults = [];
    
    if (playerPartiesResult.data?.parties) {
      for (const party of playerPartiesResult.data.parties) {
        const result = await this.checkPartyDetails(party.id);
        partyDetailsResults.push(result);
      }
    }

    const overall = playerPartiesResult.success && partyDetailsResults.every(r => r.success);

    console.log(`🏥 健康檢查完成: ${overall ? '✅ 健康' : '❌ 發現問題'}`);

    return {
      overall,
      results: {
        playerParties: playerPartiesResult,
        partyDetails: partyDetailsResults
      }
    };
  }
}

// 便捷函數
export async function quickHealthCheck(playerId: string) {
  const checker = new SubgraphChecker();
  const result = await checker.healthCheck(playerId);
  
  console.log('\n📋 健康檢查報告:');
  console.log('==================');
  console.log(`總體狀態: ${result.overall ? '✅ 健康' : '❌ 有問題'}`);
  console.log(`隊伍數量: ${result.results.playerParties.partiesCount}`);
  
  if (result.results.playerParties.issues.length > 0) {
    console.log('\n玩家隊伍問題:');
    result.results.playerParties.issues.forEach((issue: string) => console.log(`  ${issue}`));
  }
  
  result.results.partyDetails.forEach((party: any, index: number) => {
    if (party.issues.length > 0) {
      console.log(`\n隊伍 ${index + 1} 問題:`);
      party.issues.forEach((issue: string) => console.log(`  ${issue}`));
    }
  });

  return result;
}

// 開發環境暴露到 window
interface WindowWithSubgraphTools extends Window {
  subgraphChecker?: SubgraphChecker;
  quickHealthCheck?: typeof quickHealthCheck;
}

if (import.meta.env.DEV) {
  const windowWithDevTools = window as WindowWithSubgraphTools;
  windowWithDevTools.subgraphChecker = new SubgraphChecker();
  windowWithDevTools.quickHealthCheck = quickHealthCheck;
  console.log('🔧 子圖檢查工具已註冊到 window.subgraphChecker 和 window.quickHealthCheck');
}