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
 * 🕒 最後同步時間：2025/7/24 下午7:45:10
 */

// 合約地址常量 (自動從 subgraph.yaml 同步)
const HERO_ADDRESS = "0x141F081922D4015b3157cdA6eE970dff34bb8AAb"
const RELIC_ADDRESS = "0xB1eb505426e852B8Dca4BF41454a7A22D2B6F3D3"
const PARTY_V3_ADDRESS = "0xf240c4fD2651Ba41ff09eB26eE01b21f42dD9957"
const V_I_P_STAKING_ADDRESS = "0x43A6C6cC9D15f2C68C7ec98deb01f2b69a618470"
const PLAYER_PROFILE_ADDRESS = "0x1d36C2F3f0C9212422B94608cAA72080CBf34A41"
const ALTAR_OF_ASCENSION_ADDRESS = "0xb53c51Dc426c2Bd29da78Ac99426c55A6D6a51Ab"

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