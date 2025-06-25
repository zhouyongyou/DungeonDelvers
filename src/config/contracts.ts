import { type Address } from 'viem';
import { bsc, bscTestnet } from 'wagmi/chains';
import { 
  soulShardTokenABI,
  heroABI_v4,
  relicABI_v4,
  partyABI,
  dungeonCoreABI 
} from './abis';

const testnetContractAddresses = {
  soulShardToken: '0x1922c525f543165437858485a9a2aAb3d7178048',
  hero: '0x44fB99e32a673b5C271cb465851b626A5979854D',
  relic: '0xb797A27AF84411D1b953aaA33483321481541300',
  party: '0xF2e3f53C37754b2d495A216A6534571165158E34',
  dungeonCore: '0x696089304e287414995A1E5158A59C14980C34eE',
};

const mainnetContractAddresses = {
  soulShardToken: 'YOUR_MAINNET_SOUL_SHARD_TOKEN_ADDRESS',
  hero: 'YOUR_MAINNET_HERO_ADDRESS',
  relic: 'YOUR_MAINNET_RELIC_ADDRESS',
  party: 'YOUR_MAINNET_PARTY_ADDRESS',
  dungeonCore: 'YOUR_MAINNET_DUNGEON_CORE_ADDRESS',
};

type ContractName = keyof typeof testnetContractAddresses;

const getContractAddress = (chainId: number | undefined, name: ContractName): Address | undefined => {
  if (!chainId) return undefined;
  const addresses = chainId === bsc.id ? mainnetContractAddresses : testnetContractAddresses;
  return addresses[name] as Address;
};

const getContractAbi = (name: ContractName) => {
  const abis = {
    soulShardToken: soulShardTokenABI,
    hero: heroABI_v4,
    relic: relicABI_v4,
    party: partyABI,
    dungeonCore: dungeonCoreABI,
  };
  return abis[name];
}

export const getContract = (chainId: number | undefined, name: ContractName) => {
  if (!chainId) {
    return null;
  }
  const address = getContractAddress(chainId, name);
  const abi = getContractAbi(name);

  if (!address || !abi) {
    console.warn(`Contract '${name}' not found for chainId '${chainId}'`);
    return null;
  }
  
  return { address, abi };
};