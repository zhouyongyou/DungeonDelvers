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
 * 🕒 最後同步時間：7/9/2025, 4:08:42 PM
 */

// 合約地址常量 (自動從 subgraph.yaml 同步)
const HERO_ADDRESS = "0x347752f8166D270EDE722C3F31A10584bC2867b3"
const RELIC_ADDRESS = "0x06994Fb1eC1Ba0238d8CA9539dAbdbEF090A5b53"
const PARTY_ADDRESS = "0x4F4796b04e3BD3E8d5B447e32944d8B04eF53EB2"
const PLAYER_PROFILE_ADDRESS = "0xE51ae47bf0f9958a0b35f1830675d88C2c7F5232"
const V_I_P_STAKING_ADDRESS = "0x8A9943Bb231eC9131d750c7bcf8A4Ae36bd4f0F8"
const DUNGEON_MASTER_ADDRESS = "0xe208554A49aDeE49FA774a736C5279A5CB930FB8"
const PLAYER_VAULT_ADDRESS = "0x22ec24B183afd81c69d14ebB9f226D3e0BC75C03"
const ALTAR_OF_ASCENSION_ADDRESS = "0xd9bE09b96959BEA3e335850b540EC51b841Df9Cc"

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