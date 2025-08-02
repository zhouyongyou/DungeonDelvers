#!/usr/bin/env node

/**
 * V25 完整部署腳本 - 順序執行版本
 * 
 * 修復所有並行交易問題，確保所有交易順序執行
 * 
 * 使用方式：
 * npx hardhat run scripts/active/v25-deploy-complete-sequential.js --network bsc
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// ======================== 配置區域 ========================

// 部署配置
const DEPLOYMENT_CONFIG = {
  // 是否部署新的 Token 合約（生產環境通常設為 false）
  deployNewTokens: false,
  
  // 現有合約地址（如果不部署新的）
  existingContracts: {
    SOULSHARD: process.env.SOULSHARD_ADDRESS || '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
    // ORACLE: 現在總是重新部署
    UNISWAP_POOL: process.env.UNISWAP_POOL || '0x1e5Cd5F386Fb6F39cD8788675dd3A5ceB6521C82'
  },
  
  // 外部地址
  externalAddresses: {
    USDT: process.env.USDT_ADDRESS || '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE', // BSC USDT
  },
  
  // 部署選項
  options: {
    autoVerify: true,        // 自動驗證合約
    setupConnections: true,  // 自動設置合約連接
    initializeParams: true,  // 自動初始化參數
    generateDocs: true,      // 生成部署文檔
  }
};

// 合約部署順序（依賴關係）
const DEPLOYMENT_ORDER = [
  // 代幣合約
  ...(DEPLOYMENT_CONFIG.deployNewTokens ? ['Test_SoulShard'] : []),
  'Oracle_V22_Adaptive', // Oracle 現在總是重新部署
  
  // 核心合約
  'PlayerVault',
  'DungeonCore',
  'DungeonStorage',
  'DungeonMasterV2_Fixed',
  
  // NFT 合約
  'Hero',
  'Relic',
  'PartyV3',
  
  // 功能合約
  'VIPStaking',
  'PlayerProfile',
  'AltarOfAscensionV2Fixed'
];

// 合約名稱映射
const CONTRACT_NAME_MAP = {
  'Oracle_V22_Adaptive': 'ORACLE',
  'Test_SoulShard': 'SOULSHARD',
  'PlayerVault': 'PLAYERVAULT',
  'DungeonCore': 'DUNGEONCORE',
  'DungeonStorage': 'DUNGEONSTORAGE',
  'DungeonMasterV2_Fixed': 'DUNGEONMASTER',
  'Hero': 'HERO',
  'Relic': 'RELIC',
  'PartyV3': 'PARTY',
  'VIPStaking': 'VIPSTAKING',
  'PlayerProfile': 'PLAYERPROFILE',
  'AltarOfAscensionV2Fixed': 'ALTAROFASCENSION'
};

// 遊戲參數配置
const GAME_PARAMS = {
  // NFT 鑄造價格（USD）
  mintPriceUSD: 2,
  
  // 地城配置
  dungeons: [
    { id: 1, name: "新手礦洞", requiredPower: 300, rewardUSD: 6, successRate: 89 },
    { id: 2, name: "哥布林洞穴", requiredPower: 600, rewardUSD: 12, successRate: 84 },
    { id: 3, name: "食人魔山谷", requiredPower: 900, rewardUSD: 20, successRate: 79 },
    { id: 4, name: "蜘蛛巢穴", requiredPower: 1200, rewardUSD: 33, successRate: 74 },
    { id: 5, name: "石化蜥蜴沼澤", requiredPower: 1500, rewardUSD: 52, successRate: 69 },
    { id: 6, name: "巫妖墓穴", requiredPower: 1800, rewardUSD: 78, successRate: 64 },
    { id: 7, name: "奇美拉之巢", requiredPower: 2100, rewardUSD: 113, successRate: 59 },
    { id: 8, name: "惡魔前哨站", requiredPower: 2400, rewardUSD: 156, successRate: 54 },
    { id: 9, name: "巨龍之巔", requiredPower: 2700, rewardUSD: 209, successRate: 49 },
    { id: 10, name: "混沌深淵", requiredPower: 3000, rewardUSD: 225, successRate: 44 }
  ],
  
  // 基礎 URI
  baseURIs: {
    HERO: process.env.HERO_BASE_URI || 'https://dungeon-delvers-metadata-server.onrender.com/api/hero/',
    RELIC: process.env.RELIC_BASE_URI || 'https://dungeon-delvers-metadata-server.onrender.com/api/relic/',
    PARTY: process.env.PARTY_BASE_URI || 'https://dungeon-delvers-metadata-server.onrender.com/api/party/',
    VIPSTAKING: process.env.VIP_BASE_URI || 'https://dungeon-delvers-metadata-server.onrender.com/api/vip/',
    PLAYERPROFILE: process.env.PROFILE_BASE_URI || 'https://dungeon-delvers-metadata-server.onrender.com/api/profile/'
  },
  
  // 合約 URI（OpenSea 元數據）
  contractURIs: {
    HERO: process.env.HERO_CONTRACT_URI || 'https://www.dungeondelvers.xyz/metadata/hero-collection.json',
    RELIC: process.env.RELIC_CONTRACT_URI || 'https://www.dungeondelvers.xyz/metadata/relic-collection.json',
    PARTY: process.env.PARTY_CONTRACT_URI || 'https://www.dungeondelvers.xyz/metadata/party-collection.json',
    VIPSTAKING: process.env.VIP_CONTRACT_URI || 'https://www.dungeondelvers.xyz/metadata/vip-staking-collection.json',
    PLAYERPROFILE: process.env.PROFILE_CONTRACT_URI || 'https://www.dungeondelvers.xyz/metadata/player-profile-collection.json'
  },
  
  // 其他參數
  partyCreationFee: '0.001', // BNB
  vipUnstakeCooldown: 604800, // 7 天（生產環境）
  // vipUnstakeCooldown: 15, // 15 秒（測試環境）
};

// ======================== 主部署類 ========================

class V25Deployer {
  constructor() {
    this.contracts = {};
    this.verificationData = [];
    this.startBlock = null;
    this.deploymentLog = [];
    this.errors = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      info: `${colors.blue}[INFO]${colors.reset}`,
      success: `${colors.green}[SUCCESS]${colors.reset}`,
      error: `${colors.red}[ERROR]${colors.reset}`,
      warning: `${colors.yellow}[WARNING]${colors.reset}`
    };
    
    const logMessage = `${prefix[type]} ${timestamp} ${message}`;
    console.log(logMessage);
    
    // 記錄到部署日誌
    this.deploymentLog.push({
      timestamp: new Date().toISOString(),
      type,
      message
    });
  }

  async deploy() {
    console.log(`${colors.bright}
==================================================
🚀 V25 完整部署腳本 - 順序執行版本
==================================================
${colors.reset}`);

    try {
      // 獲取部署者
      const [deployer] = await hre.ethers.getSigners();
      this.deployer = deployer;
      
      // 1. 前置檢查
      await this.preDeploymentChecks();
      
      // 2. 載入現有合約（如果有）
      await this.loadExistingContracts();
      
      // 3. 獲取起始區塊
      this.startBlock = await hre.ethers.provider.getBlockNumber();
      this.log(`起始區塊: ${this.startBlock}`, 'info');
      
      // 4. 部署合約
      await this.deployContracts();
      
      // 5. 設置合約連接
      if (DEPLOYMENT_CONFIG.options.setupConnections) {
        await this.setupConnections();
      }
      
      // 6. 初始化參數
      if (DEPLOYMENT_CONFIG.options.initializeParams) {
        await this.initializeParameters();
      }
      
      // 7. 生成配置文件
      await this.generateConfigs();
      
      // 8. 驗證部署
      await this.verifyDeployment();
      
      // 9. 自動驗證合約（如果啟用）
      if (DEPLOYMENT_CONFIG.options.autoVerify) {
        await this.autoVerifyContracts();
      }
      
      // 10. 生成部署報告
      await this.generateDeploymentReport();
      
      this.log('\n✅ V25 部署完成！', 'success');
      
    } catch (error) {
      this.log(`部署失敗: ${error.message}`, 'error');
      this.errors.push(error);
      await this.generateErrorReport();
      process.exit(1);
    }
  }

  async preDeploymentChecks() {
    this.log('執行部署前檢查...', 'info');
    
    // 檢查網路
    const network = await hre.ethers.provider.getNetwork();
    if (network.chainId !== 56n) {
      throw new Error(`錯誤的網路 (期望 BSC Mainnet 56, 實際 ${network.chainId})`);
    }
    
    // 檢查餘額
    const balance = await hre.ethers.provider.getBalance(this.deployer.address);
    const balanceInBNB = hre.ethers.formatEther(balance);
    this.log(`部署錢包: ${this.deployer.address}`, 'info');
    this.log(`錢包餘額: ${balanceInBNB} BNB`, 'info');
    
    if (parseFloat(balanceInBNB) < 0.5) {
      throw new Error('BNB 餘額不足 (建議至少 0.5 BNB)');
    }
    
    // 檢查環境變數
    if (!process.env.BSCSCAN_API_KEY) {
      this.log('警告: BSCSCAN_API_KEY 未設置，無法自動驗證合約', 'warning');
    }
  }

  async loadExistingContracts() {
    if (!DEPLOYMENT_CONFIG.deployNewTokens) {
      this.log('\n載入現有合約地址...', 'info');
      for (const [name, address] of Object.entries(DEPLOYMENT_CONFIG.existingContracts)) {
        this.contracts[name] = { address };
        this.log(`✅ 使用現有 ${name}: ${address}`, 'success');
      }
    }
  }

  async deployContracts() {
    this.log('\n開始部署合約...', 'info');
    
    for (const contractName of DEPLOYMENT_ORDER) {
      await this.deployContract(contractName);
    }
  }

  async deployContract(contractName) {
    const mappedName = CONTRACT_NAME_MAP[contractName];
    this.log(`\n部署 ${mappedName} (${contractName})...`, 'info');
    
    try {
      const ContractFactory = await hre.ethers.getContractFactory(contractName);
      
      // 根據合約類型設置構造函數參數
      const constructorArgs = this.getConstructorArgs(contractName);
      
      const contract = await ContractFactory.deploy(...constructorArgs);
      await contract.waitForDeployment();
      
      const address = await contract.getAddress();
      this.contracts[mappedName] = { 
        address, 
        contract,
        contractName: contractName
      };
      
      this.log(`✅ ${mappedName} 部署成功: ${address}`, 'success');
      
      // 保存驗證數據
      this.verificationData.push({
        name: mappedName,
        contractName: contractName,
        address,
        constructorArgs
      });
      
    } catch (error) {
      this.log(`❌ ${mappedName} 部署失敗: ${error.message}`, 'error');
      throw error;
    }
  }

  getConstructorArgs(contractName) {
    switch (contractName) {
      case 'Oracle_V22_Adaptive':
        const soulShardAddress = this.contracts.SOULSHARD ? 
          this.contracts.SOULSHARD.address : 
          DEPLOYMENT_CONFIG.existingContracts.SOULSHARD;
        
        if (!soulShardAddress) {
          throw new Error('SoulShard address not found');
        }
        
        return [
          DEPLOYMENT_CONFIG.existingContracts.UNISWAP_POOL,
          soulShardAddress,
          DEPLOYMENT_CONFIG.externalAddresses.USDT
        ];
      
      case 'Test_SoulShard':
        return [];
      
      case 'DungeonCore':
        return [
          this.deployer.address,
          DEPLOYMENT_CONFIG.externalAddresses.USDT,
          this.contracts.SOULSHARD.address
        ];
      
      default:
        return [this.deployer.address];
    }
  }

  async setupConnections() {
    this.log('\n設置合約連接...', 'info');
    
    // 順序執行以避免 nonce 衝突
    await this.setupDungeonCore();
    await this.setupSpecialConnections();
    await this.setupModules();
  }

  async setupDungeonCore() {
    this.log('\n配置 DungeonCore...', 'info');
    const dungeonCore = this.contracts.DUNGEONCORE.contract;
    
    const settings = [
      { method: 'setOracle', param: this.contracts.ORACLE.address, name: 'Oracle' },
      { method: 'setHeroContract', param: this.contracts.HERO.address, name: 'Hero' },
      { method: 'setRelicContract', param: this.contracts.RELIC.address, name: 'Relic' },
      { method: 'setPartyContract', param: this.contracts.PARTY.address, name: 'Party' },
      { method: 'setDungeonMaster', param: this.contracts.DUNGEONMASTER.address, name: 'DungeonMaster' },
      { method: 'setPlayerVault', param: this.contracts.PLAYERVAULT.address, name: 'PlayerVault' },
      { method: 'setPlayerProfile', param: this.contracts.PLAYERPROFILE.address, name: 'PlayerProfile' },
      { method: 'setVipStaking', param: this.contracts.VIPSTAKING.address, name: 'VIPStaking' },
      { method: 'setAltarOfAscension', param: this.contracts.ALTAROFASCENSION.address, name: 'AltarOfAscension' }
    ];
    
    // 順序處理以避免 nonce 衝突
    for (const setting of settings) {
      try {
        const tx = await dungeonCore[setting.method](setting.param);
        await tx.wait();
        this.log(`✅ DungeonCore.${setting.method} 成功`, 'success');
      } catch (error) {
        this.log(`❌ DungeonCore.${setting.method} 失敗: ${error.message}`, 'error');
        this.errors.push({ type: 'DungeonCore設置', setting, error });
      }
    }
  }

  async setupModules() {
    this.log('\n配置各模組...', 'info');
    
    const modulesToSetup = [
      'HERO', 'RELIC', 'PARTY', 'VIPSTAKING', 'PLAYERPROFILE', 
      'PLAYERVAULT', 'DUNGEONMASTER', 'ALTAROFASCENSION'
    ];
    
    // 順序處理以避免 nonce 衝突
    for (const moduleName of modulesToSetup) {
      const module = this.contracts[moduleName]?.contract;
      if (!module) continue;
      
      try {
        // 檢查是否有 setDungeonCore 方法
        if (module.setDungeonCore) {
          const tx = await module.setDungeonCore(this.contracts.DUNGEONCORE.address);
          await tx.wait();
          this.log(`✅ ${moduleName}.setDungeonCore 成功`, 'success');
        }
      } catch (error) {
        this.log(`⚠️ ${moduleName}.setDungeonCore: ${error.message}`, 'warning');
      }
    }
  }

  async setupSpecialConnections() {
    this.log('\n設置特殊連接...', 'info');
    
    // 1. 設置 SoulShard token（包含所有需要的合約）
    const modulesNeedingSoulShard = ['HERO', 'RELIC', 'VIPSTAKING', 'PLAYERVAULT', 'DUNGEONMASTER'];
    
    for (const moduleName of modulesNeedingSoulShard) {
      const module = this.contracts[moduleName]?.contract;
      if (!module) continue;
      
      try {
        if (module.setSoulShardToken) {
          const tx = await module.setSoulShardToken(this.contracts.SOULSHARD.address);
          await tx.wait();
          this.log(`✅ ${moduleName}.setSoulShardToken 成功`, 'success');
        }
      } catch (error) {
        this.log(`⚠️ ${moduleName}.setSoulShardToken: ${error.message}`, 'warning');
      }
    }
    
    // 2. DungeonMaster & DungeonStorage 連接
    try {
      if (this.contracts.DUNGEONMASTER?.contract && this.contracts.DUNGEONSTORAGE?.contract) {
        // 設置 DungeonMaster 的 storage
        const tx1 = await this.contracts.DUNGEONMASTER.contract.setDungeonStorage(
          this.contracts.DUNGEONSTORAGE.address
        );
        await tx1.wait();
        this.log('✅ DungeonMaster.setDungeonStorage 成功', 'success');
        
        // 設置 DungeonStorage 的 logic contract
        const tx2 = await this.contracts.DUNGEONSTORAGE.contract.setLogicContract(
          this.contracts.DUNGEONMASTER.address
        );
        await tx2.wait();
        this.log('✅ DungeonStorage.setLogicContract 成功', 'success');
      }
    } catch (error) {
      this.log(`❌ DungeonMaster/Storage 連接失敗: ${error.message}`, 'error');
      this.errors.push({ type: 'Storage連接', error });
    }
    
    // 3. 設置升星祭壇 (AltarOfAscension)
    try {
      const altar = this.contracts.ALTAROFASCENSION?.contract;
      if (altar && altar.setContracts) {
        const tx = await altar.setContracts(
          this.contracts.DUNGEONCORE.address,
          this.contracts.HERO.address,
          this.contracts.RELIC.address
        );
        await tx.wait();
        this.log('✅ AltarOfAscension.setContracts 成功', 'success');
      }
    } catch (error) {
      this.log(`❌ AltarOfAscension.setContracts 失敗: ${error.message}`, 'error');
      this.errors.push({ type: '祭壇設置', error });
    }
    
    // 4. Hero & Relic 設置祭壇地址
    for (const nftName of ['HERO', 'RELIC']) {
      try {
        const nft = this.contracts[nftName]?.contract;
        if (nft && nft.setAscensionAltarAddress) {
          const tx = await nft.setAscensionAltarAddress(this.contracts.ALTAROFASCENSION.address);
          await tx.wait();
          this.log(`✅ ${nftName}.setAscensionAltarAddress 成功`, 'success');
        }
      } catch (error) {
        this.log(`❌ ${nftName}.setAscensionAltarAddress 失敗: ${error.message}`, 'error');
        this.errors.push({ type: 'NFT祭壇設置', nftName, error });
      }
    }
    
    // 5. Party 設置 Hero 和 Relic 合約
    try {
      const party = this.contracts.PARTY?.contract;
      if (party) {
        if (party.setHeroContract) {
          const tx1 = await party.setHeroContract(this.contracts.HERO.address);
          await tx1.wait();
          this.log('✅ Party.setHeroContract 成功', 'success');
        }
        
        if (party.setRelicContract) {
          const tx2 = await party.setRelicContract(this.contracts.RELIC.address);
          await tx2.wait();
          this.log('✅ Party.setRelicContract 成功', 'success');
        }
      }
    } catch (error) {
      this.log(`❌ Party NFT 設置失敗: ${error.message}`, 'error');
      this.errors.push({ type: 'Party設置', error });
    }
    
    // 6. PlayerProfile 設置 DungeonCore
    try {
      const playerProfile = this.contracts.PLAYERPROFILE?.contract;
      if (playerProfile && playerProfile.setDungeonCore) {
        const tx = await playerProfile.setDungeonCore(this.contracts.DUNGEONCORE.address);
        await tx.wait();
        this.log('✅ PlayerProfile.setDungeonCore 成功', 'success');
      }
    } catch (error) {
      this.log(`⚠️ PlayerProfile.setDungeonCore 失敗: ${error.message}`, 'warning');
    }
    
    // 7. VIPStaking 設置 DungeonCore
    try {
      const vipStaking = this.contracts.VIPSTAKING?.contract;
      if (vipStaking && vipStaking.setDungeonCore) {
        const tx = await vipStaking.setDungeonCore(this.contracts.DUNGEONCORE.address);
        await tx.wait();
        this.log('✅ VIPStaking.setDungeonCore 成功', 'success');
      }
    } catch (error) {
      this.log(`⚠️ VIPStaking.setDungeonCore 失敗: ${error.message}`, 'warning');
    }
    
    // 8. Party 設置 DungeonCore
    try {
      const party = this.contracts.PARTY?.contract;
      if (party && party.setDungeonCore) {
        const tx = await party.setDungeonCore(this.contracts.DUNGEONCORE.address);
        await tx.wait();
        this.log('✅ Party.setDungeonCore 成功', 'success');
      }
    } catch (error) {
      this.log(`⚠️ Party.setDungeonCore 失敗: ${error.message}`, 'warning');
    }
  }

  async initializeParameters() {
    this.log('\n初始化參數...', 'info');
    
    // 順序執行以避免 nonce 衝突
    await this.setBaseURIs();
    await this.initializeDungeons();
    await this.setOtherParameters();
  }

  async setBaseURIs() {
    this.log('\n設置 BaseURI...', 'info');
    
    for (const [contractName, uri] of Object.entries(GAME_PARAMS.baseURIs)) {
      try {
        const contract = this.contracts[contractName]?.contract;
        if (contract && contract.setBaseURI) {
          const tx = await contract.setBaseURI(uri);
          await tx.wait();
          this.log(`✅ ${contractName} BaseURI 設置成功`, 'success');
        }
      } catch (error) {
        this.log(`❌ ${contractName} BaseURI 設置失敗: ${error.message}`, 'error');
        this.errors.push({ type: 'BaseURI設置', contractName, error });
      }
    }
    
    // 設置 ContractURI（可選，用於 OpenSea 集合元數據）
    this.log('\n設置 ContractURI（OpenSea 集合元數據）...', 'info');
    
    for (const [contractName, uri] of Object.entries(GAME_PARAMS.contractURIs)) {
      try {
        const contract = this.contracts[contractName]?.contract;
        if (contract && contract.setContractURI) {
          const tx = await contract.setContractURI(uri);
          await tx.wait();
          this.log(`✅ ${contractName} ContractURI 設置成功`, 'success');
        }
      } catch (error) {
        this.log(`⚠️ ${contractName} ContractURI 設置失敗: ${error.message}`, 'warning');
        // ContractURI 是可選的，所以使用 warning 而非 error
      }
    }
  }

  async initializeDungeons() {
    this.log('\n初始化地城...', 'info');
    
    const dungeonMaster = this.contracts.DUNGEONMASTER?.contract;
    if (!dungeonMaster) {
      this.log('⚠️ DungeonMaster 未部署，跳過地城初始化', 'warning');
      return;
    }
    
    for (const dungeon of GAME_PARAMS.dungeons) {
      try {
        // 使用 DungeonMaster 的 setDungeon 函數 (不包含 name 參數)
        const tx = await dungeonMaster.setDungeon(
          dungeon.id,
          dungeon.requiredPower,
          hre.ethers.parseUnits(dungeon.rewardUSD.toString(), 18),
          dungeon.successRate
        );
        await tx.wait();
        this.log(`✅ 地城 ${dungeon.id} - ${dungeon.name} 設置成功`, 'success');
      } catch (error) {
        this.log(`❌ 地城 ${dungeon.id} 設置失敗: ${error.message}`, 'error');
        this.errors.push({ type: '地城設置', dungeonId: dungeon.id, error });
      }
    }
  }

  async setOtherParameters() {
    this.log('\n設置其他參數...', 'info');
    
    // 1. 設置 Party 創建費用
    try {
      const party = this.contracts.PARTY?.contract;
      if (party && party.setPlatformFee) {
        const tx = await party.setPlatformFee(hre.ethers.parseEther(GAME_PARAMS.partyCreationFee));
        await tx.wait();
        this.log(`✅ Party 創建費用設置為 ${GAME_PARAMS.partyCreationFee} BNB`, 'success');
      }
    } catch (error) {
      this.log(`❌ Party 創建費用設置失敗: ${error.message}`, 'error');
    }
    
    // 2. 設置 VIP 解鎖冷卻期
    try {
      const vipStaking = this.contracts.VIPSTAKING?.contract;
      if (vipStaking && vipStaking.setUnstakeCooldown) {
        const tx = await vipStaking.setUnstakeCooldown(GAME_PARAMS.vipUnstakeCooldown);
        await tx.wait();
        const days = GAME_PARAMS.vipUnstakeCooldown / 86400;
        this.log(`✅ VIP 解鎖冷卻期設置為 ${days} 天`, 'success');
      }
    } catch (error) {
      this.log(`❌ VIP 冷卻期設置失敗: ${error.message}`, 'error');
    }
  }

  async generateConfigs() {
    this.log('\n生成配置文件...', 'info');
    
    // 生成 v25-config.js
    const v25Config = {
      version: 'V25',
      lastUpdated: new Date().toISOString(),
      network: 'BSC Mainnet',
      deployer: this.deployer.address,
      startBlock: this.startBlock,
      contracts: {},
      deploymentOptions: DEPLOYMENT_CONFIG,
      gameParams: GAME_PARAMS
    };
    
    for (const [name, data] of Object.entries(this.contracts)) {
      v25Config.contracts[name] = {
        address: data.address,
        deploymentBlock: this.startBlock,
        contractName: data.contractName || name
      };
    }
    
    const configPath = path.join(__dirname, '../../config/v25-config.js');
    const configContent = `// V25 部署配置 - ${new Date().toISOString()}
// 自動生成，請勿手動修改

module.exports = ${JSON.stringify(v25Config, null, 2)};`;
    
    fs.writeFileSync(configPath, configContent);
    this.log(`✅ 配置文件已生成: ${configPath}`, 'success');
    
    // 生成驗證腳本數據
    const verificationPath = path.join(__dirname, '../deployments', `v25-verification-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(verificationPath), { recursive: true });
    fs.writeFileSync(verificationPath, JSON.stringify({
      version: 'V25',
      timestamp: new Date().toISOString(),
      network: 'BSC Mainnet',
      verificationData: this.verificationData
    }, null, 2));
    this.log(`✅ 驗證數據已保存: ${verificationPath}`, 'success');
  }

  async verifyDeployment() {
    this.log('\n驗證部署...', 'info');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const [name, data] of Object.entries(this.contracts)) {
      if (data.address) {
        const code = await hre.ethers.provider.getCode(data.address);
        if (code !== '0x') {
          successCount++;
          this.log(`✅ ${name} 部署驗證通過`, 'success');
        } else {
          failCount++;
          this.log(`❌ ${name} 部署驗證失敗`, 'error');
        }
      }
    }
    
    this.log(`\n部署驗證結果: ${successCount} 成功, ${failCount} 失敗`, 'info');
  }

  async autoVerifyContracts() {
    if (!process.env.BSCSCAN_API_KEY) {
      this.log('\n跳過自動驗證（未設置 BSCSCAN_API_KEY）', 'warning');
      return;
    }
    
    this.log('\n開始自動驗證合約...', 'info');
    
    // 等待 30 秒讓 BSCScan 索引
    this.log('等待 30 秒讓 BSCScan 索引...', 'info');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    for (const data of this.verificationData) {
      try {
        this.log(`\n驗證 ${data.name}...`, 'info');
        await hre.run("verify:verify", {
          address: data.address,
          constructorArguments: data.constructorArgs,
        });
        this.log(`✅ ${data.name} 驗證成功`, 'success');
      } catch (error) {
        if (error.message.includes("already verified")) {
          this.log(`⚠️ ${data.name} 已經驗證過`, 'warning');
        } else {
          this.log(`❌ ${data.name} 驗證失敗: ${error.message}`, 'error');
        }
      }
    }
  }

  async generateDeploymentReport() {
    const reportPath = path.join(__dirname, '../deployments', `v25-deployment-report-${Date.now()}.md`);
    
    let report = `# V25 部署報告

生成時間: ${new Date().toLocaleString()}

## 部署概況

- **網路**: BSC Mainnet
- **部署者**: ${this.deployer.address}
- **起始區塊**: ${this.startBlock}
- **錯誤數量**: ${this.errors.length}

## 合約地址

| 合約 | 地址 | 狀態 |
|------|------|------|
`;

    for (const [name, data] of Object.entries(this.contracts)) {
      const status = data.contract ? '✅ 已部署' : '📌 使用現有';
      report += `| ${name} | \`${data.address}\` | ${status} |\n`;
    }

    report += `
### 地城配置
`;

    for (const dungeon of GAME_PARAMS.dungeons) {
      report += `- ${dungeon.id}. ${dungeon.name}: ${dungeon.requiredPower} 力量, $${dungeon.rewardUSD} 獎勵, ${dungeon.successRate}% 成功率\n`;
    }

    if (this.errors.length > 0) {
      report += `
## 錯誤報告
`;
      for (const error of this.errors) {
        report += `- **${error.type || '未知錯誤'}**: ${error.error?.message || error.message || '未知錯誤信息'}\n`;
      }
    }

    report += `
## 下一步行動

1. 執行合約驗證: \`npx hardhat run scripts/active/v25-verify-contracts.js --network bsc\`
2. 同步配置到各項目: \`node scripts/active/v25-sync-all.js\`
3. 部署子圖: \`cd DDgraphql/dungeon-delvers && npm run deploy\`
4. 在前端測試功能

## 重要地址

- **DungeonCore**: \`${this.contracts.DUNGEONCORE?.address}\`
- **Hero**: \`${this.contracts.HERO?.address}\`
- **Relic**: \`${this.contracts.RELIC?.address}\`
- **SoulShard**: \`${this.contracts.SOULSHARD?.address}\`
`;

    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, report);
    this.log(`\n✅ 部署報告已生成: ${reportPath}`, 'success');
  }

  async generateErrorReport() {
    if (this.errors.length === 0) return;
    
    const errorPath = path.join(__dirname, '../deployments', `v25-error-report-${Date.now()}.json`);
    
    fs.mkdirSync(path.dirname(errorPath), { recursive: true });
    fs.writeFileSync(errorPath, JSON.stringify({
      version: 'V25',
      timestamp: new Date().toISOString(),
      errors: this.errors,
      deploymentLog: this.deploymentLog
    }, null, 2));
    
    this.log(`\n❌ 錯誤報告已生成: ${errorPath}`, 'error');
  }
}

// ======================== 執行部署 ========================

async function main() {
  const deployer = new V25Deployer();
  await deployer.deploy();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });