#!/usr/bin/env node

// 測試 RPC 優化版本的腳本
// 使用方法: node scripts/test-rpc-optimized.js [domain]

const domain = process.argv[2] || 'http://localhost:3000';
const rpcEndpoint = `${domain}/api/rpc-optimized`;

async function testBasicRpc() {
  console.log('\n=== 測試基本 RPC 調用 ===');
  
  try {
    const response = await fetch(rpcEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      })
    });
    
    const data = await response.json();
    const cacheStatus = response.headers.get('X-Cache') || 'N/A';
    const responseTime = response.headers.get('X-Response-Time') || 'N/A';
    
    console.log(`✅ 狀態碼: ${response.status}`);
    console.log(`✅ 區塊高度: ${parseInt(data.result, 16)}`);
    console.log(`✅ 緩存狀態: ${cacheStatus}`);
    console.log(`✅ 響應時間: ${responseTime}`);
  } catch (error) {
    console.error(`❌ 錯誤: ${error.message}`);
  }
}

async function testCaching() {
  console.log('\n=== 測試緩存機制 ===');
  
  const testMethod = 'eth_getCode';
  const testAddress = '0x0000000000000000000000000000000000000000';
  
  // 第一次請求
  console.log('第一次請求...');
  const response1 = await fetch(rpcEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: testMethod,
      params: [testAddress, 'latest'],
      id: 2
    })
  });
  
  const cache1 = response1.headers.get('X-Cache');
  const time1 = response1.headers.get('X-Response-Time');
  console.log(`✅ 緩存: ${cache1}, 時間: ${time1}`);
  
  // 第二次請求（應該命中緩存）
  console.log('\n第二次請求（應該命中緩存）...');
  const response2 = await fetch(rpcEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: testMethod,
      params: [testAddress, 'latest'],
      id: 3
    })
  });
  
  const cache2 = response2.headers.get('X-Cache');
  const time2 = response2.headers.get('X-Response-Time');
  console.log(`✅ 緩存: ${cache2}, 時間: ${time2}`);
  
  if (cache2 === 'HIT') {
    console.log('✅ 緩存機制正常工作！');
  } else {
    console.log('⚠️ 緩存未命中，請檢查配置');
  }
}

async function testBatchRequest() {
  console.log('\n=== 測試批量請求 ===');
  
  try {
    const response = await fetch(rpcEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        { jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 4 },
        { jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 5 },
        { jsonrpc: '2.0', method: 'net_version', params: [], id: 6 }
      ])
    });
    
    const data = await response.json();
    console.log(`✅ 批量請求返回 ${data.length} 個結果`);
    
    data.forEach((result, index) => {
      console.log(`  結果 ${index + 1}: ${result.result}`);
    });
  } catch (error) {
    console.error(`❌ 批量請求失敗: ${error.message}`);
  }
}

async function testRateLimit() {
  console.log('\n=== 測試速率限制 ===');
  console.log('發送 10 個快速請求...');
  
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      fetch(rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 100 + i
        })
      })
    );
  }
  
  const results = await Promise.all(promises);
  const statusCodes = results.map(r => r.status);
  
  console.log(`✅ 狀態碼: ${statusCodes.join(', ')}`);
  
  const rateLimited = statusCodes.filter(code => code === 429).length;
  if (rateLimited > 0) {
    console.log(`⚠️ ${rateLimited} 個請求被速率限制（正常）`);
  } else {
    console.log('✅ 所有請求都成功（在限制內）');
  }
}

async function testHealthCheck() {
  console.log('\n=== 測試健康檢查 ===');
  
  try {
    const response = await fetch(`${rpcEndpoint}/health`);
    const data = await response.json();
    
    console.log(`✅ 健康狀態: ${data.status}`);
    console.log(`✅ 時間戳: ${data.timestamp}`);
    
    if (data.stats) {
      console.log('\n📊 統計數據:');
      console.log(`  緩存命中率: ${data.stats.cache.hitRate}`);
      console.log(`  緩存大小: ${data.stats.cache.size}`);
      console.log(`  活躍客戶端: ${data.stats.rateLimiter.activeClients}`);
      console.log(`  可用 API Keys: ${data.stats.keyManager.totalKeys}`);
      
      if (data.stats.keyManager.keys && data.stats.keyManager.keys.length > 0) {
        console.log('\n  API Key 狀態:');
        data.stats.keyManager.keys.forEach(key => {
          console.log(`    Key ${key.index}: ${key.requests} 請求, ${key.errorRate} 錯誤率`);
        });
      }
    }
  } catch (error) {
    console.error(`❌ 健康檢查失敗: ${error.message}`);
  }
}

async function measurePerformance() {
  console.log('\n=== 性能測試 ===');
  console.log('測試 20 個請求的平均響應時間...');
  
  const times = [];
  
  for (let i = 0; i < 20; i++) {
    const start = Date.now();
    
    await fetch(rpcEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: i % 2 === 0 ? 'eth_blockNumber' : 'eth_chainId',
        params: [],
        id: 200 + i
      })
    });
    
    const duration = Date.now() - start;
    times.push(duration);
    
    // 避免速率限制
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  console.log(`✅ 平均響應時間: ${avgTime.toFixed(2)}ms`);
  console.log(`✅ 最快: ${minTime}ms`);
  console.log(`✅ 最慢: ${maxTime}ms`);
}

// 主測試函數
async function runAllTests() {
  console.log(`🧪 測試 RPC 優化版本: ${rpcEndpoint}`);
  console.log('=====================================');
  
  await testBasicRpc();
  await testCaching();
  await testBatchRequest();
  await testRateLimit();
  await testHealthCheck();
  await measurePerformance();
  
  console.log('\n✅ 所有測試完成！');
}

// 執行測試
runAllTests().catch(console.error);