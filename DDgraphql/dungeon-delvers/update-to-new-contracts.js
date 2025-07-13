// update-to-new-contracts.js - 更新到全新部署的合約地址
const fs = require('fs');
const yaml = require('js-yaml');

// 🎉 全新部署的合約地址 - 2025年1月14日
const NEW_CONTRACTS = {
  Hero: {
    address: '0x4EFc389f5DE5DfBd0c8B158a2ea41B611aA30CDb',
    startBlock: 53904572
  },
  Relic: {
    address: '0x235d53Efd9cc5aB66F2C3B1E496Ab25767D673e0',
    startBlock: 53904572
  },
  Party: {
    address: '0x5DC3175b6a1a5bB4Ec7846e8413257aB7CF31834',
    startBlock: 53904572
  },
  PlayerProfile: {
    address: '0xd6385bc4099c2713383eD5cB9C6d10E750ADe312',
    startBlock: 53904572
  },
  VIPStaking: {
    address: '0x067F289Ae4e76CB61b8a138bF705798a928a12FB',
    startBlock: 53904572
  },
  DungeonMaster: {
    address: '0x2221CCFd3e774c08839De7e4AFC24ad8916BAC4f',
    startBlock: 53904572
  },
  PlayerVault: {
    address: '0xd2c481AE2ac1Ee51FBd36878E178Bbd10D6CbCb3',
    startBlock: 53904572
  },
  AltarOfAscension: {
    address: '0x8c11f12c30bDb146A9234a1420e41873C7D80F17',
    startBlock: 53904572
  },
  DungeonCore: {
    address: '0x4d75208A83278e7bBE1Ec10195902AefAfDC5e5a',
    startBlock: 53904572
  },
  Oracle: {
    address: '0x45e623D1f288595CA174a66D180510E168bb8Aaf',
    startBlock: 53904572
  }
};

console.log('🚀 開始更新子圖到新的合約地址...');

// 讀取 subgraph.yaml
const subgraphPath = './subgraph.yaml';
if (!fs.existsSync(subgraphPath)) {
  console.error('❌ 找不到 subgraph.yaml 文件！');
  process.exit(1);
}

const subgraph = yaml.load(fs.readFileSync(subgraphPath, 'utf8'));

console.log('\n📋 更新合約地址和起始區塊：');
console.log('====================================');

// 更新每個 data source
let updatedCount = 0;
subgraph.dataSources.forEach(dataSource => {
  const contractName = dataSource.name;
  if (NEW_CONTRACTS[contractName]) {
    console.log(`✅ ${contractName}:`);
    console.log(`   舊地址: ${dataSource.source.address}`);
    console.log(`   新地址: ${NEW_CONTRACTS[contractName].address}`);
    console.log(`   起始區塊: ${NEW_CONTRACTS[contractName].startBlock}`);
    
    dataSource.source.address = NEW_CONTRACTS[contractName].address;
    dataSource.source.startBlock = NEW_CONTRACTS[contractName].startBlock;
    updatedCount++;
  } else {
    console.log(`⚠️  跳過 ${contractName} (不在更新列表中)`);
  }
});

// 寫回 subgraph.yaml
const updatedYaml = yaml.dump(subgraph, {
  styles: {
    '!!null': 'canonical'
  },
  sortKeys: false,
  lineWidth: -1 // 防止長行被截斷
});

fs.writeFileSync(subgraphPath, updatedYaml);

console.log('\n🎉 更新完成！');
console.log(`✅ 已更新 ${updatedCount} 個合約`);
console.log(`📍 所有合約從區塊 ${NEW_CONTRACTS.Hero.startBlock} 開始索引`);

console.log('\n📋 接下來的步驟：');
console.log('====================================');
console.log('1. 檢查 subgraph.yaml 確認更新正確');
console.log('2. 運行同步腳本：npm run sync-addresses');
console.log('3. 重新生成代碼：npm run codegen');
console.log('4. 構建子圖：npm run build');
console.log('5. 部署子圖：npm run deploy');
console.log('');
console.log('⚠️  重要：這會創建子圖的新版本！');
console.log('📊 索引時間：約 10-30 分鐘');

// 同步 config.ts (如果腳本存在)
try {
  const { execSync } = require('child_process');
  console.log('\n🔄 同步 config.ts...');
  
  // 首先檢查 package.json 中是否有 sync-addresses 腳本
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  if (packageJson.scripts && packageJson.scripts['sync-addresses']) {
    execSync('npm run sync-addresses', { stdio: 'inherit' });
    console.log('✅ config.ts 同步完成！');
  } else {
    console.log('⚠️  找不到 sync-addresses 腳本，請手動更新 config.ts');
  }
} catch (error) {
  console.log('⚠️  自動同步失敗，請手動運行：npm run sync-addresses');
}