// update-subgraph-addresses.js - 更新子圖配置到最新合約地址
const fs = require('fs');
const yaml = require('js-yaml');

// 最新的合約地址和部署區塊
const NEW_CONTRACTS = {
  Hero: {
    address: '0x2a046140668cBb8F598ff3852B08852A8EB23b6a',
    startBlock: 49000000 // 請替換為實際部署區塊
  },
  Relic: {
    address: '0x95F005e2e0d38381576DA36c5CA4619a87da550E',
    startBlock: 49000000
  },
  Party: {
    address: '0x11FB68409222B53b04626d382d7e691e640A1DcD',
    startBlock: 49000000
  },
  PlayerProfile: {
    address: '0x43a9BE911f1074788A00cE8e6E00732c7364c1F4',
    startBlock: 49000000
  },
  VIPStaking: {
    address: '0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB',
    startBlock: 49000000
  },
  DungeonMaster: {
    address: '0xd14A5eFFc45D0131af3eb876992fC6eD9683f5B0',
    startBlock: 49000000
  },
  PlayerVault: {
    address: '0x6187DBCcb58088E414437A6b8d58a42cD2BD1ec4',
    startBlock: 49000000
  },
  AltarOfAscension: {
    address: '0x83a7fB85E0892A67041FcFc4c1F0F1111e5aB3DA',
    startBlock: 49000000
  },
  DungeonCore: {
    address: '0x4CbAC0E4AEC9Ef3B11C93805483c23224ed1f118',
    startBlock: 49000000
  },
  Oracle: {
    address: '0xc5bBFfFf552167D1328432AA856B752e9c4b4838',
    startBlock: 49000000
  }
};

// 讀取 subgraph.yaml
const subgraphPath = './subgraph.yaml';
const subgraph = yaml.load(fs.readFileSync(subgraphPath, 'utf8'));

// 更新每個 data source
subgraph.dataSources.forEach(dataSource => {
  const contractName = dataSource.name;
  if (NEW_CONTRACTS[contractName]) {
    console.log(`更新 ${contractName}:`);
    console.log(`  舊地址: ${dataSource.source.address}`);
    console.log(`  新地址: ${NEW_CONTRACTS[contractName].address}`);
    console.log(`  起始區塊: ${NEW_CONTRACTS[contractName].startBlock}`);
    
    dataSource.source.address = NEW_CONTRACTS[contractName].address;
    dataSource.source.startBlock = NEW_CONTRACTS[contractName].startBlock;
  }
});

// 寫回 subgraph.yaml
const updatedYaml = yaml.dump(subgraph, {
  styles: {
    '!!null': 'canonical' // 確保 null 值正確顯示
  },
  sortKeys: false // 保持原始順序
});

fs.writeFileSync(subgraphPath, updatedYaml);
console.log('\n✅ subgraph.yaml 已更新！');

// 更新 config.ts
console.log('\n正在同步 config.ts...');
const { execSync } = require('child_process');
execSync('npm run sync-addresses', { stdio: 'inherit' });

console.log('\n📋 後續步驟：');
console.log('1. 檢查 subgraph.yaml 確認地址正確');
console.log('2. 從 BSCScan 獲取準確的部署區塊號並更新 startBlock');
console.log('3. 執行以下命令：');
console.log('   npm run codegen');
console.log('   npm run build');
console.log('   npm run deploy');
console.log('\n⚠️  重要：請確保使用正確的部署區塊號！');