import { type Address } from 'viem';
import { bsc, bscTestnet } from 'wagmi/chains';
import {
  soulShardTokenABI,
  heroABI,
  relicABI,
  dungeonCoreABI,
  partyABI,
  altarOfAscensionABI,
  playerProfileABI
} from './abis';

export const contracts = {
  [bscTestnet.id]: {
    soulShard: { address: '0xD6126BBDDC96BDDD81b0C082f45b63D6448B984F', abi: soulShardTokenABI },
    hero: { address: '0x...', abi: heroABI },
    relic: { address: '0x...', abi: relicABI },
    dungeonCore: { address: '0x...', abi: dungeonCoreABI },
    party: { address: '0x...', abi: partyABI },
    altarOfAscension: { address: '0x...', abi: altarOfAscensionABI },
    playerProfile: { address: '0x68Fb281d098E0f6b93dc7aB4D3A501f9032C18Df', abi: playerProfileABI },
  },
  [bsc.id]: {
    soulShard: { address: '0x...', abi: soulShardTokenABI },
    hero: { address: '0x...', abi: heroABI },
    relic: { address: '0x...', abi: relicABI },
    dungeonCore: { address: '0x...', abi: dungeonCoreABI },
    party: { address: '0x...', abi: partyABI },
    altarOfAscension: { address: '0x...', abi: altarOfAscensionABI },
    playerProfile: { address: '0x32cD66394B5d0df19881861B66F57B4692491254', abi: playerProfileABI },
  },
} as const;

// 【第1步：定義我們支援的 Chain ID 的型別】
type SupportedChainId = keyof typeof contracts;

// 【第2步：建立一個輔助函式 (型別守衛)，來檢查 chainId 是否被支援】
function isSupportedChain(chainId: number): chainId is SupportedChainId {
    return chainId in contracts;
}

// 【第3步：更新 ContractName 的型別定義，讓它更精確】
export type ContractName = keyof (typeof contracts)[SupportedChainId];

// 【第4步：重構 getContract 函式，使用我們的型別守衛】
export function getContract<T extends ContractName>(
  chainId: number | undefined,
  name: T
): { address: Address; abi: (typeof contracts)[SupportedChainId][T]['abi'] } | null {
  // 使用型別守衛來檢查和縮小 chainId 的型別範圍
  if (!chainId || !isSupportedChain(chainId)) {
    return null;
  }
  
  // 在這個 if 區塊之後，TypeScript 就知道 chainId 絕對是 97 或 56，
  // 所以 contracts[chainId] 是一個完全安全的操作。
  const contractConfig = contracts[chainId][name];

  if (!contractConfig) {
      return null;
  }
  
  return contractConfig;
}
