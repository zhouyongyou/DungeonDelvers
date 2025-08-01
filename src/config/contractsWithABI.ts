// V25 Contract Configuration with ABI
// Generated on 2025-08-01T11:41:43.056Z
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
      address: '0x20E0db8EFCC7608fCFFBbF2f95A86824b034D1e7',
      abi: HeroABI
    },
    RELIC: {
      address: '0x3c8F1b4172a076D31f0F8fa981E166aDA92C2B79',
      abi: RelicABI
    },
    PARTY: {
      address: '0x1f21fE51c039321246b219B9F659eaCA9a53176F',
      abi: PartyABI
    },
    
    // Core Contracts
    DUNGEONCORE: {
      address: '0x398F362ec79064159FFbb1079C9cA683896B758b',
      abi: DungeonCoreABI
    },
    DUNGEONMASTER: {
      address: '0x913E5c5c6d844630fd01CbDed82F029f356f1809',
      abi: DungeonMasterABI
    },
    PLAYERPROFILE: {
      address: '0xB203a1e73500E40A1eeb1D6A51cDDbf2fEb227a2',
      abi: PlayerProfileABI
    },
    VIPSTAKING: {
      address: '0xa55fee3ba652e6Ff42ac12C8598C5fDfC26EE4Bf',
      abi: VIPStakingABI
    },
    ORACLE: {
      address: '0x1d13750861ABE5aec2b4166F8a41edE084693f51',
      abi: OracleABI
    },
    ALTAROFASCENSION: {
      address: '0x167F42bcC21a5ab5319b787F8C2e045f9Aeaa4dD',
      abi: AltarOfAscensionABI
    },
    PLAYERVAULT: {
      address: '0x8c3A73E27C518f082150330e5666e765B52297AF',
      abi: PlayerVaultABI
    },
    DUNGEONSTORAGE: {
      address: '0xB5eFB972f67cA8488EDdd19bDf4e86D30dE779c1',
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
  lastUpdated: "2025-08-01T11:41:43.056Z"
};
