import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

// DungeonStorage ABI - 只包含需要的函數
const dungeonStorageABI = [
  {
    "inputs": [
      {"internalType": "uint256", "name": "id", "type": "uint256"},
      {
        "components": [
          {"internalType": "uint256", "name": "requiredPower", "type": "uint256"},
          {"internalType": "uint256", "name": "rewardAmountUSD", "type": "uint256"},
          {"internalType": "uint8", "name": "baseSuccessRate", "type": "uint8"},
          {"internalType": "bool", "name": "isInitialized", "type": "bool"}
        ],
        "internalType": "struct DungeonStorage.Dungeon",
        "name": "data",
        "type": "tuple"
      }
    ],
    "name": "setDungeon",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// 地下城配置數據
const dungeonConfigs = [
  { id: 1, name: "新手礦洞", requiredPower: 100, rewardAmountUSD: "1", baseSuccessRate: 95 },
  { id: 2, name: "哥布林洞穴", requiredPower: 250, rewardAmountUSD: "3", baseSuccessRate: 85 },
  { id: 3, name: "食人魔山谷", requiredPower: 500, rewardAmountUSD: "8", baseSuccessRate: 75 },
  { id: 4, name: "蜘蛛巢穴", requiredPower: 800, rewardAmountUSD: "15", baseSuccessRate: 70 },
  { id: 5, name: "石化蜥蜴沼澤", requiredPower: 1200, rewardAmountUSD: "25", baseSuccessRate: 65 },
  { id: 6, name: "巫妖墓穴", requiredPower: 1800, rewardAmountUSD: "40", baseSuccessRate: 60 },
  { id: 7, name: "奇美拉之巢", requiredPower: 2500, rewardAmountUSD: "60", baseSuccessRate: 55 },
  { id: 8, name: "惡魔前哨站", requiredPower: 3500, rewardAmountUSD: "85", baseSuccessRate: 50 },
  { id: 9, name: "巨龍之巔", requiredPower: 5000, rewardAmountUSD: "120", baseSuccessRate: 45 },
  { id: 10, name: "混沌深淵", requiredPower: 7500, rewardAmountUSD: "200", baseSuccessRate: 40 }
];

async function initializeDungeons() {
  try {
    console.log('🚀 開始初始化地下城數據...\n');
    
    // 檢查私鑰
    if (!process.env.PRIVATE_KEY) {
      console.error('❌ 錯誤：請在 .env 文件中設置 PRIVATE_KEY');
      return;
    }
    
    // 設置 provider 和 signer
    const provider = new ethers.JsonRpcProvider(process.env.VITE_BSC_RPC_URL || 'https://bsc-dataseed.bnbchain.org');
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log('👤 使用錢包地址:', signer.address);
    
    // DungeonStorage 合約地址
    const dungeonStorageAddress = process.env.VITE_MAINNET_DUNGEONSTORAGE_ADDRESS || '0x6FF605478fea3C3270f2eeD550129c58Dea81403';
    console.log('📍 DungeonStorage 地址:', dungeonStorageAddress);
    
    // 創建合約實例
    const dungeonStorage = new ethers.Contract(dungeonStorageAddress, dungeonStorageABI, signer);
    
    // 檢查 owner
    const owner = await dungeonStorage.owner();
    console.log('👑 合約 Owner:', owner);
    
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      console.error('❌ 錯誤：當前錢包不是合約的 owner！');
      console.error('   當前錢包:', signer.address);
      console.error('   合約 Owner:', owner);
      return;
    }
    
    console.log('✅ 權限驗證通過\n');
    
    // 估算總 gas 費用
    console.log('⛽ 估算 gas 費用...');
    const gasPrice = await provider.getFeeData();
    console.log('   Gas Price:', ethers.formatUnits(gasPrice.gasPrice, 'gwei'), 'gwei');
    
    // 初始化每個地下城
    for (const config of dungeonConfigs) {
      console.log(`\n📝 初始化地下城 ${config.id}: ${config.name}`);
      
      try {
        // 準備數據
        const dungeonData = {
          requiredPower: config.requiredPower,
          rewardAmountUSD: ethers.parseEther(config.rewardAmountUSD),
          baseSuccessRate: config.baseSuccessRate,
          isInitialized: true
        };
        
        console.log('   - 需求戰力:', config.requiredPower);
        console.log('   - USD 獎勵:', config.rewardAmountUSD);
        console.log('   - 基礎成功率:', config.baseSuccessRate + '%');
        
        // 發送交易
        const tx = await dungeonStorage.setDungeon(config.id, dungeonData);
        console.log('   📤 交易已發送:', tx.hash);
        
        // 等待確認
        const receipt = await tx.wait();
        console.log('   ✅ 交易已確認，區塊:', receipt.blockNumber);
        
      } catch (error) {
        console.error(`   ❌ 初始化地下城 ${config.id} 失敗:`, error.message);
      }
    }
    
    console.log('\n🎉 所有地下城初始化完成！');
    
  } catch (error) {
    console.error('❌ 錯誤:', error);
  }
}

// 提示確認
console.log('⚠️  警告：此腳本將初始化所有地下城數據');
console.log('請確保：');
console.log('1. 已在 .env 設置正確的 PRIVATE_KEY（必須是合約 owner）');
console.log('2. 錢包有足夠的 BNB 支付 gas 費用');
console.log('3. 正在使用正確的網絡（BSC Mainnet）\n');

// 如果有命令行參數 --yes，則自動執行
if (process.argv.includes('--yes')) {
  initializeDungeons().then(() => {
    console.log('\n✅ 腳本執行完成');
    process.exit(0);
  }).catch(error => {
    console.error('❌ 腳本執行失敗:', error);
    process.exit(1);
  });
} else {
  console.log('執行命令：node scripts/initialize-dungeons.js --yes');
}