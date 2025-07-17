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
const HERO_ADDRESS = "0xB882915F4fD4C3773e0E8eeBB65088CB584A0Bdf"
const RELIC_ADDRESS = "0x41cb97b903547C4190D66E818A64b7b37DE005c0"
const PARTY_ADDRESS = "0x075F68Ab40A55CB4341A7dF5CFdB873696502dd0"
const PLAYER_PROFILE_ADDRESS = "0x7f5D359bC65F0aB07f7A874C2efF72752Fb294e5"
const V_I_P_STAKING_ADDRESS = "0x8D7Eb405247C9AD0373D398C5F63E88421ba7b49"
const DUNGEON_MASTER_ADDRESS = "0xd13250E0F0766006816d7AfE95EaEEc5e215d082"
const PLAYER_VAULT_ADDRESS = "0x67CEecf8BE748dFd77D90D87a376Bd745B7c3c62"
const ALTAR_OF_ASCENSION_ADDRESS = "0xdf87881b48b51380CE47Bf6B54930ef1e07471F0"
const DUNGEON_CORE_ADDRESS = "0xd03d3D7456ba3B52E6E0112eBc2494dB1cB34524"
const ORACLE_ADDRESS = "0xD7e41690270Cc4f06F13eF47764F030CC4411904"
const DUNGEON_STORAGE_ADDRESS = "0x85Fe26dF31903A522e78eb7C853DeA7b6CF7eFa6"

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