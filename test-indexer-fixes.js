// 測試 indexer 修復效果
const THE_GRAPH_URL = 'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs';

// 模擬強化的查詢邏輯
async function robustQuery(query, variables, maxRetries = 3) {
  console.log(`🚀 執行強化查詢 (最大重試: ${maxRetries})`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📡 嘗試 ${attempt}/${maxRetries}...`);
      
      const response = await fetch(THE_GRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.errors) {
        const indexerErrors = result.errors.filter(error => 
          error.message?.includes('bad indexers') ||
          error.message?.includes('Unavailable') ||
          error.message?.includes('BadResponse')
        );
        
        if (indexerErrors.length > 0) {
          console.log(`⚠️ 發現 ${indexerErrors.length} 個 indexer 錯誤:`);
          indexerErrors.forEach(error => console.log(`  - ${error.message}`));
          
          if (attempt < maxRetries) {
            const delay = 1000 * attempt;
            console.log(`⏱️ 等待 ${delay}ms 後重試...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        throw new Error(`GraphQL 錯誤: ${result.errors.map(e => e.message).join(', ')}`);
      }

      console.log(`✅ 查詢成功 (嘗試 ${attempt}/${maxRetries})`);
      return result.data;
      
    } catch (error) {
      console.log(`❌ 嘗試 ${attempt} 失敗: ${error.message}`);
      
      if (attempt === maxRetries) {
        console.log(`🚫 所有嘗試都失敗了`);
        throw error;
      }
    }
  }
}

// 測試查詢
async function testIndexerFixes() {
  console.log('\n🧪 開始測試 indexer 修復效果...\n');

  // 測試 1: 隊伍詳情查詢（之前有問題的）
  console.log('📋 測試 1: 隊伍詳情查詢');
  console.log('=====================================');
  
  const partyQuery = `
    query GetPartyDetails($partyId: ID!) {
      party(id: $partyId) {
        id
        name
        totalPower
        heroIds
        heroes { id tokenId }
        relicIds
        relics { id tokenId }
      }
    }
  `;

  try {
    const partyResult = await robustQuery(partyQuery, { 
      partyId: "0x2890f2bfe5ff4655d3096ec5521be58eba6fae50-1" 
    }, 5); // 更多重試次數

    if (partyResult?.party) {
      const party = partyResult.party;
      console.log('✅ 隊伍查詢成功！');
      console.log(`📊 結果分析:`);
      console.log(`  - 隊伍名稱: ${party.name}`);
      console.log(`  - 總戰力: ${party.totalPower}`);
      console.log(`  - heroIds 數量: ${party.heroIds?.length || 0}`);
      console.log(`  - heroes 數量: ${party.heroes?.length || 0}`);
      console.log(`  - relicIds 數量: ${party.relicIds?.length || 0}`);
      console.log(`  - relics 數量: ${party.relics?.length || 0}`);
      
      // 分析修復效果
      const heroIdsFilled = party.heroIds && party.heroIds.length > 0;
      const heroesFilled = party.heroes && party.heroes.length > 0;
      const relicIdsFilled = party.relicIds && party.relicIds.length > 0;
      const relicsFilled = party.relics && party.relics.length > 0;
      
      console.log(`\n🎯 修復狀態:`);
      console.log(`  - heroIds 修復: ${heroIdsFilled ? '✅' : '❌'}`);
      console.log(`  - heroes 修復: ${heroesFilled ? '✅' : '❌'}`);
      console.log(`  - relicIds 修復: ${relicIdsFilled ? '✅' : '❌'}`);
      console.log(`  - relics 修復: ${relicsFilled ? '✅' : '❌'}`);
      
      const overallFixed = (heroIdsFilled || heroesFilled) && party.totalPower !== "0";
      console.log(`\n🏆 整體修復狀態: ${overallFixed ? '✅ 成功' : '❌ 需要進一步檢查'}`);
      
    } else {
      console.log('❌ 隊伍不存在或查詢失敗');
    }
    
  } catch (error) {
    console.log(`❌ 隊伍查詢最終失敗: ${error.message}`);
  }

  // 測試 2: 玩家隊伍列表（簡化查詢，降低 indexer 負擔）
  console.log('\n📋 測試 2: 簡化玩家查詢');
  console.log('=====================================');
  
  const playerQuery = `
    query GetPlayerBasic($playerId: ID!) {
      player(id: $playerId) {
        id
        parties(first: 3) {
          id
          name
          totalPower
        }
      }
    }
  `;

  try {
    const playerResult = await robustQuery(playerQuery, { 
      playerId: "0x10925a7138649c7e1794ce646182eeb5bf8ba647" 
    }, 3);

    if (playerResult?.player) {
      console.log('✅ 玩家查詢成功！');
      console.log(`📊 找到 ${playerResult.player.parties?.length || 0} 支隊伍`);
    } else {
      console.log('❌ 玩家查詢失敗');
    }
    
  } catch (error) {
    console.log(`❌ 玩家查詢失敗: ${error.message}`);
  }

  // 測試 3: 連續查詢壓力測試
  console.log('\n📋 測試 3: 連續查詢穩定性');
  console.log('=====================================');
  
  let successCount = 0;
  let errorCount = 0;
  const testCount = 5;

  for (let i = 1; i <= testCount; i++) {
    try {
      console.log(`🔄 連續查詢 ${i}/${testCount}...`);
      
      const result = await robustQuery(`
        query QuickTest {
          _meta {
            block {
              number
            }
          }
        }
      `, {}, 2);
      
      if (result?._meta?.block?.number) {
        successCount++;
        console.log(`  ✅ 成功 - 區塊: ${result._meta.block.number}`);
      } else {
        errorCount++;
        console.log(`  ❌ 返回數據異常`);
      }
      
      // 短暫延遲
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      errorCount++;
      console.log(`  ❌ 錯誤: ${error.message}`);
    }
  }

  console.log(`\n📊 連續查詢結果:`);
  console.log(`  - 成功: ${successCount}/${testCount} (${(successCount/testCount*100).toFixed(1)}%)`);
  console.log(`  - 錯誤: ${errorCount}/${testCount} (${(errorCount/testCount*100).toFixed(1)}%)`);
  
  const stabilityScore = successCount / testCount;
  let stabilityLevel;
  if (stabilityScore >= 0.9) stabilityLevel = '🟢 優秀';
  else if (stabilityScore >= 0.7) stabilityLevel = '🟡 良好';
  else stabilityLevel = '🔴 需要改善';
  
  console.log(`  - 穩定性: ${stabilityLevel}`);

  console.log('\n🎯 總結:');
  console.log('==========================================');
  console.log('✅ indexer 錯誤處理機制測試完成');
  console.log('✅ 重試機制驗證完成');
  console.log('✅ 查詢穩定性評估完成');
  console.log('\n💡 建議:');
  if (stabilityScore < 0.8) {
    console.log('- 考慮增加重試次數');
    console.log('- 實施更長的緩存時間');
    console.log('- 添加更多降級處理');
  } else {
    console.log('- 當前修復效果良好');
    console.log('- 可以部署到生產環境');
  }
}

// 如果在 Node.js 環境運行
if (typeof window === 'undefined') {
  testIndexerFixes().catch(console.error);
} else {
  // 如果在瀏覽器運行
  window.testIndexerFixes = testIndexerFixes;
  console.log('🔧 測試函數已註冊到 window.testIndexerFixes()');
}