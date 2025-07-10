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
 * 🕒 最後同步時間：7/10/2025, 12:06:13 PM
 */

// 合約地址常量 (自動從 subgraph.yaml 同步)
const HERO_ADDRESS = "0x2Cf5429dDbd2Df730a6668b50200233c76c1116F"
const RELIC_ADDRESS = "0x548eA33d0deC74bBE9a3F0D1B5E4C660bf59E5A5"
const PARTY_ADDRESS = "0x78dBA7671753191FFeeBEEed702Aab4F2816d70D"
const PLAYER_PROFILE_ADDRESS = "0x98708fFC8afaC1289639C797f5A6F095217FAFB8"
const V_I_P_STAKING_ADDRESS = "0xf1F84F3F3632fbB9be2F3d132C3660100d2C98e2"
const DUNGEON_MASTER_ADDRESS = "0xb9beF542bd333B5301846629C87363DE4FB520b7"
const PLAYER_VAULT_ADDRESS = "0x8727c5aEd22A2cf39d183D00cC038eE600F24726"
const ALTAR_OF_ASCENSION_ADDRESS = "0x643cB4A9EF6AE813ACeeB2a1E193b6894bdf8708"

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