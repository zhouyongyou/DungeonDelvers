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
 * 🕒 最後同步時間：2025-01-18 (手動更新為 V3 地址)
 */

// 合約地址常量 (V3 - 2025-01-18 完整重新部署)
const HERO_ADDRESS = "0x99658b9Aa55BFD3a8bd465c77DcCa6b1E7741dA3"
const RELIC_ADDRESS = "0xF3e8546216cFdB2F0A1E886291385785177ba773"
const PARTY_ADDRESS = "0xddCFa681Cee80D3a0F23834cC07D371792207C85"
const PLAYER_PROFILE_ADDRESS = "0xA65334a4F4aF2f344558094bD631e75A6A7617B6"
const V_I_P_STAKING_ADDRESS = "0x39f13d0ac5EFF88544e51bdf7c338fF881E311eD"
const DUNGEON_MASTER_ADDRESS = "0x311730fa5459fa099976B139f7007d98C2F1E7A7"
const PLAYER_VAULT_ADDRESS = "0xFF7642E66DF4cc240B218b361C3e5fB14573Cf0B"
const ALTAR_OF_ASCENSION_ADDRESS = "0xB868842b8F4f35F6f8996aA741Fdf8a34fBBe7ED"
const DUNGEON_CORE_ADDRESS = "0xd1F14243c42AF58E69ea7eA58570DC2d9A908D21"
const ORACLE_ADDRESS = "0x367f832fDAEFB8Bc038637a8c2E0F87521121a98"
const DUNGEON_STORAGE_ADDRESS = "0x6FF605478fea3C3270f2eeD550129c58Dea81403"

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