// 修復合約配置腳本
import { createWalletClient, createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CONTRACTS } from '../src/config/contracts';

// ABI 片段 - 只包含需要的函數
const DUNGEON_CORE_ABI = [
  {
    "inputs": [{"name": "_newAddress", "type": "address"}],
    "name": "setPlayerProfile",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "playerProfileAddress",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "dungeonMasterAddress", 
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const PLAYER_PROFILE_ABI = [
  {
    "inputs": [{"name": "_dungeonCore", "type": "address"}],
    "name": "setDungeonCore",
    "outputs": [],
    "stateMutability": "nonpayable", 
    "type": "function"
  },
  {
    "inputs": [],
    "name": "dungeonCore",
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

async function fixContractConfig() {
  console.log('🔧 開始修復合約配置...');
  console.log('📋 當前合約地址:');
  console.log(`   DungeonCore: ${CONTRACTS.DungeonCore}`);
  console.log(`   PlayerProfile: ${CONTRACTS.PlayerProfile}`);
  console.log(`   DungeonMaster: ${CONTRACTS.DungeonMaster}`);
  
  // 檢查環境變數
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ 請設置 PRIVATE_KEY 環境變數');
    process.exit(1);
  }

  // 創建客戶端
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const publicClient = createPublicClient({
    chain: bsc,
    transport: http('https://bsc-dataseed1.binance.org/')
  });
  
  const walletClient = createWalletClient({
    account,
    chain: bsc,
    transport: http('https://bsc-dataseed1.binance.org/')
  });

  console.log(`👤 使用錢包地址: ${account.address}`);

  try {
    // 1. 檢查當前配置
    console.log('\n🔍 檢查當前配置...');
    
    const currentPlayerProfileInCore = await publicClient.readContract({
      address: CONTRACTS.DungeonCore as `0x${string}`,
      abi: DUNGEON_CORE_ABI,
      functionName: 'playerProfileAddress'
    });
    
    const currentDungeonCoreInProfile = await publicClient.readContract({
      address: CONTRACTS.PlayerProfile as `0x${string}`,
      abi: PLAYER_PROFILE_ABI,
      functionName: 'dungeonCore'
    });

    const currentDungeonMasterInCore = await publicClient.readContract({
      address: CONTRACTS.DungeonCore as `0x${string}`,
      abi: DUNGEON_CORE_ABI,
      functionName: 'dungeonMasterAddress'
    });

    console.log(`   DungeonCore -> PlayerProfile: ${currentPlayerProfileInCore}`);
    console.log(`   PlayerProfile -> DungeonCore: ${currentDungeonCoreInProfile}`);
    console.log(`   DungeonCore -> DungeonMaster: ${currentDungeonMasterInCore}`);

    // 2. 修復 DungeonCore 中的 PlayerProfile 地址
    if (currentPlayerProfileInCore?.toLowerCase() !== CONTRACTS.PlayerProfile.toLowerCase()) {
      console.log('\n🔧 修復 DungeonCore -> PlayerProfile 地址...');
      
      const txHash1 = await walletClient.writeContract({
        address: CONTRACTS.DungeonCore as `0x${string}`,
        abi: DUNGEON_CORE_ABI,
        functionName: 'setPlayerProfile',
        args: [CONTRACTS.PlayerProfile as `0x${string}`]
      });
      
      console.log(`   交易哈希: ${txHash1}`);
      await publicClient.waitForTransactionReceipt({ hash: txHash1 });
      console.log('   ✅ 修復完成');
    } else {
      console.log('\n✅ DungeonCore -> PlayerProfile 地址已正確');
    }

    // 3. 修復 PlayerProfile 中的 DungeonCore 地址
    if (currentDungeonCoreInProfile?.toLowerCase() !== CONTRACTS.DungeonCore.toLowerCase()) {
      console.log('\n🔧 修復 PlayerProfile -> DungeonCore 地址...');
      
      const txHash2 = await walletClient.writeContract({
        address: CONTRACTS.PlayerProfile as `0x${string}`,
        abi: PLAYER_PROFILE_ABI,
        functionName: 'setDungeonCore',
        args: [CONTRACTS.DungeonCore as `0x${string}`]
      });
      
      console.log(`   交易哈希: ${txHash2}`);
      await publicClient.waitForTransactionReceipt({ hash: txHash2 });
      console.log('   ✅ 修復完成');
    } else {
      console.log('\n✅ PlayerProfile -> DungeonCore 地址已正確');
    }

    // 4. 驗證修復結果
    console.log('\n🔍 驗證修復結果...');
    
    const newPlayerProfileInCore = await publicClient.readContract({
      address: CONTRACTS.DungeonCore as `0x${string}`,
      abi: DUNGEON_CORE_ABI,
      functionName: 'playerProfileAddress'
    });
    
    const newDungeonCoreInProfile = await publicClient.readContract({
      address: CONTRACTS.PlayerProfile as `0x${string}`,
      abi: PLAYER_PROFILE_ABI,
      functionName: 'dungeonCore'
    });

    const isFixed = 
      newPlayerProfileInCore?.toLowerCase() === CONTRACTS.PlayerProfile.toLowerCase() &&
      newDungeonCoreInProfile?.toLowerCase() === CONTRACTS.DungeonCore.toLowerCase();

    console.log(`   DungeonCore -> PlayerProfile: ${newPlayerProfileInCore} ${newPlayerProfileInCore?.toLowerCase() === CONTRACTS.PlayerProfile.toLowerCase() ? '✅' : '❌'}`);
    console.log(`   PlayerProfile -> DungeonCore: ${newDungeonCoreInProfile} ${newDungeonCoreInProfile?.toLowerCase() === CONTRACTS.DungeonCore.toLowerCase() ? '✅' : '❌'}`);

    if (isFixed) {
      console.log('\n🎉 合約配置修復成功！');
      console.log('\n💡 建議重新刷新前端頁面以查看效果');
    } else {
      console.log('\n❌ 修復失败，请检查权限和网络状况');
    }

  } catch (error) {
    console.error('❌ 修復過程中發生錯誤:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('insufficient funds')) {
        console.log('\n💡 解決方案: 請確保錢包有足夠的 BNB 支付 gas 費用');
      } else if (error.message.includes('Ownable: caller is not the owner')) {
        console.log('\n💡 解決方案: 請使用合約 owner 的私鑰執行此腳本');
      }
    }
  }
}

// 執行修復
fixContractConfig().catch(console.error);

export default fixContractConfig;