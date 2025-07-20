// debug-player-profile.js
// Debug script to check PlayerProfile experience tracking

const { createPublicClient, createWalletClient, http, parseAbi, formatEther } = require('viem');
const { bsc } = require('viem/chains');

// Contract addresses from CONTRACT_ADDRESSES.md
const ADDRESSES = {
  DungeonCore: '0x3dCcbcbf81911A635E2b21e2e49925F6441B08B6',
  DungeonMaster: '0x108ed6B38D30099E1d2D141Ef0813938E279C0Fe',
  PlayerProfile: '0xBba4fE0b9Ac0b16786986aF0F39535B37D09Ff1F',
  Party: '0xe4A55375f7Aba70785f958E2661E08F9FD5f7ab1'
};

// Target address to check
const TARGET_ADDRESS = '0x10925A7138649C7E1794CE646182eeb5BF8ba647';

// Simplified ABIs
const DUNGEON_CORE_ABI = parseAbi([
  'function playerProfile() view returns (address)',
  'function dungeonMaster() view returns (address)'
]);

const PLAYER_PROFILE_ABI = parseAbi([
  'function getExperience(address _player) view returns (uint256)',
  'function getLevel(address _player) view returns (uint256)',
  'function profileTokenOf(address _player) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function dungeonCore() view returns (address)',
  'function profileData(uint256 tokenId) view returns (uint256 experience)'
]);

const DUNGEON_MASTER_ABI = parseAbi([
  'function calculateExperience(uint256 _dungeonId, bool _success) view returns (uint256)'
]);

async function debugPlayerProfile() {
  console.log('🔍 Debugging PlayerProfile Experience Issue\n');
  console.log('Target Address:', TARGET_ADDRESS);
  console.log('Transaction Hash:', '0x4a3925d9cfd8587d17b576841f9e60a0f44a024e02d6f7f41e84f92db7d7c70f');
  console.log('Party ID: 1, Dungeon ID: 7\n');

  const client = createPublicClient({
    chain: bsc,
    transport: http(process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/')
  });

  try {
    // 1. Check DungeonCore configuration
    console.log('1️⃣ Checking DungeonCore Configuration:');
    const playerProfileFromCore = await client.readContract({
      address: ADDRESSES.DungeonCore,
      abi: DUNGEON_CORE_ABI,
      functionName: 'playerProfile'
    });
    console.log('   PlayerProfile address in DungeonCore:', playerProfileFromCore);
    console.log('   Expected PlayerProfile address:', ADDRESSES.PlayerProfile);
    console.log('   ✅ Match:', playerProfileFromCore.toLowerCase() === ADDRESSES.PlayerProfile.toLowerCase());

    const dungeonMasterFromCore = await client.readContract({
      address: ADDRESSES.DungeonCore,
      abi: DUNGEON_CORE_ABI,
      functionName: 'dungeonMaster'
    });
    console.log('   DungeonMaster address in DungeonCore:', dungeonMasterFromCore);
    console.log('   Expected DungeonMaster address:', ADDRESSES.DungeonMaster);
    console.log('   ✅ Match:', dungeonMasterFromCore.toLowerCase() === ADDRESSES.DungeonMaster.toLowerCase());

    // 2. Check PlayerProfile configuration
    console.log('\n2️⃣ Checking PlayerProfile Configuration:');
    const dungeonCoreFromProfile = await client.readContract({
      address: ADDRESSES.PlayerProfile,
      abi: PLAYER_PROFILE_ABI,
      functionName: 'dungeonCore'
    });
    console.log('   DungeonCore address in PlayerProfile:', dungeonCoreFromProfile);
    console.log('   Expected DungeonCore address:', ADDRESSES.DungeonCore);
    console.log('   ✅ Match:', dungeonCoreFromProfile.toLowerCase() === ADDRESSES.DungeonCore.toLowerCase());

    // 3. Check player profile data
    console.log('\n3️⃣ Checking Player Profile Data:');
    const tokenId = await client.readContract({
      address: ADDRESSES.PlayerProfile,
      abi: PLAYER_PROFILE_ABI,
      functionName: 'profileTokenOf',
      args: [TARGET_ADDRESS]
    });
    console.log('   Profile Token ID:', tokenId.toString());

    const balance = await client.readContract({
      address: ADDRESSES.PlayerProfile,
      abi: PLAYER_PROFILE_ABI,
      functionName: 'balanceOf',
      args: [TARGET_ADDRESS]
    });
    console.log('   Profile Balance:', balance.toString());

    const experience = await client.readContract({
      address: ADDRESSES.PlayerProfile,
      abi: PLAYER_PROFILE_ABI,
      functionName: 'getExperience',
      args: [TARGET_ADDRESS]
    });
    console.log('   Experience:', experience.toString());

    const level = await client.readContract({
      address: ADDRESSES.PlayerProfile,
      abi: PLAYER_PROFILE_ABI,
      functionName: 'getLevel',
      args: [TARGET_ADDRESS]
    });
    console.log('   Level:', level.toString());

    // If tokenId exists, check profile data directly
    if (tokenId > 0n) {
      const profileData = await client.readContract({
        address: ADDRESSES.PlayerProfile,
        abi: PLAYER_PROFILE_ABI,
        functionName: 'profileData',
        args: [tokenId]
      });
      console.log('   Profile Data (experience from mapping):', profileData.toString());
    }

    // 4. Check expected experience calculation
    console.log('\n4️⃣ Checking Expected Experience Calculation:');
    const expForDungeon7Success = await client.readContract({
      address: ADDRESSES.DungeonMaster,
      abi: DUNGEON_MASTER_ABI,
      functionName: 'calculateExperience',
      args: [7n, true] // Dungeon 7, success
    });
    console.log('   Expected EXP for Dungeon 7 Success:', expForDungeon7Success.toString());

    const expForDungeon7Fail = await client.readContract({
      address: ADDRESSES.DungeonMaster,
      abi: DUNGEON_MASTER_ABI,
      functionName: 'calculateExperience',
      args: [7n, false] // Dungeon 7, fail
    });
    console.log('   Expected EXP for Dungeon 7 Fail:', expForDungeon7Fail.toString());

    // 5. Analysis
    console.log('\n5️⃣ Analysis:');
    if (tokenId === 0n && balance === 0n) {
      console.log('   ❌ Player does not have a profile NFT');
      console.log('   The profile should have been created when the expedition completed');
      console.log('   Possible issues:');
      console.log('   - DungeonMaster failed to call addExperience');
      console.log('   - addExperience transaction reverted');
      console.log('   - Contract addresses mismatch');
    } else if (experience === 0n) {
      console.log('   ❌ Player has a profile but no experience');
      console.log('   Possible issues:');
      console.log('   - addExperience was called but failed silently');
      console.log('   - Experience calculation returned 0');
      console.log('   - Profile was created after the expedition');
    } else {
      console.log('   ✅ Player has experience:', experience.toString());
    }

  } catch (error) {
    console.error('Error during debug:', error);
  }
}

debugPlayerProfile().catch(console.error);