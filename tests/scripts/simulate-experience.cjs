// simulate-experience.cjs
// Simulate adding experience to understand the issue

const { createPublicClient, http, parseAbi, encodeFunctionData } = require('viem');
const { bsc } = require('viem/chains');

const ADDRESSES = {
  DungeonCore: '0x3dCcbcbf81911A635E2b21e2e49925F6441B08B6',
  DungeonMaster: '0x108ed6B38D30099E1d2D141Ef0813938E279C0Fe',
  PlayerProfile: '0xBba4fE0b9Ac0b16786986aF0F39535B37D09Ff1F'
};

const TARGET_ADDRESS = '0x10925A7138649C7E1794CE646182eeb5BF8ba647';

const PLAYER_PROFILE_ABI = parseAbi([
  'function addExperience(address _player, uint256 _amount) external',
  'function mintProfile(address _player) public returns (uint256)',
  'function profileTokenOf(address _player) view returns (uint256)',
  'function dungeonCore() view returns (address)'
]);

const DUNGEON_CORE_ABI = parseAbi([
  'function dungeonMaster() view returns (address)'
]);

async function simulateExperience() {
  const client = createPublicClient({
    chain: bsc,
    transport: http('https://bsc-dataseed.binance.org/')
  });

  console.log('🔍 Simulating Experience Addition\n');

  try {
    // 1. Verify the authorization chain
    console.log('1️⃣ Checking Authorization Chain:');
    
    // Get dungeonMaster from DungeonCore
    const dungeonMaster = await client.readContract({
      address: ADDRESSES.DungeonCore,
      abi: DUNGEON_CORE_ABI,
      functionName: 'dungeonMaster'
    });
    console.log(`   DungeonCore.dungeonMaster(): ${dungeonMaster}`);
    console.log(`   Expected: ${ADDRESSES.DungeonMaster}`);
    console.log(`   ✅ Match: ${dungeonMaster.toLowerCase() === ADDRESSES.DungeonMaster.toLowerCase()}`);

    // Get dungeonCore from PlayerProfile
    const dungeonCore = await client.readContract({
      address: ADDRESSES.PlayerProfile,
      abi: PLAYER_PROFILE_ABI,
      functionName: 'dungeonCore'
    });
    console.log(`   PlayerProfile.dungeonCore(): ${dungeonCore}`);
    console.log(`   Expected: ${ADDRESSES.DungeonCore}`);
    console.log(`   ✅ Match: ${dungeonCore.toLowerCase() === ADDRESSES.DungeonCore.toLowerCase()}`);

    // 2. Check current profile status
    console.log('\n2️⃣ Current Profile Status:');
    const tokenId = await client.readContract({
      address: ADDRESSES.PlayerProfile,
      abi: PLAYER_PROFILE_ABI,
      functionName: 'profileTokenOf',
      args: [TARGET_ADDRESS]
    });
    console.log(`   Token ID: ${tokenId}`);
    console.log(`   Has Profile: ${tokenId > 0n ? '✅' : '❌'}`);

    // 3. Simulate addExperience call from DungeonMaster
    console.log('\n3️⃣ Simulating addExperience call:');
    console.log('   From: DungeonMaster');
    console.log('   To: PlayerProfile.addExperience()');
    console.log('   Args: player=' + TARGET_ADDRESS + ', amount=100');

    // Encode the function call
    const calldata = encodeFunctionData({
      abi: PLAYER_PROFILE_ABI,
      functionName: 'addExperience',
      args: [TARGET_ADDRESS, 100n]
    });

    try {
      // Try to simulate the call from DungeonMaster
      const result = await client.simulateContract({
        address: ADDRESSES.PlayerProfile,
        abi: PLAYER_PROFILE_ABI,
        functionName: 'addExperience',
        args: [TARGET_ADDRESS, 100n],
        account: ADDRESSES.DungeonMaster
      });
      console.log('   ✅ Simulation successful!');
      console.log('   Result:', result);
    } catch (error) {
      console.log('   ❌ Simulation failed!');
      console.log('   Error:', error.message);
      
      // Try to decode the error
      if (error.cause) {
        console.log('   Revert reason:', error.cause.reason || error.cause.message);
      }
    }

    // 4. Try simulating from wrong address to verify authorization
    console.log('\n4️⃣ Testing authorization (should fail):');
    try {
      await client.simulateContract({
        address: ADDRESSES.PlayerProfile,
        abi: PLAYER_PROFILE_ABI,
        functionName: 'addExperience',
        args: [TARGET_ADDRESS, 100n],
        account: TARGET_ADDRESS // Using player's own address
      });
      console.log('   ❌ SECURITY ISSUE: Unauthorized call succeeded!');
    } catch (error) {
      console.log('   ✅ Authorization working correctly - unauthorized call rejected');
      if (error.cause && error.cause.reason) {
        console.log('   Rejection reason:', error.cause.reason);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

simulateExperience().catch(console.error);