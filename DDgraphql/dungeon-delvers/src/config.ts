// DDgraphql/dungeon-delvers/src/config.ts
// 🎯 單一來源配置管理 - 只依賴 subgraph.yaml
// ⚠️ 此文件由腳本自動生成，請勿手動編輯！
// 🔄 更新方式：修改 subgraph.yaml 後運行 npm run sync-addresses
// 🤖 最後同步: 2025/7/31 下午6:53:27

import { dataSource } from "@graphprotocol/graph-ts"

/**
 * ⚠️ 重要說明：這些地址自動從 V25 配置同步！
 * 
 * 💡 維護方式：
 * 1. 只在合約項目的 master-config.json 中修改地址
 * 2. 運行 v25-sync-all.js 腳本自動同步
 * 
 * 📋 地址來源：V25 配置文件
 * 🕒 最後同步時間：2025/7/31 下午6:53:27
 */

// 合約地址常量 (自動從 V25 配置同步)
const HERO_ADDRESS = "0xF6A318568CFF7704c24C1Ab81B34de26Cd473d40"
const RELIC_ADDRESS = "0xA9bfc01562d168644E07afA704Ca2b6764E36C66"
const PARTY_V3_ADDRESS = "0xA4BA997d806FeAde847Cf82a070a694a9e51fAf2"
const V_I_P_STAKING_ADDRESS = "0x17D2BF72720d0E6BE6658e92729820350F6B4080"
const PLAYER_PROFILE_ADDRESS = "0x96e245735b92a493B29887a29b8c6cECa4f65Fc5"
const ALTAR_OF_ASCENSION_ADDRESS = "0x55548065bFF30EEaBb717149bE72b17AdA8dC4f1"

// 導出函數來獲取各種合約地址
export function getHeroContractAddress(): string {
    return HERO_ADDRESS
}

export function getRelicContractAddress(): string {
    return RELIC_ADDRESS
}

export function getPartyV3ContractAddress(): string {
    return PARTY_V3_ADDRESS
}

export function getPartyContractAddress(): string {
    return PARTY_V3_ADDRESS
}

export function getVIPStakingContractAddress(): string {
    return V_I_P_STAKING_ADDRESS
}

export function getPlayerProfileContractAddress(): string {
    return PLAYER_PROFILE_ADDRESS
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
