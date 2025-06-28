import { bsc, bscTestnet } from 'wagmi/chains';
import { 
    heroABI, 
    relicABI, 
    partyABI, 
    dungeonCoreABI, 
    soulShardTokenABI,
    altarOfAscensionABI,
    playerProfileABI
} from './abis';

export { 
    heroABI, 
    relicABI, 
    partyABI, 
    dungeonCoreABI, 
    soulShardTokenABI,
    altarOfAscensionABI,
    playerProfileABI
};

export const contracts = {
    hero: {
        [bsc.id]: { address: '0x...', abi: heroABI },
        [bscTestnet.id]: { address: '0x...', abi: heroABI },
    },
    relic: {
        [bsc.id]: { address: '0x...', abi: relicABI },
        [bscTestnet.id]: { address: '0x...', abi: relicABI },
    },
    party: {
        [bsc.id]: { address: '0x...', abi: partyABI },
        [bscTestnet.id]: { address: '0x...', abi: partyABI },
    },
    dungeonCore: {
        [bsc.id]: { address: '0x...', abi: dungeonCoreABI },
        [bscTestnet.id]: { address: '0x...', abi: dungeonCoreABI },
    },
    soulShard: {
        [bsc.id]: { address: '0x...', abi: soulShardTokenABI },
        [bscTestnet.id]: { address: '0xD6126BBDDC96BDDD81b0C082f45b63D6448B984F', abi: soulShardTokenABI },
    },
    altarOfAscension: {
        [bsc.id]: { address: '0x...', abi: altarOfAscensionABI },
        [bscTestnet.id]: { address: '0x...', abi: altarOfAscensionABI },
    },
    playerProfile: { // [新增]
        [bsc.id]: { address: '0x32cD66394B5d0df19881861B66F57B4692491254', abi: playerProfileABI },
        [bscTestnet.id]: { address: '0x68Fb281d098E0f6b93dc7aB4D3A501f9032C18Df', abi: playerProfileABI },
    }
} as const;

type ContractName = keyof typeof contracts;

export function getContract<T extends ContractName>(chainId: number | undefined, name: T): (typeof contracts)[T][keyof (typeof contracts)[T]] | null {
    if (!chainId) return null;

    const contractSet = contracts[name];
    if (!contractSet) return null;
    
    if (chainId in contractSet) {
        return contractSet[chainId as keyof typeof contractSet];
    }
    
    return null;
}