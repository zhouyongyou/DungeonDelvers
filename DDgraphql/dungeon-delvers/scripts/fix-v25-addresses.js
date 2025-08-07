#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// V25 正確地址 (全部小寫)
const CORRECT_ADDRESSES = {
  Hero: '0x671d937b171e2ba2c4dc23c133b07e4449f283ef',
  Relic: '0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da',
  PartyV3: '0x28a85d14e0f87d6ed04e21c30992df8b3e9434e3',
  VIPStaking: '0xc0d8c84e28e5bcfc9cbd109551de53ba04e7328c',
  PlayerProfile: '0x0f5932e89908400a5afdc306899a2987b67a3155',
  DungeonMaster: '0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a',
  PlayerVault: '0x62bce9af5e2c47b13f62a2e0fcb1f9c7afaf8787',
  AltarOfAscension: '0xa86749237d4631ad92ba859d0b0df4770f6147ba',
  VRFManagerV2Plus: '0x980d224ec4d198d94f34a8af76a19c00dabe2436'
};

console.log('🔧 Fixing V25 addresses in subgraph.yaml...\n');

const subgraphPath = path.join(__dirname, '..', 'subgraph.yaml');
let content = fs.readFileSync(subgraphPath, 'utf8');

// Split by dataSources
const lines = content.split('\n');
let currentContract = null;
let newLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Detect contract name
  if (line.includes('name:')) {
    const match = line.match(/name:\s*(\w+)/);
    if (match) {
      currentContract = match[1];
      console.log(`Found contract: ${currentContract}`);
    }
  }
  
  // Replace address if we're in a known contract section
  if (line.includes('address:') && currentContract && CORRECT_ADDRESSES[currentContract]) {
    const correctAddress = CORRECT_ADDRESSES[currentContract];
    line = `      address: "${correctAddress}"`;
    console.log(`  ✅ Fixed ${currentContract} address to ${correctAddress}`);
  }
  
  newLines.push(line);
}

// Write back
fs.writeFileSync(subgraphPath, newLines.join('\n'));

console.log('\n✨ All addresses have been fixed!');
console.log('\nNext steps:');
console.log('1. Run "npm run codegen" to regenerate types');
console.log('2. Run "npm run build" to build the subgraph');
console.log('3. Deploy with "graph deploy --studio dungeon-delvers"\n');