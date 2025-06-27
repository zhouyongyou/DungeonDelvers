// import { type Address } from 'viem';
import { bsc, bscTestnet } from 'wagmi/chains';
import { 
    heroABI, 
    relicABI, 
    partyABI, 
    dungeonCoreABI, 
    soulShardTokenABI,
    altarOfAscensionABI
} from './abis';

export const contracts = {
    hero: {
        [bsc.id]: { address: '0x44fB99e32a673b5C271cb465851b626A5979854D', abi: heroABI },
        [bscTestnet.id]: { address: '0x44fB99e32a673b5C271cb465851b626A5979854D', abi: heroABI },
    },
    relic: {
        [bsc.id]: { address: '0x44fB99e32a673b5C271cb465851b626A5979854D', abi: relicABI },
        [bscTestnet.id]: { address: '0xb797A27AF84411D1b953aaA33483321481541300', abi: relicABI },
    },
    party: {
        [bsc.id]: { address: '0x44fB99e32a673b5C271cb465851b626A5979854D', abi: partyABI },
        [bscTestnet.id]: { address: '0xF2e3f53C37754b2d495A216A6534571165158E34', abi: partyABI },
    },
    dungeonCore: {
        [bsc.id]: { address: '0x44fB99e32a673b5C271cb465851b626A5979854D', abi: dungeonCoreABI },
        [bscTestnet.id]: { address: '0x696089304e287414995A1E5158A59C14980C34eE', abi: dungeonCoreABI },
    },
    soulShard: {
        [bsc.id]: { address: '0x44fB99e32a673b5C271cb465851b626A5979854D', abi: soulShardTokenABI },
        [bscTestnet.id]: { address: '0x1922c525f543165437858485a9a2aAb3d7178048', abi: soulShardTokenABI },
    },
    altarOfAscension: {
        [bsc.id]: { address: '0x44fB99e32a673b5C271cb465851b626A5979854D', abi: altarOfAscensionABI },
        [bscTestnet.id]: { address: '0x44fB99e32a673b5C271cb465851b626A5979854D', abi: altarOfAscensionABI },
    },
} as const;

// 從上面的 contracts 物件中導出一個類型，方便在 getContract 中使用
type ContractName = keyof typeof contracts;

export const getContract = (chainId: number | undefined, name: ContractName) => {
    if (!chainId) {
        return null;
    }

    const contractForChain = contracts[name]?.[chainId as keyof typeof contracts[ContractName]];
    
    if (!contractForChain) {
        // console.warn(`Contract '${name}' not found for chainId '${chainId}'`);
        return null;
    }
    
    return contractForChain;
};
