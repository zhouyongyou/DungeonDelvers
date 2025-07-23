// DungeonDelvers Contract Configuration
// Auto-generated from master-config.json
// Version: V15
// Updated: 2025-07-23T13:37:15.810Z

export const CONTRACT_ADDRESSES = {
  TESTUSD: '0xa095B8c9D9964F62A7dbA3f60AA91dB381A3e074',
  SOULSHARD: '0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF',
  HERO: '0x2b6CB00D10EFB1aF0125a26dfcbd9EBa87e07CD2',
  RELIC: '0xaEa78C3FC4bc50966aC41D76331fD0bf219D00ac',
  PARTY: '0x514AFBb114fa6c77CC025720A31aaeE038fBbcd7',
  DUNGEONCORE: '0xA43edd46Eb4416195bc1BAA3575358EA92CE49dD',
  DUNGEONMASTER: '0xaeBd33846a4a88Afd1B1c3ACB5D8C5872796E316',
  DUNGEONSTORAGE: '0xAfA453cdca0245c858DAeb4d3e21C6360F4d62Eb',
  PLAYERVAULT: '0x34d94193aa59f8a7E34040Ed4F0Ea5B231811388',
  PLAYERPROFILE: '0x5d4582266654CBEA6cC6Bdf696B68B8473521b63',
  VIPSTAKING: '0x9c2fdD1c692116aB5209983e467286844B3b9921',
  ORACLE: '0x623caa925445BeACd54Cc6C62Bb725B5d93698af',
  ALTAROFASCENSION: '0x0000000000000000000000000000000000000000',
  DUNGEONMASTERWALLET: '0x10925A7138649C7E1794CE646182eeb5BF8ba647',
} as const;

export const DEPLOYMENT_VERSION = 'V15';
export const DEPLOYMENT_DATE = '2025-07-23';

// Network Configuration
export const NETWORK_CONFIG = {
  chainId: 56,
  name: 'BSC Mainnet',
  rpc: 'https://bsc-dataseed.binance.org/',
  explorer: 'https://bscscan.com'
};

// Subgraph Configuration
export const SUBGRAPH_CONFIG = {
  studio: 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.1.0',
  decentralized: 'https://gateway.thegraph.com/api/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs',
  useDecentralized: process.env.NODE_ENV === 'production'
};
