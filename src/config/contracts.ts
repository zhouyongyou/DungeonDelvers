// V25 Contract Configuration
// Generated on 2025-07-31T13:14:46.070Z
// DO NOT EDIT MANUALLY - Use v25-sync-all.js to update

export const CONTRACTS = {
  56: { // BSC Mainnet
    // Core Contracts
    DUNGEONCORE: '0xB8A111Ce09beCC7Aac7C4058f990b57ead635c58',
    ORACLE: '0xf21548F8836d0ddB87293C4bCe2B020D17fF11c1',
    
    // Token Contracts
    SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
    
    // NFT Contracts
    HERO: '0x785a8b7d7b2E64c5971D8f548a45B7db3CcA5797',
    RELIC: '0xaa7434e77343cd4AaE7dDea2f19Cb86232727D0d',
    PARTY: '0x2890F2bFe5ff4655d3096eC5521be58Eba6fAE50',
    
    // Game Contracts
    DUNGEONMASTER: '0x2F78de7Fdc08E95616458038a7A1E2EE28e0fa85',
    DUNGEONSTORAGE: '0xB5cf98A61682C4e0bd66124DcbF5fB794B584d8D',
    PLAYERVAULT: '0x2746Ce8D6Aa7A885c568530abD9846460cA602f1',
    PLAYERPROFILE: '0xF1b836D09A30C433A2479a856c84e0d64DBBD973',
    
    // Feature Contracts
    VIPSTAKING: '0x58A16F4845BA7Fea4377399d74D50d8aeE58fde4',
    ALTAROFASCENSION: '0xbaA5CC63F9d531288e4BD87De64Af05FdA481ED9',
    
    // External
    DUNGEONMASTERWALLET: 'undefined',
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
  deploymentBlock: 55808316,
  lastUpdated: new Date().toISOString()
};

// Legacy contract name mappings for backward compatibility
export const LEGACY_CONTRACT_NAMES = {
  soulShardToken: 'SOULSHARD',
  testUsd: 'USD'
} as const;
