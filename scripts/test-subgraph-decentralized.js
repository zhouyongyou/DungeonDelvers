#!/usr/bin/env node

// 測試 Studio 和去中心化版本的子圖

const STUDIO_URL = 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.1.2';
const DECENTRALIZED_URL = 'https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs';

// GraphQL 查詢函數
async function queryGraph(url, query) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    if (data.errors) {
      console.error('❌ GraphQL 錯誤:', data.errors);
      return null;
    }
    
    return data.data;
  } catch (error) {
    console.error('❌ 查詢失敗:', error.message);
    return null;
  }
}

// 測試查詢
const testQuery = `{
  _meta {
    block {
      number
      timestamp
    }
    deployment
    hasIndexingErrors
  }
  heros(first: 1) {
    id
  }
  relics(first: 1) {
    id
  }
  parties(first: 1) {
    id
  }
}`;

async function testBothVersions() {
  console.log('🔍 測試 DungeonDelvers 子圖的兩個版本\n');
  console.log('='.repeat(60));
  
  // 1. 測試 Studio 版本
  console.log('\n📊 Studio 版本 (v3.1.2)');
  console.log('URL:', STUDIO_URL);
  console.log('-'.repeat(60));
  
  const studioResult = await queryGraph(STUDIO_URL, testQuery);
  if (studioResult) {
    console.log('✅ 連接成功');
    console.log('區塊高度:', studioResult._meta?.block?.number || 'N/A');
    console.log('同步時間:', new Date(studioResult._meta?.block?.timestamp * 1000).toLocaleString() || 'N/A');
    console.log('部署 ID:', studioResult._meta?.deployment || 'N/A');
    console.log('索引錯誤:', studioResult._meta?.hasIndexingErrors ? '❌ 有錯誤' : '✅ 無錯誤');
    console.log('Heroes:', studioResult.heros?.length || 0);
    console.log('Relics:', studioResult.relics?.length || 0);
    console.log('Parties:', studioResult.parties?.length || 0);
  } else {
    console.log('❌ 無法連接到 Studio 版本');
  }
  
  // 2. 測試去中心化版本
  console.log('\n\n📊 去中心化版本');
  console.log('URL:', DECENTRALIZED_URL);
  console.log('-'.repeat(60));
  
  const decentralizedResult = await queryGraph(DECENTRALIZED_URL, testQuery);
  if (decentralizedResult) {
    console.log('✅ 連接成功');
    console.log('區塊高度:', decentralizedResult._meta?.block?.number || 'N/A');
    console.log('同步時間:', new Date(decentralizedResult._meta?.block?.timestamp * 1000).toLocaleString() || 'N/A');
    console.log('部署 ID:', decentralizedResult._meta?.deployment || 'N/A');
    console.log('索引錯誤:', decentralizedResult._meta?.hasIndexingErrors ? '❌ 有錯誤' : '✅ 無錯誤');
    console.log('Heroes:', decentralizedResult.heros?.length || 0);
    console.log('Relics:', decentralizedResult.relics?.length || 0);
    console.log('Parties:', decentralizedResult.parties?.length || 0);
  } else {
    console.log('❌ 無法連接到去中心化版本');
    console.log('⚠️  可能原因：');
    console.log('   1. 子圖尚未被索引器選中');
    console.log('   2. 需要更多信號（Signal）來吸引索引器');
    console.log('   3. 索引器正在同步中');
  }
  
  // 3. 比較兩個版本
  console.log('\n\n📊 版本比較');
  console.log('='.repeat(60));
  
  if (studioResult && decentralizedResult) {
    const studioBlock = studioResult._meta?.block?.number || 0;
    const decBlock = decentralizedResult._meta?.block?.number || 0;
    const blockDiff = Math.abs(studioBlock - decBlock);
    
    console.log('區塊差異:', blockDiff, '個區塊');
    if (blockDiff > 100) {
      console.log('⚠️  去中心化版本落後較多，可能正在同步中');
    } else if (blockDiff > 0) {
      console.log('✅ 兩個版本同步狀態接近');
    } else {
      console.log('✅ 兩個版本完全同步');
    }
  } else if (studioResult && !decentralizedResult) {
    console.log('⚠️  只有 Studio 版本可用');
    console.log('💡 建議：');
    console.log('   1. 增加更多信號（Signal）吸引索引器');
    console.log('   2. 等待索引器開始索引（可能需要幾小時到幾天）');
    console.log('   3. 檢查 The Graph Explorer 查看索引狀態');
  }
  
  console.log('\n' + '='.repeat(60));
}

// 執行測試
testBothVersions().catch(console.error);