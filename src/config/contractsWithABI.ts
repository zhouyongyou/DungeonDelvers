// V25 Contract Configuration with ABI
// Updated on 2025-08-07T07:00:00.000Z - 8/7 am 7 deployment

import HeroArtifact from '../contracts/abi/Hero.json';
import RelicArtifact from '../contracts/abi/Relic.json';
import PartyArtifact from '../contracts/abi/Party.json';
import DungeonMasterArtifact from '../contracts/abi/DungeonMaster.json';
import DungeonStorageArtifact from '../contracts/abi/DungeonStorage.json';
import AltarOfAscensionVRFArtifact from '../contracts/abi/AltarOfAscensionVRF.json';
import VRFConsumerV2PlusArtifact from '../contracts/abi/VRFConsumerV2Plus.json';

// Extract ABI from artifacts (V25 核心合約)
const HeroABI = HeroArtifact.abi || HeroArtifact;
const RelicABI = RelicArtifact.abi || RelicArtifact;
const PartyABI = PartyArtifact.abi || PartyArtifact;
const DungeonMasterABI = DungeonMasterArtifact.abi || DungeonMasterArtifact;
const DungeonStorageABI = DungeonStorageArtifact.abi || DungeonStorageArtifact;
const AltarOfAscensionVRFABI = AltarOfAscensionVRFArtifact.abi || AltarOfAscensionVRFArtifact;
const VRFConsumerV2PlusABI = VRFConsumerV2PlusArtifact.abi || VRFConsumerV2PlusArtifact;

export interface ContractWithABI {
  address: string;
  abi: any;
}

export const CONTRACTS_WITH_ABI = {
  56: { // BSC Mainnet
    // NFT Contracts - V25 Updated (8/7 PM6 deployment)
    HERO: {
      address: '0x671d937b171e2ba2c4dc23c133b07e4449f283ef',
      abi: HeroABI
    },
    RELIC: {
      address: '0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da',
      abi: RelicABI
    },
    PARTY: {
      address: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
      abi: PartyABI
    },
    
    // Game Contracts - V25 Updated
    DUNGEONMASTER: {
      address: '0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a',
      abi: DungeonMasterABI
    },
    DUNGEONSTORAGE: {
      address: '0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468',
      abi: DungeonStorageABI
    },
    ALTAROFASCENSIONVRF: {
      address: '0xa86749237d4631ad92ba859d0b0df4770f6147ba',
      abi: AltarOfAscensionVRFABI
    },
    
    // VRF System - V25 Updated
    VRFCONSUMERV2PLUS: {
      address: '0x980d224ec4d198d94f34a8af76a19c00dabe2436',
      abi: VRFConsumerV2PlusABI
    },
    
    // Legacy addresses (using environment variables)
    DUNGEONCORE: {
      address: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
      abi: [] // Legacy contract
    },
    ORACLE: {
      address: '0xf8CE896aF39f95a9d5Dd688c35d381062263E25a',
      abi: [] // Legacy contract
    },
    SOULSHARD: {
      address: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
      abi: [] // Token contract
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
  deploymentBlock: 56688770,
  lastUpdated: "2025-08-06T16:17:10.017Z"
};
