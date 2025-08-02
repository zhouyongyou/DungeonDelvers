// V25 Contract Configuration with ABI
// Generated on 2025-08-02T12:48:10.461Z
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
      address: '0x5d71d62fAFd07C92ec677C3Ae57984576f5955f0',
      abi: HeroABI
    },
    RELIC: {
      address: '0x5f93fCdb2ecd1A0eB758E554bfeB3A2B95581366',
      abi: RelicABI
    },
    PARTY: {
      address: '0x6B32c2EEaB24C04bF97A022B1e55943FE1E772a5',
      abi: PartyABI
    },
    
    // Core Contracts
    DUNGEONCORE: {
      address: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
      abi: DungeonCoreABI
    },
    DUNGEONMASTER: {
      address: '0x446f80c6562a9b0A33b48F74F7Dbf10b53Fe2703',
      abi: DungeonMasterABI
    },
    PLAYERPROFILE: {
      address: '0xCf352E394fD2Ff27D65bB525C032a2c03Bd79AC7',
      abi: PlayerProfileABI
    },
    VIPSTAKING: {
      address: '0x186a89e5418645459ed0a469FF97C9d4B2ca5355',
      abi: VIPStakingABI
    },
    ORACLE: {
      address: '0x67989939163bCFC57302767722E1988FFac46d64',
      abi: OracleABI
    },
    ALTAROFASCENSION: {
      address: '0xaA4f3D3ed21599F501773F83a1A2B4d65b1d0AE3',
      abi: AltarOfAscensionABI
    },
    PLAYERVAULT: {
      address: '0x39523e8eeB6c54fCe65D62ec696cA5ad888eF25c',
      abi: PlayerVaultABI
    },
    DUNGEONSTORAGE: {
      address: '0x88EF98E7F9095610d7762C30165854f271525B97',
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
  deploymentBlock: 56184733,
  lastUpdated: "2025-08-02T12:48:10.461Z"
};
