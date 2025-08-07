#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// V25 官方地址配置（8/7 pm6 部署）
const V25_CONFIG = {
  version: 'V25',
  deployedAt: '2024-08-07T18:00:00Z',
  startBlock: '56757876',
  contracts: {
    // 新部署的 V25 合約
    HERO: '0x671d937b171e2ba2c4dc23c133b07e4449f283ef',
    RELIC: '0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da',
    PARTY: '0x28a85d14e0f87d6ed04e21c30992df8b3e9434e3',
    DUNGEONSTORAGE: '0x539ac926c6dae898f2c843af8c59ff92b4b3b468',
    DUNGEONMASTER: '0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a',
    ALTAROFASCENSION: '0xa86749237d4631ad92ba859d0b0df4770f6147ba',
    
    // 重複使用的合約
    DUNGEONCORE: '0x8a2d2b1961135127228edd71ff98d6b097915a13',
    PLAYERVAULT: '0x62bce9af5e2c47b13f62a2e0fcb1f9c7afaf8787',
    PLAYERPROFILE: '0x0f5932e89908400a5afdc306899a2987b67a3155',
    VIPSTAKING: '0xc0d8c84e28e5bcfc9cbd109551de53ba04e7328c',
    ORACLE: '0xf8ce896af39f95a9d5dd688c35d381062263e25a',
    
    // Token 合約
    SOULSHARD: '0x97b2c2a9a11c7b6a020b4baeaad349865ead0bcf',
    USD: '0x7c67af4ebc6651c95df78de11cfe325660d935fe',
    UNISWAP_POOL: '0x1e5cd5f386fb6f39cd8788675dd3a5ceb6521c82',
    
    // VRF Manager
    VRF_MANAGER_V2PLUS: '0x980d224ec4d198d94f34a8af76a19c00dabe2436'
  }
};

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║            V25 配置同步驗證工具                                ║');
console.log('╠═══════════════════════════════════════════════════════════════╣');
console.log(`║  版本：${V25_CONFIG.version}                                                    ║`);
console.log(`║  部署時間：${V25_CONFIG.deployedAt}                           ║`);
console.log(`║  起始區塊：${V25_CONFIG.startBlock}                                        ║`);
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const errors = [];
const warnings = [];
const successes = [];

// 1. 檢查子圖配置
function checkSubgraph() {
  console.log('📊 檢查子圖配置 (subgraph.yaml)...\n');
  const subgraphPath = path.join(__dirname, '..', 'subgraph.yaml');
  
  if (!fs.existsSync(subgraphPath)) {
    errors.push('❌ subgraph.yaml 不存在');
    return;
  }
  
  const content = fs.readFileSync(subgraphPath, 'utf8').toLowerCase();
  
  // 檢查每個合約地址
  const contractMappings = {
    'Hero': V25_CONFIG.contracts.HERO,
    'Relic': V25_CONFIG.contracts.RELIC,
    'PartyV3': V25_CONFIG.contracts.PARTY,
    'DungeonMaster': V25_CONFIG.contracts.DUNGEONMASTER,
    'PlayerVault': V25_CONFIG.contracts.PLAYERVAULT,
    'PlayerProfile': V25_CONFIG.contracts.PLAYERPROFILE,
    'VIPStaking': V25_CONFIG.contracts.VIPSTAKING,
    'AltarOfAscension': V25_CONFIG.contracts.ALTAROFASCENSION,
    'VRFManagerV2Plus': V25_CONFIG.contracts.VRF_MANAGER_V2PLUS
  };
  
  Object.entries(contractMappings).forEach(([name, address]) => {
    const lowerAddress = address.toLowerCase();
    if (content.includes(lowerAddress)) {
      successes.push(`  ✅ ${name}: ${lowerAddress}`);
    } else {
      errors.push(`  ❌ ${name}: 地址不正確（預期 ${lowerAddress}）`);
    }
  });
  
  // 檢查起始區塊
  if (content.includes(`startblock: ${V25_CONFIG.startBlock}`)) {
    successes.push(`  ✅ Start Block: ${V25_CONFIG.startBlock}`);
  } else {
    warnings.push(`  ⚠️  Start Block 可能不一致（預期 ${V25_CONFIG.startBlock}）`);
  }
}

// 2. 檢查後端配置
function checkBackend() {
  console.log('\n🔧 檢查後端配置 (contracts.json)...\n');
  const backendPath = '/Users/sotadic/Documents/dungeon-delvers-metadata-server/config/contracts.json';
  
  if (!fs.existsSync(backendPath)) {
    warnings.push('⚠️  後端配置文件不存在或路徑不正確');
    return;
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(backendPath, 'utf8'));
    
    // 檢查關鍵地址
    const checks = [
      { name: 'Hero', key: 'hero', expected: V25_CONFIG.contracts.HERO },
      { name: 'Relic', key: 'relic', expected: V25_CONFIG.contracts.RELIC },
      { name: 'Party', key: 'party', expected: V25_CONFIG.contracts.PARTY },
      { name: 'DungeonMaster', key: 'dungeonMaster', expected: V25_CONFIG.contracts.DUNGEONMASTER },
      { name: 'AltarOfAscension', key: 'altarOfAscension', expected: V25_CONFIG.contracts.ALTAROFASCENSION },
      { name: 'VRF Manager', key: 'vrfManagerV2Plus', expected: V25_CONFIG.contracts.VRF_MANAGER_V2PLUS }
    ];
    
    checks.forEach(({ name, key, expected }) => {
      if (config.contracts && config.contracts[key]) {
        const actual = config.contracts[key].toLowerCase();
        const expectedLower = expected.toLowerCase();
        if (actual === expectedLower) {
          successes.push(`  ✅ ${name}: ${actual}`);
        } else {
          errors.push(`  ❌ ${name}: ${actual} (預期 ${expectedLower})`);
        }
      }
    });
    
    // 檢查 VRF 配置
    if (config.vrf && config.vrf.mode === 'subscription') {
      successes.push('  ✅ VRF Mode: subscription (V2.5)');
    } else {
      warnings.push('  ⚠️  VRF 模式可能不正確');
    }
  } catch (error) {
    errors.push(`  ❌ 無法解析後端配置: ${error.message}`);
  }
}

// 3. 檢查前端配置
function checkFrontend() {
  console.log('\n🎨 檢查前端配置...\n');
  
  // 嘗試多個可能的路徑
  const possiblePaths = [
    '/Users/sotadic/Documents/GitHub/DungeonDelvers/src/config/contracts.ts',
    '/Users/sotadic/Documents/GitHub/DungeonDelvers/src/config/contracts.js',
    '/Users/sotadic/Documents/GitHub/DungeonDelvers/src/utils/contracts.ts'
  ];
  
  let found = false;
  for (const frontendPath of possiblePaths) {
    if (fs.existsSync(frontendPath)) {
      found = true;
      const content = fs.readFileSync(frontendPath, 'utf8').toLowerCase();
      
      // 檢查關鍵地址
      Object.entries(V25_CONFIG.contracts).forEach(([name, address]) => {
        const lowerAddress = address.toLowerCase();
        if (content.includes(lowerAddress)) {
          successes.push(`  ✅ ${name}: 已找到`);
        } else if (name !== 'DUNGEONSTORAGE' && name !== 'ORACLE' && name !== 'DUNGEONCORE') {
          warnings.push(`  ⚠️  ${name}: 未找到地址`);
        }
      });
      break;
    }
  }
  
  if (!found) {
    warnings.push('  ⚠️  前端配置文件未找到（路徑可能不同）');
  }
}

// 4. 生成修復建議
function generateReport() {
  console.log('\n' + '═'.repeat(60));
  console.log('📋 驗證報告總結');
  console.log('═'.repeat(60) + '\n');
  
  if (successes.length > 0) {
    console.log('✅ 成功項目：');
    successes.forEach(s => console.log(s));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  警告項目：');
    warnings.forEach(w => console.log(w));
  }
  
  if (errors.length > 0) {
    console.log('\n❌ 錯誤項目：');
    errors.forEach(e => console.log(e));
    
    console.log('\n🔧 建議修復步驟：');
    console.log('1. 執行 npm run codegen 重新生成類型');
    console.log('2. 執行 npm run build 構建子圖');
    console.log('3. 確認所有地址都已更新到 V25');
    console.log('4. 執行 graph deploy --studio dungeon-delvers 部署');
  } else {
    console.log('\n✨ 所有配置已正確同步到 V25！');
  }
  
  // 顯示配置摘要
  console.log('\n📌 V25 合約地址參考：');
  console.log('┌─────────────────────┬──────────────────────────────────────────┐');
  console.log('│ 合約名稱            │ 地址                                     │');
  console.log('├─────────────────────┼──────────────────────────────────────────┤');
  Object.entries(V25_CONFIG.contracts).forEach(([name, address]) => {
    const paddedName = name.padEnd(19);
    console.log(`│ ${paddedName} │ ${address.toLowerCase()} │`);
  });
  console.log('└─────────────────────┴──────────────────────────────────────────┘');
  
  // 計算總體狀態
  const totalChecks = successes.length + warnings.length + errors.length;
  const successRate = Math.round((successes.length / totalChecks) * 100);
  
  console.log(`\n📊 同步狀態: ${successRate}% (${successes.length}/${totalChecks} 檢查通過)`);
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n🎉 完美！所有配置都已正確同步。');
  } else if (errors.length === 0) {
    console.log('\n👍 良好！主要配置已同步，但有一些警告需要注意。');
  } else {
    console.log('\n⚠️  需要修復！請檢查並更正錯誤項目。');
  }
}

// 執行所有檢查
function main() {
  checkSubgraph();
  checkBackend();
  checkFrontend();
  generateReport();
}

main();