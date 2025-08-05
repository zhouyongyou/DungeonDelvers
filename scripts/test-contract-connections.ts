// 測試腳本：驗證合約連接狀態
import { createPublicClient, http, formatEther } from 'viem';
import { bsc } from 'viem/chains';
import HeroABI from '../src/abis/Hero.json';
import RelicABI from '../src/abis/Relic.json';
import PartyABI from '../src/abis/Party.json';
import DungeonMasterABI from '../src/abis/DungeonMaster.json';

const client = createPublicClient({
  chain: bsc,
  transport: http('https://bsc-dataseed.binance.org/')
});

const contracts = [
  {
    name: 'Hero',
    address: '0x6DEb5Ade2F6BEe8294A4b7f37cE372152109E2db',
    abi: HeroABI,
    getterFunction: 'dungeonCore'
  },
  {
    name: 'Relic',
    address: '0xcfB83d8545D68b796a236290b3C1bc7e4A140B11',
    abi: RelicABI,
    getterFunction: 'dungeonCore'
  },
  {
    name: 'Party',
    address: '0x18bF1eE489CD0D8bfb006b4110bfe0Bb7459bE69',
    abi: PartyABI,
    getterFunction: 'dungeonCoreContract' // Party 使用不同的函數名
  },
  {
    name: 'DungeonMaster',
    address: '0xd06470d4C6F62F6747cf02bD2b2De0981489034F',
    abi: DungeonMasterABI,
    getterFunction: 'dungeonCore'
  }
];

async function testConnections() {
  console.log('🔍 測試合約連接狀態...\n');
  
  for (const contract of contracts) {
    try {
      console.log(`📝 ${contract.name} (${contract.address})`);
      console.log(`   Getter 函數: ${contract.getterFunction}`);
      
      // 嘗試讀取 dungeonCore 地址
      const result = await client.readContract({
        address: contract.address as `0x${string}`,
        abi: contract.abi,
        functionName: contract.getterFunction
      });
      
      console.log(`   ✅ DungeonCore 地址: ${result}`);
      
      // 檢查是否支援暫停功能
      try {
        const paused = await client.readContract({
          address: contract.address as `0x${string}`,
          abi: contract.abi,
          functionName: 'paused'
        });
        console.log(`   ⏸️  暫停狀態: ${paused ? '已暫停' : '運行中'}`);
      } catch {
        console.log(`   ⚠️  不支援暫停功能`);
      }
      
    } catch (error: any) {
      console.log(`   ❌ 錯誤: ${error.message?.split('\n')[0] || error}`);
    }
    console.log('');
  }
  
  // 測試特殊情況：檢查 Party 合約的其他可能的函數名
  console.log('🔬 深入檢查 Party 合約...');
  const partyFunctions = ['dungeonCore', 'dungeonCoreContract', 'dungeonCoreAddress', 'core'];
  
  for (const funcName of partyFunctions) {
    try {
      const result = await client.readContract({
        address: '0x18bF1eE489CD0D8bfb006b4110bfe0Bb7459bE69',
        abi: PartyABI,
        functionName: funcName
      });
      console.log(`   ✅ ${funcName}(): ${result}`);
    } catch {
      console.log(`   ❌ ${funcName}(): 不存在或調用失敗`);
    }
  }
}

testConnections().catch(console.error);