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
 * 🕒 最後同步時間：2025-01-20 (手動更新為 V12 地址)
 */

// 合約地址常量 (V12 - 2025-01-20 更新地城配置)
const HERO_ADDRESS = "0x6f4Bd03ea8607c6e69bCc971b7d3CC9e5801EF5E"
const RELIC_ADDRESS = "0x853DAAeC0ae354bF40c732C199Eb09F1a0CD3dC1"
const PARTY_ADDRESS = "0x847DceaE26aF1CFc09beC195CE87a9b5701863A7"
const PLAYER_PROFILE_ADDRESS = "0x39b09c3c64D5ada443d2965cb31C7bad7AC66F2f"
const V_I_P_STAKING_ADDRESS = "0x738eA7A2408F56D47EF127954Db42D37aE6339D5"
const DUNGEON_MASTER_ADDRESS = "0xb71f6ED7B13452a99d740024aC17470c1b4F0021"
const PLAYER_VAULT_ADDRESS = "0xA5BA5EE03d452eA5e57c72657c8EC03C6F388E1f"
const ALTAR_OF_ASCENSION_ADDRESS = "0xB9878bBDcB82926f0D03E0157e8c34AEa35E06cb"
const DUNGEON_CORE_ADDRESS = "0x2CB2Bd1b18CDd0cbF37cD6F7FF672D03E7a038a5"
const ORACLE_ADDRESS = "0xcF7c97a055CBf8d61Bb57254F0F54A2cbaa09806"
const DUNGEON_STORAGE_ADDRESS = "0xea21D782CefD785B128346F39f1574c8D6eb64C9"

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