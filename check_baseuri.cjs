// check_baseuri.cjs
// 檢查合約的baseURI設定

const fs = require('fs');

// 讀取環境變數
function loadEnv() {
  const envPath = '.env.local';
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local 文件不存在');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^"|"$/g, '');
      env[key.trim()] = value.trim();
    }
  });
  
  return env;
}

const env = loadEnv();

// 合約地址
const CONTRACTS = {
  VIP_STAKING: env.VITE_MAINNET_VIPSTAKING_ADDRESS,
  PLAYER_PROFILE: env.VITE_MAINNET_PLAYERPROFILE_ADDRESS,
  HERO: env.VITE_MAINNET_HERO_ADDRESS,
  RELIC: env.VITE_MAINNET_RELIC_ADDRESS,
  PARTY: env.VITE_MAINNET_PARTY_ADDRESS,
};

// 正確的baseURI設定
const CORRECT_BASE_URIS = {
  VIP_STAKING: 'https://dungeon-delvers-metadata-server.onrender.com/api/vipstaking/',
  PLAYER_PROFILE: 'https://dungeon-delvers-metadata-server.onrender.com/api/playerprofile/',
  HERO: 'https://dungeon-delvers-metadata-server.onrender.com/api/hero/',
  RELIC: 'https://dungeon-delvers-metadata-server.onrender.com/api/relic/',
  PARTY: 'https://dungeon-delvers-metadata-server.onrender.com/api/party/',
};

console.log('🚀 開始檢查合約 baseURI 設定...\n');

for (const [name, address] of Object.entries(CONTRACTS)) {
  if (address) {
    console.log(`🔍 檢查 ${name} 合約...`);
    console.log(`地址: ${address}`);
    console.log(`應該設定的 baseURI: ${CORRECT_BASE_URIS[name]}`);
    console.log('---');
  } else {
    console.log(`⚠️  ${name} 地址未設定`);
  }
}

console.log('\n📋 檢查步驟:');
console.log('1. 使用 etherscan 或 BSCScan 檢查合約的 baseURI() 函式');
console.log('2. 如果 baseURI 設定錯誤，需要調用 setBaseURI() 函式');
console.log('3. 確保調用者有 owner 權限');
console.log('4. 設定完成後，NFT市場應該能正確顯示SVG');

console.log('\n🔧 設定指令範例:');
console.log('// 在 etherscan 或 BSCScan 上調用 setBaseURI 函式');
console.log('// VIP Staking:');
console.log(`setBaseURI("${CORRECT_BASE_URIS.VIP_STAKING}")`);
console.log('// Player Profile:');
console.log(`setBaseURI("${CORRECT_BASE_URIS.PLAYER_PROFILE}")`);
console.log('// Hero:');
console.log(`setBaseURI("${CORRECT_BASE_URIS.HERO}")`);
console.log('// Relic:');
console.log(`setBaseURI("${CORRECT_BASE_URIS.RELIC}")`);
console.log('// Party:');
console.log(`setBaseURI("${CORRECT_BASE_URIS.PARTY}")`); 