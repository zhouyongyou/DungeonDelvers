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
 * 🕒 最後同步時間：2025/7/12 上午12:18:59
 */

// 合約地址常量 (自動從 subgraph.yaml 同步)
const HERO_ADDRESS = "0xe439b1aC9100732F33C757746AD916ADE6967C79"
const RELIC_ADDRESS = "0x0a03BE7555f8B0f1F2299c4C8DCE1b8d82b2B8B4"
const PARTY_ADDRESS = "0x21326106f2D41E4d31B724B3316C780069F9274A"
const PLAYER_PROFILE_ADDRESS = "0xA19F45fC6372Ec8111E99399876e448Af05Fa735"
const V_I_P_STAKING_ADDRESS = "0x77D81358C33c24282Ce183f00bFDE590dCc3915F"
const DUNGEON_MASTER_ADDRESS = "0xD7CF07D71E0440B5cC8e2faAF3bbbc9C3588898F"
const PLAYER_VAULT_ADDRESS = "0x4fE1e22A210d26fC40f8D6fA98A21d919793C282"
const ALTAR_OF_ASCENSION_ADDRESS = "0x5186C497C7fB40Bf2B18191404E01Dd43b387cF2"

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