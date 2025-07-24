// update-to-v19.js - Update subgraph configuration to V19 contract addresses
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

// V19 contract addresses from deployment
const V19_CONTRACTS = {
  Hero: {
    address: '0x141F081922D4015b3157cdA6eE970dff34bb8AAb',
    startBlock: 55250000 // Update with actual deployment block
  },
  Relic: {
    address: '0xB1eb505426e852B8Dca4BF41454a7A22D2B6F3D3',
    startBlock: 55250000
  },
  PartyV3: { // Note: PartyV3 in subgraph.yaml maps to Party contract
    address: '0xf240c4fD2651Ba41ff09eB26eE01b21f42dD9957',
    startBlock: 55250000
  },
  VIPStaking: {
    address: '0x43A6C6cC9D15f2C68C7ec98deb01f2b69a618470',
    startBlock: 55250000
  },
  PlayerProfile: {
    address: '0x1d36C2F3f0C9212422B94608cAA72080CBf34A41',
    startBlock: 55250000
  },
  AltarOfAscension: {
    address: '0xb53c51Dc426c2Bd29da78Ac99426c55A6D6a51Ab',
    startBlock: 55250000
  }
};

// Additional contracts that might be needed in the future
const ADDITIONAL_V19_CONTRACTS = {
  DungeonMaster: '0xd34ddc336071FE7Da3c636C3Df7C3BCB77B1044a',
  DungeonCore: '0x4D353aFC420E6187bfA5F99f0DdD8F7F137c20E9',
  PlayerVault: '0xF68cEa7E171A5caF151A85D7BEb2E862B83Ccf78',
  DungeonStorage: '0x6B85882ab32471Ce4a6599A7256E50B8Fb1fD43e',
  Oracle: '0x54Ff2524C996d7608CaE9F3D9dd2075A023472E9'
};

// Backup current subgraph.yaml
function backupSubgraphYaml() {
  const timestamp = Date.now();
  const backupPath = `./subgraph.yaml.backup-${timestamp}`;
  fs.copyFileSync('./subgraph.yaml', backupPath);
  console.log(`✅ Backed up subgraph.yaml to ${backupPath}`);
  return backupPath;
}

// Update subgraph.yaml with V19 addresses
function updateSubgraphYaml() {
  const subgraphPath = './subgraph.yaml';
  const subgraph = yaml.load(fs.readFileSync(subgraphPath, 'utf8'));

  console.log('\n📋 Updating data sources to V19 addresses:\n');

  // Update each data source
  subgraph.dataSources.forEach(dataSource => {
    const contractName = dataSource.name;
    if (V19_CONTRACTS[contractName]) {
      console.log(`Updating ${contractName}:`);
      console.log(`  Old address: ${dataSource.source.address}`);
      console.log(`  New address: ${V19_CONTRACTS[contractName].address}`);
      console.log(`  Start block: ${V19_CONTRACTS[contractName].startBlock}`);
      
      dataSource.source.address = V19_CONTRACTS[contractName].address;
      dataSource.source.startBlock = V19_CONTRACTS[contractName].startBlock;
    } else {
      console.log(`⚠️  No V19 address found for ${contractName}, keeping current address`);
    }
    console.log('');
  });

  // Write updated subgraph.yaml
  const updatedYaml = yaml.dump(subgraph, {
    styles: {
      '!!null': 'canonical'
    },
    sortKeys: false
  });

  fs.writeFileSync(subgraphPath, updatedYaml);
  console.log('✅ subgraph.yaml has been updated with V19 addresses!\n');
}

// Main execution
function main() {
  console.log('🚀 Starting V19 contract address update...\n');

  // Step 1: Backup current configuration
  const backupPath = backupSubgraphYaml();

  try {
    // Step 2: Update subgraph.yaml
    updateSubgraphYaml();

    // Step 3: Sync addresses to config.ts
    console.log('📁 Syncing addresses to config.ts...');
    const { execSync } = require('child_process');
    execSync('node scripts/sync-addresses.js', { stdio: 'inherit' });

    console.log('\n✅ V19 update completed successfully!\n');
    console.log('📋 Next steps:');
    console.log('1. Verify the addresses in subgraph.yaml are correct');
    console.log('2. Update startBlock numbers with actual deployment blocks from BSCScan');
    console.log('3. Run the following commands:');
    console.log('   npm run codegen');
    console.log('   npm run build');
    console.log('   npm run deploy\n');
    console.log('⚠️  IMPORTANT: Update the startBlock values with correct deployment block numbers!');
    console.log(`💾 If you need to revert, restore from: ${backupPath}`);

  } catch (error) {
    console.error('\n❌ Error during update:', error.message);
    console.log(`💾 Restoring from backup: ${backupPath}`);
    fs.copyFileSync(backupPath, './subgraph.yaml');
    console.log('✅ Restored original subgraph.yaml');
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}