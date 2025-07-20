// check-contracts.cjs
// Check contract deployment and configuration

const { createPublicClient, http, parseAbi } = require('viem');
const { bsc } = require('viem/chains');

// Contract addresses
const ADDRESSES = {
  DungeonCore: '0x3dCcbcbf81911A635E2b21e2e49925F6441B08B6',
  DungeonMaster: '0x108ed6B38D30099E1d2D141Ef0813938E279C0Fe',
  PlayerProfile: '0xBba4fE0b9Ac0b16786986aF0F39535B37D09Ff1F'
};

async function checkContracts() {
  const client = createPublicClient({
    chain: bsc,
    transport: http('https://bsc-dataseed.binance.org/')
  });

  console.log('🔍 Checking Contract Deployments\n');

  // Check if contracts are deployed
  for (const [name, address] of Object.entries(ADDRESSES)) {
    try {
      const code = await client.getBytecode({ address });
      const isDeployed = code && code !== '0x';
      console.log(`${name}: ${address}`);
      console.log(`  Deployed: ${isDeployed ? '✅' : '❌'}`);
      if (isDeployed) {
        console.log(`  Bytecode size: ${code.length} bytes`);
      }
    } catch (error) {
      console.log(`${name}: Error checking - ${error.message}`);
    }
  }

  // Check PlayerProfile directly with a simple call
  console.log('\n🔍 Checking PlayerProfile Functions');
  try {
    const profileAbi = parseAbi([
      'function balanceOf(address owner) view returns (uint256)',
      'function name() view returns (string)',
      'function symbol() view returns (string)'
    ]);

    const name = await client.readContract({
      address: ADDRESSES.PlayerProfile,
      abi: profileAbi,
      functionName: 'name'
    });
    console.log('  Name:', name);

    const symbol = await client.readContract({
      address: ADDRESSES.PlayerProfile,
      abi: profileAbi,
      functionName: 'symbol'
    });
    console.log('  Symbol:', symbol);

    const balance = await client.readContract({
      address: ADDRESSES.PlayerProfile,
      abi: profileAbi,
      functionName: 'balanceOf',
      args: ['0x10925A7138649C7E1794CE646182eeb5BF8ba647']
    });
    console.log('  Balance for target address:', balance.toString());

  } catch (error) {
    console.error('  Error:', error.message);
  }
}

checkContracts().catch(console.error);