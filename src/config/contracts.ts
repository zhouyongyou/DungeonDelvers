// Generated from V25 VRF update on 2025-08-06T10:12:14.536Z
// V25 Production Deployment - VRF Enabled

export const CONTRACTS = {
  // VRF Updated NFT Contracts
  Hero: '0xcaF37D9D8356eE18938466F4590A69Bf84C35E15',
  Relic: '0xfA0F9E7bb19761A731be73FD04d6FF38ebF0555A',
  Party: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
  
  // VRF Updated Core Contracts  
  DungeonCore: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
  DungeonMaster: '0x8DcE0E0b3063e84f85A419833e72D044d9Cdc816',
  DungeonStorage: '0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468',
  AltarOfAscension: '0x21EB6D4EE01aA881539d6aeA275618EDAE9cB3E1',
  
  // VRF System
  VRFManager: '0xD062785C376560A392e1a5F1b25ffb35dB5b67bD',
  
  // DeFi Contracts
  Oracle: '0xf8CE896aF39f95a9d5Dd688c35d381062263E25a',
  SoulShard: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
  USD: '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE',
  UniswapPool: '0x1e5Cd5F386Fb6F39cD8788675dd3A5ceB6521C82',
  
  // Player Contracts
  PlayerVault: '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787',
  PlayerProfile: '0x0f5932e89908400a5AfDC306899A2987b67a3155',
  VIPStaking: '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C',
} as const;

// Export alias for backward compatibility
export const CONTRACT_ADDRESSES = CONTRACTS;

// VRF Configuration
export const VRF_CONFIG = {
  enabled: true,
  requestPrice: '0.005', // BNB
  platformFee: '0.0003', // BNB per NFT
  revealBlockDelay: 3,
  maxRevealWindow: 255,
};

// Helper function to calculate mint fees
export function calculateMintFee(quantity: number): {
  platformFee: string;
  vrfFee: string;
  total: string;
} {
  const platformFeeWei = BigInt(Math.floor(parseFloat(VRF_CONFIG.platformFee) * 1e18)) * BigInt(quantity);
  const vrfFeeWei = VRF_CONFIG.enabled ? BigInt(Math.floor(parseFloat(VRF_CONFIG.requestPrice) * 1e18)) : BigInt(0);
  const totalWei = platformFeeWei + vrfFeeWei;
  
  return {
    platformFee: (platformFeeWei / BigInt(1e18)).toString() + '.' + (platformFeeWei % BigInt(1e18)).toString().padStart(18, '0').slice(0, 4),
    vrfFee: (vrfFeeWei / BigInt(1e18)).toString() + '.' + (vrfFeeWei % BigInt(1e18)).toString().padStart(18, '0').slice(0, 4),
    total: (totalWei / BigInt(1e18)).toString() + '.' + (totalWei % BigInt(1e18)).toString().padStart(18, '0').slice(0, 4)
  };
}

// Export for type safety
export type ContractName = keyof typeof CONTRACTS;
export type ContractAddress = typeof CONTRACTS[ContractName];