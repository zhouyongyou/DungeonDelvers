#!/usr/bin/env node

/**
 * V25 合約地址同步驗證腳本
 * 檢查前端、後端、子圖是否都使用了最新的 V25 合約地址
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 最新的 V25 合約地址（2025-08-07 PM6 部署）
const V25_ADDRESSES = {
  HERO: '0xF6A318568CFF7704c24C1Ab81B34de26Cd473d40',
  RELIC: '0xF8E887B019CAddfF5F965d03c60B59B58344de9c',
  DUNGEONMASTER: '0xE391261741Fad5FCC2D298d00e8c684767021253',
  ALTAROFASCENSION: '0x27E35Aa079a0F2eb43D666Fe5E8A009D84a1e7C8',
  VRFMANAGER: '0xE1D1c53e2e467BFF3d6e4EffB7b89C0C10711ad1',
  // 這些保持不變
  PARTY: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
  DUNGEONSTORAGE: '0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468',
  PLAYERVAULT: '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787',
  PLAYERPROFILE: '0x0f5932e89908400a5AfDC306899A2987b67a3155',
  VIPSTAKING: '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C',
  DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
  ORACLE: '0xf8CE896aF39f95a9d5Dd688c35d381062263E25a',
};

// 檢查結果
const results = {
  frontend: {},
  backend: {},
  subgraph: {}
};

// 1. 檢查前端配置
console.log('🔍 檢查前端配置...');
try {
  const frontendConfigPath = '/Users/sotadic/Documents/GitHub/DungeonDelvers/src/config/contracts.ts';
  const frontendConfig = fs.readFileSync(frontendConfigPath, 'utf8');
  
  Object.entries(V25_ADDRESSES).forEach(([name, address]) => {
    const regex = new RegExp(`${name}:\\s*['"]([^'"]+)['"]`, 'i');
    const match = frontendConfig.match(regex);
    if (match) {
      const currentAddress = match[1];
      results.frontend[name] = {
        current: currentAddress,
        expected: address,
        match: currentAddress.toLowerCase() === address.toLowerCase()
      };
    }
  });
} catch (error) {
  console.error('❌ 無法讀取前端配置:', error.message);
}

// 2. 檢查後端配置
console.log('🔍 檢查後端配置...');
try {
  const backendConfigPath = '/Users/sotadic/Documents/dungeon-delvers-metadata-server/config/contracts.json';
  const backendConfig = JSON.parse(fs.readFileSync(backendConfigPath, 'utf8'));
  
  const mappings = {
    'Hero': 'HERO',
    'Relic': 'RELIC',
    'DungeonMaster': 'DUNGEONMASTER',
    'AltarOfAscension': 'ALTAROFASCENSION',
    'VRFManager': 'VRFMANAGER',
    'Party': 'PARTY',
    'DungeonStorage': 'DUNGEONSTORAGE',
    'PlayerVault': 'PLAYERVAULT',
    'PlayerProfile': 'PLAYERPROFILE',
    'VipStaking': 'VIPSTAKING',
    'DungeonCore': 'DUNGEONCORE',
    'Oracle': 'ORACLE'
  };
  
  Object.entries(mappings).forEach(([backendKey, v25Key]) => {
    if (backendConfig.contracts[backendKey]) {
      results.backend[v25Key] = {
        current: backendConfig.contracts[backendKey],
        expected: V25_ADDRESSES[v25Key],
        match: backendConfig.contracts[backendKey].toLowerCase() === V25_ADDRESSES[v25Key].toLowerCase()
      };
    }
  });
} catch (error) {
  console.error('❌ 無法讀取後端配置:', error.message);
}

// 3. 檢查子圖配置
console.log('🔍 檢查子圖配置...');
try {
  const subgraphPath = path.join(__dirname, 'subgraph.yaml');
  const subgraphYaml = yaml.load(fs.readFileSync(subgraphPath, 'utf8'));
  
  const subgraphMappings = {
    'Hero': 'HERO',
    'Relic': 'RELIC',
    'DungeonMaster': 'DUNGEONMASTER',
    'AltarOfAscension': 'ALTAROFASCENSION',
    'VRFManagerV2Plus': 'VRFMANAGER',
    'PartyV3': 'PARTY',
    'PlayerVault': 'PLAYERVAULT',
    'PlayerProfile': 'PLAYERPROFILE',
    'VIPStaking': 'VIPSTAKING'
  };
  
  subgraphYaml.dataSources.forEach(dataSource => {
    const v25Key = subgraphMappings[dataSource.name];
    if (v25Key && V25_ADDRESSES[v25Key]) {
      results.subgraph[v25Key] = {
        current: dataSource.source.address,
        expected: V25_ADDRESSES[v25Key],
        match: dataSource.source.address.toLowerCase() === V25_ADDRESSES[v25Key].toLowerCase()
      };
    }
  });
} catch (error) {
  console.error('❌ 無法讀取子圖配置:', error.message);
}

// 4. 顯示結果
console.log('\n' + '='.repeat(80));
console.log('📊 V25 合約地址同步狀態報告');
console.log('='.repeat(80));

let hasIssues = false;

['frontend', 'backend', 'subgraph'].forEach(platform => {
  console.log(`\n📍 ${platform.toUpperCase()}`);
  console.log('-'.repeat(40));
  
  Object.entries(results[platform]).forEach(([contract, info]) => {
    const status = info.match ? '✅' : '❌';
    console.log(`${status} ${contract}:`);
    if (!info.match) {
      console.log(`   當前: ${info.current}`);
      console.log(`   預期: ${info.expected}`);
      hasIssues = true;
    }
  });
  
  if (Object.keys(results[platform]).length === 0) {
    console.log('   ⚠️ 無法檢查配置');
  }
});

// 5. 總結
console.log('\n' + '='.repeat(80));
if (hasIssues) {
  console.log('❌ 發現同步問題！請更新上述不匹配的合約地址。');
  
  console.log('\n📝 建議操作:');
  console.log('1. 更新前端: 編輯 src/config/contracts.ts');
  console.log('2. 更新後端: 編輯 config/contracts.json');
  console.log('3. 更新子圖: 編輯 subgraph.yaml 然後運行 npm run build');
  console.log('4. 部署子圖: export GRAPH_ACCESS_TOKEN=你的token && ./deploy-v25.sh');
  
  process.exit(1);
} else {
  console.log('✅ 所有平台都已同步到最新的 V25 合約地址！');
  console.log('\n🚀 下一步:');
  console.log('1. 部署子圖: export GRAPH_ACCESS_TOKEN=你的token && ./deploy-v25.sh');
  console.log('2. 部署前端: git push (Vercel 自動部署)');
  console.log('3. 部署後端: git push (Render 自動部署)');
  process.exit(0);
}