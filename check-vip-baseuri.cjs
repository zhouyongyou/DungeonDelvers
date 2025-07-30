// 檢查 VIP 合約的 baseURI
const { ethers } = require('ethers');

// VIP Staking 合約地址
const VIP_CONTRACT = '0x17D2BF72720d0E6BE6658e92729820350F6B4080';

// BSC RPC
const provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org/');

// 簡化的 ERC721 ABI（只包含我們需要的函數）
const ERC721_ABI = [
  'function baseURI() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function name() view returns (string)',
  'function symbol() view returns (string)'
];

async function checkVipContract() {
  try {
    console.log('🔍 檢查 VIP 合約配置...');
    console.log('合約地址:', VIP_CONTRACT);
    
    const contract = new ethers.Contract(VIP_CONTRACT, ERC721_ABI, provider);
    
    // 檢查合約基本信息
    const name = await contract.name();
    const symbol = await contract.symbol();
    console.log(`合約名稱: ${name}`);
    console.log(`合約符號: ${symbol}`);
    
    // 檢查 baseURI
    try {
      const baseURI = await contract.baseURI();
      console.log('📍 當前 baseURI:', baseURI);
      
      // 檢查 tokenURI #1
      const tokenURI = await contract.tokenURI(1);
      console.log('🔗 Token #1 URI:', tokenURI);
      
      // 分析問題
      if (tokenURI.includes('dungeon-delvers-metadata-server.onrender.com')) {
        console.log('✅ URI 配置正確');
      } else if (tokenURI.includes('dungeondelvers.xyz/metadata')) {
        console.log('❌ 問題找到：URI 指向前端域名而非後端服務');
        console.log('🛠️ 需要更新 baseURI 為: https://dungeon-delvers-metadata-server.onrender.com/api/');
      } else {
        console.log('⚠️ 意外的 URI 格式');
      }
      
    } catch (error) {
      console.log('⚠️ 無法讀取 baseURI:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
  }
}

checkVipContract();