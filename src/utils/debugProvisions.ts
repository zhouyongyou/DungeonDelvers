// Debug helper for provisions purchase issues
import { getContract } from '../config/contracts';
import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { bsc } from 'wagmi/chains';

export async function debugProvisionsPurchase(
  partyId: bigint,
  userAddress: Address,
  amount: number = 1
) {
  const publicClient = createPublicClient({
    chain: bsc,
    transport: http()
  });

  const dungeonMasterContract = getContract(bsc.id, 'dungeonMaster');
  const dungeonCoreContract = getContract(bsc.id, 'dungeonCore');
  const soulShardContract = getContract(bsc.id, 'soulShard');
  const partyContract = getContract(bsc.id, 'party');
  const dungeonStorageContract = getContract(bsc.id, 'dungeonStorage');

  if (!dungeonMasterContract || !dungeonCoreContract || !soulShardContract || !partyContract) {
    console.error('❌ 缺少必要的合約配置');
    return;
  }

  console.log('🔍 開始診斷儲備購買問題...\n');

  try {
    // 1. 檢查 DungeonMaster 的 dungeonCore 設置
    const dungeonCoreAddress = await publicClient.readContract({
      ...dungeonMasterContract,
      functionName: 'dungeonCore'
    });
    console.log(`1. DungeonCore 地址: ${dungeonCoreAddress}`);
    console.log(`   預期: ${dungeonCoreContract.address}`);
    console.log(`   ✅ 匹配: ${dungeonCoreAddress.toLowerCase() === dungeonCoreContract.address.toLowerCase()}\n`);

    // 2. 檢查 DungeonMaster 的 dungeonStorage 設置
    const dungeonStorageAddress = await publicClient.readContract({
      ...dungeonMasterContract,
      functionName: 'dungeonStorage'
    });
    console.log(`2. DungeonStorage 地址: ${dungeonStorageAddress}`);
    console.log(`   ✅ 已設置: ${dungeonStorageAddress !== '0x0000000000000000000000000000000000000000'}\n`);

    // 3. 檢查隊伍擁有者
    const partyOwner = await publicClient.readContract({
      ...partyContract,
      functionName: 'ownerOf',
      args: [partyId]
    });
    console.log(`3. 隊伍 #${partyId} 擁有者: ${partyOwner}`);
    console.log(`   用戶地址: ${userAddress}`);
    console.log(`   ✅ 是擁有者: ${partyOwner.toLowerCase() === userAddress.toLowerCase()}\n`);

    // 4. 檢查 SoulShard 代幣地址
    const soulShardAddress = await publicClient.readContract({
      ...dungeonCoreContract,
      functionName: 'soulShardTokenAddress'
    });
    console.log(`4. SoulShard 代幣地址: ${soulShardAddress}`);
    console.log(`   預期: ${soulShardContract.address}`);
    console.log(`   ✅ 匹配: ${soulShardAddress.toLowerCase() === soulShardContract.address.toLowerCase()}\n`);

    // 5. 檢查儲備價格
    const provisionPriceUSD = await publicClient.readContract({
      ...dungeonMasterContract,
      functionName: 'provisionPriceUSD'
    });
    console.log(`5. 儲備單價 (USD): ${provisionPriceUSD} (${Number(provisionPriceUSD) / 1e18} USD)\n`);

    // 6. 計算所需的 SoulShard 數量
    const totalCostUSD = provisionPriceUSD * BigInt(amount);
    const requiredSoulShard = await publicClient.readContract({
      ...dungeonCoreContract,
      functionName: 'getSoulShardAmountForUSD',
      args: [totalCostUSD]
    });
    console.log(`6. 購買 ${amount} 個儲備需要: ${requiredSoulShard} SoulShard (${Number(requiredSoulShard) / 1e18} $SOUL)\n`);

    // 7. 檢查用戶餘額
    const userBalance = await publicClient.readContract({
      ...soulShardContract,
      functionName: 'balanceOf',
      args: [userAddress]
    });
    console.log(`7. 用戶 SoulShard 餘額: ${userBalance} (${Number(userBalance) / 1e18} $SOUL)`);
    console.log(`   ✅ 餘額充足: ${userBalance >= requiredSoulShard}\n`);

    // 8. 檢查授權額度
    const allowance = await publicClient.readContract({
      ...soulShardContract,
      functionName: 'allowance',
      args: [userAddress, dungeonMasterContract.address]
    });
    console.log(`8. 授權額度: ${allowance} (${Number(allowance) / 1e18} $SOUL)`);
    console.log(`   ✅ 授權充足: ${allowance >= requiredSoulShard}\n`);

    // 9. 檢查合約是否暫停
    const isPaused = await publicClient.readContract({
      ...dungeonMasterContract,
      functionName: 'paused'
    });
    console.log(`9. 合約是否暫停: ${isPaused}`);
    console.log(`   ✅ 可以交易: ${!isPaused}\n`);

    // 10. 檢查隊伍狀態
    if (dungeonStorageContract) {
      try {
        const partyStatus = await publicClient.readContract({
          ...dungeonStorageContract,
          functionName: 'getPartyStatus',
          args: [partyId]
        });
        console.log(`10. 隊伍狀態:`);
        console.log(`    當前儲備: ${partyStatus[0]}`);
        console.log(`    冷卻結束時間: ${partyStatus[1]} (${new Date(Number(partyStatus[1]) * 1000).toLocaleString()})`);
        console.log(`    未領取獎勵: ${partyStatus[2]}`);
        console.log(`    疲勞度: ${partyStatus[3]}\n`);
      } catch (e) {
        console.log(`10. ❌ 無法讀取隊伍狀態 (可能 DungeonStorage 未正確設置)\n`);
      }
    }

    // 總結
    console.log('📋 診斷總結:');
    const issues = [];
    
    if (dungeonCoreAddress === '0x0000000000000000000000000000000000000000') {
      issues.push('DungeonCore 未在 DungeonMaster 中設置');
    }
    if (dungeonStorageAddress === '0x0000000000000000000000000000000000000000') {
      issues.push('DungeonStorage 未在 DungeonMaster 中設置');
    }
    if (partyOwner.toLowerCase() !== userAddress.toLowerCase()) {
      issues.push('用戶不是隊伍擁有者');
    }
    if (userBalance < requiredSoulShard) {
      issues.push('SoulShard 餘額不足');
    }
    if (allowance < requiredSoulShard) {
      issues.push('需要先授權 SoulShard');
    }
    if (isPaused) {
      issues.push('合約已暫停');
    }

    if (issues.length === 0) {
      console.log('✅ 所有檢查通過！應該可以正常購買儲備。');
      console.log('\n如果仍然出錯，可能是:');
      console.log('- Gas 不足');
      console.log('- 網路問題');
      console.log('- 合約內部其他邏輯問題');
    } else {
      console.log('❌ 發現以下問題:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

  } catch (error) {
    console.error('診斷過程中發生錯誤:', error);
  }
}

// 使用範例:
// debugProvisionsPurchase(1n, '0x10925A7138649C7E1794CE646182eeb5BF8ba647', 5);