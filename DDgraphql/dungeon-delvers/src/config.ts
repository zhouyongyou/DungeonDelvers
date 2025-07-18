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

// 合約地址常量 (v3.0.0 - 修復 interface 不匹配問題)
const HERO_ADDRESS = "0x33d94b7F5E32aAdEf1BD40C529c8552f0bB6d1CB"
const RELIC_ADDRESS = "0xf1A26Cbf115f62aD2a78378288b3b84f840B99ce"
const PARTY_ADDRESS = "0xcB580B4F444D72853800e6e4A3e01BD919271179"
const PLAYER_PROFILE_ADDRESS = "0xD8905614a826DBBF42601380d6f467AeDCB74e07"
const V_I_P_STAKING_ADDRESS = "0x31c94D459aAdc27F69465b83cb306DFB778D46b2"
const DUNGEON_MASTER_ADDRESS = "0x9868D71D6f28185aA2dc949973dfe3833829e93F"
const PLAYER_VAULT_ADDRESS = "0x2a5798D63e715F2B8b91000664f2556E794D00F2"
const ALTAR_OF_ASCENSION_ADDRESS = "0x1E20794D71FE5d3ce89D00b3a5F4663C814a9cdd"
const DUNGEON_CORE_ADDRESS = "0xd3E55D5EdCF5255F933F5a82b10Ad4b8e4E351b7"
const ORACLE_ADDRESS = "0x5badDb15e1C91b601E4AFbDb51c57eB4e221C3b5"
const DUNGEON_STORAGE_ADDRESS = "0xf24571268d9CECfE27825D0257F09559Ed3a0710"

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