// scripts/fix-baseuri-deployment.cjs
// 修正智能合約的 baseURI 設定

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

// IPFS 基礎 URI
const IPFS_BASE_URI = "ipfs://bafybeiagvaba3iswugci4e45tnucrerh32retgukatdx3v6p6wpupkwphm/";

// 正確的 baseURI 設定
const CORRECT_BASE_URIS = {
  VIP_STAKING: IPFS_BASE_URI + "vip/",
  PLAYER_PROFILE: IPFS_BASE_URI + "profile/",
  HERO: IPFS_BASE_URI + "hero/",
  RELIC: IPFS_BASE_URI + "relic/",
  PARTY: IPFS_BASE_URI + "party/",
};

console.log('🚀 分析部署腳本中的 baseURI 設定問題...\n');

console.log('📋 問題分析:');
console.log('1. 部署腳本設定了錯誤的 baseURI');
console.log('2. 所有合約都使用相同的 baseURI: ' + IPFS_BASE_URI);
console.log('3. 但智能合約的 tokenURI 返回: baseURI + tokenId');
console.log('4. 結果: ipfs://hash/1 (缺少類型目錄)');

console.log('\n🔧 正確的設定應該是:');
for (const [name, uri] of Object.entries(CORRECT_BASE_URIS)) {
  console.log(`${name.padEnd(20)}: ${uri}`);
}

console.log('\n📝 需要執行的修正步驟:');
console.log('1. 上傳重新組織的 IPFS 文件結構');
console.log('2. 使用以下命令修正每個合約的 baseURI:');

console.log('\n🔧 修正命令 (在 BSCScan 上執行):');
for (const [name, address] of Object.entries(CONTRACTS)) {
  if (address) {
    const correctURI = CORRECT_BASE_URIS[name];
    console.log(`${name}:`);
    console.log(`  合約地址: ${address}`);
    console.log(`  setBaseURI("${correctURI}")`);
    console.log('');
  }
}

console.log('\n⚠️  注意事項:');
console.log('1. 確保調用者有 owner 權限');
console.log('2. 先上傳重新組織的 IPFS 文件');
console.log('3. 測試 NFT 鑄造和顯示'); 