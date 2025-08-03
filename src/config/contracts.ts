// V25 Contract Configuration
// Generated on 2025-08-03T11:07:19.316Z
// DO NOT EDIT MANUALLY - Use v25-sync-all.js to update

export const CONTRACTS = {
  56: { // BSC Mainnet
    // Core Contracts
    DUNGEONCORE: '0x2953ed03825b40e9c1EBa1cAe5FBD47f20A4823d',
    ORACLE: '0xdbf49cd5708C56b8b0848233b754b418806D7018',
    
    // Token Contracts
    SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
    
    // NFT Contracts
    HERO: '0x001b7462B0f1Ab832c017a6f09133932Be140b18',
    RELIC: '0xdd8E52cD1d248D04C306c038780315a03866B402',
    PARTY: '0x382024850E08AB37E290315fc5f3692b8D6646EB',
    
    // Game Contracts
    DUNGEONMASTER: '0x9e17c01A610618223d49D64E322DC1b6360E4E8D',
    DUNGEONSTORAGE: '0x22bbcF5411c991A5DE7774Ace435DcBF69EF0a8a',
    PLAYERVAULT: '0x7085b353f553225B6001Ba23ECCb39611fBa31Bf',
    PLAYERPROFILE: '0x481ABDF19E41Bf2cE84075174675626aa027fE82',
    
    // Feature Contracts
    VIPSTAKING: '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C',
    ALTAROFASCENSION: '0xB102a57eD4697f7A721541fd7B0bba8D6bdF63a5',
    
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
