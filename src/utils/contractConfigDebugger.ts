// 合約配置調試工具
import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';
import { getContractWithABI } from '../config/contractsWithABI';
import { logger } from './logger';

// 創建 publicClient 用於合約調試
const publicClient = createPublicClient({
  chain: bsc,
  transport: http()
});

interface ContractConfigResult {
  playerProfileConfig: {
    dungeonCoreAddress: string;
    dungeonMasterFromCore: string;
    actualDungeonMaster: string;
    isConfigured: boolean;
    error?: string;
  };
  dungeonCoreConfig: {
    dungeonMasterAddress: string;
    playerProfileAddress: string;
    isConfigured: boolean;
    error?: string;
  };
}

export const debugContractConfig = async (): Promise<ContractConfigResult> => {
  console.log('🔍 Debugging contract configuration...');
  
  try {
    const dungeonCoreContract = getContractWithABI('DUNGEONCORE');
    const playerProfileContract = getContractWithABI('PLAYERPROFILE');
    const dungeonMasterContract = getContractWithABI('DUNGEONMASTER');
    
    if (!dungeonCoreContract || !playerProfileContract || !dungeonMasterContract) {
      throw new Error('Contract ABIs not found');
    }

    // 1. 檢查 PlayerProfile 配置
    console.log('1. Checking PlayerProfile configuration...');
    
    const dungeonCoreFromProfile = await publicClient.readContract({
      address: playerProfileContract.address as `0x${string}`,
      abi: playerProfileContract.abi,
      functionName: 'dungeonCore'
    }) as string;

    let dungeonMasterFromCore = '';
    if (dungeonCoreFromProfile && dungeonCoreFromProfile !== '0x0000000000000000000000000000000000000000') {
      dungeonMasterFromCore = await publicClient.readContract({
        address: dungeonCoreFromProfile as `0x${string}`,
        abi: dungeonCoreContract.abi,
        functionName: 'dungeonMasterAddress'
      }) as string;
    }

    const actualDungeonMaster = dungeonMasterContract.address;

    // 2. 檢查 DungeonCore 配置
    console.log('2. Checking DungeonCore configuration...');
    
    const dungeonMasterFromDungeonCore = await publicClient.readContract({
      address: dungeonCoreContract.address as `0x${string}`,
      abi: dungeonCoreContract.abi,
      functionName: 'dungeonMasterAddress'
    }) as string;

    const playerProfileFromDungeonCore = await publicClient.readContract({
      address: dungeonCoreContract.address as `0x${string}`,
      abi: dungeonCoreContract.abi,
      functionName: 'playerProfileAddress'
    }) as string;

    const result: ContractConfigResult = {
      playerProfileConfig: {
        dungeonCoreAddress: dungeonCoreFromProfile,
        dungeonMasterFromCore,
        actualDungeonMaster,
        isConfigured: dungeonCoreFromProfile !== '0x0000000000000000000000000000000000000000' && 
                     dungeonMasterFromCore.toLowerCase() === actualDungeonMaster.toLowerCase()
      },
      dungeonCoreConfig: {
        dungeonMasterAddress: dungeonMasterFromDungeonCore,
        playerProfileAddress: playerProfileFromDungeonCore,
        isConfigured: dungeonMasterFromDungeonCore.toLowerCase() === actualDungeonMaster.toLowerCase() &&
                     playerProfileFromDungeonCore.toLowerCase() === playerProfileContract.address.toLowerCase()
      }
    };

    // 3. 分析結果
    console.log('📊 Configuration Analysis:');
    console.log('\n🏛️ PlayerProfile Contract:');
    console.log(`   DungeonCore set to: ${result.playerProfileConfig.dungeonCoreAddress}`);
    console.log(`   DungeonMaster from Core: ${result.playerProfileConfig.dungeonMasterFromCore}`);
    console.log(`   Actual DungeonMaster: ${result.playerProfileConfig.actualDungeonMaster}`);
    console.log(`   Status: ${result.playerProfileConfig.isConfigured ? '✅ Configured' : '❌ Misconfigured'}`);

    console.log('\n🏛️ DungeonCore Contract:');
    console.log(`   DungeonMaster address: ${result.dungeonCoreConfig.dungeonMasterAddress}`);
    console.log(`   PlayerProfile address: ${result.dungeonCoreConfig.playerProfileAddress}`);
    console.log(`   Status: ${result.dungeonCoreConfig.isConfigured ? '✅ Configured' : '❌ Misconfigured'}`);

    // 4. 問題診斷
    if (!result.playerProfileConfig.isConfigured) {
      console.log('\n🚨 PlayerProfile Configuration Issues:');
      if (result.playerProfileConfig.dungeonCoreAddress === '0x0000000000000000000000000000000000000000') {
        console.log('   • DungeonCore not set in PlayerProfile');
      }
      if (result.playerProfileConfig.dungeonMasterFromCore.toLowerCase() !== result.playerProfileConfig.actualDungeonMaster.toLowerCase()) {
        console.log('   • DungeonMaster address mismatch');
      }
    }

    if (!result.dungeonCoreConfig.isConfigured) {
      console.log('\n🚨 DungeonCore Configuration Issues:');
      if (result.dungeonCoreConfig.dungeonMasterAddress.toLowerCase() !== result.playerProfileConfig.actualDungeonMaster.toLowerCase()) {
        console.log('   • DungeonMaster address not set correctly in DungeonCore');
      }
      if (result.dungeonCoreConfig.playerProfileAddress.toLowerCase() !== playerProfileContract.address.toLowerCase()) {
        console.log('   • PlayerProfile address not set correctly in DungeonCore');
      }
    }

    logger.info('Contract configuration debug completed', result);
    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Contract configuration debug failed:', errorMessage);
    
    const emptyResult: ContractConfigResult = {
      playerProfileConfig: {
        dungeonCoreAddress: '',
        dungeonMasterFromCore: '',
        actualDungeonMaster: '',
        isConfigured: false,
        error: errorMessage
      },
      dungeonCoreConfig: {
        dungeonMasterAddress: '',
        playerProfileAddress: '',
        isConfigured: false,
        error: errorMessage
      }
    };

    return emptyResult;
  }
};

// 在開發環境暴露調試工具
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).debugContractConfig = debugContractConfig;
  
  console.log('💡 Contract config debugging tool available:');
  console.log('   debugContractConfig()');
  
  // 5 秒後自動執行一次
  setTimeout(async () => {
    await debugContractConfig();
  }, 5000);
}

export default debugContractConfig;