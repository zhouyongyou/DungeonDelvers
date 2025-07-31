// 快速測試隊伍問題 - 使用你報告中的實際數據
const THE_GRAPH_URL = 'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs';

// 測試查詢
const TEST_PARTY_QUERY = `
  query TestPartyIssue($partyId: ID!) {
    party(id: $partyId) {
      id
      tokenId
      name
      totalPower
      heroIds
      relicIds
      heroes {
        id
        tokenId
        owner {
          id
        }
      }
      relics {
        id
        tokenId
        owner {
          id
        }
      }
      owner {
        id
      }
      expeditions(first: 5) {
        id
        dungeonName
        success
        timestamp
      }
    }
  }
`;

const TEST_PLAYER_QUERY = `
  query TestPlayerParties($playerId: ID!) {
    player(id: $playerId) {
      id
      parties(first: 5) {
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
        expeditions(first: 1) {
          id
          success
          dungeonName
        }
      }
    }
  }
`;

async function testQuery(query, variables, description) {
  console.log(`\n🔍 測試: ${description}`);
  console.log(`變數:`, variables);
  
  try {
    const response = await fetch(THE_GRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.log('❌ GraphQL 錯誤:', result.errors);
      return null;
    }

    console.log('✅ 查詢成功');
    console.log('📊 結果:', JSON.stringify(result.data, null, 2));
    return result.data;
    
  } catch (error) {
    console.log('❌ 網路錯誤:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 開始測試子圖問題...');
  
  // 測試 1: 檢查問題隊伍（你可以替換為實際的隊伍 ID）
  await testQuery(TEST_PARTY_QUERY, { 
    partyId: "0x2890f2bfe5ff4655d3096ec5521be58eba6fae50-1" 
  }, "檢查隊伍詳情");

  // 測試 2: 檢查玩家的所有隊伍（你可以替換為實際的玩家地址）
  await testQuery(TEST_PLAYER_QUERY, { 
    playerId: "0x你的錢包地址" 
  }, "檢查玩家隊伍");

  console.log('\n✅ 測試完成！');
}

// 如果在 Node.js 環境運行
if (typeof window === 'undefined') {
  runTests();
} else {
  // 如果在瀏覽器運行
  window.runSubgraphTest = runTests;  
  console.log('🔧 測試函數已註冊到 window.runSubgraphTest()');
}