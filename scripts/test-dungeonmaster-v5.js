import fetch from 'node-fetch';

const SUBGRAPH_URL = 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.2';

async function testDungeonMasterV5() {
  console.log('🧪 測試 DungeonMasterV5 功能\n');

  // 1. 查詢隊伍戰力
  const partyQuery = `
    {
      parties(first: 5, orderBy: totalPower, orderDirection: desc) {
        id
        owner
        totalPower
        maxPower
        memberCount
        heroes {
          id
          power
        }
      }
    }
  `;

  try {
    const response = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: partyQuery }),
    });

    const data = await response.json();
    
    console.log('📊 隊伍戰力查詢結果:');
    console.log('===================');
    
    if (data.data?.parties) {
      data.data.parties.forEach((party, index) => {
        console.log(`\n隊伍 #${index + 1}:`);
        console.log(`- ID: ${party.id}`);
        console.log(`- 擁有者: ${party.owner}`);
        console.log(`- 總戰力: ${party.totalPower}`);
        console.log(`- 最大戰力: ${party.maxPower}`);
        console.log(`- 成員數: ${party.memberCount}`);
        console.log(`- 英雄戰力: ${party.heroes.map(h => h.power).join(', ')}`);
      });
    }

    // 2. 查詢最新探險記錄
    const expeditionQuery = `
      {
        expeditions(first: 5, orderBy: timestamp, orderDirection: desc) {
          id
          player
          party {
            id
            totalPower
          }
          dungeonId
          dungeonName
          dungeonPowerRequired
          partyPower
          success
          reward
          timestamp
        }
      }
    `;

    const expResponse = await fetch(SUBGRAPH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: expeditionQuery }),
    });

    const expData = await expResponse.json();
    
    console.log('\n\n🗺️  最新探險記錄:');
    console.log('=================');
    
    if (expData.data?.expeditions && expData.data.expeditions.length > 0) {
      expData.data.expeditions.forEach((exp, index) => {
        console.log(`\n探險 #${index + 1}:`);
        console.log(`- 玩家: ${exp.player}`);
        console.log(`- 地城: ${exp.dungeonName} (ID: ${exp.dungeonId})`);
        console.log(`- 需求戰力: ${exp.dungeonPowerRequired}`);
        console.log(`- 隊伍戰力: ${exp.partyPower}`);
        console.log(`- 結果: ${exp.success ? '✅ 成功' : '❌ 失敗'}`);
        console.log(`- 獎勵: ${exp.reward}`);
        console.log(`- 時間: ${new Date(exp.timestamp * 1000).toLocaleString()}`);
      });
    } else {
      console.log('暫無探險記錄');
    }

    // 3. 測試建議
    console.log('\n\n🔧 測試建議:');
    console.log('============');
    console.log('1. 使用擁有隊伍的帳號進入地城探險');
    console.log('2. 選擇戰力需求較低的地城（如新手礦洞）');
    console.log('3. 觀察交易是否成功');
    console.log('4. 檢查子圖是否記錄 ExpeditionRequested 事件');
    console.log('5. 驗證戰力讀取是否正確');

  } catch (error) {
    console.error('❌ 查詢錯誤:', error.message);
  }
}

// 執行測試
testDungeonMasterV5();