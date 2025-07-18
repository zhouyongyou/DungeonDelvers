import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

// ABI for getDungeon function
const dungeonStorageABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "_dungeonId", "type": "uint256"}],
    "name": "getDungeon",
    "outputs": [{
      "components": [
        {"internalType": "uint256", "name": "requiredPower", "type": "uint256"},
        {"internalType": "uint256", "name": "rewardAmountUSD", "type": "uint256"},
        {"internalType": "uint8", "name": "baseSuccessRate", "type": "uint8"},
        {"internalType": "bool", "name": "isInitialized", "type": "bool"}
      ],
      "internalType": "struct DungeonStorage.Dungeon",
      "name": "",
      "type": "tuple"
    }],
    "stateMutability": "view",
    "type": "function"
  }
];

async function checkDungeonData() {
  try {
    console.log('🔍 檢查地下城數據...\n');
    
    // 設置 provider
    const provider = new ethers.JsonRpcProvider(process.env.VITE_BSC_RPC_URL || 'https://bsc-dataseed.bnbchain.org');
    
    // DungeonStorage 合約地址
    const dungeonStorageAddress = process.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS || '0x6FF605478fea3C3270f2eeD550129c58Dea81403';
    console.log('📍 DungeonStorage 地址:', dungeonStorageAddress);
    
    // 創建合約實例
    const dungeonStorage = new ethers.Contract(dungeonStorageAddress, dungeonStorageABI, provider);
    
    // 檢查合約是否存在
    const code = await provider.getCode(dungeonStorageAddress);
    if (code === '0x') {
      console.error('❌ 合約不存在於此地址！');
      return;
    }
    console.log('✅ 合約已部署\n');
    
    // 地下城名稱
    const dungeonNames = [
      "", // index 0
      "新手礦洞",
      "哥布林洞穴", 
      "食人魔山谷",
      "蜘蛛巢穴",
      "石化蜥蜴沼澤",
      "巫妖墓穴",
      "奇美拉之巢",
      "惡魔前哨站",
      "巨龍之巔",
      "混沌深淵"
    ];
    
    console.log('📊 地下城數據：\n');
    
    // 讀取每個地下城的數據
    for (let i = 1; i <= 10; i++) {
      try {
        const dungeon = await dungeonStorage.getDungeon(i);
        const [requiredPower, rewardAmountUSD, baseSuccessRate, isInitialized] = dungeon;
        
        console.log(`🏰 地下城 ${i}: ${dungeonNames[i]}`);
        console.log(`   - 需求戰力: ${requiredPower.toString()}`);
        console.log(`   - USD 獎勵: ${ethers.formatEther(rewardAmountUSD)} USD`);
        console.log(`   - 基礎成功率: ${baseSuccessRate}%`);
        console.log(`   - 是否初始化: ${isInitialized ? '✅' : '❌'}`);
        console.log('');
      } catch (error) {
        console.error(`❌ 讀取地下城 ${i} 失敗:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  }
}

// 執行檢查
checkDungeonData().then(() => {
  console.log('\n✅ 檢查完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 檢查失敗:', error);
  process.exit(1);
});