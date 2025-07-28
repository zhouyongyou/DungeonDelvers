#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the DungeonCore.json file
const dungeonCoreJsonPath = path.join(__dirname, '../src/config/abis/DungeonCore.json');
const dungeonCoreArtifact = JSON.parse(fs.readFileSync(dungeonCoreJsonPath, 'utf8'));

// Extract just the ABI array
const abi = dungeonCoreArtifact.abi || dungeonCoreArtifact;

// Format as TypeScript export
const tsContent = `export const dungeonCoreABI = ${JSON.stringify(abi, null, 2)} as const;`;

// Output to console (can be redirected to file)
console.log(tsContent);