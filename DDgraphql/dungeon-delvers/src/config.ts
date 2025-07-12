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

// 合約地址常量 (自動從 subgraph.yaml 同步)
const HERO_ADDRESS = "0x2a046140668cBb8F598ff3852B08852A8EB23b6a"
const RELIC_ADDRESS = "0x95F005e2e0d38381576DA36c5CA4619a87da550E"
const PARTY_ADDRESS = "0x11FB68409222B53b04626d382d7e691e640A1DcD"
const PLAYER_PROFILE_ADDRESS = "0x43a9BE911f1074788A00cE8e6E00732c7364c1F4"
const V_I_P_STAKING_ADDRESS = "0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB"
const DUNGEON_MASTER_ADDRESS = "0xd14A5eFFc45D0131af3eb876992fC6eD9683f5B0"
const PLAYER_VAULT_ADDRESS = "0x6187DBCcb58088E414437A6b8d58a42cD2BD1ec4"
const ALTAR_OF_ASCENSION_ADDRESS = "0x83a7fB85E0892A67041FcFc4c1F0F1111e5aB3DA"

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