import { type Address } from 'viem';
import { bsc, bscTestnet } from 'wagmi/chains';
import { 
  soulShardTokenABI,
  heroABI,
  relicABI,
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

const mainnetContractAddresses = { /* ... 您的主網地址 ... */ };

type ContractName = keyof typeof testnetContractAddresses;

const getContractAddress = (chainId: number, name: ContractName): Address | undefined => {
  const addresses = chainId === bsc.id ? mainnetContractAddresses : testnetContractAddresses;
  return addresses[name] as Address;
};

const getContractAbi = (name: ContractName) => { /* ... */ return { hero: heroABI, /*...*/ }[name]; };

export const getContract = (chainId: number, name: ContractName) => {
  // 【修正】現在我們在 useContractEvents 中已經確保 chainId 存在了。
  // 但保留這個警告是一個好習慣。
  const address = getContractAddress(chainId, name);
  const abi = getContractAbi(name);

  if (!address || !abi) {
    console.warn(`Contract '${name}' not found for chainId '${chainId}'`);
    // 明確回傳 null，讓呼叫方可以做檢查
    return null;
  }
  
  return { address, abi };
};

