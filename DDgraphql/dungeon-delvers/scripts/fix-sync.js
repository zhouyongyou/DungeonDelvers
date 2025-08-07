#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// V25 correct addresses (8/7 pm6)
const V25_ADDRESSES = {
  // New V25 contracts
  DUNGEONSTORAGE: '0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468',
  DUNGEONMASTER: '0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a',
  HERO: '0x671d937b171e2ba2c4dc23c133b07e4449f283ef',
  RELIC: '0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da',
  ALTAROFASCENSION: '0xa86749237d4631ad92ba859d0b0df4770f6147ba',
  PARTY: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
  
  // Reused contracts
  DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
  PLAYERVAULT: '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787',
  PLAYERPROFILE: '0x0f5932e89908400a5AfDC306899A2987b67a3155',
  VIPSTAKING: '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C',
  ORACLE: '0xf8CE896aF39f95a9d5Dd688c35d381062263E25a',
  
  // Token contracts
  SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
  USD: '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE',
  UNISWAP_POOL: '0x1e5Cd5F386Fb6F39cD8788675dd3A5ceB6521C82',
  
  // VRF Manager
  VRF_MANAGER_V2PLUS: '0x980d224ec4d198d94f34a8af76a19c00dabe2436'
};

const START_BLOCK = '56757876';

console.log('🔧 Starting V25 configuration sync...\n');

// 1. Fix subgraph.yaml
function fixSubgraph() {
  console.log('📊 Fixing subgraph.yaml...');
  const subgraphPath = path.join(__dirname, '..', 'subgraph.yaml');
  
  try {
    let content = fs.readFileSync(subgraphPath, 'utf8');
    
    // Update all addresses to lowercase
    Object.entries(V25_ADDRESSES).forEach(([name, address]) => {
      const regex = new RegExp(`address:\\s*["']0x[a-fA-F0-9]{40}["']`, 'gi');
      const lowerAddress = address.toLowerCase();
      
      // Find and replace matching contract sections
      if (name === 'DUNGEONSTORAGE') {
        content = content.replace(/name: DungeonStorage[\s\S]*?address: ["']0x[a-fA-F0-9]{40}["']/gi, 
          `name: DungeonStorage\n    network: bsc\n    source:\n      address: "${lowerAddress}"`);
      }
      if (name === 'DUNGEONMASTER') {
        content = content.replace(/name: DungeonMaster[\s\S]*?address: ["']0x[a-fA-F0-9]{40}["']/gi,
          `name: DungeonMaster\n    network: bsc\n    source:\n      address: "${lowerAddress}"`);
      }
      if (name === 'HERO') {
        content = content.replace(/name: Hero[\s\S]*?address: ["']0x[a-fA-F0-9]{40}["']/gi,
          `name: Hero\n    network: bsc\n    source:\n      address: "${lowerAddress}"`);
      }
      if (name === 'RELIC') {
        content = content.replace(/name: Relic[\s\S]*?address: ["']0x[a-fA-F0-9]{40}["']/gi,
          `name: Relic\n    network: bsc\n    source:\n      address: "${lowerAddress}"`);
      }
      if (name === 'ALTAROFASCENSION') {
        content = content.replace(/name: AltarOfAscension[\s\S]*?address: ["']0x[a-fA-F0-9]{40}["']/gi,
          `name: AltarOfAscension\n    network: bsc\n    source:\n      address: "${lowerAddress}"`);
      }
      if (name === 'PARTY') {
        content = content.replace(/name: Party[\s\S]*?address: ["']0x[a-fA-F0-9]{40}["']/gi,
          `name: Party\n    network: bsc\n    source:\n      address: "${lowerAddress}"`);
      }
    });
    
    // Update start blocks
    content = content.replace(/startBlock:\s*\d+/g, `startBlock: ${START_BLOCK}`);
    
    fs.writeFileSync(subgraphPath, content);
    console.log('✅ subgraph.yaml fixed\n');
  } catch (error) {
    console.error('❌ Error fixing subgraph.yaml:', error.message);
  }
}

// 2. Fix frontend config
function fixFrontend() {
  console.log('🎨 Fixing frontend config...');
  const frontendConfigPath = path.join(__dirname, '..', 'src', 'config', 'contracts.ts');
  
  try {
    let content = `// V25 Contract Addresses - Updated 8/7 pm6
export const CONTRACT_ADDRESSES = {
  // Core V25 Contracts
  DUNGEONSTORAGE: '${V25_ADDRESSES.DUNGEONSTORAGE}',
  DUNGEONMASTER: '${V25_ADDRESSES.DUNGEONMASTER}',
  HERO: '${V25_ADDRESSES.HERO}',
  RELIC: '${V25_ADDRESSES.RELIC}',
  ALTAROFASCENSION: '${V25_ADDRESSES.ALTAROFASCENSION}',
  PARTY: '${V25_ADDRESSES.PARTY}',
  
  // Reused Contracts
  DUNGEONCORE: '${V25_ADDRESSES.DUNGEONCORE}',
  PLAYERVAULT: '${V25_ADDRESSES.PLAYERVAULT}',
  PLAYERPROFILE: '${V25_ADDRESSES.PLAYERPROFILE}',
  VIPSTAKING: '${V25_ADDRESSES.VIPSTAKING}',
  ORACLE: '${V25_ADDRESSES.ORACLE}',
  
  // Token Contracts
  SOULSHARD: '${V25_ADDRESSES.SOULSHARD}',
  USD: '${V25_ADDRESSES.USD}',
  UNISWAP_POOL: '${V25_ADDRESSES.UNISWAP_POOL}',
  
  // VRF Manager (Subscription Mode V2.5)
  VRF_MANAGER_V2PLUS: '${V25_ADDRESSES.VRF_MANAGER_V2PLUS}'
} as const;

export const SUBGRAPH_URL = process.env.NEXT_PUBLIC_SUBGRAPH_URL || 'https://api.studio.thegraph.com/query/89407/dungeon-delvers/v3.8.0';
export const START_BLOCK = ${START_BLOCK};
`;
    
    fs.writeFileSync(frontendConfigPath, content);
    console.log('✅ Frontend config fixed\n');
  } catch (error) {
    console.error('❌ Error fixing frontend config:', error.message);
  }
}

// 3. Fix backend config
function fixBackend() {
  console.log('🔧 Fixing backend config...');
  const backendConfigPath = '/Users/sotadic/Documents/dungeon-delvers-metadata-server/config/contracts.json';
  
  try {
    const config = {
      network: "bsc",
      chainId: 56,
      rpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
      contracts: {
        // V25 Contracts
        dungeonStorage: V25_ADDRESSES.DUNGEONSTORAGE,
        dungeonMaster: V25_ADDRESSES.DUNGEONMASTER,
        hero: V25_ADDRESSES.HERO,
        relic: V25_ADDRESSES.RELIC,
        altarOfAscension: V25_ADDRESSES.ALTAROFASCENSION,
        party: V25_ADDRESSES.PARTY,
        
        // Reused
        dungeonCore: V25_ADDRESSES.DUNGEONCORE,
        playerVault: V25_ADDRESSES.PLAYERVAULT,
        playerProfile: V25_ADDRESSES.PLAYERPROFILE,
        vipStaking: V25_ADDRESSES.VIPSTAKING,
        oracle: V25_ADDRESSES.ORACLE,
        
        // Tokens
        soulShard: V25_ADDRESSES.SOULSHARD,
        usd: V25_ADDRESSES.USD,
        uniswapPool: V25_ADDRESSES.UNISWAP_POOL,
        
        // VRF
        vrfManagerV2Plus: V25_ADDRESSES.VRF_MANAGER_V2PLUS
      },
      vrf: {
        coordinatorAddress: "0xDA3b641D438362C440Ac5458c57e00a712b66700",
        subscriptionId: "29062",
        keyHash: "0x8596b430971ac45bdf6088665b9ad8e8630c9d5049ab6e6e742f88ecdfb8738e",
        callbackGasLimit: "2500000",
        requestConfirmations: "3",
        numWords: "1",
        mode: "subscription"
      },
      startBlock: START_BLOCK,
      version: "v3.8.0",
      deployedAt: "2024-08-07T18:00:00Z"
    };
    
    fs.writeFileSync(backendConfigPath, JSON.stringify(config, null, 2));
    console.log('✅ Backend config fixed\n');
  } catch (error) {
    console.error('❌ Error fixing backend config:', error.message);
  }
}

// 4. Update package.json
function updatePackageJson() {
  console.log('📦 Updating package.json...');
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }
    
    packageJson.scripts['fix-sync'] = 'node scripts/fix-sync.js';
    packageJson.scripts['verify-sync'] = 'node scripts/verify-sync.js';
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ package.json updated\n');
  } catch (error) {
    console.error('❌ Error updating package.json:', error.message);
  }
}

// 5. Create verification script
function createVerificationScript() {
  console.log('🔍 Creating verification script...');
  const verifyPath = path.join(__dirname, 'verify-sync.js');
  
  const verifyContent = `#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const EXPECTED = ${JSON.stringify(V25_ADDRESSES, null, 2)};

console.log('\\n🔍 Verifying V25 configuration sync...\\n');

// Check subgraph
const subgraphPath = path.join(__dirname, '..', 'subgraph.yaml');
const subgraphContent = fs.readFileSync(subgraphPath, 'utf8');

let errors = [];

Object.entries(EXPECTED).forEach(([name, address]) => {
  const lowerAddress = address.toLowerCase();
  if (!subgraphContent.includes(lowerAddress)) {
    errors.push(\`❌ Subgraph missing correct address for \${name}: expected \${lowerAddress}\`);
  }
});

if (errors.length === 0) {
  console.log('✅ All configurations are correctly synced!');
} else {
  console.log('❌ Found configuration mismatches:\\n');
  errors.forEach(err => console.log(err));
}
`;
  
  fs.writeFileSync(verifyPath, verifyContent);
  fs.chmodSync(verifyPath, '755');
  console.log('✅ Verification script created\n');
}

// Run all fixes
async function main() {
  console.log('🚀 V25 Configuration Sync Tool\n');
  console.log('📅 Version: V25 - Deployed 8/7 pm6');
  console.log('📊 Subgraph: v3.8.0');
  console.log(`🔢 Start Block: ${START_BLOCK}\n`);
  console.log('=' .repeat(50) + '\n');
  
  fixSubgraph();
  fixFrontend();
  fixBackend();
  updatePackageJson();
  createVerificationScript();
  
  console.log('=' .repeat(50));
  console.log('\n✨ All configurations have been synced!');
  console.log('\nNext steps:');
  console.log('1. Run "npm run codegen" to regenerate types');
  console.log('2. Run "npm run build" to build the subgraph');
  console.log('3. Run "npm run verify-sync" to verify all changes');
  console.log('4. Deploy with "graph deploy --studio dungeon-delvers"\n');
}

main().catch(console.error);