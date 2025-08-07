#!/usr/bin/env node
/**
 * 🚀 DungeonDelvers ABI & 配置統一同步腳本
 * 統一管理前端、子圖的 ABI 和配置同步
 * 
 * 功能：
 * 1. 從智能合約項目同步 ABI 文件
 * 2. 從 .env.v25 同步配置到各平台
 * 3. 驗證配置一致性
 * 4. 生成同步報告
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// =================================================================
// 🎯 配置路徑
// =================================================================
const PATHS = {
  // 主配置文件
  envSource: '.env.v25',
  
  // ABI 來源和目標
  contractProject: '/Users/sotadic/Documents/DungeonDelversContracts',
  abiSource: '/Users/sotadic/Documents/DungeonDelversContracts/artifacts/contracts',
  frontendAbis: './src/abis',
  subgraphAbis: './DDgraphql/dungeon-delvers/abis',
  
  // 配置目標文件
  frontendEnv: '.env.local',
  backendConfig: '/Users/sotadic/Documents/dungeon-delvers-metadata-server/config/contracts.json',
  subgraphConfig: './DDgraphql/dungeon-delvers/subgraph.yaml',
  publicConfig: './public/config/v25.json'
};

// =================================================================
// 🏗️ ABI 文件映射配置
// =================================================================
const ABI_MAPPINGS = [
  // NFT 合約
  { contract: 'Hero', sourceFile: 'nft/Hero.sol/Hero.json' },
  { contract: 'Relic', sourceFile: 'nft/Relic.sol/Relic.json' },
  { contract: 'Party', sourceFile: 'nft/Party.sol/Party.json' },
  { contract: 'PlayerProfile', sourceFile: 'nft/PlayerProfile.sol/PlayerProfile.json' },
  { contract: 'VIPStaking', sourceFile: 'nft/VIPStaking.sol/VIPStaking.json' },
  
  // 核心合約
  { contract: 'DungeonCore', sourceFile: 'core/DungeonCore.sol/DungeonCore.json' },
  { contract: 'DungeonMaster', sourceFile: 'core/DungeonMaster.sol/DungeonMaster.json' },
  { contract: 'DungeonStorage', sourceFile: 'core/DungeonStorage.sol/DungeonStorage.json' },
  { contract: 'AltarOfAscension', sourceFile: 'core/AltarOfAscension.sol/AltarOfAscension.json' },
  { contract: 'PlayerVault', sourceFile: 'defi/PlayerVault.sol/PlayerVault.json' },
  { contract: 'Oracle', sourceFile: 'defi/Oracle.sol/Oracle.json' },
  
  // 代幣合約
  { contract: 'SoulShardToken', sourceFile: 'defi/SoulShard.sol/SoulShard.json' },
  
  // VRF 合約
  { contract: 'VRFManager', sourceFile: 'core/VRFManager.sol/VRFManager.json' }
];

// =================================================================
// 🔧 工具函數
// =================================================================

/**
 * 讀取並解析 .env.v25 文件
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`❌ 找不到環境變數文件：${filePath}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...values] = line.split('=');
      env[key.trim()] = values.join('=').trim();
    }
  });
  
  return env;
}

/**
 * 同步 ABI 文件
 */
function syncAbiFiles() {
  console.log('🔄 開始同步 ABI 文件...');
  
  const results = {
    success: [],
    failed: [],
    skipped: []
  };
  
  // 檢查來源目錄
  if (!fs.existsSync(PATHS.abiSource)) {
    console.log(`⚠️  ABI 來源目錄不存在：${PATHS.abiSource}`);
    console.log('   跳過 ABI 同步，使用現有文件');
    return results;
  }
  
  ABI_MAPPINGS.forEach(({ contract, sourceFile }) => {
    try {
      const sourcePath = path.join(PATHS.abiSource, sourceFile);
      
      if (!fs.existsSync(sourcePath)) {
        results.skipped.push(`${contract} (找不到 ${sourceFile})`);
        return;
      }
      
      // 讀取並驗證 ABI
      const abiData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
      const abi = abiData.abi || abiData; // 支援不同格式
      
      if (!Array.isArray(abi)) {
        results.failed.push(`${contract} (ABI 格式無效)`);
        return;
      }
      
      // 同步到前端
      const frontendPath = path.join(PATHS.frontendAbis, `${contract}.json`);
      fs.writeFileSync(frontendPath, JSON.stringify(abi, null, 2));
      
      // 同步到子圖
      const subgraphPath = path.join(PATHS.subgraphAbis, `${contract}.json`);
      fs.writeFileSync(subgraphPath, JSON.stringify(abi, null, 2));
      
      results.success.push(contract);
      
    } catch (error) {
      results.failed.push(`${contract} (${error.message})`);
    }
  });
  
  // 輸出結果
  console.log(`✅ 成功同步 ABI：${results.success.length} 個`);
  if (results.success.length > 0) {
    console.log(`   ${results.success.join(', ')}`);
  }
  
  if (results.skipped.length > 0) {
    console.log(`⚠️  跳過：${results.skipped.join(', ')}`);
  }
  
  if (results.failed.length > 0) {
    console.log(`❌ 失敗：${results.failed.join(', ')}`);
  }
  
  return results;
}

/**
 * 同步配置到各平台
 */
function syncConfigurations(env) {
  console.log('🔄 開始同步配置...');
  
  const results = [];
  
  try {
    // 1. 同步前端環境變數
    fs.writeFileSync(PATHS.frontendEnv, Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n'));
    results.push('✅ 前端 .env.local');
    
    // 2. 同步後端配置
    const backendConfig = {
      version: env.VITE_APP_VERSION || 'V25',
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      network: env.VITE_NETWORK_NAME || 'BSC Mainnet',
      chainId: parseInt(env.VITE_CHAIN_ID) || 56,
      startBlock: parseInt(env.VITE_START_BLOCK) || 0,
      contracts: {
        DUNGEONCORE: env.VITE_DUNGEONCORE_ADDRESS,
        ORACLE: env.VITE_ORACLE_ADDRESS,
        HERO: env.VITE_HERO_ADDRESS,
        RELIC: env.VITE_RELIC_ADDRESS,
        PARTY: env.VITE_PARTY_ADDRESS,
        DUNGEONMASTER: env.VITE_DUNGEONMASTER_ADDRESS,
        DUNGEONSTORAGE: env.VITE_DUNGEONSTORAGE_ADDRESS,
        ALTAROFASCENSION: env.VITE_ALTAROFASCENSION_ADDRESS,
        PLAYERVAULT: env.VITE_PLAYERVAULT_ADDRESS,
        PLAYERPROFILE: env.VITE_PLAYERPROFILE_ADDRESS,
        VIPSTAKING: env.VITE_VIPSTAKING_ADDRESS,
        SOULSHARD: env.VITE_SOULSHARD_ADDRESS,
        USD: env.VITE_USD_ADDRESS,
        VRFMANAGER: env.VITE_VRF_MANAGER_V2PLUS_ADDRESS
      },
      endpoints: {
        subgraph: env.VITE_SUBGRAPH_URL,
        backend: env.VITE_METADATA_SERVER_URL,
        rpc: env.VITE_RPC_URL
      }
    };
    
    fs.writeFileSync(PATHS.backendConfig, JSON.stringify(backendConfig, null, 2));
    results.push('✅ 後端 contracts.json');
    
    // 3. 更新公共配置文件
    const publicConfigPath = PATHS.publicConfig;
    if (fs.existsSync(publicConfigPath)) {
      const publicConfig = JSON.parse(fs.readFileSync(publicConfigPath, 'utf8'));
      
      // 更新合約地址
      Object.keys(backendConfig.contracts).forEach(key => {
        if (publicConfig.contracts[key] !== backendConfig.contracts[key]) {
          publicConfig.contracts[key] = backendConfig.contracts[key];
        }
      });
      
      // 更新服務端點
      if (publicConfig.services) {
        if (publicConfig.services.subgraph) {
          publicConfig.services.subgraph.url = env.VITE_SUBGRAPH_URL;
        }
        if (publicConfig.services.metadataServer) {
          publicConfig.services.metadataServer.url = env.VITE_METADATA_SERVER_URL;
        }
      }
      
      publicConfig.lastUpdated = new Date().toISOString();
      
      fs.writeFileSync(publicConfigPath, JSON.stringify(publicConfig, null, 2));
      results.push('✅ 公共配置 v25.json');
    }
    
  } catch (error) {
    results.push(`❌ 配置同步失敗：${error.message}`);
  }
  
  results.forEach(result => console.log(`   ${result}`));
  return results;
}

/**
 * 驗證配置一致性
 */
function verifyConsistency(env) {
  console.log('🔍 驗證配置一致性...');
  
  const issues = [];
  const warnings = [];
  
  try {
    // 檢查必要的環境變數
    const requiredVars = [
      'VITE_HERO_ADDRESS',
      'VITE_RELIC_ADDRESS',
      'VITE_DUNGEONMASTER_ADDRESS',
      'VITE_SUBGRAPH_URL'
    ];
    
    requiredVars.forEach(varName => {
      if (!env[varName] || env[varName].trim() === '') {
        issues.push(`缺少必要變數：${varName}`);
      }
    });
    
    // 檢查地址格式
    Object.entries(env).forEach(([key, value]) => {
      if (key.includes('_ADDRESS') && value) {
        if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
          issues.push(`地址格式錯誤：${key} = ${value}`);
        }
      }
    });
    
    // 檢查 URL 格式
    ['VITE_SUBGRAPH_STUDIO_URL', 'VITE_METADATA_SERVER_URL'].forEach(key => {
      if (env[key] && !env[key].startsWith('http')) {
        warnings.push(`URL 可能無效：${key} = ${env[key]}`);
      }
    });
    
  } catch (error) {
    issues.push(`驗證過程出錯：${error.message}`);
  }
  
  // 輸出結果
  if (issues.length === 0 && warnings.length === 0) {
    console.log('   ✅ 配置一致性檢查通過');
  }
  
  issues.forEach(issue => console.log(`   ❌ ${issue}`));
  warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
  
  return { issues, warnings };
}

/**
 * 生成同步報告
 */
function generateReport(env, abiResults, configResults, verification) {
  const report = {
    timestamp: new Date().toISOString(),
    version: env.VITE_APP_VERSION || 'V25',
    abi: {
      synced: abiResults.success.length,
      failed: abiResults.failed.length,
      skipped: abiResults.skipped.length,
      details: abiResults
    },
    config: {
      results: configResults
    },
    validation: verification,
    summary: {
      status: verification.issues.length === 0 ? 'SUCCESS' : 'HAS_ISSUES',
      totalIssues: verification.issues.length,
      totalWarnings: verification.warnings.length
    }
  };
  
  // 保存報告
  const reportPath = './sync-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\\n📊 同步報告已生成：sync-report.json');
  console.log(`   狀態：${report.summary.status}`);
  console.log(`   ABI 同步：${report.abi.synced}/${ABI_MAPPINGS.length}`);
  console.log(`   配置問題：${report.summary.totalIssues} 個`);
  console.log(`   警告：${report.summary.totalWarnings} 個`);
  
  return report;
}

// =================================================================
// 🚀 主執行流程
// =================================================================
function main() {
  console.log('🚀 DungeonDelvers 統一配置同步工具');
  console.log('='.repeat(50));
  
  try {
    // 1. 讀取主配置
    console.log('📋 讀取主配置文件...');
    const env = parseEnvFile(PATHS.envSource);
    console.log(`   ✅ 讀取到 ${Object.keys(env).length} 個配置項`);
    
    // 2. 同步 ABI 文件
    const abiResults = syncAbiFiles();
    
    // 3. 同步配置
    const configResults = syncConfigurations(env);
    
    // 4. 驗證一致性
    const verification = verifyConsistency(env);
    
    // 5. 生成報告
    const report = generateReport(env, abiResults, configResults, verification);
    
    console.log('\\n' + '='.repeat(50));
    if (report.summary.status === 'SUCCESS') {
      console.log('✅ 同步完成！所有配置已更新並驗證通過');
    } else {
      console.log('⚠️  同步完成但有問題需要處理');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 同步過程發生錯誤：', error.message);
    process.exit(1);
  }
}

// 執行主流程
if (require.main === module) {
  main();
}

module.exports = { main, parseEnvFile, syncAbiFiles, syncConfigurations, verifyConsistency };