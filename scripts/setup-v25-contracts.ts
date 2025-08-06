// V25 合約互連設定腳本 - 完整版
import { createWalletClient, createPublicClient, http } from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// V25 最新合約地址
const V25_CONTRACTS = {
  // 新部署的合約
  DungeonMaster: '0xE391261741Fad5FCC2D298d00e8c684767021253',
  Hero: '0xD48867dbac5f1c1351421726B6544f847D9486af',
  Relic: '0x86f15792Ecfc4b5F2451d841A3fBaBEb651138ce',
  AltarOfAscension: '0x095559778C0BAA2d8FA040Ab0f8752cF07779D33',
  DungeonStorage: '0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468',
  
  // 重複使用的合約
  DungeonCore: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
  PlayerVault: '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787',
  PlayerProfile: '0x0f5932e89908400a5AfDC306899A2987b67a3155',
  VIPStaking: '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C',
  Oracle: '0xf8CE896aF39f95a9d5Dd688c35d381062263E25a',
  
  // 長期固定使用
  VRFManager: '0xD062785C376560A392e1a5F1b25ffb35dB5b67bD',
  Party: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
  SoulShard: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
  UniswapPool: '0x1e5Cd5F386Fb6F39cD8788675dd3A5ceB6521C82',
  USD: '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE'
} as const;

// 簡化的 ABI - 只包含設定函數
const DUNGEON_CORE_ABI = [
  {
    "inputs": [{"name": "_newAddress", "type": "address"}],
    "name": "setHeroContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_newAddress", "type": "address"}],
    "name": "setRelicContract", 
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_newAddress", "type": "address"}],
    "name": "setDungeonMaster",
    "outputs": [],
    "stateMutability": "nonpayable", 
    "type": "function"
  },
  {
    "inputs": [{"name": "_newAddress", "type": "address"}],
    "name": "setAltarOfAscension",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const CONTRACT_SET_DUNGEONCORE_ABI = [
  {
    "inputs": [{"name": "_newAddress", "type": "address"}],
    "name": "setDungeonCore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const DUNGEONMASTER_ABI = [
  {
    "inputs": [{"name": "_newAddress", "type": "address"}],
    "name": "setDungeonStorage",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_newAddress", "type": "address"}],
    "name": "setVRFManager",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const VRF_SET_ABI = [
  {
    "inputs": [{"name": "_newAddress", "type": "address"}],
    "name": "setVRFManager",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

async function setupV25Contracts() {
  console.log('🚀 開始 V25 合約互連設定...');
  console.log('📋 使用合約地址:');
  Object.entries(V25_CONTRACTS).forEach(([name, address]) => {
    console.log(`   ${name}: ${address}`);
  });

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ 請設置 PRIVATE_KEY 環境變數');
    console.log('\n💡 使用方法:');
    console.log('   PRIVATE_KEY=0x你的私鑰 npx tsx scripts/setup-v25-contracts.ts');
    return;
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const publicClient = createPublicClient({
    chain: bsc,
    transport: http('https://bsc-dataseed1.binance.org/')
  });
  
  const walletClient = createWalletClient({
    account,
    chain: bsc,
    transport: http('https://bsc-dataseed1.binance.org/')
  });

  console.log(`👤 使用錢包地址: ${account.address}\n`);

  const transactions: Array<{name: string, hash: string}> = [];

  try {
    console.log('🔧 1. 設定 DungeonCore 中的合約地址...');
    
    // 設定 Hero 合約
    const heroTx = await walletClient.writeContract({
      address: V25_CONTRACTS.DungeonCore as `0x${string}`,
      abi: DUNGEON_CORE_ABI,
      functionName: 'setHeroContract',
      args: [V25_CONTRACTS.Hero as `0x${string}`]
    });
    transactions.push({name: 'DungeonCore.setHeroContract', hash: heroTx});
    console.log(`   ✅ Hero 合約設定: ${heroTx}`);

    // 設定 Relic 合約
    const relicTx = await walletClient.writeContract({
      address: V25_CONTRACTS.DungeonCore as `0x${string}`,
      abi: DUNGEON_CORE_ABI,
      functionName: 'setRelicContract',
      args: [V25_CONTRACTS.Relic as `0x${string}`]
    });
    transactions.push({name: 'DungeonCore.setRelicContract', hash: relicTx});
    console.log(`   ✅ Relic 合約設定: ${relicTx}`);

    // 設定 DungeonMaster 合約
    const dungeonMasterTx = await walletClient.writeContract({
      address: V25_CONTRACTS.DungeonCore as `0x${string}`,
      abi: DUNGEON_CORE_ABI,
      functionName: 'setDungeonMaster',
      args: [V25_CONTRACTS.DungeonMaster as `0x${string}`]
    });
    transactions.push({name: 'DungeonCore.setDungeonMaster', hash: dungeonMasterTx});
    console.log(`   ✅ DungeonMaster 合約設定: ${dungeonMasterTx}`);

    // 設定 AltarOfAscension 合約
    const altarTx = await walletClient.writeContract({
      address: V25_CONTRACTS.DungeonCore as `0x${string}`,
      abi: DUNGEON_CORE_ABI,
      functionName: 'setAltarOfAscension',
      args: [V25_CONTRACTS.AltarOfAscension as `0x${string}`]
    });
    transactions.push({name: 'DungeonCore.setAltarOfAscension', hash: altarTx});
    console.log(`   ✅ AltarOfAscension 合約設定: ${altarTx}`);

    console.log('\n🔧 2. 設定各合約的 DungeonCore 引用...');
    
    // 設定 Hero 合約的 DungeonCore
    const heroCoreTx = await walletClient.writeContract({
      address: V25_CONTRACTS.Hero as `0x${string}`,
      abi: CONTRACT_SET_DUNGEONCORE_ABI,
      functionName: 'setDungeonCore',
      args: [V25_CONTRACTS.DungeonCore as `0x${string}`]
    });
    transactions.push({name: 'Hero.setDungeonCore', hash: heroCoreTx});
    console.log(`   ✅ Hero.setDungeonCore: ${heroCoreTx}`);

    // 設定 Relic 合約的 DungeonCore
    const relicCoreTx = await walletClient.writeContract({
      address: V25_CONTRACTS.Relic as `0x${string}`,
      abi: CONTRACT_SET_DUNGEONCORE_ABI,
      functionName: 'setDungeonCore',
      args: [V25_CONTRACTS.DungeonCore as `0x${string}`]
    });
    transactions.push({name: 'Relic.setDungeonCore', hash: relicCoreTx});
    console.log(`   ✅ Relic.setDungeonCore: ${relicCoreTx}`);

    // 設定 AltarOfAscension 合約的 DungeonCore
    const altarCoreTx = await walletClient.writeContract({
      address: V25_CONTRACTS.AltarOfAscension as `0x${string}`,
      abi: CONTRACT_SET_DUNGEONCORE_ABI,
      functionName: 'setDungeonCore',
      args: [V25_CONTRACTS.DungeonCore as `0x${string}`]
    });
    transactions.push({name: 'AltarOfAscension.setDungeonCore', hash: altarCoreTx});
    console.log(`   ✅ AltarOfAscension.setDungeonCore: ${altarCoreTx}`);

    console.log('\n🔧 3. 設定 DungeonMaster 依賴...');
    
    // 設定 DungeonMaster 的 DungeonCore
    const dmCoreTx = await walletClient.writeContract({
      address: V25_CONTRACTS.DungeonMaster as `0x${string}`,
      abi: CONTRACT_SET_DUNGEONCORE_ABI,
      functionName: 'setDungeonCore',
      args: [V25_CONTRACTS.DungeonCore as `0x${string}`]
    });
    transactions.push({name: 'DungeonMaster.setDungeonCore', hash: dmCoreTx});
    console.log(`   ✅ DungeonMaster.setDungeonCore: ${dmCoreTx}`);

    // 設定 DungeonMaster 的 DungeonStorage
    const dmStorageTx = await walletClient.writeContract({
      address: V25_CONTRACTS.DungeonMaster as `0x${string}`,
      abi: DUNGEONMASTER_ABI,
      functionName: 'setDungeonStorage',
      args: [V25_CONTRACTS.DungeonStorage as `0x${string}`]
    });
    transactions.push({name: 'DungeonMaster.setDungeonStorage', hash: dmStorageTx});
    console.log(`   ✅ DungeonMaster.setDungeonStorage: ${dmStorageTx}`);

    console.log('\n🔧 4. 設定 VRF 連接...');
    
    // 設定 Hero 合約的 VRFManager
    const heroVrfTx = await walletClient.writeContract({
      address: V25_CONTRACTS.Hero as `0x${string}`,
      abi: VRF_SET_ABI,
      functionName: 'setVRFManager',
      args: [V25_CONTRACTS.VRFManager as `0x${string}`]
    });
    transactions.push({name: 'Hero.setVRFManager', hash: heroVrfTx});
    console.log(`   ✅ Hero.setVRFManager: ${heroVrfTx}`);

    // 設定 Relic 合約的 VRFManager
    const relicVrfTx = await walletClient.writeContract({
      address: V25_CONTRACTS.Relic as `0x${string}`,
      abi: VRF_SET_ABI,
      functionName: 'setVRFManager',
      args: [V25_CONTRACTS.VRFManager as `0x${string}`]
    });
    transactions.push({name: 'Relic.setVRFManager', hash: relicVrfTx});
    console.log(`   ✅ Relic.setVRFManager: ${relicVrfTx}`);

    // 設定 DungeonMaster 的 VRFManager
    const dmVrfTx = await walletClient.writeContract({
      address: V25_CONTRACTS.DungeonMaster as `0x${string}`,
      abi: DUNGEONMASTER_ABI,
      functionName: 'setVRFManager',
      args: [V25_CONTRACTS.VRFManager as `0x${string}`]
    });
    transactions.push({name: 'DungeonMaster.setVRFManager', hash: dmVrfTx});
    console.log(`   ✅ DungeonMaster.setVRFManager: ${dmVrfTx}`);

    // 設定 AltarOfAscension 的 VRFManager
    const altarVrfTx = await walletClient.writeContract({
      address: V25_CONTRACTS.AltarOfAscension as `0x${string}`,
      abi: VRF_SET_ABI,
      functionName: 'setVRFManager',
      args: [V25_CONTRACTS.VRFManager as `0x${string}`]
    });
    transactions.push({name: 'AltarOfAscension.setVRFManager', hash: altarVrfTx});
    console.log(`   ✅ AltarOfAscension.setVRFManager: ${altarVrfTx}`);

    console.log('\n⏳ 等待所有交易確認...');
    for (const tx of transactions) {
      await publicClient.waitForTransactionReceipt({ hash: tx.hash as `0x${string}` });
      console.log(`   ✅ ${tx.name} 已確認`);
    }

    console.log('\n🎉 V25 合約互連設定完成！');
    console.log('\n📝 交易摘要:');
    transactions.forEach(tx => {
      console.log(`   ${tx.name}: ${tx.hash}`);
    });

    console.log('\n💡 接下來需要手動完成:');
    console.log('   1. 更新子圖合約地址');
    console.log('   2. 重新部署子圖');
    console.log('   3. 驗證前端功能');

  } catch (error) {
    console.error('❌ 設定過程中發生錯誤:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('insufficient funds')) {
        console.log('\n💡 解決方案: 請確保錢包有足夠的 BNB 支付 gas 費用');
      } else if (error.message.includes('Ownable: caller is not the owner')) {
        console.log('\n💡 解決方案: 請使用合約 owner 的私鑰執行此腳本');
      }
    }
    
    console.log('\n📝 已完成的交易:');
    transactions.forEach(tx => {
      console.log(`   ${tx.name}: ${tx.hash}`);
    });
  }
}

// 執行設定
setupV25Contracts().catch(console.error);

export default setupV25Contracts;