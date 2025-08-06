/**
 * Subgraph Configuration
 * Generated on 2025-08-07T00:30:00.000Z
 * DO NOT EDIT MANUALLY - Use sync-system to update
 */

// Contract addresses
export const HERO_ADDRESS = '0x05Cbb0DbdA4B66c4CC6f60CdADFDb4C4995D9BFD';
export const RELIC_ADDRESS = '0x9B36DA9584d8170bAA1693F14E898f44eBFc77F4';
export const PARTY_ADDRESS = '0x28A85D14e0F87d6eD04e21c30992Df8B3e9434E3';
export const VIP_STAKING_ADDRESS = '0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C';
export const PLAYER_PROFILE_ADDRESS = '0x0f5932e89908400a5AfDC306899A2987b67a3155';
export const ALTAR_OF_ASCENSION_ADDRESS = '0x095559778C0BAA2d8FA040Ab0f8752cF07779D33';
export const DUNGEON_MASTER_ADDRESS = '0xE391261741Fad5FCC2D298d00e8c684767021253';
export const PLAYER_VAULT_ADDRESS = '0x62Bce9aF5E2C47b13f62A2e0fCB1f9C7AfaF8787';
export const VRF_MANAGER_ADDRESS = '0xE1D1c53e2e467BFF3d6e4EffB7b89C0C10711ad1';

// Network info
export const NETWORK = 'bsc';
export const START_BLOCK = 56688770;
export const VERSION = 'v3.7.1';

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