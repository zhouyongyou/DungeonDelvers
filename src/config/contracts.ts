// V25 Contract Configuration
// Generated on 2025-08-02T15:03:09.411Z
// DO NOT EDIT MANUALLY - Use v25-sync-all.js to update

export const CONTRACTS = {
  56: { // BSC Mainnet
    // Core Contracts
    DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
    ORACLE: '0x67989939163bCFC57302767722E1988FFac46d64',
    
    // Token Contracts
    SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
    
    // NFT Contracts
    HERO: '0x5d71d62fAFd07C92ec677C3Ae57984576f5955f0',
    RELIC: '0x5f93fCdb2ecd1A0eB758E554bfeB3A2B95581366',
    PARTY: '0x6B32c2EEaB24C04bF97A022B1e55943FE1E772a5',
    
    // Game Contracts
    DUNGEONMASTER: '0x446f80c6562a9b0A33b48F74F7Dbf10b53Fe2703',
    DUNGEONSTORAGE: '0x88EF98E7F9095610d7762C30165854f271525B97',
    PLAYERVAULT: '0x39523e8eeB6c54fCe65D62ec696cA5ad888eF25c',
    PLAYERPROFILE: '0xCf352E394fD2Ff27D65bB525C032a2c03Bd79AC7',
    
    // Feature Contracts
    VIPSTAKING: '0x186a89e5418645459ed0a469FF97C9d4B2ca5355',
    ALTAROFASCENSION: '0xaA4f3D3ed21599F501773F83a1A2B4d65b1d0AE3',
    
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
  deploymentBlock: 56184733,
  lastUpdated: new Date().toISOString()
};

// Legacy contract name mappings for backward compatibility
export const LEGACY_CONTRACT_NAMES = {
  soulShardToken: 'SOULSHARD',
  testUsd: 'USD'
} as const;
