// 檢查運行時的子圖配置

console.log('🔍 檢查前端運行時配置...\n');

// 模擬前端配置載入過程
const path = require('path');
const fs = require('fs');

// 1. 檢查 .env 文件
const envPath = path.join(__dirname, '.env');
const envLocalPath = path.join(__dirname, '.env.local');

console.log('📁 環境變數文件:');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const graphUrlLine = envContent.split('\n').find(line => line.includes('VITE_THE_GRAPH'));
  console.log(`  .env: ${graphUrlLine || '未找到 VITE_THE_GRAPH 變數'}`);
} else {
  console.log('  .env: 不存在');
}

if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const graphUrlLine = envContent.split('\n').find(line => line.includes('VITE_THE_GRAPH'));
  console.log(`  .env.local: ${graphUrlLine || '未找到 VITE_THE_GRAPH 變數'}`);
} else {
  console.log('  .env.local: 不存在');
}

// 2. 檢查 CDN 配置
const v25ConfigPath = path.join(__dirname, 'public/config/v25.json');
if (fs.existsSync(v25ConfigPath)) {
  const config = JSON.parse(fs.readFileSync(v25ConfigPath, 'utf8'));
  console.log('\n🌐 CDN 配置 (v25.json):');
  console.log(`  Studio URL: ${config.subgraph?.studio?.url}`);
  console.log(`  Decentralized URL: ${config.subgraph?.decentralized?.url}`);
  console.log(`  Use Decentralized: ${config.subgraph?.useDecentralized}`);
}

// 3. 檢查環境變數默認值
console.log('\n🔧 當前 Node 環境變數:');
Object.keys(process.env).filter(key => key.includes('GRAPH') || key.includes('VITE')).forEach(key => {
  console.log(`  ${key}: ${process.env[key]}`);
});

// 4. 模擬前端配置載入邏輯
console.log('\n⚙️ 模擬前端配置載入:');

// 模擬 useDecentralized 檢查
const USE_DECENTRALIZED = process.env.VITE_USE_DECENTRALIZED_GRAPH === 'true' || false;
console.log(`  USE_DECENTRALIZED: ${USE_DECENTRALIZED}`);

// 模擬 API URL 選擇邏輯
const STUDIO_URL = process.env.VITE_THE_GRAPH_API_URL || 'https://api.studio.thegraph.com/query/115633/dungeon-delvers---bsc/v3.2.3';
const NETWORK_URL = process.env.VITE_THE_GRAPH_NETWORK_URL || 'https://gateway.thegraph.com/api...';

const SELECTED_URL = USE_DECENTRALIZED ? NETWORK_URL : STUDIO_URL;

console.log(`  選擇的 URL: ${SELECTED_URL}`);

// 5. 測試實際查詢
async function testQuery() {
  const query = `{ heros(first: 3) { id tokenId rarity } }`;
  
  console.log(`\n🧪 測試查詢 ${SELECTED_URL}:`);
  
  try {
    const response = await fetch(SELECTED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    const result = await response.json();
    
    if (result.errors) {
      console.log('❌ 查詢錯誤:', result.errors);
    } else {
      console.log(`✅ 查詢成功，返回 ${result.data?.heros?.length || 0} 個英雄`);
      if (result.data?.heros?.length > 0) {
        console.log('   前幾個英雄:', result.data.heros.map(h => `#${h.tokenId}`).join(', '));
      }
    }
  } catch (error) {
    console.log('❌ 網路錯誤:', error.message);
  }
}

testQuery().catch(console.error);