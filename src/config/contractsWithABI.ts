// V25 Contract Configuration with ABI
// Generated on 2025-08-03T11:07:19.316Z
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
      address: '0x001b7462B0f1Ab832c017a6f09133932Be140b18',
      abi: HeroABI
    },
    RELIC: {
      address: '0xdd8E52cD1d248D04C306c038780315a03866B402',
      abi: RelicABI
    },
    PARTY: {
      address: '0x382024850E08AB37E290315fc5f3692b8D6646EB',
      abi: PartyABI
    },
    
    // Core Contracts
    DUNGEONCORE: {
      address: '0x2953ed03825b40e9c1EBa1cAe5FBD47f20A4823d',
      abi: DungeonCoreABI
    },
    DUNGEONMASTER: {
      address: '0x9e17c01A610618223d49D64E322DC1b6360E4E8D',
      abi: DungeonMasterABI
    },
    PLAYERPROFILE: {
      address: '0x481ABDF19E41Bf2cE84075174675626aa027fE82',
      abi: PlayerProfileABI
    },
    VIPSTAKING: {
      address: '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C',
      abi: VIPStakingABI
    },
    ORACLE: {
      address: '0xdbf49cd5708C56b8b0848233b754b418806D7018',
      abi: OracleABI
    },
    ALTAROFASCENSION: {
      address: '0xB102a57eD4697f7A721541fd7B0bba8D6bdF63a5',
      abi: AltarOfAscensionABI
    },
    PLAYERVAULT: {
      address: '0x7085b353f553225B6001Ba23ECCb39611fBa31Bf',
      abi: PlayerVaultABI
    },
    DUNGEONSTORAGE: {
      address: '0x22bbcF5411c991A5DE7774Ace435DcBF69EF0a8a',
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
  lastUpdated: "2025-08-03T11:07:19.316Z"
};
