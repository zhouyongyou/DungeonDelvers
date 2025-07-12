// check_contract_baseuri.mjs
import { createPublicClient, http, parseAbi } from 'viem';
import { bsc } from 'wagmi/chains';

// 创建客户端
const publicClient = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed1.binance.org/')
});

// 合约地址
const CONTRACTS = {
  VIP_STAKING: '0x30a5374bcc612698B4eF1Df1348a21F18cbb3c9D',
  PLAYER_PROFILE: '0x21753CDc15804be66B4792F75C23Fc828A26203a',
  HERO: '0xE22C45AcC80BFAEDa4F2Ec17352301a37Fbc0741',
  RELIC: '0x5b03165dBD05c82480b69b94F59d0FE942ED9A36',
  PARTY: '0xaE13E9FE44aB58D6d43014A32Cbd565bAEf01C01',
};

// ABI 片段
const BASE_URI_ABI = parseAbi([
  'function baseURI() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
]);

// 正确的baseURI设定
const CORRECT_BASE_URIS = {
  VIP_STAKING: 'https://dungeon-delvers-metadata-server.onrender.com/api/vipstaking/',
  PLAYER_PROFILE: 'https://dungeon-delvers-metadata-server.onrender.com/api/playerprofile/',
  HERO: 'https://dungeon-delvers-metadata-server.onrender.com/api/hero/',
  RELIC: 'https://dungeon-delvers-metadata-server.onrender.com/api/relic/',
  PARTY: 'https://dungeon-delvers-metadata-server.onrender.com/api/party/',
};

async function checkBaseURI(contractName, contractAddress) {
  console.log(`\n🔍 检查 ${contractName} 合约...`);
  console.log(`地址: ${contractAddress}`);
  
  try {
    // 检查baseURI
    const baseURI = await publicClient.readContract({
      address: contractAddress,
      abi: BASE_URI_ABI,
      functionName: 'baseURI',
    });
    
    console.log(`当前 baseURI: ${baseURI}`);
    
    const correctURI = CORRECT_BASE_URIS[contractName];
    if (baseURI === correctURI) {
      console.log(`✅ ${contractName} baseURI 设置正确`);
    } else {
      console.log(`❌ ${contractName} baseURI 设置错误`);
      console.log(`应该设置为: ${correctURI}`);
    }
    
    // 测试tokenURI
    try {
      const tokenURI = await publicClient.readContract({
        address: contractAddress,
        abi: BASE_URI_ABI,
        functionName: 'tokenURI',
        args: [1n],
      });
      console.log(`Token #1 URI: ${tokenURI}`);
      
    } catch (error) {
      console.log(`❌ TokenURI 调用失败: ${error.message}`);
    }
    
  } catch (error) {
    console.log(`❌ 检查失败: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 开始检查合约 baseURI 设置...\n');
  
  for (const [name, address] of Object.entries(CONTRACTS)) {
    await checkBaseURI(name, address);
  }
  
  console.log('\n📋 总结:');
  console.log('1. 如果baseURI设置错误，需要调用 setBaseURI() 函数');
  console.log('2. 确保调用者有 owner 权限');
  console.log('3. 设置完成后，NFT市场应该能正确显示静态图片');
}

main().catch(console.error); 