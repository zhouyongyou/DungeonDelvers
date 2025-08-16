import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const account = privateKeyToAccount(PRIVATE_KEY);

const publicClient = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed.binance.org/')
});

const walletClient = createWalletClient({
  account,
  chain: bsc,
  transport: http('https://bsc-dataseed.binance.org/')
});

const contracts = {
  dungeonCore: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
  dungeonMaster: '0x395358733F69572C5744b561Ba61F0e16F32A571' // 正確的 V25 地址
};

const abi = parseAbi([
  'function dungeonMasterAddress() view returns (address)',
  'function setDungeonMaster(address _newAddress) external',
  'function owner() view returns (address)'
]);

async function checkAndFix() {
  console.log('🔍 檢查 DungeonCore 配置...\n');

  try {
    // 檢查當前設置
    const currentDM = await publicClient.readContract({
      address: contracts.dungeonCore,
      abi: abi,
      functionName: 'dungeonMasterAddress',
    });

    console.log('當前 DungeonMaster:', currentDM);
    console.log('正確的地址應該是:', contracts.dungeonMaster);

    if (currentDM.toLowerCase() === contracts.dungeonMaster.toLowerCase()) {
      console.log('✅ DungeonMaster 地址已經正確！');
      return;
    }

    console.log('❌ DungeonMaster 地址不正確，需要更新');

    // 檢查 owner
    const owner = await publicClient.readContract({
      address: contracts.dungeonCore,
      abi: abi,
      functionName: 'owner',
    });

    console.log('\nDungeonCore owner:', owner);
    console.log('當前帳戶:', account.address);

    if (owner.toLowerCase() !== account.address.toLowerCase()) {
      console.log('❌ 你不是 DungeonCore 的 owner，無法更新');
      return;
    }

    // 詢問是否執行
    console.log('\n準備執行更新...');
    console.log('這將設置 DungeonMaster 為:', contracts.dungeonMaster);
    
    // 執行更新
    const { request } = await publicClient.simulateContract({
      account,
      address: contracts.dungeonCore,
      abi: abi,
      functionName: 'setDungeonMaster',
      args: [contracts.dungeonMaster],
    });

    const hash = await walletClient.writeContract(request);
    console.log('交易已發送:', hash);

    // 等待確認
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('✅ 交易已確認:', receipt.transactionHash);

    // 驗證更新
    const newDM = await publicClient.readContract({
      address: contracts.dungeonCore,
      abi: abi,
      functionName: 'dungeonMasterAddress',
    });

    console.log('\n更新後的 DungeonMaster:', newDM);
    if (newDM.toLowerCase() === contracts.dungeonMaster.toLowerCase()) {
      console.log('✅ 更新成功！');
    } else {
      console.log('❌ 更新失敗，請檢查');
    }

  } catch (error) {
    console.error('錯誤:', error);
  }
}

checkAndFix();