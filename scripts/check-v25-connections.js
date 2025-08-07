// 檢查 V25 合約連接狀態
import { createPublicClient, http, parseAbi } from 'viem';
import { bsc } from 'viem/chains';

const ALCHEMY_RPC = 'https://bnb-mainnet.g.alchemy.com/v2/QzXiHWkNRovjd_EeDRqVfR9rApUDiXRp';

// V25 合約地址
const contracts = {
  dungeonCore: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
  hero: '0x671d937b171e2ba2c4dc23c133b07e4449f283ef',
  relic: '0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da',
  party: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
  altarOfAscension: '0xa86749237d4631ad92ba859d0b0df4770f6147ba',
  vrfManager: '0x980d224ec4d198d94f34a8af76a19c00dabe2436',
  dungeonMaster: '0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a',
};

async function checkConnections() {
  console.log('🔍 檢查 V25 合約連接狀態...\n');

  const client = createPublicClient({
    chain: bsc,
    transport: http(ALCHEMY_RPC),
  });

  // 檢查 VRF Manager 授權
  console.log('📋 檢查 VRF Manager 授權狀態:');
  
  const vrfABI = parseAbi([
    'function authorized(address) view returns (bool)',
  ]);

  const authResults = {};
  for (const [name, address] of Object.entries({
    Hero: contracts.hero,
    Relic: contracts.relic,
    AltarOfAscension: contracts.altarOfAscension,
    DungeonMaster: contracts.dungeonMaster,
  })) {
    try {
      const isAuthorized = await client.readContract({
        address: contracts.vrfManager,
        abi: vrfABI,
        functionName: 'authorized',
        args: [address],
      });
      
      authResults[name] = isAuthorized;
      console.log(`  ${name}: ${isAuthorized ? '✅ 已授權' : '❌ 未授權'}`);
      
      if (!isAuthorized) {
        console.log(`    需要執行: VRFManager.authorize(${address}, true)`);
      }
    } catch (error) {
      console.log(`  ${name}: ❓ 無法檢查授權狀態`);
    }
  }

  // 檢查合約的 DungeonCore 設置
  console.log('\n📋 檢查合約的 DungeonCore 反向連接:');
  
  const contractABI = parseAbi([
    'function dungeonCore() view returns (address)',
    'function dungeonCoreContract() view returns (address)', // Party 合約使用這個名稱
  ]);

  const coreResults = {};
  for (const [name, address] of Object.entries({
    Hero: contracts.hero,
    Relic: contracts.relic,
    Party: contracts.party,
    AltarOfAscension: contracts.altarOfAscension,
  })) {
    try {
      // Party 合約使用 dungeonCoreContract，其他使用 dungeonCore
      const functionName = name === 'Party' ? 'dungeonCoreContract' : 'dungeonCore';
      const dungeonCoreAddress = await client.readContract({
        address: address,
        abi: contractABI,
        functionName: functionName,
      });
      
      const isCorrect = dungeonCoreAddress.toLowerCase() === contracts.dungeonCore.toLowerCase();
      coreResults[name] = isCorrect;
      console.log(`  ${name}: ${isCorrect ? '✅' : '❌'} ${dungeonCoreAddress}`);
      
      if (!isCorrect) {
        console.log(`    需要執行: ${name}.setDungeonCore(${contracts.dungeonCore})`);
      }
    } catch (error) {
      console.log(`  ${name}: ❓ 無法讀取 (${error.message?.includes('not found') ? '函數不存在' : '其他錯誤'})`);
    }
  }

  console.log('\n📊 總結:');
  
  // 統計結果
  const authIssues = Object.values(authResults).filter(v => !v).length;
  const coreIssues = Object.values(coreResults).filter(v => !v).length;
  
  if (authIssues === 0 && coreIssues === 0) {
    console.log('  ✅ 所有連接都已正確設置！');
  } else {
    if (authIssues > 0) {
      console.log(`  ❌ 有 ${authIssues} 個合約需要 VRF Manager 授權`);
    }
    if (coreIssues > 0) {
      console.log(`  ❌ 有 ${coreIssues} 個合約需要設置 DungeonCore 反向連接`);
    }
    console.log('\n  💡 使用管理員錢包執行上述命令來修復這些問題');
  }
}

checkConnections().catch(console.error);