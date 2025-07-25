#!/usr/bin/env node

// 簡單測試去中心化子圖狀態

const STUDIO_URL = 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.1.2';
const DECENTRALIZED_URL = 'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs';

async function testSubgraph(name, url) {
  console.log(`\n📊 測試 ${name}`);
  console.log('URL:', url);
  console.log('-'.repeat(60));
  
  try {
    // 1. 測試基本連接
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '{ _meta { block { number timestamp } deployment hasIndexingErrors } }'
      })
    });
    
    if (!response.ok) {
      console.log(`❌ HTTP 錯誤: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    
    if (data.errors) {
      console.log('❌ GraphQL 錯誤:', data.errors);
      return false;
    }
    
    if (data.data && data.data._meta) {
      const meta = data.data._meta;
      console.log('✅ 連接成功');
      console.log(`   區塊高度: ${meta.block.number}`);
      console.log(`   區塊時間: ${new Date(meta.block.timestamp * 1000).toLocaleString()}`);
      console.log(`   部署 ID: ${meta.deployment}`);
      console.log(`   索引錯誤: ${meta.hasIndexingErrors ? '有' : '無'}`);
      
      // 2. 測試數據查詢
      const dataResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{
            heros(first: 1) { id }
            relics(first: 1) { id }
            parties(first: 1) { id }
            players(first: 1) { id }
          }`
        })
      });
      
      const entityData = await dataResponse.json();
      if (entityData.data) {
        console.log(`\n   數據統計:`);
        console.log(`   - Heroes: ${entityData.data.heros?.length || 0}`);
        console.log(`   - Relics: ${entityData.data.relics?.length || 0}`);
        console.log(`   - Parties: ${entityData.data.parties?.length || 0}`);
        console.log(`   - Players: ${entityData.data.players?.length || 0}`);
      }
      
      return true;
    } else {
      console.log('❌ 無效的響應數據');
      return false;
    }
  } catch (error) {
    console.log('❌ 錯誤:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 DungeonDelvers 子圖狀態測試\n');
  console.log('='.repeat(60));
  
  // 測試兩個版本
  const studioOk = await testSubgraph('Studio 版本 (v3.1.2)', STUDIO_URL);
  const decentralizedOk = await testSubgraph('去中心化版本', DECENTRALIZED_URL);
  
  // 總結
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 測試總結：');
  console.log(`   Studio 版本: ${studioOk ? '✅ 正常' : '❌ 異常'}`);
  console.log(`   去中心化版本: ${decentralizedOk ? '✅ 正常' : '❌ 異常'}`);
  
  if (studioOk && !decentralizedOk) {
    console.log('\n⚠️  去中心化版本尚未就緒');
    console.log('可能原因：');
    console.log('1. 需要更多信號（Signal）來吸引索引器');
    console.log('2. 索引器正在評估是否索引此子圖');
    console.log('3. 網絡問題或配置問題');
    console.log('\n建議在 The Graph Explorer 查看詳細狀態：');
    console.log('https://thegraph.com/explorer/subgraphs/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs');
  } else if (studioOk && decentralizedOk) {
    console.log('\n✅ 兩個版本都正常運行！');
    console.log('可以開始使用去中心化版本進行生產環境查詢。');
  }
}

main().catch(console.error);