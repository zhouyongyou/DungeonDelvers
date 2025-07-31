// 檢查特定交易的事件日誌
const THE_GRAPH_URL = 'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs';

const TX_HASH = '0x800843529f5126dc280609180de840bb2245a6f6b5718e75822b52fed9c339c5';
const BLOCK_NUMBER = 55860726;
const USER_ADDRESS = '0x10925A7138649C7E1794CE646182eeb5BF8ba647';

async function checkSpecificTransaction() {
  console.log('🔍 檢查特定交易和時間點的子圖數據...\n');

  try {
    // 1. 檢查該交易哈希是否在子圖中
    console.log('1️⃣ 檢查交易哈希相關的遠征記錄:');
    const txQuery = `
      query GetExpeditionByTx($txHash: String!) {
        expeditions(where: { transactionHash: $txHash }) {
          id
          player
          party { id tokenId }
          success
          reward
          expGained
          timestamp
          transactionHash
          dungeonName
        }
      }
    `;

    const txResponse = await fetch(THE_GRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: txQuery,
        variables: { txHash: TX_HASH }
      })
    });

    const txResult = await txResponse.json();
    if (txResult.errors) {
      console.log('⚠️ 交易查詢錯誤:', txResult.errors);
    } else if (txResult.data?.expeditions?.length > 0) {
      console.log(`✅ 找到 ${txResult.data.expeditions.length} 筆遠征記錄：`);
      txResult.data.expeditions.forEach(exp => {
        const date = new Date(parseInt(exp.timestamp) * 1000).toLocaleString('zh-TW');
        console.log(`   ${exp.success ? '✅成功' : '❌失敗'} - ${exp.dungeonName} - ${date}`);
        console.log(`   獎勵: ${exp.reward} SOUL, 經驗: ${exp.expGained}`);
        console.log(`   隊伍: ${exp.party?.tokenId || 'N/A'}`);
      });
    } else {
      console.log('❌ 該交易哈希沒有遠征記錄');
    }

    // 2. 檢查在該時間點前後的遠征記錄
    console.log('\n2️⃣ 檢查用戶在該時間點前後的遠征記錄:');
    const timeQuery = `
      query GetExpeditionsAroundTime($player: String!, $timestamp: BigInt!) {
        expeditions(
          where: { 
            player: $player,
            timestamp_gte: "${BLOCK_NUMBER * 3 - 300}",
            timestamp_lte: "${BLOCK_NUMBER * 3 + 300}"
          }
          orderBy: timestamp
          orderDirection: desc
        ) {
          id
          party { tokenId }
          success
          reward
          expGained
          timestamp
          transactionHash
          dungeonName
        }
      }
    `;

    // 估算時間戳 (區塊號 * 3秒，粗略計算)
    const estimatedTimestamp = BLOCK_NUMBER * 3;

    const timeResponse = await fetch(THE_GRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: timeQuery,
        variables: { 
          player: USER_ADDRESS.toLowerCase(),
          timestamp: estimatedTimestamp.toString()
        }
      })
    });

    const timeResult = await timeResponse.json();
    if (timeResult.errors) {
      console.log('⚠️ 時間範圍查詢錯誤:', timeResult.errors);
    } else if (timeResult.data?.expeditions?.length > 0) {
      console.log(`✅ 在該時間點附近找到 ${timeResult.data.expeditions.length} 筆遠征記錄：`);
      timeResult.data.expeditions.forEach(exp => {
        const date = new Date(parseInt(exp.timestamp) * 1000).toLocaleString('zh-TW');
        console.log(`   ${exp.success ? '✅成功' : '❌失敗'} - TX: ${exp.transactionHash.slice(0, 10)}... - ${date}`);
      });
    } else {
      console.log('❌ 該時間點附近沒有遠征記錄');
    }

    // 3. 檢查是否有隊伍在該時間創建
    console.log('\n3️⃣ 檢查是否有隊伍在該時間創建:');
    const partyQuery = `
      query GetPartiesAroundTime($owner: String!, $timestamp: BigInt!) {
        parties(
          where: { 
            owner: $owner,
            createdAt_gte: "${estimatedTimestamp - 3600}",
            createdAt_lte: "${estimatedTimestamp + 3600}"
          }
          orderBy: createdAt
          orderDirection: desc
        ) {
          id
          tokenId
          totalPower
          createdAt
          lastUpdatedAt
        }
      }
    `;

    const partyResponse = await fetch(THE_GRAPH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: partyQuery,
        variables: { 
          owner: USER_ADDRESS.toLowerCase(),
          timestamp: estimatedTimestamp.toString()
        }
      })
    });

    const partyResult = await partyResponse.json();
    if (partyResult.errors) {
      console.log('⚠️ 隊伍時間查詢錯誤:', partyResult.errors);
    } else if (partyResult.data?.parties?.length > 0) {
      console.log(`✅ 在該時間點附近找到 ${partyResult.data.parties.length} 個隊伍創建：`);
      partyResult.data.parties.forEach(party => {
        const createDate = new Date(parseInt(party.createdAt) * 1000).toLocaleString('zh-TW');
        const updateDate = new Date(parseInt(party.lastUpdatedAt) * 1000).toLocaleString('zh-TW');
        console.log(`   隊伍 ${party.tokenId}: 創建於 ${createDate}, 更新於 ${updateDate}`);
        console.log(`   戰力: ${party.totalPower}, ID: ${party.id}`);
      });
    } else {
      console.log('❌ 該時間點附近沒有隊伍創建');
    }

    console.log('\n🎯 分析結論:');
    console.log('==========================================');
    console.log('基於 BSCScan 的交易信息：');
    console.log(`- 交易: ${TX_HASH}`);
    console.log(`- 區塊: ${BLOCK_NUMBER}`);
    console.log(`- 操作: Mint 1 of DDPF (可能是隊伍創建，不是遠征)`);
    console.log('- 該交易可能是隊伍創建交易，而非遠征交易');
    console.log('- 你需要查找實際的遠征交易');

  } catch (error) {
    console.error('❌ 檢查失敗:', error);
  }
}

checkSpecificTransaction();