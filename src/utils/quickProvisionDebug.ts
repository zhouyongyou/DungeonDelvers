// 快速診斷儲備購買問題
// 在瀏覽器 console 執行: window.debugProvisions()

import { createPublicClient, http } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContract } from '../config/contracts';

export async function quickProvisionDebug() {
  const publicClient = createPublicClient({
    chain: bsc,
    transport: http()
  });

  const dungeonMasterContract = getContract(bsc.id, 'dungeonMaster');
  const dungeonCoreContract = getContract(bsc.id, 'dungeonCore');
  
  if (!dungeonMasterContract || !dungeonCoreContract) {
    console.error('合約未找到');
    return;
  }

  console.log('🔍 檢查 DungeonMaster 合約設置...\n');

  try {
    // 1. 檢查 dungeonCore
    const dungeonCore = await publicClient.readContract({
      ...dungeonMasterContract,
      functionName: 'dungeonCore'
    });
    console.log('DungeonCore:', dungeonCore);
    console.log('預期:', dungeonCoreContract.address);
    console.log('匹配:', dungeonCore.toLowerCase() === dungeonCoreContract.address.toLowerCase());

    // 2. 檢查 dungeonStorage
    const dungeonStorage = await publicClient.readContract({
      ...dungeonMasterContract,
      functionName: 'dungeonStorage'
    });
    console.log('\nDungeonStorage:', dungeonStorage);
    console.log('是否為空:', dungeonStorage === '0x0000000000000000000000000000000000000000');

    // 3. 檢查是否暫停
    const isPaused = await publicClient.readContract({
      ...dungeonMasterContract,
      functionName: 'paused'
    });
    console.log('\n合約暫停:', isPaused);

    // 4. 檢查儲備價格
    const provisionPrice = await publicClient.readContract({
      ...dungeonMasterContract,
      functionName: 'provisionPriceUSD'
    });
    console.log('\n儲備價格:', provisionPrice, `(${Number(provisionPrice) / 1e18} USD)`);

    // 結論
    console.log('\n📋 診斷結果:');
    if (dungeonCore === '0x0000000000000000000000000000000000000000') {
      console.error('❌ DungeonCore 未設置！需要執行: setDungeonCore()');
    } else if (dungeonStorage === '0x0000000000000000000000000000000000000000') {
      console.error('❌ DungeonStorage 未設置！需要執行: setDungeonStorage()');
    } else if (isPaused) {
      console.error('❌ 合約已暫停！需要執行: unpause()');
    } else {
      console.log('✅ 合約設置看起來正常');
    }

  } catch (error) {
    console.error('診斷出錯:', error);
  }
}

// 掛載到 window 對象
if (typeof window !== 'undefined') {
  (window as any).debugProvisions = quickProvisionDebug;
}