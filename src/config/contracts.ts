// V24 合約配置 - 2025-07-27T13:30:40.192Z
// 自動生成，請勿手動修改

export const CONTRACT_ADDRESSES = {
  // Core Contracts
  DUNGEONCORE: "0x940b44fa26ad15A79ad2485A21fb63F0f634017c",
  ORACLE: "0xde3bA7f6F75AC667416a07b624b7eFA4E8892BA8",
  
  // NFT Contracts  
  HERO: "0x5c8a29f82F1aFcbf44dF023970aA6442ca3D6D96",
  RELIC: "0xA31651E260E9863f13d0b3f773716490f9ed7024",
  PARTY: "0x6e6b6Cc4fd496bF655695b3Be670Da6dF26e3d1b",
  
  // DeFi Contracts
  SOULSHARD: "0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF",
  
  // Game Mechanics
  DUNGEONMASTER: "0x1da1ab60fBA1A294e1CD0767D26CF70ee9611F6d",
  DUNGEONMASTER_WALLET: "0x10925A7138649C7E1794CE646182eeb5BF8ba647",
  PLAYERVAULT: "0x7273A8368aBAbfF7E9297Dd9eA720D43ffe2634c",
  PLAYERPROFILE: "0x44814a5E9096Be8F34365F915e42BE0C3E02b9d5",
  ALTAROFASCENSION: "0xeE9f541224AB9352A8e5CDD79CBf8B95DF11C4ef",
  VIPSTAKING: "0x78E30b5d5708db41b815D7556c333A2ea73718c4",
  DUNGEONSTORAGE: "0xfA7848Da96d5691F14b424fE48c70358eCd3EfF6",
} as const;

export const getContract = (name: keyof typeof CONTRACT_ADDRESSES): string => {
  return CONTRACT_ADDRESSES[name];
};

export const getContractAddress = (name: string): string => {
  return CONTRACT_ADDRESSES[name as keyof typeof CONTRACT_ADDRESSES] || '';
};

// Export contract info for debugging
export const CONTRACT_INFO = {
  version: "V24",
  network: "BSC Mainnet",
  deploymentBlock: 55499653,
  lastUpdated: "2025-07-27T13:27:01.035Z"
};

// Legacy contract name mappings for backward compatibility
export const LEGACY_CONTRACT_NAMES = {
  soulShardToken: 'SOULSHARD',
  testUsd: 'USD'
} as const;