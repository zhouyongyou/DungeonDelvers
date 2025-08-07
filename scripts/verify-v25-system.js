// V25 系統完整性檢查和驗證
import { createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';

const ALCHEMY_RPC = 'https://bnb-mainnet.g.alchemy.com/v2/QzXiHWkNRovjd_EeDRqVfR9rApUDiXRp';

// V25 合約地址
const V25_CONTRACTS = {
  // 新部署的合約
  DUNGEONSTORAGE: '0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468',
  DUNGEONMASTER: '0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a',
  HERO: '0x671d937b171e2ba2c4dc23c133b07e4449f283ef',
  RELIC: '0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da',
  ALTAROFASCENSION: '0xa86749237d4631ad92ba859d0b0df4770f6147ba',
  PARTY: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
  
  // 複用的合約
  DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
  PLAYERVAULT: '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787',
  PLAYERPROFILE: '0x0f5932e89908400a5AfDC306899A2987b67a3155',
  VIPSTAKING: '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C',
  ORACLE: '0xf8CE896aF39f95a9d5Dd688c35d381062263E25a',
  
  // Token 合約
  SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
  USD: '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE',
  UNISWAP_POOL: '0x1e5Cd5F386Fb6F39cD8788675dd3A5ceB6521C82',
  
  // VRF
  VRF_MANAGER: '0x980d224ec4d198d94f34a8af76a19c00dabe2436',
  VRF_COORDINATOR: '0xd691f04bc0C9a24Edb78af9E005Cf85768F694C9',
  
  // 管理員
  DUNGEONMASTERWALLET: '0x10925A7138649C7E1794CE646182eeb5BF8ba647'
};

// 基本合約 ABI
const BASIC_ABI = [
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const DUNGEONCORE_ABI = [
  ...BASIC_ABI,
  {
    "inputs": [],
    "name": "heroContractAddress",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "relicContractAddress",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "partyContractAddress",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "dungeonMasterAddress",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

const VRF_ABI = [
  ...BASIC_ABI,
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
  }
];

const client = createPublicClient({
  chain: bsc,
  transport: http(ALCHEMY_RPC)
});

async function checkContractExists(name, address) {
  try {
    const code = await client.getCode({ address });
    const exists = code && code !== '0x';
    console.log(`  ${name}: ${exists ? '✅' : '❌'} ${exists ? '存在' : '不存在'}`);
    return exists;
  } catch (error) {
    console.log(`  ${name}: ❌ 檢查失敗 (${error.message})`);
    return false;
  }
}

async function checkDungeonCoreConnections() {
  console.log('\n🔗 檢查 DungeonCore 合約連接...');
  try {
    const [hero, relic, party, dungeonMaster] = await Promise.all([
      client.readContract({
        address: V25_CONTRACTS.DUNGEONCORE,
        abi: DUNGEONCORE_ABI,
        functionName: 'heroContractAddress'
      }).catch(() => '0x0000000000000000000000000000000000000000'),
      client.readContract({
        address: V25_CONTRACTS.DUNGEONCORE,
        abi: DUNGEONCORE_ABI,
        functionName: 'relicContractAddress'
      }).catch(() => '0x0000000000000000000000000000000000000000'),
      client.readContract({
        address: V25_CONTRACTS.DUNGEONCORE,
        abi: DUNGEONCORE_ABI,
        functionName: 'partyContractAddress'
      }).catch(() => '0x0000000000000000000000000000000000000000'),
      client.readContract({
        address: V25_CONTRACTS.DUNGEONCORE,
        abi: DUNGEONCORE_ABI,
        functionName: 'dungeonMasterAddress'
      }).catch(() => '0x0000000000000000000000000000000000000000')
    ]);

    const checkConnection = (name, current, expected) => {
      const isCorrect = current.toLowerCase() === expected.toLowerCase();
      console.log(`  ${name}: ${isCorrect ? '✅' : '❌'} ${isCorrect ? '正確' : '需要更新'}`);
      if (!isCorrect) {
        console.log(`    當前: ${current}`);
        console.log(`    應該: ${expected}`);
      }
      return isCorrect;
    };

    checkConnection('HERO', hero, V25_CONTRACTS.HERO);
    checkConnection('RELIC', relic, V25_CONTRACTS.RELIC);
    checkConnection('PARTY', party, V25_CONTRACTS.PARTY);
    checkConnection('DUNGEONMASTER', dungeonMaster, V25_CONTRACTS.DUNGEONMASTER);

  } catch (error) {
    console.log(`  ❌ 檢查失敗: ${error.message}`);
  }
}

async function checkVRFConfiguration() {
  console.log('\n🎲 檢查 VRF 配置...');
  try {
    const [subscriptionId, keyHash, owner] = await Promise.all([
      client.readContract({
        address: V25_CONTRACTS.VRF_MANAGER,
        abi: VRF_ABI,
        functionName: 's_subscriptionId'
      }),
      client.readContract({
        address: V25_CONTRACTS.VRF_MANAGER,
        abi: VRF_ABI,
        functionName: 'keyHash'
      }),
      client.readContract({
        address: V25_CONTRACTS.VRF_MANAGER,
        abi: VRF_ABI,
        functionName: 'owner'
      })
    ]);

    const expectedSubId = '114131353280130458891383141995968474440293173552039681622016393393251650814328';
    const expectedKeyHash = '0x130dba50ad435d4ecc214aad0d5820474137bd68e7e77724144f27c3c377d3d4';

    console.log(`  Subscription ID: ${subscriptionId.toString() === expectedSubId ? '✅' : '❌'} ${subscriptionId.toString() === expectedSubId ? '正確' : '需要更新'}`);
    if (subscriptionId.toString() !== expectedSubId) {
      console.log(`    當前: ${subscriptionId.toString()}`);
      console.log(`    應該: ${expectedSubId}`);
    }

    console.log(`  Key Hash: ${keyHash === expectedKeyHash ? '✅' : '❌'} ${keyHash === expectedKeyHash ? '正確' : '錯誤'}`);
    console.log(`  Owner: ${owner.toLowerCase() === V25_CONTRACTS.DUNGEONMASTERWALLET.toLowerCase() ? '✅' : '❌'} ${owner}`);

  } catch (error) {
    console.log(`  ❌ 檢查失敗: ${error.message}`);
  }
}

async function verifyV25System() {
  console.log('🔍 V25 系統完整性檢查');
  console.log('部署時間: 2025-08-07 PM10');
  console.log('起始區塊: 56771885');
  console.log('=' .repeat(60));

  // 1. 檢查所有合約是否存在
  console.log('\n📋 檢查合約部署狀態...');
  let allExist = true;
  for (const [name, address] of Object.entries(V25_CONTRACTS)) {
    // 跳過 EOA 地址
    if (name === 'DUNGEONMASTERWALLET') {
      console.log(`  ${name}: ✅ 管理員錢包 (EOA)`);
      continue;
    }
    const exists = await checkContractExists(name, address);
    if (!exists) allExist = false;
  }

  if (!allExist) {
    console.log('\n❌ 部分合約不存在，請檢查地址是否正確');
    return;
  }

  // 2. 檢查 DungeonCore 連接
  await checkDungeonCoreConnections();

  // 3. 檢查 VRF 配置
  await checkVRFConfiguration();

  // 4. 總結
  console.log('\n📊 檢查總結:');
  console.log('  合約部署: ✅ 所有合約已部署');
  console.log('  DungeonCore: 🔍 請檢查上方的連接狀態');
  console.log('  VRF 配置: 🔍 請檢查上方的配置狀態');
  
  console.log('\n🚀 需要執行的設置步驟:');
  console.log('  1. 更新 VRF Manager 的 Subscription ID');
  console.log('  2. 在 DungeonCore 中設置新的合約地址');
  console.log('  3. 在新合約中設置 DungeonCore 地址');
  console.log('  4. 授權 VRF Manager 給新的 NFT 合約');
  
  console.log('\n🔧 配置更新腳本:');
  console.log('  VRF: PRIVATE_KEY=你的私鑰 node scripts/fix-vrf-subscription.js --execute');
}

verifyV25System().catch(console.error);