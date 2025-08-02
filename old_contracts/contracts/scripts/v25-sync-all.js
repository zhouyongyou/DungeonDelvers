#!/usr/bin/env node

/**
 * V25 配置同步腳本
 * 
 * 同步合約地址和 ABI 到所有相關項目
 * 支援自動備份和回滾
 * 
 * 使用方式：
 * node scripts/active/v25-sync-all.js
 * node scripts/active/v25-sync-all.js --rollback
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// 項目路徑配置
const PROJECT_PATHS = {
  frontend: '/Users/sotadic/Documents/GitHub/DungeonDelvers',
  backend: '/Users/sotadic/Documents/dungeon-delvers-metadata-server',
  subgraph: '/Users/sotadic/Documents/GitHub/DungeonDelvers/DDgraphql/dungeon-delvers',
  contracts: '/Users/sotadic/Documents/DungeonDelversContracts'
};

// ABI 同步配置
const ABI_SYNC_CONFIG = [
  {
    contractName: 'HERO',
    artifactName: 'Hero',
    destinations: [
      { type: 'frontend', path: 'src/abis/Hero.json' },
      { type: 'subgraph', path: 'abis/Hero.json' }
    ]
  },
  {
    contractName: 'RELIC',
    artifactName: 'Relic',
    destinations: [
      { type: 'frontend', path: 'src/abis/Relic.json' },
      { type: 'subgraph', path: 'abis/Relic.json' }
    ]
  },
  {
    contractName: 'PARTY',
    artifactName: 'PartyV3',
    destinations: [
      { type: 'frontend', path: 'src/abis/Party.json' },
      { type: 'subgraph', path: 'abis/PartyV3.json' }
    ]
  },
  {
    contractName: 'VIPSTAKING',
    artifactName: 'VIPStaking',
    destinations: [
      { type: 'frontend', path: 'src/abis/VIPStaking.json' },
      { type: 'subgraph', path: 'abis/VIPStaking.json' }
    ]
  },
  {
    contractName: 'PLAYERPROFILE',
    artifactName: 'PlayerProfile',
    destinations: [
      { type: 'frontend', path: 'src/abis/PlayerProfile.json' },
      { type: 'subgraph', path: 'abis/PlayerProfile.json' }
    ]
  },
  {
    contractName: 'ALTAROFASCENSION',
    artifactName: 'AltarOfAscensionV2Fixed',
    destinations: [
      { type: 'frontend', path: 'src/abis/AltarOfAscension.json' },
      { type: 'subgraph', path: 'abis/AltarOfAscensionV2Fixed.json' }
    ]
  },
  {
    contractName: 'DUNGEONMASTER',
    artifactName: 'DungeonMasterV2_Fixed',
    destinations: [
      { type: 'frontend', path: 'src/abis/DungeonMaster.json' },
      { type: 'subgraph', path: 'abis/DungeonMaster.json' }
    ]
  },
  {
    contractName: 'DUNGEONCORE',
    artifactName: 'DungeonCore',
    destinations: [
      { type: 'frontend', path: 'src/abis/DungeonCore.json' }
    ]
  },
  {
    contractName: 'ORACLE',
    artifactName: 'Oracle_V22_Adaptive',
    destinations: [
      { type: 'frontend', path: 'src/abis/Oracle.json' }
    ]
  },
  {
    contractName: 'PLAYERVAULT',
    artifactName: 'PlayerVault',
    destinations: [
      { type: 'frontend', path: 'src/abis/PlayerVault.json' }
    ]
  }
];

class V25Syncer {
  constructor() {
    this.v25Config = null;
    this.backups = [];
    this.errors = [];
    this.isRollback = process.argv.includes('--rollback');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      info: `${colors.blue}[INFO]${colors.reset}`,
      success: `${colors.green}[SUCCESS]${colors.reset}`,
      error: `${colors.red}[ERROR]${colors.reset}`,
      warning: `${colors.yellow}[WARNING]${colors.reset}`
    };
    console.log(`${prefix[type]} ${timestamp} ${message}`);
  }

  async sync() {
    console.log(`${colors.bright}
==================================================
🔄 V25 配置同步腳本
==================================================
${colors.reset}`);

    try {
      if (this.isRollback) {
        await this.performRollback();
      } else {
        await this.performSync();
      }
    } catch (error) {
      this.log(`同步失敗: ${error.message}`, 'error');
      console.error(error);
      process.exit(1);
    }
  }

  async performSync() {
    // 1. 載入 V25 配置
    await this.loadV25Config();
    
    // 2. 編譯合約以確保 ABI 最新
    await this.compileContracts();
    
    // 3. 同步 ABI 文件
    await this.syncABIs();
    
    // 4. 同步配置文件
    await this.syncConfigs();
    
    // 5. 更新子圖配置
    await this.updateSubgraph();
    
    // 6. 生成同步報告
    await this.generateSyncReport();
    
    // 7. 顯示下一步指示
    this.showNextSteps();
    
    this.log('\n✅ V25 同步完成！', 'success');
  }

  async loadV25Config() {
    this.log('載入 V25 配置...', 'info');
    
    const configPath = path.join(PROJECT_PATHS.contracts, 'config/v25-config.js');
    if (!fs.existsSync(configPath)) {
      throw new Error('V25 配置文件不存在，請先執行部署');
    }
    
    this.v25Config = require(configPath);
    this.log(`已載入配置: ${Object.keys(this.v25Config.contracts).length} 個合約`, 'info');
  }

  async compileContracts() {
    this.log('\n編譯合約以生成 ABI...', 'info');
    
    try {
      execSync('npx hardhat compile', {
        cwd: PROJECT_PATHS.contracts,
        stdio: 'pipe'
      });
      this.log('✅ 合約編譯成功', 'success');
    } catch (error) {
      this.log('❌ 合約編譯失敗', 'error');
      throw error;
    }
  }

  async syncABIs() {
    this.log('\n同步 ABI 文件...', 'info');
    
    for (const config of ABI_SYNC_CONFIG) {
      await this.syncABI(config);
    }
  }

  async syncABI(config) {
    this.log(`\n處理 ${config.contractName} ABI...`, 'info');
    
    // 獲取 artifact 路徑
    const artifactPath = path.join(
      PROJECT_PATHS.contracts,
      'artifacts/contracts',
      this.findContractPath(config.artifactName),
      `${config.artifactName}.sol`,
      `${config.artifactName}.json`
    );
    
    if (!fs.existsSync(artifactPath)) {
      this.log(`找不到 ${config.contractName} 的 artifact`, 'warning');
      return;
    }
    
    // 讀取 artifact
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    
    // 同步到各個目標
    for (const dest of config.destinations) {
      const destPath = path.join(PROJECT_PATHS[dest.type], dest.path);
      
      // 備份現有文件
      if (fs.existsSync(destPath)) {
        const backupPath = `${destPath}.backup-${Date.now()}`;
        fs.copyFileSync(destPath, backupPath);
        this.backups.push({ original: destPath, backup: backupPath });
        this.log(`📋 已備份: ${path.basename(backupPath)}`, 'info');
      }
      
      // 寫入新 ABI
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.writeFileSync(destPath, JSON.stringify(artifact, null, 2));
      this.log(`✅ ${config.contractName} ABI 已複製到${dest.type}`, 'success');
    }
  }

  findContractPath(contractName) {
    // 搜索合約文件位置
    const searchPaths = [
      'current/nft',
      'current/core',
      'current/defi',
      'current/staking',
      'current/game'
    ];
    
    for (const searchPath of searchPaths) {
      const fullPath = path.join(PROJECT_PATHS.contracts, 'contracts', searchPath, `${contractName}.sol`);
      if (fs.existsSync(fullPath)) {
        return searchPath;
      }
    }
    
    return 'current'; // 默認路徑
  }

  async syncConfigs() {
    this.log('\n同步配置文件...', 'info');
    
    // 更新前端配置
    await this.updateFrontendConfig();
    
    // 更新後端配置
    await this.updateBackendConfig();
  }

  async updateFrontendConfig() {
    this.log('\n更新前端配置...', 'info');
    
    const configPath = path.join(PROJECT_PATHS.frontend, 'src/config/contracts.ts');
    
    // 備份
    if (fs.existsSync(configPath)) {
      const backupPath = `${configPath}.backup-${Date.now()}`;
      fs.copyFileSync(configPath, backupPath);
      this.backups.push({ original: configPath, backup: backupPath });
      this.log(`📋 已備份: ${path.basename(backupPath)}`, 'info');
    }
    
    // 生成新配置
    const contractsTs = this.generateFrontendConfig();
    fs.writeFileSync(configPath, contractsTs);
    this.log('✅ 前端配置已更新', 'success');
  }

  generateFrontendConfig() {
    const config = this.v25Config;
    
    return `// V25 Contract Configuration
// Generated on ${new Date().toISOString()}
// DO NOT EDIT MANUALLY - Use v25-sync-all.js to update

export const CONTRACTS = {
  56: { // BSC Mainnet
    // Core Contracts
    DUNGEONCORE: '${config.contracts.DUNGEONCORE?.address || ''}',
    ORACLE: '${config.contracts.ORACLE?.address || ''}',
    
    // Token Contracts
    SOULSHARD: '${config.contracts.SOULSHARD?.address || ''}',
    
    // NFT Contracts
    HERO: '${config.contracts.HERO?.address || ''}',
    RELIC: '${config.contracts.RELIC?.address || ''}',
    PARTY: '${config.contracts.PARTY?.address || ''}',
    
    // Game Contracts
    DUNGEONMASTER: '${config.contracts.DUNGEONMASTER?.address || ''}',
    DUNGEONSTORAGE: '${config.contracts.DUNGEONSTORAGE?.address || ''}',
    PLAYERVAULT: '${config.contracts.PLAYERVAULT?.address || ''}',
    PLAYERPROFILE: '${config.contracts.PLAYERPROFILE?.address || ''}',
    
    // Feature Contracts
    VIPSTAKING: '${config.contracts.VIPSTAKING?.address || ''}',
    ALTAROFASCENSION: '${config.contracts.ALTAROFASCENSION?.address || ''}',
    
    // External
    DUNGEONMASTERWALLET: '${config.deployer}',
  }
} as const;

// Contract version for tracking
export const CONTRACT_VERSION = 'V25';

// Export individual addresses for convenience
export const {
  DUNGEONCORE,
  ORACLE,
  SOULSHARD,
  HERO,
  RELIC,
  PARTY,
  DUNGEONMASTER,
  DUNGEONSTORAGE,
  PLAYERVAULT,
  PLAYERPROFILE,
  VIPSTAKING,
  ALTAROFASCENSION,
  DUNGEONMASTERWALLET,
} = CONTRACTS[56];
`;
  }

  async updateBackendConfig() {
    this.log('\n更新後端配置...', 'info');
    
    const configPath = path.join(PROJECT_PATHS.backend, 'config/contracts.js');
    
    // 備份
    if (fs.existsSync(configPath)) {
      const backupPath = `${configPath}.backup-${Date.now()}`;
      fs.copyFileSync(configPath, backupPath);
      this.backups.push({ original: configPath, backup: backupPath });
      this.log(`📋 已備份: ${path.basename(backupPath)}`, 'info');
    }
    
    // 生成新配置
    const contractsJs = this.generateBackendConfig();
    fs.writeFileSync(configPath, contractsJs);
    this.log('✅ 後端配置已更新', 'success');
  }

  generateBackendConfig() {
    const config = this.v25Config;
    
    return `// V25 Contract Configuration for Backend
// Generated on ${new Date().toISOString()}
// DO NOT EDIT MANUALLY - Use v25-sync-all.js to update

module.exports = {
  // BSC Mainnet Contracts
  contracts: {
    // Core Contracts
    DUNGEONCORE: '${config.contracts.DUNGEONCORE?.address || ''}',
    ORACLE: '${config.contracts.ORACLE?.address || ''}',
    
    // Token Contracts
    SOULSHARD: '${config.contracts.SOULSHARD?.address || ''}',
    
    // NFT Contracts
    HERO: '${config.contracts.HERO?.address || ''}',
    RELIC: '${config.contracts.RELIC?.address || ''}',
    PARTY: '${config.contracts.PARTY?.address || ''}',
    
    // Game Contracts
    DUNGEONMASTER: '${config.contracts.DUNGEONMASTER?.address || ''}',
    DUNGEONSTORAGE: '${config.contracts.DUNGEONSTORAGE?.address || ''}',
    PLAYERVAULT: '${config.contracts.PLAYERVAULT?.address || ''}',
    PLAYERPROFILE: '${config.contracts.PLAYERPROFILE?.address || ''}',
    
    // Feature Contracts
    VIPSTAKING: '${config.contracts.VIPSTAKING?.address || ''}',
    ALTAROFASCENSION: '${config.contracts.ALTAROFASCENSION?.address || ''}',
    
    // External
    DUNGEONMASTERWALLET: '${config.deployer}',
  },
  
  // Contract version for tracking
  version: 'V25',
  
  // Network configuration
  network: {
    chainId: 56,
    name: 'BSC Mainnet',
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/'
  }
};
`;
  }

  async updateSubgraph() {
    this.log('\n更新子圖配置...', 'info');
    
    // 更新 networks.json
    await this.updateSubgraphNetworks();
    
    // 更新 subgraph.yaml
    await this.updateSubgraphYaml();
  }

  async updateSubgraphNetworks() {
    this.log('更新子圖 networks.json...', 'info');
    
    const networksPath = path.join(PROJECT_PATHS.subgraph, 'networks.json');
    
    // 備份
    if (fs.existsSync(networksPath)) {
      const backupPath = `${networksPath}.backup-${Date.now()}`;
      fs.copyFileSync(networksPath, backupPath);
      this.backups.push({ original: networksPath, backup: backupPath });
      this.log(`📋 已備份: ${path.basename(backupPath)}`, 'info');
    }
    
    // 生成新配置
    const networks = {
      bsc: {
        Hero: {
          address: this.v25Config.contracts.HERO?.address,
          startBlock: this.v25Config.startBlock
        },
        Relic: {
          address: this.v25Config.contracts.RELIC?.address,
          startBlock: this.v25Config.startBlock
        },
        PartyV3: {
          address: this.v25Config.contracts.PARTY?.address,
          startBlock: this.v25Config.startBlock
        },
        VIPStaking: {
          address: this.v25Config.contracts.VIPSTAKING?.address,
          startBlock: this.v25Config.startBlock
        },
        PlayerProfile: {
          address: this.v25Config.contracts.PLAYERPROFILE?.address,
          startBlock: this.v25Config.startBlock
        },
        AltarOfAscensionV2Fixed: {
          address: this.v25Config.contracts.ALTAROFASCENSION?.address,
          startBlock: this.v25Config.startBlock
        },
        DungeonMaster: {
          address: this.v25Config.contracts.DUNGEONMASTER?.address,
          startBlock: this.v25Config.startBlock
        }
      }
    };
    
    fs.writeFileSync(networksPath, JSON.stringify(networks, null, 2));
    this.log('✅ 子圖 networks.json 已更新', 'success');
  }

  async updateSubgraphYaml() {
    this.log('更新子圖 YAML...', 'info');
    
    const yamlPath = path.join(PROJECT_PATHS.subgraph, 'subgraph.yaml');
    
    // 備份
    if (fs.existsSync(yamlPath)) {
      const backupPath = `${yamlPath}.backup-${Date.now()}`;
      fs.copyFileSync(yamlPath, backupPath);
      this.backups.push({ original: yamlPath, backup: backupPath });
      this.log(`📋 已備份: ${path.basename(backupPath)}`, 'info');
    }
    
    // 讀取並更新 YAML
    let yamlContent = fs.readFileSync(yamlPath, 'utf8');
    
    // 更新地址和起始區塊
    const updates = [
      { name: 'Hero', address: this.v25Config.contracts.HERO?.address },
      { name: 'Relic', address: this.v25Config.contracts.RELIC?.address },
      { name: 'PartyV3', address: this.v25Config.contracts.PARTY?.address },
      { name: 'VIPStaking', address: this.v25Config.contracts.VIPSTAKING?.address },
      { name: 'PlayerProfile', address: this.v25Config.contracts.PLAYERPROFILE?.address },
      { name: 'AltarOfAscension', address: this.v25Config.contracts.ALTAROFASCENSION?.address },
      { name: 'DungeonMaster', address: this.v25Config.contracts.DUNGEONMASTER?.address }
    ];
    
    for (const update of updates) {
      if (update.address) {
        // 更新地址
        const addressRegex = new RegExp(`(name: ${update.name}[\\s\\S]*?address: )'[^']+'`, 'g');
        yamlContent = yamlContent.replace(addressRegex, `$1'${update.address}'`);
        
        // 更新起始區塊
        const blockRegex = new RegExp(`(name: ${update.name}[\\s\\S]*?startBlock: )\\d+`, 'g');
        yamlContent = yamlContent.replace(blockRegex, `$1${this.v25Config.startBlock}`);
        
        this.log(`✅ 更新 ${update.name} 地址和起始區塊`, 'success');
      }
    }
    
    // 更新頂部註釋
    yamlContent = `# Generated from v25-config.js on ${new Date().toISOString()}
# V25 Production Deployment
${yamlContent.split('\n').slice(2).join('\n')}`;
    
    fs.writeFileSync(yamlPath, yamlContent);
    this.log('✅ 子圖 YAML 已更新', 'success');
  }

  async generateSyncReport() {
    const reportPath = path.join(PROJECT_PATHS.contracts, 'scripts/deployments', `v25-sync-report-${Date.now()}.json`);
    
    const report = {
      version: 'V25',
      timestamp: new Date().toISOString(),
      synced: {
        frontend: true,
        backend: true,
        subgraph: true
      },
      backups: this.backups,
      errors: this.errors,
      contracts: this.v25Config.contracts
    };
    
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`\n✅ 同步報告已生成: ${reportPath}`, 'success');
  }

  showNextSteps() {
    console.log(`\n${colors.bright}下一步:${colors.reset}`);
    console.log('1. 前端: cd /Users/sotadic/Documents/GitHub/DungeonDelvers && npm run dev');
    console.log('2. 後端: cd /Users/sotadic/Documents/dungeon-delvers-metadata-server && npm start');
    console.log('3. 子圖:');
    console.log('   cd /Users/sotadic/Documents/GitHub/DungeonDelvers/DDgraphql/dungeon-delvers');
    console.log('   npm run codegen');
    console.log('   npm run build');
    console.log('   npm run deploy');
  }

  async performRollback() {
    this.log('執行回滾...', 'info');
    
    // 尋找最新的同步報告
    const deploymentsDir = path.join(PROJECT_PATHS.contracts, 'scripts/deployments');
    const files = fs.readdirSync(deploymentsDir)
      .filter(f => f.startsWith('v25-sync-report-'))
      .sort()
      .reverse();
    
    if (files.length === 0) {
      throw new Error('找不到同步報告，無法回滾');
    }
    
    const latestReport = JSON.parse(
      fs.readFileSync(path.join(deploymentsDir, files[0]), 'utf8')
    );
    
    // 執行回滾
    for (const backup of latestReport.backups) {
      if (fs.existsSync(backup.backup)) {
        fs.copyFileSync(backup.backup, backup.original);
        this.log(`✅ 已回滾: ${path.basename(backup.original)}`, 'success');
      }
    }
    
    this.log('\n✅ 回滾完成！', 'success');
  }
}

// 執行同步
async function main() {
  const syncer = new V25Syncer();
  await syncer.sync();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });