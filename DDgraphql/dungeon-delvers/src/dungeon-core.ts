// src/dungeon-core.ts
import { OracleSet, PlayerVaultSet } from "../generated/DungeonCore/DungeonCore"
import { GlobalStats } from "../generated/schema"
import { getOrCreateGlobalStats } from "./stats"

export function handleOracleSet(event: OracleSet): void {
  // 記錄 Oracle 設定事件，只需要更新時間戳
  const stats = getOrCreateGlobalStats()
  stats.lastUpdated = event.block.timestamp
  stats.save()
}

export function handlePlayerVaultSet(event: PlayerVaultSet): void {
  // 記錄 PlayerVault 設定事件，只需要更新時間戳
  const stats = getOrCreateGlobalStats()
  stats.lastUpdated = event.block.timestamp
  stats.save()
}