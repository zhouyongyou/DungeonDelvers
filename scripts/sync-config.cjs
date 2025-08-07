#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * V25 配置同步工具 - 從 .env.v25 統一同步所有配置
 * 
 * 功能：
 * 1. 從 .env.v25 讀取配置
 * 2. 生成前端 .env 文件
 * 3. 生成後端配置文件
 * 4. 生成子圖配置文件
 * 5. 驗證所有配置一致性
 */

class ConfigSyncManager {
  constructor() {
    this.sourceFile = path.join(__dirname, '..', '.env.v25');
    this.config = {};
    
    console.log('🔧 V25 配置同步管理器');
    console.log('=' .repeat(50));
  }

  // 讀取源配置
  loadSourceConfig() {
    if (!fs.existsSync(this.sourceFile)) {
      throw new Error(`配置源文件不存在: ${this.sourceFile}`);
    }

    console.log('📖 讀取源配置文件...');
    const content = fs.readFileSync(this.sourceFile, 'utf8');
    
    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [key, value] = line.split('=', 2);
        this.config[key.trim()] = value.trim();
      }
    });

    console.log(`✅ 載入 ${Object.keys(this.config).length} 個配置項`);
    return this;
  }

  // 生成前端 .env
  generateFrontendEnv() {
    console.log('\n🎨 生成前端配置...');
    
    const envPath = path.join(__dirname, '..', '.env');
    const localEnvPath = path.join(__dirname, '..', '.env.local');
    
    // 生成主 .env
    let envContent = `# V25 前端配置 - 自動生成於 ${new Date().toISOString()}
# 來源：.env.v25

`;
    
    Object.entries(this.config).forEach(([key, value]) => {
      if (key.startsWith('VITE_')) {
        envContent += `${key}=${value}\n`;
      }
    });

    fs.writeFileSync(envPath, envContent);
    console.log(`✅ 生成 ${envPath}`);

    // 同步 .env.local
    if (fs.existsSync(localEnvPath)) {
      this.updateLocalEnv(localEnvPath);
    }
    
    return this;
  }

  // 更新 .env.local
  updateLocalEnv(localEnvPath) {
    console.log('🔄 更新 .env.local...');
    
    let content = fs.readFileSync(localEnvPath, 'utf8');
    
    // 更新子圖相關配置
    const updates = {
      'VITE_THE_GRAPH_STUDIO_API_URL': this.config.VITE_SUBGRAPH_URL,
      'REACT_APP_SUBGRAPH_URL': this.config.VITE_SUBGRAPH_URL,
      'VITE_THE_GRAPH_DECENTRALIZED_API_URL': this.config.VITE_SUBGRAPH_DECENTRALIZED_URL
    };

    // 更新合約地址
    Object.entries(this.config).forEach(([key, value]) => {
      if (key.endsWith('_ADDRESS')) {
        const reactKey = key.replace('VITE_', 'REACT_APP_').replace('_ADDRESS', '_CONTRACT');
        updates[reactKey] = value;
      }
    });

    // 應用更新
    Object.entries(updates).forEach(([key, newValue]) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (content.match(regex)) {
        content = content.replace(regex, `${key}=${newValue}`);
        console.log(`  ✅ 更新 ${key}`);
      }
    });

    fs.writeFileSync(localEnvPath, content);
    console.log(`✅ 更新 ${localEnvPath}`);
  }

  // 生成後端配置
  generateBackendConfig() {
    console.log('\n🔧 生成後端配置...');
    
    const backendConfigPath = '/Users/sotadic/Documents/dungeon-delvers-metadata-server/config/contracts.json';
    
    const backendConfig = {
      network: "bsc",
      chainId: 56,
      rpcUrl: this.config.VITE_RPC_URL || "https://bsc-dataseed.binance.org/",
      contracts: {
        dungeonStorage: this.config.VITE_DUNGEONSTORAGE_ADDRESS,
        dungeonMaster: this.config.VITE_DUNGEONMASTER_ADDRESS,
        hero: this.config.VITE_HERO_ADDRESS,
        relic: this.config.VITE_RELIC_ADDRESS,
        altarOfAscension: this.config.VITE_ALTAROFASCENSION_ADDRESS,
        party: this.config.VITE_PARTY_ADDRESS,
        dungeonCore: this.config.VITE_DUNGEONCORE_ADDRESS,
        playerVault: this.config.VITE_PLAYERVAULT_ADDRESS,
        playerProfile: this.config.VITE_PLAYERPROFILE_ADDRESS,
        vipStaking: this.config.VITE_VIPSTAKING_ADDRESS,
        oracle: this.config.VITE_ORACLE_ADDRESS,
        soulShard: this.config.VITE_SOULSHARD_ADDRESS,
        usd: this.config.VITE_USD_ADDRESS,
        uniswapPool: this.config.VITE_UNISWAP_POOL_ADDRESS,
        vrfManagerV2Plus: this.config.VITE_VRF_MANAGER_V2PLUS_ADDRESS
      },
      vrf: {
        coordinatorAddress: "0xDA3b641D438362C440Ac5458c57e00a712b66700",
        subscriptionId: this.config.VITE_VRF_SUBSCRIPTION_ID,
        keyHash: this.config.VITE_VRF_KEY_HASH,
        callbackGasLimit: this.config.VITE_VRF_CALLBACK_GAS_LIMIT,
        requestConfirmations: this.config.VITE_VRF_REQUEST_CONFIRMATIONS,
        numWords: this.config.VITE_VRF_NUM_WORDS,
        mode: "subscription"
      },
      subgraph: {
        url: this.config.VITE_SUBGRAPH_URL,
        version: this.config.VITE_SUBGRAPH_VERSION
      },
      deployment: {
        version: this.config.VITE_DEPLOYMENT_VERSION,
        date: this.config.VITE_DEPLOYMENT_DATE,
        startBlock: this.config.VITE_SUBGRAPH_START_BLOCK
      }
    };

    try {
      fs.writeFileSync(backendConfigPath, JSON.stringify(backendConfig, null, 2));
      console.log(`✅ 生成 ${backendConfigPath}`);
    } catch (error) {
      console.log(`⚠️  後端配置路徑不存在，跳過生成`);
    }

    return this;
  }

  // 生成子圖配置
  generateSubgraphConfig() {
    console.log('\n📊 生成子圖配置...');
    
    const sharedConfigPath = path.join(__dirname, '..', 'shared-config.json');
    
    try {
      const sharedConfig = JSON.parse(fs.readFileSync(sharedConfigPath, 'utf8'));
      
      // 更新子圖配置
      sharedConfig.services.subgraph.url = this.config.VITE_SUBGRAPH_URL;
      
      // 更新合約地址
      sharedConfig.contracts = {
        hero: this.config.VITE_HERO_ADDRESS,
        relic: this.config.VITE_RELIC_ADDRESS,
        party: this.config.VITE_PARTY_ADDRESS,
        vipStaking: this.config.VITE_VIPSTAKING_ADDRESS,
        playerProfile: this.config.VITE_PLAYERPROFILE_ADDRESS,
        dungeonCore: this.config.VITE_DUNGEONCORE_ADDRESS,
        dungeonMaster: this.config.VITE_DUNGEONMASTER_ADDRESS,
        oracle: this.config.VITE_ORACLE_ADDRESS,
        playerVault: this.config.VITE_PLAYERVAULT_ADDRESS,
        altarOfAscension: this.config.VITE_ALTAROFASCENSION_ADDRESS,
        dungeonStorage: this.config.VITE_DUNGEONSTORAGE_ADDRESS
      };
      
      sharedConfig.tokens = {
        soulShard: this.config.VITE_SOULSHARD_ADDRESS,
        usd: this.config.VITE_USD_ADDRESS
      };

      fs.writeFileSync(sharedConfigPath, JSON.stringify(sharedConfig, null, 2));
      console.log(`✅ 更新 ${sharedConfigPath}`);
    } catch (error) {
      console.log(`⚠️  shared-config.json 更新失敗: ${error.message}`);
    }

    return this;
  }

  // 驗證配置一致性
  validateConfig() {
    console.log('\n🔍 驗證配置一致性...');
    
    const errors = [];
    const warnings = [];
    
    // 檢查必要的配置項
    const requiredConfigs = [
      'VITE_HERO_ADDRESS',
      'VITE_RELIC_ADDRESS',
      'VITE_PARTY_ADDRESS',
      'VITE_SUBGRAPH_URL',
      'VITE_DEPLOYMENT_VERSION'
    ];

    requiredConfigs.forEach(key => {
      if (!this.config[key]) {
        errors.push(`缺少必要配置: ${key}`);
      }
    });

    // 檢查地址格式
    Object.entries(this.config).forEach(([key, value]) => {
      if (key.endsWith('_ADDRESS') && !value.match(/^0x[a-fA-F0-9]{40}$/)) {
        errors.push(`地址格式錯誤: ${key} = ${value}`);
      }
    });

    // 檢查子圖版本
    if (this.config.VITE_SUBGRAPH_URL && !this.config.VITE_SUBGRAPH_URL.includes(this.config.VITE_SUBGRAPH_VERSION)) {
      warnings.push('子圖 URL 與版本可能不匹配');
    }

    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ 所有配置驗證通過');
    } else {
      if (errors.length > 0) {
        console.log('\n❌ 發現錯誤:');
        errors.forEach(e => console.log(`  ${e}`));
      }
      if (warnings.length > 0) {
        console.log('\n⚠️  發現警告:');
        warnings.forEach(w => console.log(`  ${w}`));
      }
    }

    return { errors, warnings };
  }

  // 生成配置摘要
  generateSummary() {
    console.log('\n📋 配置摘要:');
    console.log('=' .repeat(50));
    console.log(`版本: ${this.config.VITE_DEPLOYMENT_VERSION}`);
    console.log(`部署時間: ${this.config.VITE_DEPLOYMENT_DATE}`);
    console.log(`子圖版本: ${this.config.VITE_SUBGRAPH_VERSION}`);
    console.log(`起始區塊: ${this.config.VITE_SUBGRAPH_START_BLOCK}`);
    
    console.log('\n📍 核心合約地址:');
    [
      'VITE_HERO_ADDRESS',
      'VITE_RELIC_ADDRESS', 
      'VITE_PARTY_ADDRESS',
      'VITE_DUNGEONMASTER_ADDRESS',
      'VITE_ALTAROFASCENSION_ADDRESS'
    ].forEach(key => {
      console.log(`  ${key.replace('VITE_', '').replace('_ADDRESS', '')}: ${this.config[key]}`);
    });

    console.log('\n🔗 服務端點:');
    console.log(`  子圖: ${this.config.VITE_SUBGRAPH_URL}`);
    console.log(`  後端: ${this.config.VITE_METADATA_SERVER_URL}`);
  }

  // 主執行函數
  async run() {
    try {
      this.loadSourceConfig()
          .generateFrontendEnv()
          .generateBackendConfig()
          .generateSubgraphConfig();

      const validation = this.validateConfig();
      this.generateSummary();

      if (validation.errors.length === 0) {
        console.log('\n🎉 配置同步完成！');
        console.log('\n📌 下一步操作:');
        console.log('1. 檢查生成的配置文件');
        console.log('2. 重新啟動前端開發服務器');
        console.log('3. 驗證後端服務連接');
        console.log('4. 測試子圖查詢功能');
      } else {
        console.log('\n⚠️  請修復錯誤後重新執行同步');
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ 配置同步失敗:', error.message);
      process.exit(1);
    }
  }
}

// 執行同步
if (require.main === module) {
  const manager = new ConfigSyncManager();
  manager.run();
}

module.exports = ConfigSyncManager;