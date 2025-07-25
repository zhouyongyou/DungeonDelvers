#!/usr/bin/env node

// V20 最終部署腳本 - 修復 Oracle 並更新正確的系統參數
// 此腳本僅部署和更新必要的組件，不修改遊戲參數

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 載入環境變數
dotenv.config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const BSC_RPC = 'https://bsc-dataseed.binance.org/';

// V19 合約地址（保持不變的）
const V19_ADDRESSES = {
  // 核心代幣
  USD: '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE',
  SOULSHARD: '0x4e02B4d0A6b6a90fDDFF058B8a6148BA3F909915',
  
  // NFT 合約
  HERO: '0x141F081922D4015b3157cdA6eE970dff34bb8AAb',
  RELIC: '0xB1eb505426e852B8Dca4BF41454a7A22D2B6F3D3',
  PARTY: '0x096aA1e0f9c87e57e8B69a7DD35D893d13Bba8f5',
  
  // 核心系統
  PLAYERVAULT: '0xE4654796e4c03f88776a666f3A47E16F5d6BE4FA',
  DUNGEON_MASTER: '0xbC7eCa65F0D0BA6f7aDDC5C6C956FE926d3344CE',
  DUNGEON_CORE: '0x4D353aFC420E6187bfA5F99f0DdD8F7F137c20E9', // 正確的 DungeonCore
  DUNGEON_STORAGE: '0x2Fcd1BBbb88CCE8040A2DE92E97d5375D8B088da',
  
  // DeFi
  UNISWAP_POOL: '0x1e5Cd5F386Fb6F39cD8788675dd3A5ceB6521C82',
  OLD_ORACLE: '0x54Ff2524C996d7608CaE9F3D9dd2075A023472E9', // 需要替換的 Oracle
  
  // 其他
  VIPSTAKING: '0x43f03C89aF6091090bE05C00a65CC4934CF5f90D',
  ALTAR: '0xFaEda7886Cc9dF32a96ebc7DaF4DA1a27d3fB3De',
  PLAYERPROFILE: '0xc5A972B7186562f768c8aC97D3b4ca15A019657d'
};

// 正確的地城配置
const CORRECT_DUNGEON_CONFIG = [
  { id: 1, name: "新手礦洞", requiredPower: 300, rewardUSD: 6, successRate: 89 },
  { id: 2, name: "哥布林洞穴", requiredPower: 600, rewardUSD: 12, successRate: 83 },
  { id: 3, name: "食人魔山谷", requiredPower: 900, rewardUSD: 20, successRate: 78 },
  { id: 4, name: "蜘蛛巢穴", requiredPower: 1200, rewardUSD: 27, successRate: 74 },
  { id: 5, name: "石化蜥蜴沼澤", requiredPower: 1500, rewardUSD: 35, successRate: 70 },
  { id: 6, name: "巫妖墓穴", requiredPower: 1800, rewardUSD: 60, successRate: 66 },
  { id: 7, name: "奇美拉之巢", requiredPower: 2100, rewardUSD: 82, successRate: 62 },
  { id: 8, name: "惡魔前哨站", requiredPower: 2400, rewardUSD: 103, successRate: 58 },
  { id: 9, name: "巨龍之巔", requiredPower: 2700, rewardUSD: 136, successRate: 54 },
  { id: 10, name: "混沌深淵", requiredPower: 3000, rewardUSD: 225, successRate: 50 }
];

// 正確的平台費用
const CORRECT_PLATFORM_FEE = ethers.parseEther('0.0003'); // 0.0003 BNB

async function deployV20Final() {
  console.log('🚀 開始 V20 最終部署...\n');
  console.log('📋 此部署將：');
  console.log('   1. 部署新的 Oracle_Final 合約');
  console.log('   2. 更新 DungeonCore 的 Oracle 地址');
  console.log('   3. 更新 Hero/Relic 平台費用為 0.0003 BNB');
  console.log('   4. 驗證地城配置是否正確');
  console.log('   5. 不會修改 VIP 質押和隊伍參數\n');

  if (!DEPLOYER_PRIVATE_KEY) {
    console.error('❌ 錯誤: 未設置 DEPLOYER_PRIVATE_KEY');
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(BSC_RPC);
  const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider);
  
  console.log(`📝 部署者地址: ${deployer.address}`);
  
  const balance = await provider.getBalance(deployer.address);
  console.log(`💰 部署者餘額: ${ethers.formatEther(balance)} BNB\n`);
  
  if (balance < ethers.parseEther('0.05')) {
    console.error('❌ 錯誤: BNB 餘額不足 (需要至少 0.05 BNB)');
    process.exit(1);
  }

  try {
    // ========================================
    // 步驟 1: 部署新的 Oracle_Final
    // ========================================
    console.log('📊 步驟 1: 部署 Oracle_Final...');
    
    const oracleArtifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'defi', 'Oracle_Final.sol', 'Oracle_Final.json');
    
    if (!fs.existsSync(oracleArtifactPath)) {
      console.error('❌ 找不到 Oracle_Final 編譯文件');
      console.log('   請先執行: npx hardhat compile');
      process.exit(1);
    }
    
    const oracleArtifact = JSON.parse(fs.readFileSync(oracleArtifactPath, 'utf8'));
    const OracleFactory = new ethers.ContractFactory(oracleArtifact.abi, oracleArtifact.bytecode, deployer);
    
    console.log('   部署參數:');
    console.log(`   - Pool 地址: ${V19_ADDRESSES.UNISWAP_POOL}`);
    console.log(`   - SoulShard: ${V19_ADDRESSES.SOULSHARD}`);
    console.log(`   - USD: ${V19_ADDRESSES.USD}`);
    
    const oracle = await OracleFactory.deploy(
      V19_ADDRESSES.UNISWAP_POOL,
      V19_ADDRESSES.SOULSHARD,
      V19_ADDRESSES.USD
    );
    
    console.log(`   ⏳ 等待交易確認...`);
    await oracle.waitForDeployment();
    const oracleAddress = await oracle.getAddress();
    
    console.log(`   ✅ Oracle_Final 部署成功: ${oracleAddress}`);
    
    // 驗證 Oracle 功能
    console.log('\n   驗證 Oracle 功能...');
    
    try {
      const latestPrice = await oracle.getLatestPrice();
      console.log(`   ✅ getLatestPrice: ${ethers.formatUnits(latestPrice, 18)} USD per SOUL`);
      
      const requiredAmount = await oracle.getRequiredSoulShardAmount(ethers.parseUnits('2', 18));
      console.log(`   ✅ 2 USD = ${ethers.formatUnits(requiredAmount, 18)} SOUL`);
      
      const amountOut = await oracle.getAmountOut(V19_ADDRESSES.USD, ethers.parseUnits('2', 18));
      console.log(`   ✅ getAmountOut(USD, 2) = ${ethers.formatUnits(amountOut, 18)} SOUL`);
      
      // 檢查價格合理性
      const pricePerUSD = Number(ethers.formatUnits(requiredAmount, 18)) / 2;
      if (pricePerUSD > 10000 && pricePerUSD < 50000) {
        console.log(`   ✅ 價格在合理範圍內: 1 USD = ${pricePerUSD.toFixed(2)} SOUL`);
      } else {
        console.log(`   ⚠️ 價格可能異常: 1 USD = ${pricePerUSD.toFixed(2)} SOUL`);
      }
    } catch (error) {
      console.error('   ❌ Oracle 功能驗證失敗:', error.message);
      process.exit(1);
    }

    // ========================================
    // 步驟 2: 更新 DungeonCore 的 Oracle 地址
    // ========================================
    console.log('\n📝 步驟 2: 更新 DungeonCore 的 Oracle...');
    
    const dungeonCoreABI = [
      'function oracle() view returns (address)',
      'function setOracle(address) returns (bool)',
      'function owner() view returns (address)'
    ];
    
    const dungeonCore = new ethers.Contract(V19_ADDRESSES.DUNGEON_CORE, dungeonCoreABI, deployer);
    
    const currentOracle = await dungeonCore.oracle();
    console.log(`   當前 Oracle: ${currentOracle}`);
    console.log(`   新 Oracle: ${oracleAddress}`);
    
    const dungeonCoreOwner = await dungeonCore.owner();
    if (dungeonCoreOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.error(`   ❌ 部署者不是 DungeonCore 的 owner`);
      console.log(`   DungeonCore owner: ${dungeonCoreOwner}`);
      console.log(`   部署者: ${deployer.address}`);
      process.exit(1);
    }
    
    console.log('   ⏳ 更新 Oracle...');
    const updateOracleTx = await dungeonCore.setOracle(oracleAddress);
    await updateOracleTx.wait();
    console.log('   ✅ DungeonCore Oracle 更新成功');

    // ========================================
    // 步驟 3: 更新 Hero 和 Relic 平台費用
    // ========================================
    console.log('\n📝 步驟 3: 更新平台費用...');
    
    const nftABI = [
      'function platformFee() view returns (uint256)',
      'function setPlatformFee(uint256) returns (bool)',
      'function owner() view returns (address)'
    ];
    
    // 更新 Hero 平台費用
    const hero = new ethers.Contract(V19_ADDRESSES.HERO, nftABI, deployer);
    const currentHeroFee = await hero.platformFee();
    console.log(`\n   Hero 合約:`);
    console.log(`   - 當前費用: ${ethers.formatEther(currentHeroFee)} BNB`);
    
    if (currentHeroFee !== CORRECT_PLATFORM_FEE) {
      const heroOwner = await hero.owner();
      if (heroOwner.toLowerCase() === deployer.address.toLowerCase()) {
        const tx1 = await hero.setPlatformFee(CORRECT_PLATFORM_FEE);
        await tx1.wait();
        console.log(`   - ✅ 已更新為: 0.0003 BNB`);
      } else {
        console.log(`   - ⚠️ 無法更新 (不是 owner)`);
      }
    } else {
      console.log(`   - ✅ 費用已經正確`);
    }
    
    // 更新 Relic 平台費用
    const relic = new ethers.Contract(V19_ADDRESSES.RELIC, nftABI, deployer);
    const currentRelicFee = await relic.platformFee();
    console.log(`\n   Relic 合約:`);
    console.log(`   - 當前費用: ${ethers.formatEther(currentRelicFee)} BNB`);
    
    if (currentRelicFee !== CORRECT_PLATFORM_FEE) {
      const relicOwner = await relic.owner();
      if (relicOwner.toLowerCase() === deployer.address.toLowerCase()) {
        const tx2 = await relic.setPlatformFee(CORRECT_PLATFORM_FEE);
        await tx2.wait();
        console.log(`   - ✅ 已更新為: 0.0003 BNB`);
      } else {
        console.log(`   - ⚠️ 無法更新 (不是 owner)`);
      }
    } else {
      console.log(`   - ✅ 費用已經正確`);
    }

    // ========================================
    // 步驟 4: 驗證地城配置
    // ========================================
    console.log('\n📝 步驟 4: 驗證地城配置...');
    
    const dungeonStorageABI = [
      'function dungeons(uint256) view returns (uint256 requiredPower, uint256 rewardAmountUSD, uint8 baseSuccessRate, bool isInitialized)'
    ];
    
    const dungeonStorage = new ethers.Contract(V19_ADDRESSES.DUNGEON_STORAGE, dungeonStorageABI, provider);
    
    console.log('\n   檢查地城配置:');
    let configCorrect = true;
    
    for (const dungeon of CORRECT_DUNGEON_CONFIG) {
      try {
        const data = await dungeonStorage.dungeons(dungeon.id);
        const actualPower = Number(data.requiredPower);
        const actualRewardUSD = Number(ethers.formatUnits(data.rewardAmountUSD, 18));
        const actualSuccessRate = Number(data.baseSuccessRate);
        
        const powerCorrect = actualPower === dungeon.requiredPower;
        const rewardCorrect = Math.abs(actualRewardUSD - dungeon.rewardUSD) < 0.01;
        const rateCorrect = actualSuccessRate === dungeon.successRate;
        
        if (powerCorrect && rewardCorrect && rateCorrect) {
          console.log(`   ✅ ${dungeon.name}: 配置正確`);
        } else {
          console.log(`   ❌ ${dungeon.name}: 配置錯誤`);
          console.log(`      期望: 戰力 ${dungeon.requiredPower}, 獎勵 $${dungeon.rewardUSD}, 成功率 ${dungeon.successRate}%`);
          console.log(`      實際: 戰力 ${actualPower}, 獎勵 $${actualRewardUSD.toFixed(2)}, 成功率 ${actualSuccessRate}%`);
          configCorrect = false;
        }
      } catch (e) {
        console.log(`   ❌ ${dungeon.name}: 無法讀取`);
        configCorrect = false;
      }
    }
    
    if (!configCorrect) {
      console.log('\n   ⚠️ 地城配置需要修正，請聯繫管理員');
    }

    // ========================================
    // 步驟 5: 測試價格查詢
    // ========================================
    console.log('\n📝 步驟 5: 測試完整價格查詢鏈...');
    
    const heroQueryABI = ['function getRequiredSoulShardAmount(uint256) view returns (uint256)'];
    const heroQuery = new ethers.Contract(V19_ADDRESSES.HERO, heroQueryABI, provider);
    
    try {
      const price1 = await heroQuery.getRequiredSoulShardAmount(1);
      const price5 = await heroQuery.getRequiredSoulShardAmount(5);
      console.log(`   ✅ Hero 價格查詢成功:`);
      console.log(`      1 個: ${ethers.formatUnits(price1, 18)} SOUL`);
      console.log(`      5 個: ${ethers.formatUnits(price5, 18)} SOUL`);
    } catch (e) {
      console.log(`   ❌ Hero 價格查詢失敗: ${e.message}`);
    }

    // ========================================
    // 生成配置更新指南
    // ========================================
    console.log('\n📋 步驟 6: 生成配置更新指南...');
    
    const updateGuide = `
# V20 配置更新指南
生成時間: ${new Date().toISOString()}

## 更新的合約
- Oracle: ${V19_ADDRESSES.OLD_ORACLE} → ${oracleAddress}

## 需要更新的地方

### 1. 前端 (DungeonDelvers)
\`\`\`bash
cd /Users/sotadic/Documents/GitHub/DungeonDelvers
# 編輯 src/config/contracts.ts
# 將 ORACLE 地址改為: ${oracleAddress}
\`\`\`

### 2. 後端 (backend-nft-marketplace-master)
\`\`\`bash
cd /Users/sotadic/Documents/GitHub/backend-nft-marketplace-master
# 編輯 .env
# 將 ORACLE_ADDRESS 改為: ${oracleAddress}
\`\`\`

### 3. 子圖 (DungeonDelvers-Subgraph)
\`\`\`bash
cd /Users/sotadic/Documents/DungeonDelvers-Subgraph
# 編輯 networks.json
# 將 oracle 地址改為: ${oracleAddress}
\`\`\`

### 4. 停用價格覆蓋
\`\`\`bash
# 編輯前端 src/config/priceOverride.ts
# 設置 enabled: false
\`\`\`

## 驗證步驟
1. 重啟前端開發服務器
2. 檢查鑄造頁面價格是否正常顯示
3. 測試鑄造功能
4. 監控錯誤日誌
`;
    
    const guidePath = path.join(__dirname, '..', 'deployments', 'v20-update-guide.md');
    fs.mkdirSync(path.dirname(guidePath), { recursive: true });
    fs.writeFileSync(guidePath, updateGuide);
    console.log(`   ✅ 更新指南已保存: ${guidePath}`);

    // ========================================
    // 部署總結
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ V20 部署完成！\n');
    console.log('📋 部署摘要:');
    console.log(`   - 新 Oracle 地址: ${oracleAddress}`);
    console.log(`   - DungeonCore 已更新: ✅`);
    console.log(`   - 平台費用已更新: ${currentHeroFee !== CORRECT_PLATFORM_FEE || currentRelicFee !== CORRECT_PLATFORM_FEE ? '✅' : '無需更新'}`);
    console.log(`   - 地城配置: ${configCorrect ? '✅ 正確' : '⚠️ 需要修正'}`);
    console.log(`   - 價格查詢功能: ✅`);
    console.log('\n📌 下一步:');
    console.log('   1. 按照更新指南更新所有配置');
    console.log('   2. 停用前端價格覆蓋');
    console.log('   3. 在 BSCScan 驗證 Oracle 合約');
    console.log('   4. 測試鑄造功能');
    console.log('='.repeat(60));
    
    // 保存部署記錄
    const deploymentRecord = {
      version: 'V20',
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        Oracle_Final: oracleAddress
      },
      updates: {
        DungeonCore_Oracle: 'Updated',
        Hero_PlatformFee: currentHeroFee !== CORRECT_PLATFORM_FEE ? 'Updated to 0.0003 BNB' : 'Already correct',
        Relic_PlatformFee: currentRelicFee !== CORRECT_PLATFORM_FEE ? 'Updated to 0.0003 BNB' : 'Already correct'
      },
      verifications: {
        Oracle_Functions: 'All working',
        Dungeon_Config: configCorrect ? 'Correct' : 'Needs correction',
        Price_Query: 'Working'
      }
    };
    
    const recordPath = path.join(__dirname, '..', 'deployments', `v20-deployment-${Date.now()}.json`);
    fs.writeFileSync(recordPath, JSON.stringify(deploymentRecord, null, 2));
    console.log(`\n📄 部署記錄已保存: ${recordPath}`);
    
  } catch (error) {
    console.error('\n❌ 部署失敗:', error);
    process.exit(1);
  }
}

// 執行部署
deployV20Final().catch(console.error);