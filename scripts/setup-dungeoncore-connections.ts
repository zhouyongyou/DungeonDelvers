// V25 DungeonCore 合約連接設置腳本
import { createWalletClient, http } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const ALCHEMY_RPC = 'https://bnb-mainnet.g.alchemy.com/v2/QzXiHWkNRovjd_EeDRqVfR9rApUDiXRp';

// V25 合約地址
const ADDRESSES = {
  DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
  HERO: '0x671d937b171e2ba2c4dc23c133b07e4449f283ef',
  RELIC: '0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da',
  PARTY: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
  DUNGEONMASTER: '0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a'
} as const;

const DUNGEONCORE_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "_heroContract", "type": "address"}],
    "name": "setHeroContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_relicContract", "type": "address"}],
    "name": "setRelicContract", 
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_partyContract", "type": "address"}],
    "name": "setPartyContract",
    "outputs": [],
    "stateMutability": "nonpayable", 
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_newAddress", "type": "address"}],
    "name": "setDungeonMaster",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

async function setupDungeonCoreConnections() {
  console.log('🔗 設置 DungeonCore 合約連接...');
  
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
  console.log(`📍 DungeonCore: ${ADDRESSES.DUNGEONCORE}`);

  const operations = [
    { name: 'Hero Contract', function: 'setHeroContract', address: ADDRESSES.HERO },
    { name: 'Relic Contract', function: 'setRelicContract', address: ADDRESSES.RELIC },
    { name: 'Party Contract', function: 'setPartyContract', address: ADDRESSES.PARTY },
    { name: 'DungeonMaster Contract', function: 'setDungeonMaster', address: ADDRESSES.DUNGEONMASTER }
  ];

  if (!process.argv.includes('--execute')) {
    console.log('');
    console.log('🔍 預覽模式 - 使用 --execute 參數來實際執行交易');
    console.log('📝 將要執行的操作:');
    operations.forEach((op, i) => {
      console.log(`  ${i + 1}. ${op.name}: ${op.address}`);
    });
    return;
  }

  console.log('');
  console.log('🚀 執行 DungeonCore 連接設置...');

  for (const [index, op] of operations.entries()) {
    try {
      console.log(`\n${index + 1}. 設置 ${op.name}...`);
      
      const hash = await client.writeContract({
        address: ADDRESSES.DUNGEONCORE,
        abi: DUNGEONCORE_ABI,
        functionName: op.function as any,
        args: [op.address],
      });

      console.log(`   ✅ 交易發送: ${hash}`);
      console.log(`   🔍 BSCScan: https://bscscan.com/tx/${hash}`);

      // 簡單等待 2 秒後繼續下一個
      if (index < operations.length - 1) {
        console.log('   ⏳ 等待 2 秒後執行下一個...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } catch (error) {
      console.error(`   ❌ 設置 ${op.name} 失敗:`, error);
    }
  }

  console.log('\n✅ DungeonCore 連接設置完成！');
  console.log('🔍 請使用 verify-v25-system.js 驗證結果');
}

setupDungeonCoreConnections().catch(console.error);