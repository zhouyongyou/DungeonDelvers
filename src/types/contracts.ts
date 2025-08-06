/**
 * 合約類型定義
 */

import { Address } from 'viem';

// 嚴格的地址類型
export type ContractAddress = Address;

// 合約名稱枚舉
export enum ContractName {
  // Core
  DUNGEONCORE = 'DUNGEONCORE',
  ORACLE = 'ORACLE',
  SOULSHARD = 'SOULSHARD',
  
  // NFT
  HERO = 'HERO',
  RELIC = 'RELIC',
  PARTY = 'PARTY',
  
  // Game
  DUNGEONMASTER = 'DUNGEONMASTER',
  DUNGEONSTORAGE = 'DUNGEONSTORAGE',
  ALTAROFASCENSION = 'ALTAROFASCENSION',
  
  // Player
  PLAYERVAULT = 'PLAYERVAULT',
  PLAYERPROFILE = 'PLAYERPROFILE',
  VIPSTAKING = 'VIPSTAKING',
  
  // VRF
  VRFMANAGER = 'VRFMANAGER',
}

// 合約配置類型
export interface ContractConfig {
  address: ContractAddress;
  abi: readonly unknown[];
  deploymentBlock?: number;
}

// 網路配置
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  blockExplorer: string;
  contracts: Record<ContractName, ContractAddress>;
}