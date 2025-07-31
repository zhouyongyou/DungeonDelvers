// V25 Contract Configuration with ABI
// Generated on 2025-07-31T16:34:09.223Z
// DO NOT EDIT MANUALLY - Use v25-sync-all.js to update

import HeroABI from '../abis/Hero.json';
import RelicABI from '../abis/Relic.json';
import PartyABI from '../abis/Party.json';
import DungeonCoreABI from '../abis/DungeonCore.json';
import DungeonMasterABI from '../abis/DungeonMaster.json';
import PlayerProfileABI from '../abis/PlayerProfile.json';
import VIPStakingABI from '../abis/VIPStaking.json';
import OracleABI from '../abis/Oracle.json';
import AltarOfAscensionABI from '../abis/AltarOfAscension.json';
import PlayerVaultABI from '../abis/PlayerVault.json';
import DungeonStorageABI from '../abis/DungeonStorage.json';
import SoulShardTokenABI from '../abis/SoulShardToken.json';

export interface ContractWithABI {
  address: string;
  abi: any;
}

export const CONTRACTS_WITH_ABI = {
  56: { // BSC Mainnet
    // NFT Contracts
    HERO: {
      address: '0x785a8b7d7b2E64c5971D8f548a45B7db3CcA5797',
      abi: HeroABI
    },
    RELIC: {
      address: '0xaa7434e77343cd4AaE7dDea2f19Cb86232727D0d',
      abi: RelicABI
    },
    PARTY: {
      address: '0x2890F2bFe5ff4655d3096eC5521be58Eba6fAE50',
      abi: PartyABI
    },
    
    // Core Contracts
    DUNGEONCORE: {
      address: '0xB8A111Ce09beCC7Aac7C4058f990b57ead635c58',
      abi: DungeonCoreABI
    },
    DUNGEONMASTER: {
      address: '0x2F78de7Fdc08E95616458038a7A1E2EE28e0fa85',
      abi: DungeonMasterABI
    },
    PLAYERPROFILE: {
      address: '0xF1b836D09A30C433A2479a856c84e0d64DBBD973',
      abi: PlayerProfileABI
    },
    VIPSTAKING: {
      address: '0x58A16F4845BA7Fea4377399d74D50d8aeE58fde4',
      abi: VIPStakingABI
    },
    ORACLE: {
      address: '0xf21548F8836d0ddB87293C4bCe2B020D17fF11c1',
      abi: OracleABI
    },
    ALTAROFASCENSION: {
      address: '0xbaA5CC63F9d531288e4BD87De64Af05FdA481ED9',
      abi: AltarOfAscensionABI
    },
    PLAYERVAULT: {
      address: '0x2746Ce8D6Aa7A885c568530abD9846460cA602f1',
      abi: PlayerVaultABI
    },
    DUNGEONSTORAGE: {
      address: '0xB5cf98A61682C4e0bd66124DcbF5fB794B584d8D',
      abi: DungeonStorageABI
    },
    
    // Token Contracts
    SOULSHARD: {
      address: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
      abi: SoulShardTokenABI
    },
    
    // Additional Addresses (from master-config.json)
    USD: {
      address: '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE',
      abi: [] // USD Token ABI if needed
    },
    UNISWAP_POOL: {
      address: '0x1e5Cd5F386Fb6F39cD8788675dd3A5ceB6521C82',
      abi: [] // Uniswap V3 Pool ABI if needed
    },
    DUNGEONMASTERWALLET: {
      address: '0x10925A7138649C7E1794CE646182eeb5BF8ba647',
      abi: [] // This is a wallet address, not a contract
    }
  }
} as const;

// Contract version for tracking
export const CONTRACT_VERSION = 'V25';

// Helper function to get contract with ABI - supports both signatures
export function getContractWithABI(name: keyof typeof CONTRACTS_WITH_ABI[56]): ContractWithABI;
export function getContractWithABI(chainId: number, name: string): ContractWithABI | undefined;
export function getContractWithABI(
  nameOrChainId: keyof typeof CONTRACTS_WITH_ABI[56] | number,
  nameIfChainId?: string
): ContractWithABI | undefined {
  // Support old signature: getContractWithABI(name)
  if (typeof nameOrChainId === 'string') {
    return CONTRACTS_WITH_ABI[56][nameOrChainId];
  }
  
  // Support new signature: getContractWithABI(chainId, name)
  const chainId = nameOrChainId as number;
  const name = nameIfChainId!;
  
  // Convert contract name to uppercase to match the keys
  const upperName = name.toUpperCase();
  
  // Check if chainId exists in CONTRACTS_WITH_ABI
  if (!(chainId in CONTRACTS_WITH_ABI)) {
    console.warn(`Chain ID ${chainId} not found in CONTRACTS_WITH_ABI`);
    return undefined;
  }
  
  const chainContracts = CONTRACTS_WITH_ABI[chainId as keyof typeof CONTRACTS_WITH_ABI];
  
  // Check if contract exists for this chain
  if (!(upperName in chainContracts)) {
    console.warn(`Contract ${name} (${upperName}) not found for chain ${chainId}`);
    return undefined;
  }
  
  return chainContracts[upperName as keyof typeof chainContracts];
}

/**
 * @deprecated Use getContractWithABI() instead. This function only returns the address.
 * Legacy compatibility function - will be removed in future versions.
 */
export const getContract = (name: keyof typeof CONTRACTS_WITH_ABI[56]): string => {
  console.warn(`⚠️ getContract('${name}') is deprecated. Use getContractWithABI('${name}') instead.`);
  return CONTRACTS_WITH_ABI[56][name].address;
};

// Export contract info for debugging
export const CONTRACT_INFO = {
  version: CONTRACT_VERSION,
  network: "BSC Mainnet",
  deploymentBlock: 55808316,
  lastUpdated: "2025-07-31T16:34:09.223Z"
};
