// V25 Contract Configuration - 2025-08-06 PM 5
// Generated on 2025-08-06T17:54:02.731Z
// DO NOT EDIT MANUALLY - Use sync scripts to update
// 
// V25 DEPLOYED CONTRACTS (2025-08-06):
// New deployments with updated DUNGEONMASTER and DUNGEONSTORAGE
// HERO & RELIC remain from fixed version to maintain stability

import { formatEther } from 'viem';

export const CONTRACTS = {
  56: { // BSC Mainnet
    // Core Contracts
    DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
    ORACLE: '0xf8CE896aF39f95a9d5Dd688c35d381062263E25a',
    
    // Token Contracts
    SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
    
    // NFT Contracts
    HERO: '0x05Cbb0DbdA4B66c4CC6f60CdADFDb4C4995D9BFD',
    RELIC: '0x9B36DA9584d8170bAA1693F14E898f44eBFc77F4',
    PARTY: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
    
    // Game Contracts
    DUNGEONMASTER: '0xE391261741Fad5FCC2D298d00e8c684767021253',
    DUNGEONSTORAGE: '0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468',
    PLAYERVAULT: '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787',
    PLAYERPROFILE: '0x0f5932e89908400a5AfDC306899A2987b67a3155',
    
    // Feature Contracts
    VIPSTAKING: '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C',
    ALTAROFASCENSION: '0x095559778C0BAA2d8FA040Ab0f8752cF07779D33',
    
    // VRF Manager (V2.5 Subscription Mode)
    VRFMANAGER: '0xE1D1c53e2e467BFF3d6e4EffB7b89C0C10711ad1',
    
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
  deploymentBlock: 56688770,
  lastUpdated: "2025-08-06T17:00:00.000Z"
};

// Legacy contract name mappings for backward compatibility
export const LEGACY_CONTRACT_NAMES = {
  soulShardToken: 'SOULSHARD',
  testUsd: 'USD'
} as const;

// VRF Configuration
export const VRF_CONFIG = {
  enabled: true,
  requestPrice: '0.0005', // BNB - 合理的 VRF 費用
  platformFee: '0', // BNB per NFT - 已設為 0
};

// Calculate total mint fee (platform fee * quantity + VRF fee)
export const calculateMintFee = (
  quantity: number, 
  contractPlatformFee?: bigint,
  contractVrfFee?: bigint
) => {
  // 🔧 修復：正確處理 0n 值和 undefined - 使用 !== undefined 而非 truthy 檢查
  const platformFeePerUnit = contractPlatformFee !== undefined
    ? Number(contractPlatformFee) / 1e18 
    : parseFloat(VRF_CONFIG.platformFee);
  
  const vrfFee = contractVrfFee !== undefined
    ? Number(contractVrfFee) / 1e18 
    : parseFloat(VRF_CONFIG.requestPrice);

  // 正確的費用計算：平台費 * 數量 + VRF 費用（固定）
  const platformFeeTotal = (platformFeePerUnit * quantity);
  const totalFee = platformFeeTotal + vrfFee;
  
  // 格式化：去除不必要的後續零
  const formatBnb = (value: number) => {
    return parseFloat(value.toFixed(6)).toString();
  };
  
  return {
    platformFee: formatBnb(platformFeeTotal),
    vrfFee: formatBnb(vrfFee), 
    total: formatBnb(totalFee)
  };
};
