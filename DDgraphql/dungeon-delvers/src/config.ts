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
 * 🕒 最後同步時間：7/12/2025, 5:56:47 PM
 */

// 合約地址常量 (v1.3.0 - VIP Oracle 修復版本)
const HERO_ADDRESS = "0x648FcDf1f59a2598e9f68aB3210a25A877fAD353"
const RELIC_ADDRESS = "0x6704d55c8736e373B001d54Ba00a80dbb0EC793b"
const PARTY_ADDRESS = "0x66EA7C0b2BAA497EAf18bE9f3D4459Ffc20ba491"
const PLAYER_PROFILE_ADDRESS = "0x5f041FE4f313AF8aB010319BA85b701b33De13B0"
const V_I_P_STAKING_ADDRESS = "0xE9Cb85E3671486054133eC4EfcB19cF7fbF99706"
const DUNGEON_MASTER_ADDRESS = "0xbD35485ccfc0aDF28582E2Acf2b2D22cD0F92529"
const PLAYER_VAULT_ADDRESS = "0xbaD08C748596fD72D776B2F6aa5F26100334BD4B"
const ALTAR_OF_ASCENSION_ADDRESS = "0xE29Bb0F3C613CCb56c4188026a7C60898Ad068C4"
const DUNGEON_CORE_ADDRESS = "0x5f840dE828b4349f2391aF35721564a248C077Fc"
const ORACLE_ADDRESS = "0xe72eDD302C51DAb2a2Fc599a8e2CF74247dc563B"

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