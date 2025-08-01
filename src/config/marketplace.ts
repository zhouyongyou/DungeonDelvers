// DungeonDelvers Marketplace V2 Configuration
// 統一的 Marketplace 配置管理
// ⚠️ IMPORTANT: 使用與主配置一致的 V25 NFT 合約地址
// Last synced: 2025-08-01T11:26:53.174Z
// Last synced: 2025-08-01T05:54:34.889Z

export const MARKETPLACE_V2_CONFIG = {
  // Contract addresses (deployed 2025-07-29)
  contracts: {
    DungeonMarketplaceV2: '0xCd2Dc43ddB5f628f98CDAA273bd74605cBDF21F8' as const,
    OfferSystemV2: '0xE072DC1Ea6243aEaD9c794aFe2585A8b6A5350EF' as const,
  },
  
  // V25 NFT Contract addresses (must match master-config.json)
  nftContracts: {
    HERO: '0x785a8b7d7b2E64c5971D8f548a45B7db3CcA5797' as const,
    RELIC: '0xaa7434e77343cd4AaE7dDea2f19Cb86232727D0d' as const,
    PARTY: '0x2890F2bFe5ff4655d3096eC5521be58Eba6fAE50' as const,
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