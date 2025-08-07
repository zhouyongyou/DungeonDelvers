#!/usr/bin/env node

/**
 * V25 VRF 事件更新腳本
 * 為子圖添加 VRF 相關的新事件處理
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// 讀取現有的 subgraph.yaml
const subgraphPath = path.join(__dirname, 'subgraph.yaml');
const subgraphContent = fs.readFileSync(subgraphPath, 'utf8');
const subgraph = yaml.load(subgraphContent);

// VRF 相關的新事件定義
const VRF_EVENTS = {
  Hero: [
    // 現有事件
    { event: 'Transfer(indexed address,indexed address,indexed uint256)', handler: 'handleTransfer' },
    { event: 'HeroMinted(indexed uint256,indexed address,uint8,uint256)', handler: 'handleHeroMinted' },
    { event: 'HeroBurned(indexed uint256,indexed address,uint8,uint256)', handler: 'handleHeroBurned' },
    // VRF 新事件
    { event: 'MintCommitted(indexed address,uint256,uint256,bool)', handler: 'handleHeroMintCommitted' },
    { event: 'HeroRevealed(indexed uint256,indexed address,uint8,uint256)', handler: 'handleHeroRevealed' },
    { event: 'BatchMintCompleted(indexed address,uint256,uint8,uint256[])', handler: 'handleHeroBatchMintCompleted' },
    { event: 'VRFManagerSet(indexed address)', handler: 'handleHeroVRFManagerSet' }
  ],
  
  Relic: [
    // 現有事件
    { event: 'Transfer(indexed address,indexed address,indexed uint256)', handler: 'handleTransfer' },
    { event: 'RelicMinted(indexed uint256,indexed address,uint8,uint8)', handler: 'handleRelicMinted' },
    { event: 'RelicBurned(indexed uint256,indexed address,uint8,uint8)', handler: 'handleRelicBurned' },
    // VRF 新事件
    { event: 'MintCommitted(indexed address,uint256,uint256,bool)', handler: 'handleRelicMintCommitted' },
    { event: 'RelicRevealed(indexed uint256,indexed address,uint8,uint8)', handler: 'handleRelicRevealed' },
    { event: 'BatchMintCompleted(indexed address,uint256,uint8,uint256[])', handler: 'handleRelicBatchMintCompleted' },
    { event: 'VRFManagerSet(indexed address)', handler: 'handleRelicVRFManagerSet' }
  ],
  
  DungeonMaster: [
    // 現有事件
    { event: 'ExpeditionFulfilled(indexed address,indexed uint256,bool,uint256,uint256)', handler: 'handleExpeditionFulfilled' },
    // VRF 新事件
    { event: 'ExpeditionCommitted(indexed address,uint256,uint256,uint256)', handler: 'handleExpeditionCommitted' },
    { event: 'ExpeditionRevealed(indexed address,uint256,bool)', handler: 'handleExpeditionRevealed' },
    { event: 'VRFManagerSet(indexed address)', handler: 'handleDungeonMasterVRFManagerSet' },
    { event: 'VRFRequestFulfilled(indexed uint256,uint256)', handler: 'handleDungeonMasterVRFFulfilled' }
  ],
  
  AltarOfAscension: [
    // 現有事件
    { event: 'UpgradeProcessed(indexed address,indexed address,uint8,uint8)', handler: 'handleUpgradeProcessed' },
    // VRF 新事件
    { event: 'UpgradeCommitted(indexed address,address,uint8,uint256,uint256[])', handler: 'handleUpgradeCommitted' },
    { event: 'UpgradeRevealed(indexed address,uint8,uint8)', handler: 'handleUpgradeRevealed' },
    { event: 'UpgradeRequested(indexed address,uint256[],uint256,uint256)', handler: 'handleUpgradeRequested' },
    { event: 'VRFManagerSet(indexed address)', handler: 'handleAltarVRFManagerSet' }
  ],
  
  VRFManagerV2Plus: [
    { event: 'RandomRequested(indexed uint256,indexed address,uint8)', handler: 'handleRandomRequested' },
    { event: 'RandomFulfilled(indexed uint256,uint256[])', handler: 'handleRandomFulfilled' },
    { event: 'AuthorizationUpdated(indexed address,bool)', handler: 'handleAuthorizationUpdated' },
    { event: 'VRFPriceUpdated(uint256)', handler: 'handleVRFPriceUpdated' },
    { event: 'PlatformFeeUpdated(uint256)', handler: 'handlePlatformFeeUpdated' }
  ]
};

// 更新數據源的事件處理器
function updateDataSourceEvents() {
  let updated = false;
  
  subgraph.dataSources.forEach(dataSource => {
    const name = dataSource.name;
    
    if (VRF_EVENTS[name]) {
      console.log(`\n📝 更新 ${name} 的事件處理器...`);
      
      const newEvents = VRF_EVENTS[name];
      const existingEvents = dataSource.mapping.eventHandlers || [];
      
      // 創建現有事件的 Map（用於去重）
      const eventMap = new Map();
      existingEvents.forEach(e => {
        const key = e.event;
        eventMap.set(key, e);
      });
      
      // 添加新事件（避免重複）
      newEvents.forEach(newEvent => {
        if (!eventMap.has(newEvent.event)) {
          console.log(`  ✅ 添加新事件: ${newEvent.event}`);
          eventMap.set(newEvent.event, newEvent);
          updated = true;
        } else {
          console.log(`  ⏭️  已存在: ${newEvent.event}`);
        }
      });
      
      // 更新事件處理器列表
      dataSource.mapping.eventHandlers = Array.from(eventMap.values());
    }
  });
  
  return updated;
}

// 保存更新後的 subgraph.yaml
function saveSubgraph() {
  const yamlStr = yaml.dump(subgraph, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false
  });
  
  // 添加頭部註釋
  const header = `# Generated from V25 VRF Events Update on ${new Date().toISOString()}
# V25 VRF Version with Complete Event Support
`;
  
  fs.writeFileSync(subgraphPath, header + yamlStr);
}

// 生成事件處理器模板
function generateEventHandlerTemplates() {
  console.log('\n📄 生成事件處理器模板...');
  
  const templates = {};
  
  // Hero 事件處理器
  templates['hero-vrf-handlers.ts'] = `
import { MintCommitted, HeroRevealed, BatchMintCompleted, VRFManagerSet } from "../generated/Hero/Hero"
import { Hero, MintCommitment } from "../generated/schema"

export function handleHeroMintCommitted(event: MintCommitted): void {
  let commitment = new MintCommitment(event.params.player.toHex())
  commitment.user = event.params.player
  commitment.quantity = event.params.quantity
  commitment.blockNumber = event.params.blockNumber
  commitment.fromVault = event.params.fromVault
  commitment.fulfilled = false
  commitment.createdAt = event.block.timestamp
  commitment.save()
}

export function handleHeroRevealed(event: HeroRevealed): void {
  let hero = Hero.load(event.params.tokenId.toString())
  if (hero) {
    hero.rarity = event.params.rarity
    hero.power = event.params.power
    hero.isRevealed = true
    hero.save()
  }
}

export function handleHeroBatchMintCompleted(event: BatchMintCompleted): void {
  // Update user's mint commitment as fulfilled
  let commitment = MintCommitment.load(event.params.player.toHex())
  if (commitment) {
    commitment.fulfilled = true
    commitment.save()
  }
}

export function handleHeroVRFManagerSet(event: VRFManagerSet): void {
  // Track VRF manager updates if needed
}
`;

  // Relic 事件處理器
  templates['relic-vrf-handlers.ts'] = `
import { MintCommitted, RelicRevealed, BatchMintCompleted, VRFManagerSet } from "../generated/Relic/Relic"
import { Relic, MintCommitment } from "../generated/schema"

export function handleRelicMintCommitted(event: MintCommitted): void {
  let commitment = new MintCommitment(event.params.player.toHex() + "-relic")
  commitment.user = event.params.player
  commitment.quantity = event.params.quantity
  commitment.blockNumber = event.params.blockNumber
  commitment.fromVault = event.params.fromVault
  commitment.fulfilled = false
  commitment.createdAt = event.block.timestamp
  commitment.save()
}

export function handleRelicRevealed(event: RelicRevealed): void {
  let relic = Relic.load(event.params.tokenId.toString())
  if (relic) {
    relic.rarity = event.params.rarity
    relic.capacity = event.params.capacity
    relic.isRevealed = true
    relic.save()
  }
}

export function handleRelicBatchMintCompleted(event: BatchMintCompleted): void {
  // Update user's mint commitment as fulfilled
  let commitment = MintCommitment.load(event.params.player.toHex() + "-relic")
  if (commitment) {
    commitment.fulfilled = true
    commitment.save()
  }
}

export function handleRelicVRFManagerSet(event: VRFManagerSet): void {
  // Track VRF manager updates if needed
}
`;

  // VRF Manager 事件處理器
  templates['vrf-manager-handlers.ts'] = `
import { RandomRequested, RandomFulfilled, AuthorizationUpdated } from "../generated/VRFManagerV2Plus/VRFManagerV2Plus"
import { VRFRequest, VRFAuthorization } from "../generated/schema"

export function handleRandomRequested(event: RandomRequested): void {
  let request = new VRFRequest(event.params.requestId.toString())
  request.requestId = event.params.requestId
  request.requester = event.params.requester
  request.requestType = event.params.requestType
  request.fulfilled = false
  request.createdAt = event.block.timestamp
  request.save()
}

export function handleRandomFulfilled(event: RandomFulfilled): void {
  let request = VRFRequest.load(event.params.requestId.toString())
  if (request) {
    request.fulfilled = true
    request.randomWords = event.params.randomWords
    request.fulfilledAt = event.block.timestamp
    request.save()
  }
}

export function handleAuthorizationUpdated(event: AuthorizationUpdated): void {
  let auth = new VRFAuthorization(event.params.contract_.toHex())
  auth.contract = event.params.contract_
  auth.authorized = event.params.authorized
  auth.updatedAt = event.block.timestamp
  auth.save()
}
`;
  
  // 保存模板文件
  Object.entries(templates).forEach(([filename, content]) => {
    const filepath = path.join(__dirname, 'src', 'templates', filename);
    const dir = path.dirname(filepath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, content.trim());
    console.log(`  ✅ 生成模板: ${filename}`);
  });
}

// 主函數
function main() {
  console.log('🚀 V25 VRF 事件更新');
  console.log('===================');
  
  // 更新事件
  const updated = updateDataSourceEvents();
  
  if (updated) {
    // 保存更新
    saveSubgraph();
    console.log('\n✅ subgraph.yaml 已更新');
    
    // 生成處理器模板
    generateEventHandlerTemplates();
    
    console.log('\n📌 下一步：');
    console.log('1. 更新 schema.graphql 添加新實體');
    console.log('2. 實現事件處理器函數');
    console.log('3. 運行 npm run codegen');
    console.log('4. 運行 npm run build');
    console.log('5. 部署子圖');
  } else {
    console.log('\n✅ 所有事件已是最新');
  }
}

// 執行
main();