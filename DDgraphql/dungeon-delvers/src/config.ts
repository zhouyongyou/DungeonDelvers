// DDgraphql/dungeon-delvers/src/config.ts
// 🎯 單一來源配置管理 - 只依賴 subgraph.yaml
// ⚠️ 此文件由腳本自動生成，請勿手動編輯！
// 🔄 更新方式：修改 subgraph.yaml 後運行 npm run sync-addresses

import { dataSource } from "@graphprotocol/graph-ts"

/**
 * ⚠️ 重要說明：這些地址自動從 subgraph.yaml 同步！
 * 
 * 💡 維護方式：
 * 1. 只在 subgraph.yaml 中修改地址
 * 2. 運行 npm run sync-addresses 自動同步
 * 
 * 📋 地址來源：subgraph.yaml dataSources[].source.address
 * 🕒 最後同步時間：2025-01-17 (手動更新為 V2 地址)
 */

// 合約地址常量 (v2.0.0 - DungeonMaster V2 版本)
const HERO_ADDRESS = "0xaF1Ca485BB112236BE70A40F0CD79D9D562B50E8"
const RELIC_ADDRESS = "0x07161a55DBc5f6351013B3513fab2b524F93023b"
const PARTY_ADDRESS = "0xBFcfB4e00EF020b30A602e982026e54617dAfd44"
const PLAYER_PROFILE_ADDRESS = "0xFa6D78B73546cf7D28ec11dee3131245e52ba9b9"
const V_I_P_STAKING_ADDRESS = "0x5a5eB30cA44CD30179c470dCbC9787b5666BC530"
const DUNGEON_MASTER_ADDRESS = "0x5D4ae4275A5173A52EF32F42F21F13794dcFD95d"
const PLAYER_VAULT_ADDRESS = "0x61c42bB0f0F123a85D6305Efa8eaaA51c9Ab2A7E"
const ALTAR_OF_ASCENSION_ADDRESS = "0x86681Fb06cB3Be62c0b175B72381868610DF1092"
const DUNGEON_CORE_ADDRESS = "0x942cde20A3ebA345e6A329B71362C383bC2cDa48"
const ORACLE_ADDRESS = "0x6B2df9AA4586A8Cb228E872C8Ea35CA31c0286AB"
const DUNGEON_STORAGE_ADDRESS = "0x43b9745063c488781bBE45373E1d539A4a00d52e"

// 導出函數來獲取各種合約地址
export function getHeroContractAddress(): string {
    return HERO_ADDRESS
}

export function getRelicContractAddress(): string {
    return RELIC_ADDRESS
}

export function getPartyContractAddress(): string {
    return PARTY_ADDRESS
}

export function getPlayerProfileContractAddress(): string {
    return PLAYER_PROFILE_ADDRESS
}

export function getVIPStakingContractAddress(): string {
    return V_I_P_STAKING_ADDRESS
}

export function getDungeonMasterContractAddress(): string {
    return DUNGEON_MASTER_ADDRESS
}

export function getPlayerVaultContractAddress(): string {
    return PLAYER_VAULT_ADDRESS
}

export function getAltarOfAscensionContractAddress(): string {
    return ALTAR_OF_ASCENSION_ADDRESS
}

export function getDungeonCoreContractAddress(): string {
    return DUNGEON_CORE_ADDRESS
}

export function getOracleContractAddress(): string {
    return ORACLE_ADDRESS
}

export function getDungeonStorageContractAddress(): string {
    return DUNGEON_STORAGE_ADDRESS
}

// 工具函數：驗證地址是否有效
export function isValidAddress(address: string): bool {
    return address.length == 42 && address.startsWith("0x")
}

// 工具函數：獲取當前網路
export function getCurrentNetwork(): string {
    return dataSource.network()
}

// 工具函數：建立實體 ID
export function createEntityId(contractAddress: string, tokenId: string): string {
    return contractAddress.toLowerCase().concat("-").concat(tokenId)
}