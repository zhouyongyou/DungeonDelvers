// check-more-slots.cjs
const { createPublicClient, http } = require('viem');
const { bsc } = require('viem/chains');

const ADDRESSES = {
  DungeonCore: '0x3dCcbcbf81911A635E2b21e2e49925F6441B08B6',
  PlayerProfile: '0xBba4fE0b9Ac0b16786986aF0F39535B37D09Ff1F'
};

async function checkMoreSlots() {
  const client = createPublicClient({
    chain: bsc,
    transport: http('https://bsc-dataseed.binance.org/')
  });

  console.log('🔍 Checking more storage slots for PlayerProfile address\n');

  // Check slots 10-20
  for (let i = 10; i <= 20; i++) {
    const slot = '0x' + i.toString(16);
    try {
      const value = await client.getStorageAt({
        address: ADDRESSES.DungeonCore,
        slot
      });
      if (value && value !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        const possibleAddress = '0x' + value.slice(-40);
        console.log(`Slot ${slot}: ${possibleAddress}`);
        if (possibleAddress.toLowerCase() === ADDRESSES.PlayerProfile.toLowerCase()) {
          console.log('  ✅ PlayerProfile found!');
        }
      }
    } catch (e) {
      // Skip
    }
  }
}

checkMoreSlots().catch(console.error);