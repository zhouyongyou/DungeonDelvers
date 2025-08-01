// DDgraphql/dungeon-delvers/src/config.ts
// 🎯 單一來源配置管理 - 只依賴 subgraph.yaml
// ⚠️ 此文件由腳本自動生成，請勿手動編輯！
// 🔄 更新方式：修改 subgraph.yaml 後運行 npm run sync-addresses
// 🤖 最後同步: 2025/8/2 上午3:01:01

import { dataSource } from "@graphprotocol/graph-ts"

/**
 * ⚠️ 重要說明：這些地址自動從 V25 配置同步！
 * 
 * 💡 維護方式：
 * 1. 只在合約項目的 master-config.json 中修改地址
 * 2. 運行 v25-sync-all.js 腳本自動同步
 * 
 * 📋 地址來源：V25 配置文件
 * 🕒 最後同步時間：2025/8/2 上午3:01:01
 */

// 合約地址常量 (自動從 V25 配置同步)
const HERO_ADDRESS = "0x20E0db8EFCC7608fCFFBbF2f95A86824b034D1e7"
const RELIC_ADDRESS = "0x3c8F1b4172a076D31f0F8fa981E166aDA92C2B79"
const PARTY_V3_ADDRESS = "0x1f21fE51c039321246b219B9F659eaCA9a53176F"
const V_I_P_STAKING_ADDRESS = "0xa55fee3ba652e6Ff42ac12C8598C5fDfC26EE4Bf"
const PLAYER_PROFILE_ADDRESS = "0xB203a1e73500E40A1eeb1D6A51cDDbf2fEb227a2"
const ALTAR_OF_ASCENSION_ADDRESS = "0x167F42bcC21a5ab5319b787F8C2e045f9Aeaa4dD"

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
