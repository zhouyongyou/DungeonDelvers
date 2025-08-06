// V25 Contract Configuration
// Generated on 2025-08-06T16:15:09.388Z
// DO NOT EDIT MANUALLY - Use v25-sync-all.js to update

import { formatEther } from 'viem';

export const CONTRACTS = {
  56: { // BSC Mainnet
    // Core Contracts
    DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
    ORACLE: '0xf8CE896aF39f95a9d5Dd688c35d381062263E25a',
    
    // Token Contracts
    SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
    
    // NFT Contracts
    HERO: '0xD48867dbac5f1c1351421726B6544f847D9486af',
    RELIC: '0x86f15792Ecfc4b5F2451d841A3fBaBEb651138ce',
    PARTY: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
    
    // Game Contracts
    DUNGEONMASTER: '0xE391261741Fad5FCC2D298d00e8c684767021253',
    DUNGEONSTORAGE: '0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468',
    PLAYERVAULT: '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787',
    PLAYERPROFILE: '0x0f5932e89908400a5AfDC306899A2987b67a3155',
    
    // Feature Contracts
    VIPSTAKING: '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C',
    ALTAROFASCENSION: '0x095559778C0BAA2d8FA040Ab0f8752cF07779D33',
    
    // VRF Manager
    VRFMANAGER: '0xFac10cd51981ED3aE85a05c5CFF6ab5b8e145038',
    
    // External
    DUNGEONMASTERWALLET: '0x10925A7138649C7E1794CE646182eeb5BF8ba647',
  }
} as const;

// Contract version for tracking
export const CONTRACT_VERSION = 'V25';

// Export individual addresses for convenience
export const {
  DUNGEONCORE,
  ORACLE,
  SOULSHARD,
  HERO,
  RELIC,
  PARTY,
  DUNGEONMASTER,
  DUNGEONSTORAGE,
  PLAYERVAULT,
  PLAYERPROFILE,
  VIPSTAKING,
  ALTAROFASCENSION,
  VRFMANAGER,
  DUNGEONMASTERWALLET,
} = CONTRACTS[56];

// Legacy compatibility - for V24 format
export const CONTRACT_ADDRESSES = CONTRACTS[56];

// Helper functions for backward compatibility
export const getContract = (name: keyof typeof CONTRACT_ADDRESSES): string => {
  return CONTRACT_ADDRESSES[name];
};

export const getContractAddress = (name: string): string => {
  return CONTRACT_ADDRESSES[name as keyof typeof CONTRACT_ADDRESSES] || '';
};

// Export contract info for debugging
export const CONTRACT_INFO = {
  version: CONTRACT_VERSION,
  network: "BSC Mainnet",
  deploymentBlock: 56664525,
  lastUpdated: "2025-08-06T16:17:10.017Z"
};

// Legacy contract name mappings for backward compatibility
export const LEGACY_CONTRACT_NAMES = {
  soulShardToken: 'SOULSHARD',
  testUsd: 'USD'
} as const;

// VRF and fee calculation
export function calculateMintFee(quantity: number, platformFeePerUnit: bigint, vrfFee: bigint) {
  // Platform fee calculation: platformFee * quantity + VRF fee (fixed)
  const platformFeeTotal = platformFeePerUnit * BigInt(quantity);
  const totalFee = platformFeeTotal + vrfFee;
  
  return {
    platform: platformFeeTotal,
    vrf: vrfFee,
    total: formatEther(totalFee)
  };
}
