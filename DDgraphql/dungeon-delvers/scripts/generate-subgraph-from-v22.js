#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load v22 config
const v22ConfigPath = path.join(__dirname, '../../../../../DungeonDelversContracts/config/v22-config.js');
console.log('Loading config from:', v22ConfigPath);
const v22Config = require(v22ConfigPath);

// Subgraph template
const subgraphTemplate = {
  specVersion: "0.0.4",
  schema: {
    file: "./schema.graphql"
  },
  dataSources: []
};

// Get the BSC chain ID
const BSC_CHAIN_ID = 56;

// Map contract names to subgraph configurations
const contractMappings = {
  HERO: {
    name: 'Hero',
    entities: ['Hero', 'Transfer'],
    eventHandlers: [
      {
        event: 'Transfer(indexed address,indexed address,indexed uint256)',
        handler: 'handleTransfer'
      },
      {
        event: 'HeroMinted(indexed uint256,indexed address,uint8,uint256)',
        handler: 'handleHeroMinted'
      }
    ],
    file: './src/hero.ts'
  },
  RELIC: {
    name: 'Relic',
    entities: ['Relic', 'Transfer'],
    eventHandlers: [
      {
        event: 'Transfer(indexed address,indexed address,indexed uint256)',
        handler: 'handleTransfer'
      },
      {
        event: 'RelicMinted(indexed uint256,indexed address,uint8,uint8)',
        handler: 'handleRelicMinted'
      }
    ],
    file: './src/relic.ts'
  },
  PARTY: {
    name: 'PartyV3',
    entities: ['Party', 'Transfer'],
    eventHandlers: [
      {
        event: 'Transfer(indexed address,indexed address,indexed uint256)',
        handler: 'handlePartyTransfer'
      },
      {
        event: 'PartyCreated(indexed uint256,indexed address,uint256[],uint256[],uint256,uint256,uint8)',
        handler: 'handlePartyCreated'
      }
    ],
    file: './src/party.ts'
  },
  VIPSTAKING: {
    name: 'VIPStaking',
    entities: ['VIPStake', 'User'],
    eventHandlers: [
      {
        event: 'Staked(indexed address,uint256,uint256)',
        handler: 'handleStaked'
      },
      {
        event: 'UnstakeRequested(indexed address,uint256,uint256)',
        handler: 'handleUnstakeRequested'
      },
      {
        event: 'UnstakeClaimed(indexed address,uint256)',
        handler: 'handleUnstakeClaimed'
      }
    ],
    file: './src/vip-staking.ts'
  },
  PLAYERPROFILE: {
    name: 'PlayerProfile',
    entities: ['Player', 'Referral'],
    eventHandlers: [
      {
        event: 'ProfileCreated(indexed address,indexed uint256)',
        handler: 'handleProfileCreated'
      },
      {
        event: 'ExperienceAdded(indexed address,indexed uint256,uint256,uint256)',
        handler: 'handleExperienceAdded'
      }
    ],
    file: './src/player-profile.ts'
  },
  ALTAROFASCENSION: {
    name: 'AltarOfAscension',
    abi: 'AltarOfAscensionV2Fixed',
    entities: ['UpgradeAttempt', 'Player'],
    eventHandlers: [
      {
        event: 'UpgradeAttempted(indexed address,indexed address,uint8,uint8,uint256[],uint256[],uint8,uint256)',
        handler: 'handleUpgradeAttempted'
      }
    ],
    file: './src/altar-of-ascension.ts'
  }
};

// Default start block for V22 (2025-07-25 deployment)
// V21 was at 55164905, V22 is approximately 5 days later
// BSC produces ~3 seconds per block = ~28,800 blocks per day
const DEFAULT_START_BLOCK = 55309000; // Approximately 5 days after V21

// Generate data sources
Object.entries(contractMappings).forEach(([contractKey, mapping]) => {
  // v22Config structure: v22Config.contracts.HERO instead of v22Config.HERO
  const contractConfig = v22Config.contracts ? v22Config.contracts[contractKey] : v22Config[contractKey];
  
  if (!contractConfig || !contractConfig.address) {
    console.warn(`⚠️  No address found for ${contractKey}, skipping...`);
    return;
  }

  const dataSource = {
    kind: 'ethereum/contract',
    name: mapping.name,
    network: 'bsc',
    source: {
      address: contractConfig.address,
      abi: mapping.abi || mapping.name,
      startBlock: contractConfig.deployedBlock || DEFAULT_START_BLOCK
    },
    mapping: {
      kind: 'ethereum/events',
      apiVersion: '0.0.6',
      language: 'wasm/assemblyscript',
      entities: mapping.entities,
      abis: [
        {
          name: mapping.abi || mapping.name,
          file: `./abis/${mapping.abi || mapping.name}.json`
        }
      ],
      eventHandlers: mapping.eventHandlers,
      file: mapping.file
    }
  };

  subgraphTemplate.dataSources.push(dataSource);
});

// Convert to YAML format
const yaml = require('js-yaml');
const yamlStr = yaml.dump(subgraphTemplate, {
  lineWidth: -1,
  noRefs: true,
  quotingType: '"'
});

// Add header comment
const header = `# Generated from v22-config.js on ${new Date().toISOString()}
# DO NOT EDIT MANUALLY - Use npm run sync:config
`;

// Write to file
const outputPath = path.join(__dirname, '../subgraph.yaml');
fs.writeFileSync(outputPath, header + yamlStr);

console.log('✅ Successfully generated subgraph.yaml from v22-config.js');
console.log(`📄 Output file: ${outputPath}`);
console.log(`📊 Generated ${subgraphTemplate.dataSources.length} data sources`);

// Check if we need to install js-yaml
try {
  require('js-yaml');
} catch (e) {
  console.log('\n⚠️  Please install js-yaml: npm install --save-dev js-yaml');
}