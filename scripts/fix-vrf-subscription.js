// 修復 VRF Manager 的 Subscription ID
import { createWalletClient, createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const VRF_MANAGER_ADDRESS = '0x980d224ec4d198d94f34a8af76a19c00dabe2436';
const ALCHEMY_RPC = 'https://bnb-mainnet.g.alchemy.com/v2/QzXiHWkNRovjd_EeDRqVfR9rApUDiXRp';
const NEW_SUBSCRIPTION_ID = '114131353280130458891383141995968474440293173552039681622016393393251650814328';

// 需要設置私鑰環境變數
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('❌ 請設置 PRIVATE_KEY 環境變數');
  process.exit(1);
}

// VRF Manager ABI - 管理員函數
const VRF_MANAGER_ABI = [
  {
    "inputs": [{ "internalType": "uint256", "name": "_subscriptionId", "type": "uint256" }],
    "name": "setSubscriptionId",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "s_subscriptionId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const publicClient = createPublicClient({
  chain: bsc,
  transport: http(ALCHEMY_RPC)
});

const account = privateKeyToAccount(PRIVATE_KEY);
const walletClient = createWalletClient({
  account,
  chain: bsc,
  transport: http(ALCHEMY_RPC)
});

async function updateSubscriptionId() {
  console.log('🔧 修復 VRF Manager Subscription ID...');
  console.log('合約地址:', VRF_MANAGER_ADDRESS);
  console.log('錢包地址:', account.address);
  console.log('=' .repeat(60));

  try {
    // 檢查當前設置
    console.log('📋 檢查當前設置...');
    const [currentSubId, owner] = await Promise.all([
      publicClient.readContract({
        address: VRF_MANAGER_ADDRESS,
        abi: VRF_MANAGER_ABI,
        functionName: 's_subscriptionId'
      }),
      publicClient.readContract({
        address: VRF_MANAGER_ADDRESS,
        abi: VRF_MANAGER_ABI,
        functionName: 'owner'
      })
    ]);

    console.log('  當前 Subscription ID:', currentSubId.toString());
    console.log('  合約 Owner:', owner);
    console.log('  你的地址:', account.address);

    // 檢查權限
    if (owner.toLowerCase() !== account.address.toLowerCase()) {
      console.error('❌ 權限不足：你不是合約的 owner');
      return;
    }

    // 檢查是否需要更新
    if (currentSubId.toString() === NEW_SUBSCRIPTION_ID) {
      console.log('✅ Subscription ID 已經是正確的值，無需更新');
      return;
    }

    console.log('🚀 開始更新 Subscription ID...');
    console.log('  從:', currentSubId.toString());
    console.log('  到:', NEW_SUBSCRIPTION_ID);

    // 執行更新
    const hash = await walletClient.writeContract({
      address: VRF_MANAGER_ADDRESS,
      abi: VRF_MANAGER_ABI,
      functionName: 'setSubscriptionId',
      args: [BigInt(NEW_SUBSCRIPTION_ID)]
    });

    console.log('📝 交易已提交:', hash);
    console.log('⏳ 等待確認...');

    // 等待交易確認
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log('✅ 交易成功確認！');
      console.log('   區塊號:', receipt.blockNumber);
      console.log('   Gas 使用:', receipt.gasUsed);

      // 驗證更新結果
      console.log('🔍 驗證更新結果...');
      const newSubId = await publicClient.readContract({
        address: VRF_MANAGER_ADDRESS,
        abi: VRF_MANAGER_ABI,
        functionName: 's_subscriptionId'
      });

      if (newSubId.toString() === NEW_SUBSCRIPTION_ID) {
        console.log('🎉 Subscription ID 更新成功！');
        console.log('   新值:', newSubId.toString());
      } else {
        console.error('❌ 更新失敗，值不匹配');
        console.log('   預期:', NEW_SUBSCRIPTION_ID);
        console.log('   實際:', newSubId.toString());
      }
    } else {
      console.error('❌ 交易失敗:', receipt);
    }

  } catch (error) {
    console.error('❌ 更新失敗:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.log('💡 請確保錢包有足夠的 BNB 支付 gas 費用');
    }
  }
}

// 檢查環境並執行
if (process.argv.includes('--execute')) {
  updateSubscriptionId().catch(console.error);
} else {
  console.log('🔍 這是 VRF Subscription ID 更新腳本');
  console.log('請確認以下信息後添加 --execute 參數執行：');
  console.log('  1. 設置了正確的 PRIVATE_KEY 環境變數');
  console.log('  2. 錢包有足夠的 BNB 支付 gas');
  console.log('  3. 確認要更新的 Subscription ID');
  console.log('');
  console.log('執行命令：PRIVATE_KEY=你的私鑰 node scripts/fix-vrf-subscription.js --execute');
}