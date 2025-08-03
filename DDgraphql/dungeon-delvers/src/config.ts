// DDgraphql/dungeon-delvers/src/config.ts
// 🎯 單一來源配置管理 - 只依賴 subgraph.yaml
// ⚠️ 此文件由腳本自動生成，請勿手動編輯！
// 🔄 更新方式：修改 subgraph.yaml 後運行 npm run sync-addresses
// 🤖 最後同步: 2025/8/3 下午6:51:40

import { dataSource } from "@graphprotocol/graph-ts"

/**
 * ⚠️ 重要說明：這些地址自動從 V25 配置同步！
 * 
 * 💡 維護方式：
 * 1. 只在合約項目的 master-config.json 中修改地址
 * 2. 運行 v25-sync-all.js 腳本自動同步
 * 
 * 📋 地址來源：V25 配置文件
 * 🕒 最後同步時間：2025/8/3 下午6:51:40
 */

// 合約地址常量 (自動從 V25 配置同步)
const HERO_ADDRESS = "0x5d71d62fAFd07C92ec677C3Ae57984576f5955f0"
const RELIC_ADDRESS = "0x5f93fCdb2ecd1A0eB758E554bfeB3A2B95581366"
const PARTY_V3_ADDRESS = "0x6B32c2EEaB24C04bF97A022B1e55943FE1E772a5"
const V_I_P_STAKING_ADDRESS = "0x186a89e5418645459ed0a469FF97C9d4B2ca5355"
const PLAYER_PROFILE_ADDRESS = "0xCf352E394fD2Ff27D65bB525C032a2c03Bd79AC7"
const ALTAR_OF_ASCENSION_ADDRESS = "0xaA4f3D3ed21599F501773F83a1A2B4d65b1d0AE3"

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
