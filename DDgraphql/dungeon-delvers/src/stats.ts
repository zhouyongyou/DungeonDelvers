// DDgraphql/dungeon-delvers/src/stats.ts

import { BigInt, ethereum, log } from "@graphprotocol/graph-ts";
import { GlobalStats, PlayerStats, Player } from "../generated/schema";

/**
 * 獲取或創建全域統計數據
 */
export function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load("global");
  if (!stats) {
    stats = new GlobalStats("global");
    stats.totalHeroes = BigInt.fromI32(0);
    stats.totalRelics = BigInt.fromI32(0);
    stats.totalParties = BigInt.fromI32(0);
    stats.totalPlayers = BigInt.fromI32(0);
    stats.totalUpgradeAttempts = BigInt.fromI32(0);
    stats.successfulUpgrades = BigInt.fromI32(0);
    stats.lastUpdated = BigInt.fromI32(0);
    stats.save();
  }
  return stats as GlobalStats;
}

/**
 * 獲取或創建玩家統計數據
 */
export function getOrCreatePlayerStats(playerId: string): PlayerStats {
  let stats = PlayerStats.load(playerId);
  if (!stats) {
    stats = new PlayerStats(playerId);
    stats.player = playerId;
    stats.totalHeroesMinted = 0;
    stats.totalRelicsMinted = 0;
    stats.totalPartiesCreated = 0;
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
  field: string,
  increment: i32,
  timestamp: BigInt = BigInt.fromI32(0)
): void {
  let stats = getOrCreateGlobalStats();
  
  switch (field) {
    case "totalHeroes":
      stats.totalHeroes = stats.totalHeroes.plus(BigInt.fromI32(increment));
      break;
    case "totalRelics":
      stats.totalRelics = stats.totalRelics.plus(BigInt.fromI32(increment));
      break;
    case "totalParties":
      stats.totalParties = stats.totalParties.plus(BigInt.fromI32(increment));
      break;
    case "totalPlayers":
      stats.totalPlayers = stats.totalPlayers.plus(BigInt.fromI32(increment));
      break;
    case "totalUpgradeAttempts":
      stats.totalUpgradeAttempts = stats.totalUpgradeAttempts.plus(BigInt.fromI32(increment));
      break;
    case "successfulUpgrades":
      stats.successfulUpgrades = stats.successfulUpgrades.plus(BigInt.fromI32(increment));
      break;
    default:
      log.warning("Unknown global stats field: {}", [field]);
      return;
  }
  
  if (timestamp.gt(BigInt.fromI32(0))) {
    stats.lastUpdated = timestamp;
  }
  
  stats.save();
  log.info("Updated global stats: {} by {}", [field, increment.toString()]);
}

/**
 * 更新玩家統計數據
 */
export function updatePlayerStats(
  playerId: string,
  field: string,
  increment: i32,
  timestamp: BigInt = BigInt.fromI32(0)
): void {
  let stats = getOrCreatePlayerStats(playerId);
  
  switch (field) {
    case "totalHeroesMinted":
      stats.totalHeroesMinted = stats.totalHeroesMinted + increment;
      break;
    case "totalRelicsMinted":
      stats.totalRelicsMinted = stats.totalRelicsMinted + increment;
      break;
    case "totalPartiesCreated":
      stats.totalPartiesCreated = stats.totalPartiesCreated + increment;
      break;
    case "totalExpeditions":
      stats.totalExpeditions = stats.totalExpeditions + increment;
      break;
    case "successfulExpeditions":
      stats.successfulExpeditions = stats.successfulExpeditions + increment;
      break;
    case "totalUpgradeAttempts":
      stats.totalUpgradeAttempts = stats.totalUpgradeAttempts + increment;
      break;
    case "successfulUpgrades":
      stats.successfulUpgrades = stats.successfulUpgrades + increment;
      break;
    default:
      log.warning("Unknown player stats field: {}", [field]);
      return;
  }
  
  if (timestamp.gt(BigInt.fromI32(0))) {
    stats.lastActivityAt = timestamp;
  }
  
  stats.save();
  log.info("Updated player stats for {}: {} by {}", [playerId, field, increment.toString()]);
}

/**
 * 更新玩家統計數據中的BigInt字段
 */
export function updatePlayerStatsBigInt(
  playerId: string,
  field: string,
  value: BigInt,
  timestamp: BigInt = BigInt.fromI32(0)
): void {
  let stats = getOrCreatePlayerStats(playerId);
  
  switch (field) {
    case "totalRewardsEarned":
      stats.totalRewardsEarned = stats.totalRewardsEarned.plus(value);
      break;
    case "highestPartyPower":
      if (value.gt(stats.highestPartyPower)) {
        stats.highestPartyPower = value;
      }
      break;
    default:
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
export function checkAndUpdatePlayerCount(playerId: string, timestamp: BigInt): void {
  let player = Player.load(playerId);
  if (!player) {
    // 這是新玩家，更新全域統計
    updateGlobalStats("totalPlayers", 1, timestamp);
    log.info("New player detected: {}", [playerId]);
  }
}