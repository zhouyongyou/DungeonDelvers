// 優化版統計模組 - 減少 save() 調用次數
import { BigInt, Address } from "@graphprotocol/graph-ts";
import { GlobalStats, PlayerStats } from "../generated/schema";

// 統計字段常量
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
  TOTAL_UPGRADE_ATTEMPTS_PLAYER: 12,
  SUCCESSFUL_UPGRADES_PLAYER: 13,
};

// 批次更新緩存
let globalStatsPending: GlobalStats | null = null;
let playerStatsPending = new Map<string, PlayerStats>();

/**
 * 獲取或創建全域統計（優化版）
 */
export function getOrCreateGlobalStats(): GlobalStats {
  if (globalStatsPending) return globalStatsPending;
  
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
    stats.totalRewardsDistributed = BigInt.zero();
    stats.lastUpdatedAt = BigInt.zero();
  }
  globalStatsPending = stats;
  return stats as GlobalStats;
}

/**
 * 批次更新全域統計（不立即保存）
 */
export function updateGlobalStatsBatch(field: i32, increment: i32, timestamp: BigInt): void {
  const stats = getOrCreateGlobalStats();
  
  switch (field) {
    case STATS_FIELDS.TOTAL_HEROES:
      stats.totalHeroes = stats.totalHeroes + increment;
      break;
    case STATS_FIELDS.TOTAL_RELICS:
      stats.totalRelics = stats.totalRelics + increment;
      break;
    case STATS_FIELDS.TOTAL_PARTIES:
      stats.totalParties = stats.totalParties + increment;
      break;
    case STATS_FIELDS.TOTAL_PLAYERS:
      stats.totalPlayers = stats.totalPlayers + increment;
      break;
    case STATS_FIELDS.TOTAL_UPGRADE_ATTEMPTS:
      stats.totalUpgradeAttempts = stats.totalUpgradeAttempts + increment;
      break;
    case STATS_FIELDS.SUCCESSFUL_UPGRADES:
      stats.successfulUpgrades = stats.successfulUpgrades + increment;
      break;
  }
  
  if (timestamp.gt(BigInt.zero())) {
    stats.lastUpdatedAt = timestamp;
  }
}

/**
 * 提交所有待處理的統計更新
 */
export function commitStatsBatch(): void {
  // 保存全域統計
  if (globalStatsPending) {
    globalStatsPending.save();
    globalStatsPending = null;
  }
  
  // 保存所有玩家統計
  for (let i = 0; i < playerStatsPending.entries.length; i++) {
    playerStatsPending.entries[i].value.save();
  }
  playerStatsPending.clear();
}

/**
 * 簡化的單次更新（向後兼容）
 */
export function updateGlobalStats(field: i32, increment: i32, timestamp: BigInt): void {
  updateGlobalStatsBatch(field, increment, timestamp);
  commitStatsBatch();
}