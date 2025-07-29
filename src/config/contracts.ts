// V25 Contract Configuration
// Generated on 2025-07-29T21:12:48.665Z
// DO NOT EDIT MANUALLY - Use v25-sync-all.js to update

export const CONTRACTS = {
  56: { // BSC Mainnet
    // Core Contracts
    DUNGEONCORE: '0x69Ef62C83E992b7285CFce4345DB26099575dA62',
    ORACLE: '0xF38e98A9d3EcBC04E6049997aBFC939F1DCCD470',
    
    // Token Contracts
    SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
    
    // NFT Contracts
    HERO: '0x2F9c6EF3B2447417E633fD9e05E30B152dC691EE',
    RELIC: '0x9f367175c88394A3A924bd3778B09F98b9F1587a',
    PARTY: '0x4d058545FCe6d3511960B2706b9D529E9aBb78D3',
    
    // Game Contracts
    DUNGEONMASTER: '0x6503a51b7452Fd9c8D17CC447C357Eb2c7145789',
    DUNGEONSTORAGE: '0xB717bCed3e53b2657F6736042782eb3c412D1B2d',
    PLAYERVAULT: '0x77d58a567865c225C270A299B9AA8C869223B9B2',
    PLAYERPROFILE: '0x64e8A1F68BFB14cFC8444786F240616068a51b5E',
    
    // Feature Contracts
    VIPSTAKING: '0xF503872475bf07048755AA9FAC8B5A9312C91D89',
    ALTAROFASCENSION: '0xa1F4EF2C5A6078c8D14f0D588cd75497da68Fe3a',
    
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
  deploymentBlock: 55761797,
  lastUpdated: new Date().toISOString()
};

// Legacy contract name mappings for backward compatibility
export const LEGACY_CONTRACT_NAMES = {
  soulShardToken: 'SOULSHARD',
  testUsd: 'USD'
} as const;
