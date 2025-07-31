// 類型測試文件：驗證 GraphQL Code Generator 生成的類型
import type { 
  GetPlayerAnalyticsQuery, 
  GetPlayerAnalyticsQueryVariables,
  Player,
  PlayerProfile,
  Party,
  Expedition
} from './generated';

// 🎯 驗證查詢變數類型
const testVariables: GetPlayerAnalyticsQueryVariables = {
  address: "0x1234567890123456789012345678901234567890"
};

// 🎯 驗證查詢響應類型
const testResponse: GetPlayerAnalyticsQuery = {
  __typename: 'Query',
  player: {
    __typename: 'Player',
    id: "0x1234567890123456789012345678901234567890",
    profile: {
      __typename: 'PlayerProfile',
      id: "0x1234567890123456789012345678901234567890",
      name: "測試玩家",
      level: 10,
      experience: "1000",
      successfulExpeditions: 5,
      totalRewardsEarned: "500"
    },
    parties: [
      {
        __typename: 'Party',
        id: "party-1",
        tokenId: "1",
        name: "測試隊伍",
        totalPower: "1000"
      }
    ],
    expeditions: [
      {
        __typename: 'Expedition',
        id: "expedition-1",
        success: true,
        reward: "100",
        expGained: "50",
        timestamp: "1640995200",
        dungeonId: "1",
        dungeonName: "測試地下城",
        party: {
          __typename: 'Party',
          id: "party-1",
          name: "測試隊伍"
        }
      }
    ]
  }
};

// 🎯 類型安全的數據處理函數
export function processPlayerData(data: GetPlayerAnalyticsQuery): {
  hasProfile: boolean;
  playerName: string;
  totalParties: number;
  totalExpeditions: number;
  successRate: number;
} {
  const player = data.player;
  
  if (!player) {
    return {
      hasProfile: false,
      playerName: '未知玩家',
      totalParties: 0,
      totalExpeditions: 0,
      successRate: 0
    };
  }

  // TypeScript 完全知道這些類型！
  const profile = player.profile;
  const parties = player.parties || [];
  const expeditions = player.expeditions || [];
  
  const successfulExpeditions = expeditions.filter(exp => exp.success).length;
  const successRate = expeditions.length > 0 
    ? (successfulExpeditions / expeditions.length) * 100 
    : 0;

  return {
    hasProfile: !!profile,
    playerName: profile?.name || '未命名玩家',
    totalParties: parties.length,
    totalExpeditions: expeditions.length,
    successRate: Math.round(successRate * 100) / 100
  };
}

// 🎯 類型測試：驗證所有欄位都存在且類型正確
function typeTests() {
  const profile: PlayerProfile = {
    __typename: 'PlayerProfile',
    id: "test",
    name: "test",
    level: 1,
    experience: "100",
    successfulExpeditions: 1,
    totalRewardsEarned: "50",
    inviter: null,
    invitees: [],
    commissionEarned: "0",
    createdAt: "1640995200",
    lastUpdatedAt: null,
    owner: {
      __typename: 'Player',
      id: "test"
    } as Player
  };

  // 如果這些編譯通過，就表示類型生成正確！
  console.log('✅ PlayerProfile 類型正確');
  
  return {
    testVariables,
    testResponse,
    profile
  };
}

// 導出類型測試函數（僅在開發環境）
interface WindowWithTypeTests extends Window {
  testGraphQLTypes?: typeof typeTests;
}

if (import.meta.env.DEV) {
  const windowWithDevTools = window as WindowWithTypeTests;
  windowWithDevTools.testGraphQLTypes = typeTests;
  console.log('🔧 GraphQL 類型測試函數已註冊到 window.testGraphQLTypes');
}

export { typeTests };