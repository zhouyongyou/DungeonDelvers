// 檢查 VRF Manager 合約狀態
import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';

const VRF_MANAGER_ADDRESS = '0x980d224ec4d198d94f34a8af76a19c00dabe2436';
const ALCHEMY_RPC = 'https://bnb-mainnet.g.alchemy.com/v2/QzXiHWkNRovjd_EeDRqVfR9rApUDiXRp';

// VRF Manager ABI - 關鍵函數
const VRF_MANAGER_ABI = [
  {
    "inputs": [],
    "name": "s_subscriptionId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "keyHash",
    "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "callbackGasLimit",
    "outputs": [{ "internalType": "uint32", "name": "", "type": "uint32" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "requestConfirmations",
    "outputs": [{ "internalType": "uint16", "name": "", "type": "uint16" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "authorizedContracts",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
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

const client = createPublicClient({
  chain: bsc,
  transport: http(ALCHEMY_RPC)
});

async function checkVRFManagerStatus() {
  console.log('🔍 檢查 VRF Manager 合約狀態...');
  console.log('合約地址:', VRF_MANAGER_ADDRESS);
  console.log('=' .repeat(60));

  try {
    // 檢查基本配置
    const [subscriptionId, keyHash, gasLimit, confirmations, owner] = await Promise.all([
      client.readContract({
        address: VRF_MANAGER_ADDRESS,
        abi: VRF_MANAGER_ABI,
        functionName: 's_subscriptionId'
      }),
      client.readContract({
        address: VRF_MANAGER_ADDRESS,
        abi: VRF_MANAGER_ABI,
        functionName: 'keyHash'
      }),
      client.readContract({
        address: VRF_MANAGER_ADDRESS,
        abi: VRF_MANAGER_ABI,
        functionName: 'callbackGasLimit'
      }),
      client.readContract({
        address: VRF_MANAGER_ADDRESS,
        abi: VRF_MANAGER_ABI,
        functionName: 'requestConfirmations'
      }),
      client.readContract({
        address: VRF_MANAGER_ADDRESS,
        abi: VRF_MANAGER_ABI,
        functionName: 'owner'
      })
    ]);

    console.log('✅ VRF 基本配置:');
    console.log('  Subscription ID:', subscriptionId.toString());
    console.log('  Key Hash:', keyHash);
    console.log('  Gas Limit:', gasLimit.toString());
    console.log('  Confirmations:', confirmations.toString());
    console.log('  Owner:', owner);
    
    // 檢查預期值
    const expectedSubId = '114131353280130458891383141995968474440293173552039681622016393393251650814328';
    const expectedKeyHash = '0x130dba50ad435d4ecc214aad0d5820474137bd68e7e77724144f27c3c377d3d4';
    
    console.log('\n🎯 配置驗證:');
    console.log('  Subscription ID 正確:', subscriptionId.toString() === expectedSubId ? '✅' : '❌');
    console.log('  Key Hash 正確:', keyHash === expectedKeyHash ? '✅' : '❌');
    console.log('  Owner 正確:', owner.toLowerCase() === '0x10925A7138649C7E1794CE646182eeb5BF8ba647'.toLowerCase() ? '✅' : '❌');

    // 檢查授權的合約
    const contractsToCheck = [
      { name: 'HERO', address: '0x671d937b171e2ba2c4dc23c133b07e4449f283ef' },
      { name: 'RELIC', address: '0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da' },
      { name: 'PARTY', address: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3' },
      { name: 'ALTAR', address: '0xa86749237d4631ad92ba859d0b0df4770f6147ba' },
      { name: 'DUNGEONMASTER', address: '0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a' }
    ];

    console.log('\n🔐 合約授權狀態:');
    for (const contract of contractsToCheck) {
      try {
        const isAuthorized = await client.readContract({
          address: VRF_MANAGER_ADDRESS,
          abi: VRF_MANAGER_ABI,
          functionName: 'authorizedContracts',
          args: [contract.address]
        });
        console.log(`  ${contract.name}: ${isAuthorized ? '✅ 已授權' : '❌ 未授權'}`);
      } catch (error) {
        console.log(`  ${contract.name}: ❓ 無法檢查 (${error.message})`);
      }
    }

  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
    
    // 檢查合約是否存在
    try {
      const code = await client.getCode({ address: VRF_MANAGER_ADDRESS });
      if (!code || code === '0x') {
        console.error('💥 合約不存在或沒有代碼！');
      } else {
        console.log('✅ 合約存在，可能是 ABI 不匹配');
      }
    } catch (codeError) {
      console.error('❌ 無法檢查合約代碼:', codeError.message);
    }
  }
}

checkVRFManagerStatus().catch(console.error);