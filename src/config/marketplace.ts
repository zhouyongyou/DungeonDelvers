// DungeonDelvers Marketplace V2 Configuration
// 統一的 Marketplace 配置管理
// ⚠️ IMPORTANT: 使用與主配置一致的 V25 NFT 合約地址
// Last synced: 2025-08-02T12:24:50.439Z
// Last synced: 2025-08-01T13:56:00.000Z

export const MARKETPLACE_V2_CONFIG = {
  // Contract addresses (deployed 2025-07-29)
  contracts: {
    DungeonMarketplaceV2: '0xCd2Dc43ddB5f628f98CDAA273bd74605cBDF21F8' as const,
    OfferSystemV2: '0xE072DC1Ea6243aEaD9c794aFe2585A8b6A5350EF' as const,
  },
  
  // V25 NFT Contract addresses (must match master-config.json)
  nftContracts: {
    HERO: '0x20E0db8EFCC7608fCFFBbF2f95A86824b034D1e7' as const,
    RELIC: '0x3c8F1b4172a076D31f0F8fa981E166aDA92C2B79' as const,
    PARTY: '0x1f21fE51c039321246b219B9F659eaCA9a53176F' as const,
  },
  
  // Supported stablecoins on BSC (only USDT and BUSD for simplicity)
  stablecoins: {
    USDT: {
      address: '0x55d398326f99059fF775485246999027B3197955' as const,
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 18,
      icon: '💵'
    },
    BUSD: {
      address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56' as const,
      symbol: 'BUSD', 
      name: 'Binance USD',
      decimals: 18,
      icon: '💰'
    }
  },
  
  // Platform parameters
  parameters: {
    platformFee: 250, // 2.5%
    maxFee: 1000,     // 10%
    feeRecipient: '0x10925A7138649C7E1794CE646182eeb5BF8ba647' as const
  },
  
  // Deployment info
  deployment: {
    blockNumber: 55723777,
    network: 'BSC Mainnet',
    chainId: 56
  }
} as const;

// Export individual addresses for backward compatibility
export const DUNGEONMARKETPLACE_V2 = MARKETPLACE_V2_CONFIG.contracts.DungeonMarketplaceV2;
export const OFFERSYSTEM_V2 = MARKETPLACE_V2_CONFIG.contracts.OfferSystemV2;
export const SUPPORTED_STABLECOINS = MARKETPLACE_V2_CONFIG.stablecoins;