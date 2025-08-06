/**
 * 主配置文件 - 單一真相來源
 * 所有合約地址和配置都從這裡導出
 * 更新時間：2025-08-06 PM 5:00
 * 版本：V25 VRF
 * 部署區塊：56664525
 */

export const MASTER_CONFIG = {
  version: 'V25',
  network: 'BSC Mainnet',
  chainId: 56,
  deploymentBlock: 56664525,
  
  // 核心合約 - 長期使用
  core: {
    DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
    ORACLE: '0xf8CE896aF39f95a9d5Dd688c35d381062263E25a',
    SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
    USD: '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE', // USD1 測試幣
    UNISWAP_POOL: '0x1e5Cd5F386Fb6F39cD8788675dd3A5ceB6521C82',
  },
  
  // NFT 合約 - V25 新部署
  nft: {
    HERO: '0xD48867dbac5f1c1351421726B6544f847D9486af',
    RELIC: '0x86f15792Ecfc4b5F2451d841A3fBaBEb651138ce',
    PARTY: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
  },
  
  // 遊戲合約 - V25 新部署
  game: {
    DUNGEONMASTER: '0xE391261741Fad5FCC2D298d00e8c684767021253',
    DUNGEONSTORAGE: '0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468',
    ALTAROFASCENSION: '0x095559778C0BAA2d8FA040Ab0f8752cF07779D33',
  },
  
  // 玩家系統 - 重複使用
  player: {
    PLAYERVAULT: '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787',
    PLAYERPROFILE: '0x0f5932e89908400a5AfDC306899A2987b67a3155',
    VIPSTAKING: '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C',
  },
  
  // VRF 系統
  vrf: {
    VRFMANAGER: '0xFac10cd51981ED3aE85a05c5CFF6ab5b8e145038',
    requestPrice: '0.005', // BNB
    platformFee: '0.0003', // BNB per NFT
  },
  
  // 外部地址
  external: {
    DUNGEONMASTERWALLET: '0x10925A7138649C7E1794CE646182eeb5BF8ba647',
  },
  
  // Marketplace V2 (可選，測試中)
  marketplace: {
    MARKETPLACE_V2: '0xCd2Dc43ddB5f628f98CDAA273bd74605cBDF21F8',
    OFFERSYSTEM_V2: '0xE072DC1Ea6243aEaD9c794aFe2585A8b6A5350EF',
  }
} as const;

// 類型定義
export type ContractAddress = `0x${string}`;
export type MasterConfig = typeof MASTER_CONFIG;

// 輔助函數
export const getAllContracts = () => {
  return {
    ...MASTER_CONFIG.core,
    ...MASTER_CONFIG.nft,
    ...MASTER_CONFIG.game,
    ...MASTER_CONFIG.player,
    ...MASTER_CONFIG.vrf,
    ...MASTER_CONFIG.external,
  };
};

export const getContractByName = (name: string): ContractAddress | undefined => {
  const allContracts = getAllContracts();
  return allContracts[name as keyof typeof allContracts] as ContractAddress;
};