// diagnose_metadata.cjs
// 診斷 metadata server 問題

const https = require('https');

// 測試函式
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve({ error: 'Invalid JSON', raw: data });
        }
      });
    }).on('error', reject);
  });
}

async function diagnoseMetadata() {
  console.log('🔍 開始診斷 Metadata Server 問題...\n');

  // 1. 檢查健康狀態
  console.log('1. 檢查健康狀態...');
  try {
    const health = await makeRequest('https://dungeon-delvers-metadata-server.onrender.com/health');
    console.log('✅ 健康檢查:', health.status);
  } catch (e) {
    console.log('❌ 健康檢查失敗:', e.message);
  }

  // 2. 測試 Hero API
  console.log('\n2. 測試 Hero API...');
  try {
    const hero1 = await makeRequest('https://dungeon-delvers-metadata-server.onrender.com/api/hero/1');
    const hero2 = await makeRequest('https://dungeon-delvers-metadata-server.onrender.com/api/hero/2');
    
    console.log('Hero #1:', {
      name: hero1.name,
      rarity: hero1.attributes?.[0]?.value,
      power: hero1.attributes?.[1]?.value,
      hasError: !!hero1.error
    });
    
    console.log('Hero #2:', {
      name: hero2.name,
      rarity: hero2.attributes?.[0]?.value,
      power: hero2.attributes?.[1]?.value,
      hasError: !!hero2.error
    });

    // 檢查是否相同
    const isSame = hero1.attributes?.[0]?.value === hero2.attributes?.[0]?.value &&
                   hero1.attributes?.[1]?.value === hero2.attributes?.[1]?.value;
    
    if (isSame) {
      console.log('⚠️  警告: Hero #1 和 Hero #2 屬性完全相同！');
    } else {
      console.log('✅ Hero #1 和 Hero #2 屬性不同');
    }
  } catch (e) {
    console.log('❌ Hero API 測試失敗:', e.message);
  }

  // 3. 測試 Relic API
  console.log('\n3. 測試 Relic API...');
  try {
    const relic1 = await makeRequest('https://dungeon-delvers-metadata-server.onrender.com/api/relic/1');
    const relic2 = await makeRequest('https://dungeon-delvers-metadata-server.onrender.com/api/relic/2');
    
    console.log('Relic #1:', {
      name: relic1.name,
      rarity: relic1.attributes?.[0]?.value,
      capacity: relic1.attributes?.[1]?.value,
      hasError: !!relic1.error
    });
    
    console.log('Relic #2:', {
      name: relic2.name,
      rarity: relic2.attributes?.[0]?.value,
      capacity: relic2.attributes?.[1]?.value,
      hasError: !!relic2.error
    });

    // 檢查是否相同
    const isSame = relic1.attributes?.[0]?.value === relic2.attributes?.[0]?.value &&
                   relic1.attributes?.[1]?.value === relic2.attributes?.[1]?.value;
    
    if (isSame) {
      console.log('⚠️  警告: Relic #1 和 Relic #2 屬性完全相同！');
    } else {
      console.log('✅ Relic #1 和 Relic #2 屬性不同');
    }
  } catch (e) {
    console.log('❌ Relic API 測試失敗:', e.message);
  }

  // 4. 測試 VIP API
  console.log('\n4. 測試 VIP API...');
  try {
    const vip1 = await makeRequest('https://dungeon-delvers-metadata-server.onrender.com/api/vipstaking/1');
    
    console.log('VIP #1:', {
      name: vip1.name,
      level: vip1.attributes?.[0]?.value,
      stakedValue: vip1.attributes?.[1]?.value,
      hasError: !!vip1.error
    });
  } catch (e) {
    console.log('❌ VIP API 測試失敗:', e.message);
  }

  // 5. 測試 Subgraph
  console.log('\n5. 測試 Subgraph...');
  try {
    const subgraphQuery = JSON.stringify({
      query: `query {
        heroes(first: 5) {
          id
          tokenId
          power
          rarity
          createdAt
        }
      }`
    });

    const subgraphResponse = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.studio.thegraph.com',
        path: '/query/115633/dungeon-delvers/1.2.4',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(subgraphQuery)
        }
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve({ error: 'Invalid JSON', raw: data });
          }
        });
      });
      
      req.on('error', reject);
      req.write(subgraphQuery);
      req.end();
    });

    if (subgraphResponse.errors) {
      console.log('❌ Subgraph 查詢錯誤:', subgraphResponse.errors[0].message);
    } else if (subgraphResponse.data?.heroes) {
      console.log('✅ Subgraph 查詢成功');
      console.log('Heroes 數量:', subgraphResponse.data.heroes.length);
      subgraphResponse.data.heroes.forEach((hero, index) => {
        console.log(`  Hero ${index + 1}: ID=${hero.id}, TokenID=${hero.tokenId}, Power=${hero.power}, Rarity=${hero.rarity}`);
      });
    } else {
      console.log('⚠️  Subgraph 回應異常:', subgraphResponse);
    }
  } catch (e) {
    console.log('❌ Subgraph 測試失敗:', e.message);
  }

  console.log('\n📋 診斷總結:');
  console.log('• 如果所有 NFT 屬性相同，問題在於 subgraph 查詢失敗或資料同步問題');
  console.log('• 如果 subgraph 查詢錯誤，需要檢查 schema 和部署狀態');
  console.log('• 如果 API 回傳錯誤，metadata server 可能有 fallback 機制問題');
}

diagnoseMetadata().catch(console.error); 