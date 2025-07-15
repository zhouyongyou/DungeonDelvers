#!/usr/bin/env node

/**
 * 手動 RPC 代理測試腳本
 * 用於快速測試單個 RPC 功能
 */

const fetch = require('node-fetch');

// 配置
const RPC_PROXY_URL = process.env.RPC_PROXY_URL || 'http://localhost:3000/api/rpc';

// 測試函數
async function testRpcRequest(method, params = []) {
  console.log(`\n🔍 測試 ${method}...`);
  
  const request = {
    jsonrpc: '2.0',
    method: method,
    params: params,
    id: Date.now()
  };
  
  try {
    const start = Date.now();
    
    const response = await fetch(RPC_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });
    
    const duration = Date.now() - start;
    
    if (!response.ok) {
      console.error(`❌ HTTP 錯誤: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    
    console.log(`⏱️ 響應時間: ${duration}ms`);
    console.log(`📊 狀態碼: ${response.status}`);
    console.log(`📄 響應頭:`, Object.fromEntries(response.headers));
    
    if (data.error) {
      console.error(`❌ RPC 錯誤:`, data.error);
    } else {
      console.log(`✅ 成功:`, data.result);
    }
    
  } catch (error) {
    console.error(`❌ 請求失敗:`, error.message);
  }
}

async function testCORS() {
  console.log(`\n🌐 測試 CORS 設置...`);
  
  try {
    const response = await fetch(RPC_PROXY_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log(`📊 OPTIONS 狀態碼: ${response.status}`);
    console.log(`🔒 CORS 標頭:`);
    console.log(`  - Access-Control-Allow-Origin: ${response.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`  - Access-Control-Allow-Methods: ${response.headers.get('Access-Control-Allow-Methods')}`);
    console.log(`  - Access-Control-Allow-Headers: ${response.headers.get('Access-Control-Allow-Headers')}`);
    
  } catch (error) {
    console.error(`❌ CORS 測試失敗:`, error.message);
  }
}

async function testKeyRotation() {
  console.log(`\n🔄 測試 API 金鑰輪換...`);
  
  const results = [];
  
  for (let i = 0; i < 5; i++) {
    try {
      const start = Date.now();
      const response = await fetch(RPC_PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: i + 1
        })
      });
      
      const duration = Date.now() - start;
      const data = await response.json();
      
      results.push({
        request: i + 1,
        success: !data.error,
        duration,
        result: data.result || data.error
      });
      
      console.log(`  請求 ${i + 1}: ${data.error ? '❌' : '✅'} (${duration}ms)`);
      
    } catch (error) {
      results.push({
        request: i + 1,
        success: false,
        error: error.message
      });
      console.log(`  請求 ${i + 1}: ❌ ${error.message}`);
    }
    
    // 短暫延遲
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n📊 金鑰輪換測試結果: ${successCount}/5 成功`);
}

async function testErrorHandling() {
  console.log(`\n⚠️ 測試錯誤處理...`);
  
  // 測試無效 JSON
  try {
    const response = await fetch(RPC_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json'
    });
    
    const data = await response.json();
    console.log(`無效 JSON 響應:`, data);
    
  } catch (error) {
    console.log(`無效 JSON 錯誤:`, error.message);
  }
  
  // 測試無效方法
  try {
    const response = await fetch(RPC_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'invalid_method',
        params: [],
        id: 999
      })
    });
    
    const data = await response.json();
    console.log(`無效方法響應:`, data);
    
  } catch (error) {
    console.log(`無效方法錯誤:`, error.message);
  }
}

async function main() {
  console.log('🧪 DungeonDelvers RPC 代理手動測試');
  console.log('='*40);
  console.log(`🔗 代理 URL: ${RPC_PROXY_URL}`);
  
  // 基本 RPC 測試
  await testRpcRequest('eth_chainId');
  await testRpcRequest('eth_blockNumber');
  await testRpcRequest('eth_gasPrice');
  await testRpcRequest('eth_getBalance', ['0x0000000000000000000000000000000000000000', 'latest']);
  
  // CORS 測試
  await testCORS();
  
  // API 金鑰輪換測試
  await testKeyRotation();
  
  // 錯誤處理測試
  await testErrorHandling();
  
  console.log('\n✅ 測試完成');
}

if (require.main === module) {
  main().catch(console.error);
}