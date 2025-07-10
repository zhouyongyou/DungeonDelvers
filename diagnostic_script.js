#!/usr/bin/env node

// NFT 市場顯示問題診斷腳本
// 用於檢查服務器狀態、智能合約調用和網路連接

import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';
import fetch from 'node-fetch';
import 'dotenv/config';

// 配置
const config = {
  rpcUrl: process.env.VITE_ALCHEMY_BSC_MAINNET_RPC_URL || 'https://bsc-dataseed1.binance.org/',
  graphqlUrl: process.env.VITE_THE_GRAPH_STUDIO_API_URL,
  metadataServerUrl: process.env.METADATA_SERVER_URL || 'http://localhost:3001',
  contracts: {
    vipStaking: process.env.VITE_MAINNET_VIPSTAKING_ADDRESS,
    hero: process.env.VITE_MAINNET_HERO_ADDRESS,
    relic: process.env.VITE_MAINNET_RELIC_ADDRESS,
    oracle: process.env.VITE_MAINNET_ORACLE_ADDRESS,
  },
  testUser: process.env.TEST_USER_ADDRESS || '0x742d35Cc6634C0532925a3b8D84E05E7ff02b4c2', // 測試用地址
  testTokenIds: {
    vip: 1,
    hero: 1,
    relic: 1,
  }
};

// 創建 viem 客戶端
const publicClient = createPublicClient({
  chain: bsc,
  transport: http(config.rpcUrl),
});

// VIP Staking ABI (部分)
const vipStakingAbi = [
  {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getVipLevel',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
];

// 診斷結果
const results = {
  rpcConnection: { status: 'pending', details: null },
  smartContracts: { status: 'pending', details: {} },
  metadataServer: { status: 'pending', details: {} },
  graphqlEndpoint: { status: 'pending', details: null },
  ipfsGateways: { status: 'pending', details: {} },
  overall: { status: 'pending', issues: [], recommendations: [] }
};

// 顏色輸出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// 1. 檢查 RPC 連接
async function checkRpcConnection() {
  log('🔍 檢查 RPC 連接...', 'blue');
  
  try {
    const blockNumber = await publicClient.getBlockNumber();
    results.rpcConnection.status = 'success';
    results.rpcConnection.details = {
      blockNumber: blockNumber.toString(),
      rpcUrl: config.rpcUrl,
    };
    log(`✅ RPC 連接正常，當前區塊: ${blockNumber}`, 'green');
  } catch (error) {
    results.rpcConnection.status = 'error';
    results.rpcConnection.details = { error: error.message };
    log(`❌ RPC 連接失敗: ${error.message}`, 'red');
    results.overall.issues.push('RPC 節點連接問題');
    results.overall.recommendations.push('檢查 RPC 節點 URL 或更換 RPC 提供商');
  }
}

// 2. 檢查智能合約調用
async function checkSmartContracts() {
  log('🔍 檢查智能合約調用...', 'blue');
  
  // 檢查 VIP Staking 合約
  if (config.contracts.vipStaking) {
    try {
      // 測試 getVipLevel 函數
      const vipLevel = await publicClient.readContract({
        address: config.contracts.vipStaking,
        abi: vipStakingAbi,
        functionName: 'getVipLevel',
        args: [config.testUser],
      });
      
      results.smartContracts.details.vipLevel = {
        status: 'success',
        result: vipLevel.toString(),
      };
      log(`✅ VIP 等級查詢成功: ${vipLevel}`, 'green');
      
      // 測試 tokenURI 函數
      try {
        const tokenURI = await publicClient.readContract({
          address: config.contracts.vipStaking,
          abi: vipStakingAbi,
          functionName: 'tokenURI',
          args: [BigInt(config.testTokenIds.vip)],
        });
        
        results.smartContracts.details.tokenURI = {
          status: 'success',
          result: tokenURI.substring(0, 100) + '...',
        };
        log(`✅ TokenURI 查詢成功`, 'green');
      } catch (error) {
        results.smartContracts.details.tokenURI = {
          status: 'error',
          error: error.message,
        };
        log(`⚠️ TokenURI 查詢失敗: ${error.message}`, 'yellow');
      }
      
    } catch (error) {
      results.smartContracts.details.vipLevel = {
        status: 'error',
        error: error.message,
      };
      log(`❌ VIP 合約調用失敗: ${error.message}`, 'red');
      results.overall.issues.push('智能合約調用問題');
      results.overall.recommendations.push('檢查合約地址和 ABI 配置');
    }
  } else {
    log('⚠️ 未配置 VIP Staking 合約地址', 'yellow');
  }
  
  results.smartContracts.status = 'completed';
}

// 3. 檢查元數據服務器
async function checkMetadataServer() {
  log('🔍 檢查元數據服務器...', 'blue');
  
  try {
    // 健康檢查
    const healthResponse = await fetch(`${config.metadataServerUrl}/health`, {
      timeout: 5000,
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      results.metadataServer.details.health = {
        status: 'success',
        data: healthData,
      };
      log(`✅ 元數據服務器健康檢查通過`, 'green');
    } else {
      results.metadataServer.details.health = {
        status: 'error',
        statusCode: healthResponse.status,
      };
      log(`❌ 元數據服務器健康檢查失敗: ${healthResponse.status}`, 'red');
    }
    
    // 測試 VIP NFT API
    const vipApiResponse = await fetch(`${config.metadataServerUrl}/api/vip/${config.testTokenIds.vip}`, {
      timeout: 10000,
    });
    
    if (vipApiResponse.ok) {
      const vipData = await vipApiResponse.json();
      results.metadataServer.details.vipApi = {
        status: 'success',
        hasImage: !!vipData.image,
        hasAttributes: !!vipData.attributes,
      };
      log(`✅ VIP NFT API 調用成功`, 'green');
    } else {
      const errorText = await vipApiResponse.text();
      results.metadataServer.details.vipApi = {
        status: 'error',
        statusCode: vipApiResponse.status,
        error: errorText,
      };
      log(`❌ VIP NFT API 調用失敗: ${vipApiResponse.status}`, 'red');
      results.overall.issues.push('元數據服務器 API 問題');
      results.overall.recommendations.push('檢查元數據服務器狀態和配置');
    }
    
  } catch (error) {
    results.metadataServer.details.connection = {
      status: 'error',
      error: error.message,
    };
    log(`❌ 元數據服務器連接失敗: ${error.message}`, 'red');
    results.overall.issues.push('元數據服務器連接問題');
    results.overall.recommendations.push('檢查元數據服務器 URL 和網路連接');
  }
  
  results.metadataServer.status = 'completed';
}

// 4. 檢查 GraphQL 端點
async function checkGraphQLEndpoint() {
  log('🔍 檢查 GraphQL 端點...', 'blue');
  
  if (!config.graphqlUrl) {
    log('⚠️ 未配置 GraphQL URL', 'yellow');
    return;
  }
  
  try {
    const query = `
      query GetPlayerAssets($owner: ID!) {
        player(id: $owner) {
          id
          vip {
            level
            stakedAmount
            tokenId
          }
        }
      }
    `;
    
    const response = await fetch(config.graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: { owner: config.testUser.toLowerCase() },
      }),
      timeout: 10000,
    });
    
    if (response.ok) {
      const data = await response.json();
      results.graphqlEndpoint.status = 'success';
      results.graphqlEndpoint.details = {
        hasData: !!data.data,
        hasErrors: !!data.errors,
        vipLevel: data.data?.player?.vip?.level || 'N/A',
      };
      log(`✅ GraphQL 查詢成功`, 'green');
      
      if (data.data?.player?.vip?.level === 0) {
        log(`⚠️ GraphQL 中的 VIP 等級為 0 (已知問題)`, 'yellow');
        results.overall.issues.push('GraphQL 子圖中 VIP 等級硬編碼為 0');
        results.overall.recommendations.push('確認前端直接調用智能合約獲取 VIP 等級');
      }
    } else {
      results.graphqlEndpoint.status = 'error';
      results.graphqlEndpoint.details = {
        statusCode: response.status,
        error: await response.text(),
      };
      log(`❌ GraphQL 查詢失敗: ${response.status}`, 'red');
      results.overall.issues.push('GraphQL 端點問題');
      results.overall.recommendations.push('檢查 The Graph 子圖部署狀態');
    }
  } catch (error) {
    results.graphqlEndpoint.status = 'error';
    results.graphqlEndpoint.details = { error: error.message };
    log(`❌ GraphQL 連接失敗: ${error.message}`, 'red');
    results.overall.issues.push('GraphQL 連接問題');
    results.overall.recommendations.push('檢查 GraphQL 端點 URL 和網路連接');
  }
}

// 5. 檢查 IPFS 網關
async function checkIpfsGateways() {
  log('🔍 檢查 IPFS 網關...', 'blue');
  
  const testHash = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'; // 測試用的 IPFS 哈希
  const gateways = [
    'https://ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
  ];
  
  for (const gateway of gateways) {
    try {
      const response = await fetch(`${gateway}${testHash}`, {
        timeout: 5000,
      });
      
      if (response.ok) {
        results.ipfsGateways.details[gateway] = {
          status: 'success',
          responseTime: Date.now(),
        };
        log(`✅ IPFS 網關可用: ${gateway}`, 'green');
      } else {
        results.ipfsGateways.details[gateway] = {
          status: 'error',
          statusCode: response.status,
        };
        log(`❌ IPFS 網關失敗: ${gateway} (${response.status})`, 'red');
      }
    } catch (error) {
      results.ipfsGateways.details[gateway] = {
        status: 'error',
        error: error.message,
      };
      log(`❌ IPFS 網關連接失敗: ${gateway}`, 'red');
    }
  }
  
  const workingGateways = Object.values(results.ipfsGateways.details).filter(g => g.status === 'success').length;
  if (workingGateways === 0) {
    results.overall.issues.push('所有 IPFS 網關都不可用');
    results.overall.recommendations.push('檢查網路連接或使用其他 IPFS 網關');
  }
  
  results.ipfsGateways.status = 'completed';
}

// 生成診斷報告
function generateReport() {
  log('\n📊 診斷報告', 'blue');
  log('='.repeat(50), 'blue');
  
  console.log('\n🔍 檢查結果:');
  console.log(`RPC 連接: ${results.rpcConnection.status === 'success' ? '✅' : '❌'}`);
  console.log(`智能合約: ${results.smartContracts.details.vipLevel?.status === 'success' ? '✅' : '❌'}`);
  console.log(`元數據服務器: ${results.metadataServer.details.health?.status === 'success' ? '✅' : '❌'}`);
  console.log(`GraphQL 端點: ${results.graphqlEndpoint.status === 'success' ? '✅' : '❌'}`);
  console.log(`IPFS 網關: ${Object.values(results.ipfsGateways.details).some(g => g.status === 'success') ? '✅' : '❌'}`);
  
  if (results.overall.issues.length > 0) {
    console.log('\n⚠️ 發現的問題:');
    results.overall.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  }
  
  if (results.overall.recommendations.length > 0) {
    console.log('\n💡 建議修復方案:');
    results.overall.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
  }
  
  console.log('\n📋 詳細結果:');
  console.log(JSON.stringify(results, null, 2));
}

// 主函數
async function main() {
  log('🚀 開始 NFT 市場顯示問題診斷', 'blue');
  log('='.repeat(50), 'blue');
  
  try {
    await checkRpcConnection();
    await checkSmartContracts();
    await checkMetadataServer();
    await checkGraphQLEndpoint();
    await checkIpfsGateways();
    
    generateReport();
    
    // 設置整體狀態
    if (results.overall.issues.length === 0) {
      results.overall.status = 'healthy';
      log('\n🎉 所有檢查都通過！', 'green');
    } else {
      results.overall.status = 'issues_found';
      log('\n⚠️ 發現問題，請查看上面的建議修復方案', 'yellow');
    }
    
  } catch (error) {
    log(`❌ 診斷過程中發生錯誤: ${error.message}`, 'red');
    results.overall.status = 'error';
    results.overall.issues.push('診斷過程中發生未預期錯誤');
  }
}

// 運行診斷
main().catch(console.error);