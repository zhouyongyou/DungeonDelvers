// 全域常數定義 - 避免重複創建
import { BigInt } from "@graphprotocol/graph-ts"

// 數值常數
export const ZERO = BigInt.fromI32(0)
export const ONE = BigInt.fromI32(1)
export const TEN = BigInt.fromI32(10)
export const HUNDRED = BigInt.fromI32(100)
export const THOUSAND = BigInt.fromI32(1000)

// 常用地址
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

// 統計欄位常數（避免魔術數字）
export const STATS_FIELDS = {
  TOTAL_HEROES: 1,
  TOTAL_RELICS: 2,
  TOTAL_PARTIES: 3,
  TOTAL_PLAYERS: 4,
  TOTAL_UPGRADE_ATTEMPTS: 5,
  SUCCESSFUL_UPGRADES: 6,
  TOTAL_HEROES_MINTED: 7,
  TOTAL_RELICS_MINTED: 8,
  TOTAL_PARTIES_CREATED: 9,
  TOTAL_EXPEDITIONS: 10,
  SUCCESSFUL_EXPEDITIONS: 11,
}

// 區塊時間常數（BSC = 3 秒）
export const BLOCK_TIME = 3
export const BLOCKS_PER_MINUTE = 20
export const BLOCKS_PER_HOUR = 1200
export const BLOCKS_PER_DAY = 28800