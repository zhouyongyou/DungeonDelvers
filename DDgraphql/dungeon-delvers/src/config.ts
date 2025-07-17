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
 * 🕒 最後同步時間：7/12/2025, 5:56:47 PM
 */

// 合約地址常量 (v1.4.0 - 統一地址版本)
const HERO_ADDRESS = "0xaa3166b87648F10E7C8A59f000E48d21A1A048C1"
const RELIC_ADDRESS = "0x7023E506A9AD9339D5150c1c9F767A422066D3Df"
const PARTY_ADDRESS = "0xb069B70d61f96bE5f5529dE216538766672f1096"
const PLAYER_PROFILE_ADDRESS = "0x861CFCA7af4E6005884CF3fE89C2a5Cf3d6F3c85"
const V_I_P_STAKING_ADDRESS = "0x769C47058c786A9d1b0948922Db70A56394c96FD"
const DUNGEON_MASTER_ADDRESS = "0x8550ACe3B6C9Ef311B995678F9263A69bC00EC3A"
const PLAYER_VAULT_ADDRESS = "0x172cd598bC04609056e643Bba5430ceA9641aD3B"
const ALTAR_OF_ASCENSION_ADDRESS = "0x66bf56FBec308E5f2713C4B96CE8e4B02fD3ae8B"
const DUNGEON_CORE_ADDRESS = "0x548A15CaFAE2a5D19f9683CDad6D57e3320E61a7"
const ORACLE_ADDRESS = "0xB75BB304AaBfB12B3A428BE77d6a0A9052671925"
const DUNGEON_STORAGE_ADDRESS = "0xEC6773F9C52446BB2F8318dBBa09f58E72fe91b4"

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