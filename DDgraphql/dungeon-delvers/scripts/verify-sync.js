#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const EXPECTED = {
  "DUNGEONSTORAGE": "0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468",
  "DUNGEONMASTER": "0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a",
  "HERO": "0x671d937b171e2ba2c4dc23c133b07e4449f283ef",
  "RELIC": "0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da",
  "ALTAROFASCENSION": "0xa86749237d4631ad92ba859d0b0df4770f6147ba",
  "PARTY": "0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3",
  "DUNGEONCORE": "0x8a2D2b1961135127228EdD71Ff98d6B097915a13",
  "PLAYERVAULT": "0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787",
  "PLAYERPROFILE": "0x0f5932e89908400a5AfDC306899A2987b67a3155",
  "VIPSTAKING": "0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C",
  "ORACLE": "0xf8CE896aF39f95a9d5Dd688c35d381062263E25a",
  "SOULSHARD": "0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF",
  "USD": "0x7C67Af4EBC6651c95dF78De11cfe325660d935FE",
  "UNISWAP_POOL": "0x1e5Cd5F386Fb6F39cD8788675dd3A5ceB6521C82",
  "VRF_MANAGER_V2PLUS": "0x980d224ec4d198d94f34a8af76a19c00dabe2436"
};

console.log('\n🔍 Verifying V25 configuration sync...\n');

// Check subgraph
const subgraphPath = path.join(__dirname, '..', 'subgraph.yaml');
const subgraphContent = fs.readFileSync(subgraphPath, 'utf8');

let errors = [];

Object.entries(EXPECTED).forEach(([name, address]) => {
  const lowerAddress = address.toLowerCase();
  if (!subgraphContent.includes(lowerAddress)) {
    errors.push(`❌ Subgraph missing correct address for ${name}: expected ${lowerAddress}`);
  }
});

if (errors.length === 0) {
  console.log('✅ All configurations are correctly synced!');
} else {
  console.log('❌ Found configuration mismatches:\n');
  errors.forEach(err => console.log(err));
}
