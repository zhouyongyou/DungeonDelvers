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
const HERO_ADDRESS = "0x929a4187a462314fCC480ff547019fA122A283f0"
const RELIC_ADDRESS = "0x1067295025D21f59C8AcB5E777E42F3866a6D2fF"
const PARTY_ADDRESS = "0xe4A55375f7Aba70785f958E2661E08F9FD5f7ab1"
const PLAYER_PROFILE_ADDRESS = "0xBba4fE0b9Ac0b16786986aF0F39535B37D09Ff1F"
const V_I_P_STAKING_ADDRESS = "0x7aBEA5b90528a19580A0a2A83e4CF9AD4871880F"
const DUNGEON_MASTER_ADDRESS = "0x108ed6B38D30099E1d2D141Ef0813938E279C0Fe"
const PLAYER_VAULT_ADDRESS = "0x294Fb94d5a543cd77c9932fD34282462a74bFf1A"
const ALTAR_OF_ASCENSION_ADDRESS = "0xD26444ec19e567B872824fe0B9c104e45A3a3341"
const DUNGEON_CORE_ADDRESS = "0x3dCcbcbf81911A635E2b21e2e49925F6441B08B6"
const ORACLE_ADDRESS = "0xFa2255D806C62a68e8b2F4a7e20f3E8aE9a15c06"
const DUNGEON_STORAGE_ADDRESS = "0x40D0DFA394707e26247a1EFfAe0f9C1b248Fff10"

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