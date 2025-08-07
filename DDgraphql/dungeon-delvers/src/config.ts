/**
 * Subgraph Configuration
 * Generated on 2025-08-07T14:59:45.034Z
 * DO NOT EDIT MANUALLY - Use sync-system to update
 */

// Contract addresses
export const HERO_ADDRESS = '0x671d937b171e2ba2c4dc23c133b07e4449f283ef';
export const RELIC_ADDRESS = '0x42bf1bd8fc5a8dfdd0e97de131246ec0e3ec73da';
export const PARTY_ADDRESS = '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3';
export const VIP_STAKING_ADDRESS = '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C';
export const PLAYER_PROFILE_ADDRESS = '0x0f5932e89908400a5AfDC306899A2987b67a3155';
export const ALTAR_OF_ASCENSION_ADDRESS = '0xa86749237d4631ad92ba859d0b0df4770f6147ba';
export const DUNGEON_MASTER_ADDRESS = '0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a';
export const PLAYER_VAULT_ADDRESS = '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787';
export const VRF_MANAGER_ADDRESS = '0x980d224ec4d198d94f34a8af76a19c00dabe2436';

// Network info
export const NETWORK = 'bsc';
export const START_BLOCK = 56757876;
export const VERSION = 'v3.8.1';

// Helper function to create consistent entity IDs
export function createEntityId(contractAddress: string, tokenId: string): string {
  return contractAddress.toLowerCase() + '-' + tokenId;
}

// Helper functions to get contract addresses
export function getHeroContractAddress(): string {
  return HERO_ADDRESS.toLowerCase();
}

export function getRelicContractAddress(): string {
  return RELIC_ADDRESS.toLowerCase();
}

export function getPartyContractAddress(): string {
  return PARTY_ADDRESS.toLowerCase();
}
