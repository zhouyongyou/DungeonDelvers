// DDgraphql/dungeon-delvers/src/stats.ts

import { BigInt, Address, log } from "@graphprotocol/graph-ts";
import { GlobalStats, PlayerStats, Player } from "../generated/schema";

// 定義統計字段常量
const TOTAL_HEROES = 1;
const TOTAL_RELICS = 2;
const TOTAL_PARTIES = 3;
const TOTAL_PLAYERS = 4;
const TOTAL_UPGRADE_ATTEMPTS = 5;
const SUCCESSFUL_UPGRADES = 6;
const TOTAL_HEROES_MINTED = 7;
const TOTAL_RELICS_MINTED = 8;
const TOTAL_PARTIES_CREATED = 9;
const TOTAL_EXPEDITIONS = 10;
const SUCCESSFUL_EXPEDITIONS = 11;
const TOTAL_UPGRADE_ATTEMPTS_PLAYER = 12;
const SUCCESSFUL_UPGRADES_PLAYER = 13;

/**
 * 獲取或創建全域統計數據
 */
export function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load("global");
  if (!stats) {
    stats = new GlobalStats("global");
    stats.totalHeroes = 0;
    stats.totalRelics = 0;
    stats.totalParties = 0;
    stats.totalPlayers = 0;
    stats.totalUpgradeAttempts = 0;
    stats.successfulUpgrades = 0;
    stats.totalExpeditions = 0;
    stats.successfulExpeditions = 0;
    stats.totalRewardsDistributed = BigInt.fromI32(0);
    stats.lastUpdatedAt = BigInt.fromI32(0);
    stats.save();
  }
  return stats as GlobalStats;
}

/**
 * 獲取或創建玩家統計數據
 */
export function getOrCreatePlayerStats(playerAddress: Address): PlayerStats {
  const playerId = playerAddress;
  let stats = PlayerStats.load(playerId);
  if (!stats) {
    stats = new PlayerStats(playerId);
    stats.player = playerAddress;
    stats.totalHeroes = 0;
    stats.totalRelics = 0;
    stats.totalParties = 0;
    stats.totalExpeditions = 0;
    stats.successfulExpeditions = 0;
    stats.totalRewardsEarned = BigInt.fromI32(0);
    stats.highestPartyPower = BigInt.fromI32(0);
    stats.totalUpgradeAttempts = 0;
    stats.successfulUpgrades = 0;
    stats.lastActivityAt = BigInt.fromI32(0);
    stats.save();
  }
  return stats as PlayerStats;
}

/**
 * 更新全域統計數據
 */
export function updateGlobalStats(
  field: i32,
  increment: i32,
  timestamp: BigInt = BigInt.fromI32(0)
): void {
  const stats = getOrCreateGlobalStats();
  
  switch (field) {
    case TOTAL_HEROES:
      stats.totalHeroes = stats.totalHeroes + increment;
      break;
    case TOTAL_RELICS:
      stats.totalRelics = stats.totalRelics + increment;
      break;
    case TOTAL_PARTIES:
      stats.totalParties = stats.totalParties + increment;
      break;
    case TOTAL_PLAYERS:
      stats.totalPlayers = stats.totalPlayers + increment;
      break;
    case TOTAL_UPGRADE_ATTEMPTS:
      stats.totalUpgradeAttempts = stats.totalUpgradeAttempts + increment;
      break;
    case SUCCESSFUL_UPGRADES:
      stats.successfulUpgrades = stats.successfulUpgrades + increment;
      break;
    default:
      log.warning("Unknown global stats field: {}", [field.toString()]);
      return;
  }
  
  if (timestamp.gt(BigInt.fromI32(0))) {
    stats.lastUpdatedAt = timestamp;
  }
  
  stats.save();
  log.info("Updated global stats: {} by {}", [field.toString(), increment.toString()]);
}

/**
 * 更新玩家統計數據
 */
export function updatePlayerStats(
  playerAddress: Address,
  field: i32,
  increment: i32,
  timestamp: BigInt = BigInt.fromI32(0)
): void {
  const stats = getOrCreatePlayerStats(playerAddress);
  const playerId = playerAddress.toHexString();
  switch (field) {
    case TOTAL_HEROES_MINTED:
      stats.totalHeroes = stats.totalHeroes + increment;
      break;
    case TOTAL_RELICS_MINTED:
      stats.totalRelics = stats.totalRelics + increment;
      break;
    case TOTAL_PARTIES_CREATED:
      stats.totalParties = stats.totalParties + increment;
      break;
    case TOTAL_EXPEDITIONS:
      stats.totalExpeditions = stats.totalExpeditions + increment;
      break;
    case SUCCESSFUL_EXPEDITIONS:
      stats.successfulExpeditions = stats.successfulExpeditions + increment;
      break;
    case TOTAL_UPGRADE_ATTEMPTS_PLAYER:
      stats.totalUpgradeAttempts = stats.totalUpgradeAttempts + increment;
      break;
    case SUCCESSFUL_UPGRADES_PLAYER:
      stats.successfulUpgrades = stats.successfulUpgrades + increment;
      break;
    default:
      log.warning("Unknown player stats field: {}", [field.toString()]);
      return;
  }
  
  if (timestamp.gt(BigInt.fromI32(0))) {
    stats.lastActivityAt = timestamp;
  }
  
  stats.save();
  log.info("Updated player stats for {}: {} by {}", [playerId, field.toString(), increment.toString()]);
}

/**
 * 更新玩家統計數據中的BigInt字段
 */
export function updatePlayerStatsBigInt(
  playerAddress: Address,
  field: string,
  value: BigInt,
  timestamp: BigInt = BigInt.fromI32(0)
): void {
  const stats = getOrCreatePlayerStats(playerAddress);
  const playerId = playerAddress.toHexString();
  
  if (field == "totalRewardsEarned") {
    stats.totalRewardsEarned = stats.totalRewardsEarned.plus(value);
  } else if (field == "highestPartyPower") {
    if (value.gt(stats.highestPartyPower)) {
      stats.highestPartyPower = value;
    }
  } else {
    log.warning("Unknown player stats BigInt field: {}", [field]);
    return;
  }
  
  if (timestamp.gt(BigInt.fromI32(0))) {
    stats.lastActivityAt = timestamp;
  }
  
  stats.save();
  log.info("Updated player stats BigInt for {}: {} with value {}", [playerId, field, value.toString()]);
}

/**
 * 檢查是否為新玩家並更新統計數據
 */
export function checkAndUpdatePlayerCount(playerAddress: Address, timestamp: BigInt): void {
  const player = Player.load(playerAddress);
  const playerId = playerAddress.toHexString();
  if (!player) {
    // 這是新玩家，更新全域統計
    updateGlobalStats(TOTAL_PLAYERS, 1, timestamp);
    log.info("New player detected: {}", [playerId]);
  }
}

// 導出常量供其他文件使用
export { 
  TOTAL_HEROES, TOTAL_RELICS, TOTAL_PARTIES, TOTAL_PLAYERS, 
  TOTAL_UPGRADE_ATTEMPTS, SUCCESSFUL_UPGRADES,
  TOTAL_HEROES_MINTED, TOTAL_RELICS_MINTED, TOTAL_PARTIES_CREATED,
  TOTAL_EXPEDITIONS, SUCCESSFUL_EXPEDITIONS,
  TOTAL_UPGRADE_ATTEMPTS_PLAYER, SUCCESSFUL_UPGRADES_PLAYER
};