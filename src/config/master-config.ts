/**
 * 主配置文件 - 單一真相來源
 * 所有合約地址和配置都從這裡導出
 * 更新時間：2025-08-07 AM 7:00
 * 版本：V25 VRF
 * 部署區塊：56696666
 */

export const MASTER_CONFIG = {
  version: 'V25',
  network: 'BSC Mainnet',
  chainId: 56,
  deploymentBlock: 56696666,
  
  // 核心合約 - 長期使用
  core: {
    DUNGEONCORE: '0x8a2D2b1961135127228EdD71Ff98d6B097915a13',
    ORACLE: '0xf8CE896aF39f95a9d5Dd688c35d381062263E25a',
    SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
    USD: '0x7C67Af4EBC6651c95dF78De11cfe325660d935FE', // USD1 測試幣
    UNISWAP_POOL: '0x1e5Cd5F386Fb6F39cD8788675dd3A5ceB6521C82',
  },
  
  // NFT 合約 - V25 新部署 (8/7 PM6)
  nft: {
    HERO: '0x671d937b171e2ba2c4dc23c133b07e4449f283ef',
    RELIC: '0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da',
    PARTY: '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3',
  },
  
  // 遊戲合約 - V25 新部署
  game: {
    DUNGEONMASTER: '0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a',
    DUNGEONSTORAGE: '0x539AC926C6daE898f2C843aF8C59Ff92B4b3B468',
    ALTAROFASCENSION: '0xa86749237d4631ad92ba859d0b0df4770f6147ba',
  },
  
  // 玩家系統 - 重複使用
  player: {
    PLAYERVAULT: '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787',
    PLAYERPROFILE: '0x0f5932e89908400a5AfDC306899A2987b67a3155',
    VIPSTAKING: '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C',
  },
  
  // VRF 系統
  vrf: {
    VRFMANAGER: '0x980d224ec4d198d94f34a8af76a19c00dabe2436',
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