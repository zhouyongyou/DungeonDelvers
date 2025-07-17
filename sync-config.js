#!/usr/bin/env node

/**
 * 合約配置同步腳本
 * 從 contract-config.json 同步到各個項目的配置文件
 */

const fs = require('fs');
const path = require('path');

// 讀取統一配置
const CONFIG_PATH = path.join(__dirname, 'contract-config.json');
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

console.log(`🔄 同步合約配置 ${config.version} (${config.deploymentDate})`);

// 1. 更新前端 .env
function updateFrontendEnv() {
  const envPath = path.join(__dirname, '.env');
  const contracts = config.contracts;
  
  const envContent = `# 自動生成於 ${new Date().toISOString()}
# 來源：contract-config.json ${config.version}

VITE_BSC_RPC=https://bsc-dataseed1.binance.org/

# The Graph Settings
VITE_THEGRAPH_API_URL=${config.subgraph.endpoint}
VITE_THE_GRAPH_API_URL=${config.subgraph.endpoint}
VITE_THE_GRAPH_STUDIO_API_URL=${config.subgraph.endpoint}

# Mainnet URL
VITE_MAINNET_URL=https://dungeondelvers.xyz

# Developer Settings
VITE_DEVELOPER_ADDRESS=${config.developer.address}

# 合約地址 (${config.version} - ${config.deploymentDate})
VITE_MAINNET_ORACLE_ADDRESS=${contracts.core.oracle.address}
VITE_MAINNET_DUNGEONSTORAGE_ADDRESS=${contracts.core.dungeonStorage.address}
VITE_MAINNET_PLAYERVAULT_ADDRESS=${contracts.core.playerVault.address}
VITE_MAINNET_ALTAROFASCENSION_ADDRESS=${contracts.game.altarOfAscension.address}
VITE_MAINNET_DUNGEONMASTER_ADDRESS=${contracts.game.dungeonMaster.address}
VITE_MAINNET_HERO_ADDRESS=${contracts.nfts.hero.address}
VITE_MAINNET_RELIC_ADDRESS=${contracts.nfts.relic.address}
VITE_MAINNET_PARTY_ADDRESS=${contracts.nfts.party.address}
VITE_MAINNET_VIPSTAKING_ADDRESS=${contracts.tokens.vipStaking.address}
VITE_MAINNET_PLAYERPROFILE_ADDRESS=${contracts.game.playerProfile.address}
VITE_MAINNET_DUNGEONCORE_ADDRESS=${contracts.core.dungeonCore.address}

VITE_MAINNET_SOULSHARDTOKEN_ADDRESS=${contracts.tokens.soulShard.address}
VITE_MAINNET_SOUL_SHARD_TOKEN_ADDRESS="${contracts.tokens.soulShard.address}"
VITE_MAINNET_USD_TOKEN_ADDRESS="${config.external.usdToken}"
VITE_MAINNET_POOL_ADDRESS="${config.external.liquidityPool}"

# Metadata Server
VITE_METADATA_SERVER_URL=${config.metadata.server}
VITE_SERVER_URL=${config.metadata.server}

# RPC 配置
VITE_ALCHEMY_KEY=3lmTWjUVbFylAurhdU-rSUefTC-P4tKf
VITE_WALLET_CONNECT_PROJECT_ID=d02f4199d4862ab0a12a3d0424fb567b
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ 前端 .env 已更新');
}

// 2. 更新後端 .env
function updateBackendEnv() {
  const envPath = path.join(__dirname, '../../dungeon-delvers-metadata-server/.env');
  if (!fs.existsSync(path.dirname(envPath))) {
    console.log('❌ 後端目錄不存在，跳過');
    return;
  }

  const contracts = config.contracts;
  const envContent = `# 自動生成於 ${new Date().toISOString()}
# 來源：contract-config.json ${config.version}

# Alchemy API Keys
ALCHEMY_API_KEY_1=3lmTWjUVbFylAurhdU-rSUefTC-P4tKf
ALCHEMY_BSC_MAINNET_RPC_URL=https://bnb-mainnet.g.alchemy.com/v2/3lmTWjUVbFylAurhdU-rSUefTC-P4tKf
BSC_MAINNET_RPC_URL=https://bnb-mainnet.g.alchemy.com/v2/3lmTWjUVbFylAurhdU-rSUefTC-P4tKf

# 合約地址 (${config.version} - ${config.deploymentDate})
VITE_MAINNET_ORACLE_ADDRESS=${contracts.core.oracle.address}
VITE_MAINNET_DUNGEONSTORAGE_ADDRESS=${contracts.core.dungeonStorage.address}
VITE_MAINNET_PLAYERVAULT_ADDRESS=${contracts.core.playerVault.address}
VITE_MAINNET_ALTAROFASCENSION_ADDRESS=${contracts.game.altarOfAscension.address}
VITE_MAINNET_DUNGEONMASTER_ADDRESS=${contracts.game.dungeonMaster.address}
VITE_MAINNET_HERO_ADDRESS=${contracts.nfts.hero.address}
VITE_MAINNET_RELIC_ADDRESS=${contracts.nfts.relic.address}
VITE_MAINNET_PARTY_ADDRESS=${contracts.nfts.party.address}
VITE_MAINNET_VIPSTAKING_ADDRESS=${contracts.tokens.vipStaking.address}
VITE_MAINNET_PLAYERPROFILE_ADDRESS=${contracts.game.playerProfile.address}
VITE_MAINNET_DUNGEONCORE_ADDRESS=${contracts.core.dungeonCore.address}

VITE_MAINNET_SOUL_SHARD_TOKEN_ADDRESS="${contracts.tokens.soulShard.address}"
VITE_MAINNET_USD_TOKEN_ADDRESS="${config.external.usdToken}"
VITE_MAINNET_POOL_ADDRESS="${config.external.liquidityPool}"

# The Graph 配置
THE_GRAPH_API_URL=${config.subgraph.endpoint}
VITE_THE_GRAPH_STUDIO_API_URL=${config.subgraph.endpoint}

# 其他配置
CORS_ORIGIN=https://dungeondelvers.xyz,https://www.dungeondelvers.xyz
TEST_MODE=false
NODE_ENV=development
PORT=3001
`;

  fs.writeFileSync(envPath, envContent);
  console.log('✅ 後端 .env 已更新');
}

// 3. 更新子圖配置
function updateSubgraphConfig() {
  const configPath = path.join(__dirname, 'DDgraphql/dungeon-delvers/src/config.ts');
  if (!fs.existsSync(configPath)) {
    console.log('❌ 子圖配置文件不存在，跳過');
    return;
  }

  const contracts = config.contracts;
  const configContent = `// 自動生成於 ${new Date().toISOString()}
// 來源：contract-config.json ${config.version}

export const DUNGEON_CORE_ADDRESS = "${contracts.core.dungeonCore.address}";
export const ORACLE_ADDRESS = "${contracts.core.oracle.address}";
export const DUNGEON_STORAGE_ADDRESS = "${contracts.core.dungeonStorage.address}";
export const PLAYER_VAULT_ADDRESS = "${contracts.core.playerVault.address}";
export const DUNGEON_MASTER_ADDRESS = "${contracts.game.dungeonMaster.address}";
export const ALTAR_OF_ASCENSION_ADDRESS = "${contracts.game.altarOfAscension.address}";
export const PLAYER_PROFILE_ADDRESS = "${contracts.game.playerProfile.address}";
export const HERO_ADDRESS = "${contracts.nfts.hero.address}";
export const RELIC_ADDRESS = "${contracts.nfts.relic.address}";
export const PARTY_ADDRESS = "${contracts.nfts.party.address}";
export const VIP_STAKING_ADDRESS = "${contracts.tokens.vipStaking.address}";
export const SOUL_SHARD_ADDRESS = "${contracts.tokens.soulShard.address}";

export const START_BLOCK = ${contracts.core.dungeonCore.startBlock};
export const NETWORK = "${config.network}";
export const VERSION = "${config.version}";
`;

  fs.writeFileSync(configPath, configContent);
  console.log('✅ 子圖配置已更新');
}

// 4. 生成更新總結
function generateSummary() {
  const summaryPath = path.join(__dirname, 'sync-summary.md');
  const summary = `# 合約配置同步總結

**同步時間**: ${new Date().toISOString()}  
**配置版本**: ${config.version}  
**部署日期**: ${config.deploymentDate}  
**網路**: ${config.network}  

## 已更新文件

- ✅ 前端 \`.env\`
- ✅ 後端 \`.env\`  
- ✅ 子圖 \`config.ts\`

## 主要合約地址

| 合約 | 地址 |
|------|------|
| DungeonMaster | ${config.contracts.game.dungeonMaster.address} |
| Hero | ${config.contracts.nfts.hero.address} |
| Relic | ${config.contracts.nfts.relic.address} |
| Party | ${config.contracts.nfts.party.address} |

## 下一步行動

1. 🔄 重新啟動前端開發服務器
2. 📤 推送更新到 GitHub  
3. 🚀 重新部署到生產環境
4. 🔍 測試所有功能是否正常

---
*由 sync-config.js 自動生成*
`;

  fs.writeFileSync(summaryPath, summary);
  console.log('✅ 同步總結已生成');
}

// 執行同步
try {
  updateFrontendEnv();
  updateBackendEnv();
  updateSubgraphConfig();
  generateSummary();
  
  console.log('\n🎉 合約配置同步完成！');
  console.log('📋 查看 sync-summary.md 了解詳情');
} catch (error) {
  console.error('❌ 同步失敗:', error.message);
  process.exit(1);
}