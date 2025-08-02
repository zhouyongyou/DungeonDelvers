// 遠征交易 Gas 調試工具
import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';
import { getContractWithABI } from '../config/contractsWithABI';
import { logger } from './logger';

// 創建 publicClient 用於 Gas 估算
const publicClient = createPublicClient({
  chain: bsc,
  transport: http()
});

interface GasDebugResult {
  success: boolean;
  estimatedGas?: bigint;
  currentGasPrice?: bigint;
  recommendedGasLimit?: bigint;
  recommendedGasPrice?: bigint;
  totalCostBNB?: string;
  error?: string;
}

export const debugExpeditionGas = async (
  partyId: bigint,
  dungeonId: bigint,
  playerAddress: string,
  explorationFee: bigint
): Promise<GasDebugResult> => {
  console.log('🔍 Debugging expedition gas requirements...');
  
  try {
    const dungeonMasterContract = getContractWithABI('DUNGEONMASTER');
    if (!dungeonMasterContract) {
      throw new Error('DungeonMaster contract not found');
    }

    // 1. 估算 Gas
    console.log('1. Estimating gas...');
    const estimatedGas = await publicClient.estimateContractGas({
      address: dungeonMasterContract.address as `0x${string}`,
      abi: dungeonMasterContract.abi,
      functionName: 'requestExpedition',
      args: [partyId, dungeonId],
      value: explorationFee,
      account: playerAddress as `0x${string}`
    });

    // 2. 獲取當前 Gas Price
    console.log('2. Getting current gas price...');
    const currentGasPrice = await publicClient.getGasPrice();

    // 3. 計算建議值
    const gasBuffer = 20n; // 20% buffer
    const recommendedGasLimit = estimatedGas + (estimatedGas * gasBuffer) / 100n;
    
    // BSC 建議的最低 Gas Price
    const minGasPrice = 3000000000n; // 3 Gwei
    const recommendedGasPrice = currentGasPrice > minGasPrice ? currentGasPrice : minGasPrice;

    // 4. 計算總成本
    const totalGasCost = recommendedGasLimit * recommendedGasPrice;
    const totalCostBNB = (Number(totalGasCost) / 1e18).toFixed(6);

    const result: GasDebugResult = {
      success: true,
      estimatedGas,
      currentGasPrice,
      recommendedGasLimit,
      recommendedGasPrice,
      totalCostBNB
    };

    // 5. 記錄結果
    console.log('✅ Gas estimation successful:');
    console.log(`   Estimated Gas: ${estimatedGas.toString()}`);
    console.log(`   Current Gas Price: ${currentGasPrice.toString()} wei (${Number(currentGasPrice) / 1e9} Gwei)`);
    console.log(`   Recommended Gas Limit: ${recommendedGasLimit.toString()}`);
    console.log(`   Recommended Gas Price: ${recommendedGasPrice.toString()} wei (${Number(recommendedGasPrice) / 1e9} Gwei)`);
    console.log(`   Total Cost: ${totalCostBNB} BNB`);

    // 6. 安全檢查
    if (estimatedGas > 500000n) {
      console.warn('⚠️  High gas usage detected! This might indicate a problem.');
    }
    
    if (currentGasPrice < minGasPrice) {
      console.warn('⚠️  Current gas price is very low. Transaction might be slow or fail.');
    }

    logger.info('Expedition gas debug completed', result);
    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('❌ Gas estimation failed:', errorMessage);
    
    // 分析常見錯誤
    if (errorMessage.includes('execution reverted')) {
      console.log('💡 Possible causes:');
      console.log('   • Party is on cooldown');
      console.log('   • Insufficient party power');
      console.log('   • Insufficient BNB for exploration fee');
      console.log('   • Dungeon does not exist');
    } else if (errorMessage.includes('insufficient funds')) {
      console.log('💡 Insufficient funds for gas or exploration fee');
    }

    logger.error('Expedition gas debug failed', { error: errorMessage, partyId, dungeonId });
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

// 快速診斷函數
export const quickGasDiagnosis = async () => {
  console.log('🩺 Quick Gas Diagnosis for BSC...');
  
  try {
    const gasPrice = await publicClient.getGasPrice();
    const blockNumber = await publicClient.getBlockNumber();
    
    console.log(`Current Block: ${blockNumber}`);
    console.log(`Current Gas Price: ${Number(gasPrice) / 1e9} Gwei`);
    
    if (gasPrice < 1000000000n) { // < 1 Gwei
      console.warn('⚠️  Extremely low gas price - transactions may fail');
    } else if (gasPrice < 3000000000n) { // < 3 Gwei
      console.warn('⚠️  Low gas price - transactions may be slow');
    } else {
      console.log('✅ Gas price looks normal');
    }
    
  } catch (error) {
    console.error('❌ Quick diagnosis failed:', error);
  }
};

// 在開發環境暴露調試工具
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).debugExpeditionGas = debugExpeditionGas;
  (window as any).quickGasDiagnosis = quickGasDiagnosis;
  
  console.log('💡 Gas debugging tools available:');
  console.log('   debugExpeditionGas(partyId, dungeonId, playerAddress, explorationFee)');
  console.log('   quickGasDiagnosis()');
}

export default debugExpeditionGas;