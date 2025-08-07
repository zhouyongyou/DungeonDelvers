// V25 VRF Subscription ID 更新腳本
import { createWalletClient, http } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const ALCHEMY_RPC = 'https://bnb-mainnet.g.alchemy.com/v2/QzXiHWkNRovjd_EeDRqVfR9rApUDiXRp';
const VRF_MANAGER_ADDRESS = '0x980d224ec4d198d94f34a8af76a19c00dabe2436';

// 正確的 VRF Subscription ID
const CORRECT_SUBSCRIPTION_ID = 114131353280130458891383141995968474440293173552039681622016393393251650814328n;

const VRF_MANAGER_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "_subscriptionId", "type": "uint256"}],
    "name": "setSubscriptionId",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "s_subscriptionId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

async function updateVRFSubscriptionId() {
  console.log('🎲 更新 VRF Manager Subscription ID...');
  
  if (!process.env.PRIVATE_KEY) {
    console.error('❌ 請設置 PRIVATE_KEY 環境變數');
    process.exit(1);
  }

  const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
  const client = createWalletClient({
    account,
    chain: bsc,
    transport: http(ALCHEMY_RPC)
  });

  console.log(`📍 管理員地址: ${account.address}`);
  console.log(`📍 VRF Manager: ${VRF_MANAGER_ADDRESS}`);
  console.log(`📍 新的 Subscription ID: ${CORRECT_SUBSCRIPTION_ID.toString()}`);

  if (!process.argv.includes('--execute')) {
    console.log('');
    console.log('🔍 預覽模式 - 使用 --execute 參數來實際執行交易');
    console.log('📝 將要執行的操作:');
    console.log('  1. 調用 setSubscriptionId() 函數');
    console.log('  2. 設置新的訂閱 ID');
    return;
  }

  try {
    console.log('');
    console.log('🚀 執行 setSubscriptionId 交易...');
    
    const hash = await client.writeContract({
      address: VRF_MANAGER_ADDRESS,
      abi: VRF_MANAGER_ABI,
      functionName: 'setSubscriptionId',
      args: [CORRECT_SUBSCRIPTION_ID],
    });

    console.log(`📝 交易已發送: ${hash}`);
    console.log(`🔍 BSCScan: https://bscscan.com/tx/${hash}`);
    console.log('⏳ 等待交易確認...');

    // 等待交易確認
    const receipt = await client.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
      console.log('✅ VRF Subscription ID 更新成功！');
      console.log(`📊 Gas 使用: ${receipt.gasUsed.toString()}`);
    } else {
      console.log('❌ 交易失敗');
    }

  } catch (error) {
    console.error('❌ 更新失敗:', error);
    process.exit(1);
  }
}

updateVRFSubscriptionId().catch(console.error);