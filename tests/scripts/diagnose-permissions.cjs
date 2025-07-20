// diagnose-permissions.cjs
// Diagnose permission issues between contracts

const { createPublicClient, http, parseAbi, getContract: viemGetContract } = require('viem');
const { bsc } = require('viem/chains');

const ADDRESSES = {
  DungeonCore: '0x3dCcbcbf81911A635E2b21e2e49925F6441B08B6',
  DungeonMaster: '0x108ed6B38D30099E1d2D141Ef0813938E279C0Fe',
  PlayerProfile: '0xBba4fE0b9Ac0b16786986aF0F39535B37D09Ff1F'
};

const DUNGEON_CORE_ABI = parseAbi([
  'function dungeonMaster() view returns (address)',
  'function playerProfile() view returns (address)',
  'function owner() view returns (address)'
]);

const PLAYER_PROFILE_ABI = parseAbi([
  'function dungeonCore() view returns (address)',
  'function owner() view returns (address)'
]);

async function diagnosePermissions() {
  const client = createPublicClient({
    chain: bsc,
    transport: http('https://bsc-dataseed.binance.org/')
  });

  console.log('🔍 Diagnosing Contract Permissions\n');

  try {
    // Check DungeonCore configuration
    console.log('1️⃣ DungeonCore Configuration:');
    
    const dungeonCoreContract = viemGetContract({
      address: ADDRESSES.DungeonCore,
      abi: DUNGEON_CORE_ABI,
      client
    });

    // Get bytecode to check if it's the right interface
    const dungeonCoreCode = await client.getBytecode({ address: ADDRESSES.DungeonCore });
    console.log(`   Contract deployed: ${dungeonCoreCode && dungeonCoreCode !== '0x' ? '✅' : '❌'}`);
    
    // Try to get owner first
    try {
      const owner = await dungeonCoreContract.read.owner();
      console.log(`   Owner: ${owner}`);
    } catch (e) {
      console.log(`   Owner: ❌ Failed to read (${e.message})`);
    }

    // Try different function selectors
    console.log('\n   Testing function selectors:');
    
    // Standard getter functions might have different names
    const possibleSelectors = [
      { name: 'dungeonMaster', selector: '0x9c47d712' },
      { name: 'playerProfile', selector: '0xcc181ca8' },
      { name: 'getDungeonMaster', selector: '0x72c69e8b' },
      { name: 'getPlayerProfile', selector: '0x8c3c0a42' },
      { name: 'dungeonMasterAddress', selector: '0x7f4e5c9f' },
      { name: 'playerProfileAddress', selector: '0x5834be58' }
    ];

    for (const { name, selector } of possibleSelectors) {
      try {
        const result = await client.call({
          to: ADDRESSES.DungeonCore,
          data: selector
        });
        if (result && result.data && result.data !== '0x') {
          console.log(`   ${name}: ${result.data}`);
        }
      } catch (e) {
        // Silently skip
      }
    }

    // Check PlayerProfile configuration
    console.log('\n2️⃣ PlayerProfile Configuration:');
    
    const playerProfileContract = viemGetContract({
      address: ADDRESSES.PlayerProfile,
      abi: PLAYER_PROFILE_ABI,
      client
    });

    try {
      const dungeonCore = await playerProfileContract.read.dungeonCore();
      console.log(`   DungeonCore address: ${dungeonCore}`);
      console.log(`   Expected: ${ADDRESSES.DungeonCore}`);
      console.log(`   ✅ Match: ${dungeonCore.toLowerCase() === ADDRESSES.DungeonCore.toLowerCase()}`);
    } catch (e) {
      console.log(`   DungeonCore: ❌ Failed to read (${e.message})`);
    }

    try {
      const owner = await playerProfileContract.read.owner();
      console.log(`   Owner: ${owner}`);
    } catch (e) {
      console.log(`   Owner: ❌ Failed to read (${e.message})`);
    }

    // Try to decode the contract storage directly
    console.log('\n3️⃣ Checking DungeonCore Storage Slots:');
    
    // Common storage slots for contract addresses
    const storageSlots = [
      '0x0', // slot 0 - often owner
      '0x1', // slot 1
      '0x2', // slot 2
      '0x3', // slot 3
      '0x4', // slot 4
      '0x5', // slot 5
      '0x6', // slot 6
      '0x7', // slot 7
      '0x8', // slot 8
      '0x9', // slot 9
    ];

    for (const slot of storageSlots) {
      try {
        const value = await client.getStorageAt({
          address: ADDRESSES.DungeonCore,
          slot
        });
        if (value && value !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
          // Check if it looks like an address (20 bytes at the end)
          const possibleAddress = '0x' + value.slice(-40);
          if (possibleAddress.toLowerCase() === ADDRESSES.DungeonMaster.toLowerCase()) {
            console.log(`   Slot ${slot}: DungeonMaster found! ${possibleAddress}`);
          } else if (possibleAddress.toLowerCase() === ADDRESSES.PlayerProfile.toLowerCase()) {
            console.log(`   Slot ${slot}: PlayerProfile found! ${possibleAddress}`);
          } else if (value.length === 66) { // Full slot used, might be address
            console.log(`   Slot ${slot}: ${possibleAddress}`);
          }
        }
      } catch (e) {
        // Skip
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

diagnosePermissions().catch(console.error);