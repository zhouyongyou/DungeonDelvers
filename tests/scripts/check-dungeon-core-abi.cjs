// check-dungeon-core-abi.cjs
// Check the actual DungeonCore contract interface

const { createPublicClient, http, parseAbi, keccak256, toHex } = require('viem');
const { bsc } = require('viem/chains');

const DUNGEON_CORE_ADDRESS = '0x3dCcbcbf81911A635E2b21e2e49925F6441B08B6';

// Known function signatures
const FUNCTION_SIGS = {
  'dungeonMaster()': '0x9c47d712',
  'playerProfile()': '0xcc181ca8',
  'owner()': '0x8da5cb5b',
  'hero()': '0x4ee202ce',
  'relic()': '0x8a928edc',
  'party()': '0x58659b66',
  'playerVault()': '0xbc2e0143',
  'oracle()': '0x7dc0d1d0',
  'vipStaking()': '0x43d7d5f5',
  'altarOfAscension()': '0xecb93ee0'
};

async function checkDungeonCoreABI() {
  const client = createPublicClient({
    chain: bsc,
    transport: http('https://bsc-dataseed.binance.org/')
  });

  console.log('🔍 Checking DungeonCore Contract Interface\n');
  console.log('Address:', DUNGEON_CORE_ADDRESS);

  // Check if contract is deployed
  const code = await client.getBytecode({ address: DUNGEON_CORE_ADDRESS });
  console.log('Contract deployed:', code && code !== '0x' ? '✅' : '❌');
  console.log('Bytecode length:', code ? code.length : 0, 'bytes\n');

  // Try calling each function
  console.log('Testing function calls:');
  for (const [sig, selector] of Object.entries(FUNCTION_SIGS)) {
    try {
      const result = await client.call({
        to: DUNGEON_CORE_ADDRESS,
        data: selector
      });
      
      if (result.data && result.data !== '0x') {
        // Convert result to address format
        const address = '0x' + result.data.slice(-40);
        console.log(`✅ ${sig.padEnd(20)} => ${address}`);
      } else {
        console.log(`❌ ${sig.padEnd(20)} => No data`);
      }
    } catch (error) {
      console.log(`❌ ${sig.padEnd(20)} => Reverted`);
    }
  }

  // Also try some common getter patterns
  console.log('\nTrying alternative function names:');
  const alternativeNames = [
    'getDungeonMaster',
    'getPlayerProfile',
    'dungeonMasterAddress',
    'playerProfileAddress',
    'contracts',
    'getContract'
  ];

  for (const name of alternativeNames) {
    const sig = keccak256(toHex(name + '()')).slice(0, 10);
    try {
      const result = await client.call({
        to: DUNGEON_CORE_ADDRESS,
        data: sig
      });
      
      if (result.data && result.data !== '0x') {
        console.log(`✅ ${name}() [${sig}] => ${result.data}`);
      }
    } catch (error) {
      // Silent skip
    }
  }

  // Check the actual slots again with proper formatting
  console.log('\nDirect storage slots:');
  const knownAddresses = {
    '0x10925a7138649c7e1794ce646182eeb5bf8ba647': 'Owner/Developer',
    '0x108ed6b38d30099e1d2d141ef0813938e279c0fe': 'DungeonMaster',
    '0xbba4fe0b9ac0b16786986af0f39535b37d09ff1f': 'PlayerProfile',
    '0x929a4187a462314fcc480ff547019fa122a283f0': 'Hero',
    '0x1067295025d21f59c8acb5e777e42f3866a6d2ff': 'Relic',
    '0xe4a55375f7aba70785f958e2661e08f9fd5f7ab1': 'Party',
    '0x294fb94d5a543cd77c9932fd34282462a74bff1a': 'PlayerVault',
    '0x7abea5b90528a19580a0a2a83e4cf9ad4871880f': 'VIPStaking',
    '0xd26444ec19e567b872824fe0b9c104e45a3a3341': 'AltarOfAscension',
    '0xfa2255d806c62a68e8b2f4a7e20f3e8ae9a15c06': 'Oracle'
  };

  for (let i = 0; i <= 15; i++) {
    const slot = '0x' + i.toString(16);
    try {
      const value = await client.getStorageAt({
        address: DUNGEON_CORE_ADDRESS,
        slot
      });
      if (value && value !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
        const address = '0x' + value.slice(-40);
        const label = knownAddresses[address.toLowerCase()] || 'Unknown';
        console.log(`Slot ${slot.padEnd(4)}: ${address} (${label})`);
      }
    } catch (e) {
      // Skip
    }
  }
}

checkDungeonCoreABI().catch(console.error);