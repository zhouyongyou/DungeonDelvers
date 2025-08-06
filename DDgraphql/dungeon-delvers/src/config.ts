/**
 * Subgraph Configuration
 * V25 Production Deployment
 */

// Contract addresses
export const HERO_ADDRESS = '0xcaF37D9D8356eE18938466F4590A69Bf84C35E15';
export const RELIC_ADDRESS = '0xfA0F9E7bb19761A731be73FD04d6FF38ebF0555A';
export const PARTY_ADDRESS = '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3';
export const VIP_STAKING_ADDRESS = '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C';
export const PLAYER_PROFILE_ADDRESS = '0x0f5932e89908400a5AfDC306899A2987b67a3155';
export const ALTAR_OF_ASCENSION_ADDRESS = '0x21EB6D4EE01aA881539d6aeA275618EDAE9cB3E1';
export const DUNGEON_MASTER_ADDRESS = '0x8DcE0E0b3063e84f85A419833e72D044d9Cdc816';
export const PLAYER_VAULT_ADDRESS = '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787';
export const DUNGEON_CORE_ADDRESS = '0x8a2D2b1961135127228EdD71Ff98d6B097915a13';

// Network config
export const NETWORK = 'bsc';
export const START_BLOCK = 56631513;

// Helper function to create entity IDs
export function createEntityId(contractAddress: string, tokenId: string): string {
  return contractAddress + '-' + tokenId;
}

// Helper functions to get contract addresses
export function getHeroContractAddress(): string {
  return HERO_ADDRESS;
}

export function getRelicContractAddress(): string {
  return RELIC_ADDRESS;
}

export function getPartyContractAddress(): string {
  return PARTY_ADDRESS;
}
