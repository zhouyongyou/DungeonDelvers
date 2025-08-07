// 檢查 DungeonCore 中的 dungeonMasterAddress 設置
import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';
import { getContractWithABI } from '../config/contractsWithABI';
import { logger } from './logger';

// 獲取 Alchemy RPC URL
function getAlchemyUrl(): string {
  const alchemyKey = import.meta.env.VITE_ALCHEMY_KEY || 
                    import.meta.env.VITE_ALCHEMY_KEY_PUBLIC ||
                    'tiPlQVTwx4_2P98Pl7hb-LfzaTyi5HOn';
  return `https://bnb-mainnet.g.alchemy.com/v2/${alchemyKey}`;
}

const publicClient = createPublicClient({
  chain: bsc,
  transport: http(getAlchemyUrl())
});

export const debugDungeonMasterAddress = async () => {
  console.log('🔍 Debugging DungeonMaster address configuration...');
  
  try {
    const dungeonCoreContract = getContractWithABI('DUNGEONCORE');
    const dungeonMasterContract = getContractWithABI('DUNGEONMASTER');
    
    if (!dungeonCoreContract || !dungeonMasterContract) {
      throw new Error('Contract ABIs not found');
    }

    // 1. 檢查 DungeonCore 中設置的 dungeonMasterAddress
    const dungeonMasterFromCore = await publicClient.readContract({
      address: dungeonCoreContract.address as `0x${string}`,
      abi: dungeonCoreContract.abi,
      functionName: 'dungeonMasterAddress'
    }) as string;

    // 2. 實際的 DungeonMaster 合約地址
    const actualDungeonMaster = dungeonMasterContract.address;

    // 3. 比較結果
    const isMatching = dungeonMasterFromCore.toLowerCase() === actualDungeonMaster.toLowerCase();

    console.log('📊 DungeonMaster Address Analysis:');
    console.log(`   DungeonCore.dungeonMasterAddress(): ${dungeonMasterFromCore}`);
    console.log(`   Actual DungeonMaster contract: ${actualDungeonMaster}`);
    console.log(`   Addresses match: ${isMatching ? '✅ YES' : '❌ NO'}`);

    if (!isMatching) {
      console.log('\n🚨 PROBLEM FOUND:');
      console.log('   DungeonCore.dungeonMasterAddress() does not match actual DungeonMaster address!');
      console.log('   This causes PlayerProfile.addExperience() to fail with "Caller is not the DungeonMaster"');
      console.log('\n💡 SOLUTION:');
      console.log('   Update DungeonCore.setDungeonMaster() with correct address');
    } else {
      console.log('\n✅ DungeonMaster address configuration is correct');
      console.log('   The issue must be elsewhere...');
    }

    logger.info('DungeonMaster address debug completed', {
      dungeonMasterFromCore,
      actualDungeonMaster,
      isMatching
    });

    return {
      dungeonMasterFromCore,
      actualDungeonMaster,
      isMatching
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ DungeonMaster address debug failed:', errorMessage);
    logger.error('DungeonMaster address debug failed', { error: errorMessage });
    
    return {
      error: errorMessage
    };
  }
};

// 在開發環境暴露調試工具
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).debugDungeonMasterAddress = debugDungeonMasterAddress;
  
  console.log('💡 DungeonMaster address debugging tool available:');
  console.log('   debugDungeonMasterAddress()');
  
  // 5 秒後自動執行一次
  setTimeout(async () => {
    await debugDungeonMasterAddress();
  }, 7000);
}

export default debugDungeonMasterAddress;