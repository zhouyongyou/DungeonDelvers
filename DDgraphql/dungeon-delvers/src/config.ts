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
 * 🕒 最後同步時間：2025-07-23 (V12 部署區塊 55018576)
 */

// 合約地址常量 (V12 - 2025-07-23 區塊 55018576)
const HERO_ADDRESS = "0xAA3734B376eDf4E92402Df4328AA6C1B8254144e"
const RELIC_ADDRESS = "0xD73D7D5D279ac033c9D8639A15CcEa6B6BE2C786"
const PARTY_ADDRESS = "0x54025749950137d64469fb11263B475F6A346b83"
const PLAYER_PROFILE_ADDRESS = "0x0dEf83dbD501fC7D96Bb24FcA2eAAc06c6DD5db9"
const V_I_P_STAKING_ADDRESS = "0x56350F90a26A844B3248F55dbd5043C3B3F27927"
const DUNGEON_MASTER_ADDRESS = "0xA54104946c08E78fC9df1dB6db01f8C38a0a0fF6"
const PLAYER_VAULT_ADDRESS = "0xe7f2B5C1544a7C2530F4094AF1E492574B66bAa2"
const ALTAR_OF_ASCENSION_ADDRESS = "0xc598B642aA41e5286aC9e2F64d5a2CBBbc35288b"
const DUNGEON_CORE_ADDRESS = "0xC880c8253A617FaBe83bACd010E9E26369e12aDB"
const ORACLE_ADDRESS = "0x097561AFa628Ce7c6565705ce3d36DF505777070"
const DUNGEON_STORAGE_ADDRESS = "0x1E5f011D9eF295aef7e6bA54e760b73976547b4b"

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