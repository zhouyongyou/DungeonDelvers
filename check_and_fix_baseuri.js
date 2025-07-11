// check_and_fix_baseuri.js
// 檢查和修復合約的baseURI設定

const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('wagmi/chains');
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

// 創建客戶端
const publicClient = createPublicClient({
  chain: bsc,
  transport: http(env.VITE_ALCHEMY_BSC_MAINNET_RPC_URL)
});

// 合約地址
const CONTRACTS = {
  VIP_STAKING: env.VITE_MAINNET_VIPSTAKING_ADDRESS,
  PLAYER_PROFILE: env.VITE_MAINNET_PLAYERPROFILE_ADDRESS,
  HERO: env.VITE_MAINNET_HERO_ADDRESS,
  RELIC: env.VITE_MAINNET_RELIC_ADDRESS,
  PARTY: env.VITE_MAINNET_PARTY_ADDRESS,
};

// ABI 片段
const BASE_URI_ABI = parseAbi([
  'function baseURI() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function setBaseURI(string memory newBaseURI)',
]);

// 正確的baseURI設定
const CORRECT_BASE_URIS = {
  VIP_STAKING: 'https://dungeon-delvers-metadata-server.onrender.com/api/vipstaking/',
  PLAYER_PROFILE: 'https://dungeon-delvers-metadata-server.onrender.com/api/playerprofile/',
  HERO: 'https://dungeon-delvers-metadata-server.onrender.com/api/hero/',
  RELIC: 'https://dungeon-delvers-metadata-server.onrender.com/api/relic/',
  PARTY: 'https://dungeon-delvers-metadata-server.onrender.com/api/party/',
};

async function checkBaseURI(contractName, contractAddress) {
  console.log(`\n🔍 檢查 ${contractName} 合約...`);
  console.log(`地址: ${contractAddress}`);
  
  try {
    // 檢查baseURI
    const baseURI = await publicClient.readContract({
      address: contractAddress,
      abi: BASE_URI_ABI,
      functionName: 'baseURI',
    });
    
    console.log(`當前 baseURI: ${baseURI}`);
    
    const correctURI = CORRECT_BASE_URIS[contractName];
    if (baseURI === correctURI) {
      console.log(`✅ ${contractName} baseURI 設定正確`);
    } else {
      console.log(`❌ ${contractName} baseURI 設定錯誤`);
      console.log(`應該設定為: ${correctURI}`);
    }
    
    // 測試tokenURI
    try {
      const tokenURI = await publicClient.readContract({
        address: contractAddress,
        abi: BASE_URI_ABI,
        functionName: 'tokenURI',
        args: [1n],
      });
      console.log(`Token #1 URI: ${tokenURI}`);
      
    } catch (error) {
      console.log(`❌ TokenURI 調用失敗: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ 檢查失敗: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 開始檢查合約 baseURI 設定...\n');
  
  for (const [name, address] of Object.entries(CONTRACTS)) {
    if (address) {
      await checkBaseURI(name, address);
    } else {
      console.log(`⚠️  ${name} 地址未設定`);
    }
  }
  
  console.log('\n📋 總結:');
  console.log('1. 如果baseURI設定錯誤，需要調用 setBaseURI() 函式');
  console.log('2. 確保調用者有 owner 權限');
  console.log('3. 設定完成後，NFT市場應該能正確顯示SVG');
}

main().catch(console.error); 