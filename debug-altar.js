#!/usr/bin/env node

// 調試祭壇頁面配置的腳本

console.log('🔍 調試祭壇頁面配置...\n');

// 檢查合約地址
const contracts = {
  HERO: '0x162b0b673f38C11732b0bc0B4B026304e563e8e2',
  RELIC: '0x15c2454A31Abc0063ef4a71d0640057d71847a22',
  ALTAROFASCENSION: '0x0148Aff0Dee6D31BA9825e66ED34a66BCeF45845'
};

console.log('📋 當前合約地址 (V25):');
console.log(`  HERO: ${contracts.HERO}`);
console.log(`  RELIC: ${contracts.RELIC}`);
console.log(`  ALTAR: ${contracts.ALTAROFASCENSION}\n`);

// 檢查子圖端點
const subgraphUrl = 'https://api.studio.thegraph.com/query/115633/dungeon-delvers---bsc/v3.2.3';
console.log(`🌐 子圖端點: ${subgraphUrl}\n`);

// 測試子圖查詢
async function testSubgraph() {
  const query = `{
    _meta { 
      block { number } 
      hasIndexingErrors 
    }
    heros(first: 5) { 
      id 
      tokenId 
      rarity 
      owner { id } 
    }
    relics(first: 5) { 
      id 
      tokenId 
      rarity 
      owner { id } 
    }
  }`;

  try {
    const response = await fetch(subgraphUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.log('❌ 子圖查詢錯誤:');
      console.log(JSON.stringify(result.errors, null, 2));
      return;
    }

    console.log('✅ 子圖查詢成功:');
    console.log(`  當前區塊: ${result.data._meta.block.number}`);
    console.log(`  索引錯誤: ${result.data._meta.hasIndexingErrors}`);
    console.log(`  英雄數量: ${result.data.heros.length}`);
    console.log(`  聖物數量: ${result.data.relics.length}\n`);

    if (result.data.heros.length > 0) {
      console.log('🦸 英雄列表:');
      result.data.heros.forEach(hero => {
        console.log(`  #${hero.tokenId} (稀有度: ${hero.rarity}) - 擁有者: ${hero.owner.id}`);
      });
    }

    if (result.data.relics.length > 0) {
      console.log('🏺 聖物列表:');
      result.data.relics.forEach(relic => {
        console.log(`  #${relic.tokenId} (稀有度: ${relic.rarity}) - 擁有者: ${relic.owner.id}`);
      });
    }

    if (result.data.heros.length === 0 && result.data.relics.length === 0) {
      console.log('📭 子圖中沒有 NFT 數據');
      console.log('   這表明 V25 合約是全新部署，還沒有鑄造 NFT');
      console.log('   祭壇頁面顯示空白是正常的');
    }

  } catch (error) {
    console.log('❌ 網路錯誤:', error.message);
  }
}

// 執行測試
testSubgraph().then(() => {
  console.log('\n🔧 建議解決方案:');
  console.log('1. 清除瀏覽器緩存 (Ctrl+Shift+R 或 Cmd+Shift+R)');
  console.log('2. 如果需要顯示舊 NFT，需要修改子圖同時索引舊合約');
  console.log('3. 或者等待新合約有 NFT 活動後再使用祭壇功能');
}).catch(console.error);