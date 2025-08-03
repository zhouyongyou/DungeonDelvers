// DDgraphql/dungeon-delvers/src/config.ts
// 🎯 單一來源配置管理 - 只依賴 subgraph.yaml
// ⚠️ 此文件由腳本自動生成，請勿手動編輯！
// 🔄 更新方式：修改 subgraph.yaml 後運行 npm run sync-addresses
// 🤖 最後同步: 2025/8/3 下午7:07:19

import { dataSource } from "@graphprotocol/graph-ts"

/**
 * ⚠️ 重要說明：這些地址自動從 V25 配置同步！
 * 
 * 💡 維護方式：
 * 1. 只在合約項目的 master-config.json 中修改地址
 * 2. 運行 v25-sync-all.js 腳本自動同步
 * 
 * 📋 地址來源：V25 配置文件
 * 🕒 最後同步時間：2025/8/3 下午7:07:19
 */

// 合約地址常量 (自動從 V25 配置同步)
const HERO_ADDRESS = "0x001b7462B0f1Ab832c017a6f09133932Be140b18"
const RELIC_ADDRESS = "0xdd8E52cD1d248D04C306c038780315a03866B402"
const PARTY_V3_ADDRESS = "0x382024850E08AB37E290315fc5f3692b8D6646EB"
const V_I_P_STAKING_ADDRESS = "0xC0D8C84e28E5BcfC9cBD109551De53BA04e7328C"
const PLAYER_PROFILE_ADDRESS = "0x481ABDF19E41Bf2cE84075174675626aa027fE82"
const ALTAR_OF_ASCENSION_ADDRESS = "0xB102a57eD4697f7A721541fd7B0bba8D6bdF63a5"

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
