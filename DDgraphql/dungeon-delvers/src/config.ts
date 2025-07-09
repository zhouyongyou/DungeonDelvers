// DDgraphql/dungeon-delvers/src/config.ts
// 統一的合約地址配置管理

import { dataSource } from "@graphprotocol/graph-ts"

// 合約地址配置
class ContractAddresses {
    hero: string = ""
    relic: string = ""
    party: string = ""
    playerProfile: string = ""
    vipStaking: string = ""
    dungeonMaster: string = ""
    playerVault: string = ""
    altarOfAscension: string = ""
}

// BSC 網路的合約地址
const BSC_ADDRESSES: ContractAddresses = {
    hero: "0xfc2a24E894236a6169d2353BE430a3d5828111D2",
    relic: "0xd86245Ddce19E8F94Bc30f0facf7bd111069FAf9",
    party: "0x4F4796b04e3BD3E8d5B447e32944d8B04eF53EB2",
    playerProfile: "0xE51ae47bf0f9958a0b35f1830675d88C2c7F5232",
    vipStaking: "0x8A9943Bb231eC9131d750c7bcf8A4Ae36bd4f0F8",
    dungeonMaster: "0xe208554A49aDeE49FA774a736C5279A5CB930FB8",
    playerVault: "0x22ec24B183afd81c69d14ebB9f226D3e0BC75C03",
    altarOfAscension: "0xd9bE09b96959BEA3e335850b540EC51b841Df9Cc"
}

// 其他網路的地址可以在這裡添加
// const ETHEREUM_ADDRESSES: ContractAddresses = { ... }
// const POLYGON_ADDRESSES: ContractAddresses = { ... }

/**
 * 根據當前網路獲取合約地址配置
 */
function getAddressesForNetwork(): ContractAddresses {
    let network = dataSource.network()
    
    if (network == "bsc") {
        return BSC_ADDRESSES
    }
    // 可以添加其他網路
    // else if (network == "mainnet") {
    //     return ETHEREUM_ADDRESSES
    // } else if (network == "matic") {
    //     return POLYGON_ADDRESSES
    // }
    else {
        // 默認返回 BSC 地址
        return BSC_ADDRESSES
    }
}

// 導出函數來獲取各種合約地址
export function getHeroContractAddress(): string {
    return getAddressesForNetwork().hero
}

export function getRelicContractAddress(): string {
    return getAddressesForNetwork().relic
}

export function getPartyContractAddress(): string {
    return getAddressesForNetwork().party
}

export function getPlayerProfileContractAddress(): string {
    return getAddressesForNetwork().playerProfile
}

export function getVIPStakingContractAddress(): string {
    return getAddressesForNetwork().vipStaking
}

export function getDungeonMasterContractAddress(): string {
    return getAddressesForNetwork().dungeonMaster
}

export function getPlayerVaultContractAddress(): string {
    return getAddressesForNetwork().playerVault
}

export function getAltarOfAscensionContractAddress(): string {
    return getAddressesForNetwork().altarOfAscension
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