// testGraphQL.ts - 測試子圖查詢支援
import { THE_GRAPH_API_URL } from '../config/graphConfig';

// 測試基本的玩家查詢
const TEST_PLAYER_QUERY = `
  query TestPlayer($address: String!) {
    player(id: $address) {
      id
      totalRewardsEarned
      totalExpeditions
      successfulExpeditions
    }
  }
`;

// 測試遠征查詢
const TEST_EXPEDITIONS_QUERY = `
  query TestExpeditions($first: Int!) {
    expeditions(first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      success
      rewardAmount
      timestamp
      player {
        id
      }
      dungeon {
        id
        name
      }
      party {
        id
        name
      }
    }
  }
`;

// 測試隊伍查詢
const TEST_PARTIES_QUERY = `
  query TestParties($first: Int!) {
    parties(first: $first) {
      id
      tokenId
      name
      totalPower
      totalRewardsEarned
      owner {
        id
      }
    }
  }
`;

export async function testGraphQLSupport() {
  if (!THE_GRAPH_API_URL) {
    console.error('❌ The Graph API URL not configured');
    return {
      configured: false,
      playerQuery: false,
      expeditionsQuery: false,
      partiesQuery: false
    };
  }

  console.log('🔍 Testing GraphQL support...');
  console.log('API URL:', THE_GRAPH_API_URL);

  const results = {
    configured: true,
    playerQuery: false,
    expeditionsQuery: false,
    partiesQuery: false,
    error: null as string | null
  };

  try {
    // 測試基本連接
    console.log('Testing basic connection...');
    const response = await fetch(THE_GRAPH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query {
            _meta {
              block {
                number
                timestamp
              }
            }
          }
        `
      })
    });

    if (!response.ok) {
      results.error = `HTTP ${response.status}: ${response.statusText}`;
      console.error('❌ Basic connection failed:', results.error);
      return results;
    }

    const metaResult = await response.json();
    if (metaResult.errors) {
      results.error = metaResult.errors[0]?.message || 'Meta query failed';
      console.error('❌ Meta query failed:', results.error);
      return results;
    }

    console.log('✅ Basic connection successful');
    console.log('Block number:', metaResult.data._meta.block.number);

    // 測試玩家查詢
    console.log('Testing player query...');
    const playerResponse = await fetch(THE_GRAPH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: TEST_PLAYER_QUERY,
        variables: { address: '0x0000000000000000000000000000000000000001' }
      })
    });

    const playerResult = await playerResponse.json();
    if (!playerResult.errors) {
      results.playerQuery = true;
      console.log('✅ Player query supported');
    } else {
      console.log('❌ Player query not supported:', playerResult.errors[0]?.message);
    }

    // 測試遠征查詢
    console.log('Testing expeditions query...');
    const expeditionsResponse = await fetch(THE_GRAPH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: TEST_EXPEDITIONS_QUERY,
        variables: { first: 5 }
      })
    });

    const expeditionsResult = await expeditionsResponse.json();
    if (!expeditionsResult.errors) {
      results.expeditionsQuery = true;
      console.log('✅ Expeditions query supported');
      console.log('Found expeditions:', expeditionsResult.data?.expeditions?.length || 0);
    } else {
      console.log('❌ Expeditions query not supported:', expeditionsResult.errors[0]?.message);
    }

    // 測試隊伍查詢
    console.log('Testing parties query...');
    const partiesResponse = await fetch(THE_GRAPH_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: TEST_PARTIES_QUERY,
        variables: { first: 5 }
      })
    });

    const partiesResult = await partiesResponse.json();
    if (!partiesResult.errors) {
      results.partiesQuery = true;
      console.log('✅ Parties query supported');
      console.log('Found parties:', partiesResult.data?.parties?.length || 0);
    } else {
      console.log('❌ Parties query not supported:', partiesResult.errors[0]?.message);
    }

  } catch (error) {
    results.error = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ GraphQL test failed:', results.error);
  }

  return results;
}

// 開發環境下自動測試
if (import.meta.env.DEV) {
  // 延遲執行，避免阻塞初始化
  setTimeout(() => {
    testGraphQLSupport().then(results => {
      console.log('📊 GraphQL Support Summary:', results);
    });
  }, 2000);
}