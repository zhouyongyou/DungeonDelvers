// DDgraphql/dungeondelvers/src/altar-of-ascension-v2.ts
// V2Fixed 祭壇事件處理器
import { 
  UpgradeAttempted,
  PlayerStatsUpdated
} from "../generated/AltarOfAscension/AltarOfAscensionV2Fixed"
import { 
  UpgradeAttempt, 
  PlayerUpgradeStats,
  GlobalUpgradeStats
} from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { updateGlobalStats, updatePlayerStats, TOTAL_UPGRADE_ATTEMPTS, SUCCESSFUL_UPGRADES, TOTAL_UPGRADE_ATTEMPTS_PLAYER, SUCCESSFUL_UPGRADES_PLAYER } from "./stats"
import { BigInt } from "@graphprotocol/graph-ts"

// V23 removed UpgradeProcessed event
/*
export function handleUpgradeProcessed(event: UpgradeProcessed): void {
    const player = getOrCreatePlayer(event.params.player)
    
    const attemptId = event.transaction.hash.toHexString().concat("-").concat(event.logIndex.toString())
    
    const upgradeAttempt = new UpgradeAttempt(attemptId)
    upgradeAttempt.player = player.id
    upgradeAttempt.type = event.params.tokenContract.toHexString()
    upgradeAttempt.targetId = event.params.targetRarity.toString()
    upgradeAttempt.materialIds = []
    upgradeAttempt.materials = []
    upgradeAttempt.isSuccess = event.params.outcome >= 2
    if (event.params.outcome >= 2) {
        upgradeAttempt.newRarity = event.params.targetRarity
    }
    upgradeAttempt.timestamp = event.block.timestamp
    
    // V2 欄位設置默認值
    upgradeAttempt.baseRarity = event.params.targetRarity - 1
    upgradeAttempt.outcome = event.params.outcome
    upgradeAttempt.fee = BigInt.fromI32(0)
    upgradeAttempt.burnedTokenIds = []
    upgradeAttempt.mintedTokenIds = []
    
    upgradeAttempt.save()
    
    // 更新統計數據
    updateGlobalStats(TOTAL_UPGRADE_ATTEMPTS, 1, event.block.timestamp)
    updatePlayerStats(event.params.player, TOTAL_UPGRADE_ATTEMPTS_PLAYER, 1, event.block.timestamp)
    
    if (event.params.outcome >= 2) {
        updateGlobalStats(SUCCESSFUL_UPGRADES, 1, event.block.timestamp)
        updatePlayerStats(event.params.player, SUCCESSFUL_UPGRADES_PLAYER, 1, event.block.timestamp)
    }
}
*/

// 處理 V2Fixed 新事件
export function handleUpgradeAttempted(event: UpgradeAttempted): void {
    const player = getOrCreatePlayer(event.params.player)
    
    const attemptId = event.transaction.hash.toHexString().concat("-").concat(event.logIndex.toString())
    
    const upgradeAttempt = new UpgradeAttempt(attemptId)
    upgradeAttempt.player = player.id
    upgradeAttempt.type = event.params.tokenContract.toHexString()
    upgradeAttempt.baseRarity = event.params.baseRarity
    upgradeAttempt.targetId = event.params.targetRarity.toString()
    upgradeAttempt.burnedTokenIds = event.params.burnedTokenIds
    upgradeAttempt.mintedTokenIds = event.params.mintedTokenIds
    upgradeAttempt.outcome = event.params.outcome
    upgradeAttempt.isSuccess = event.params.outcome >= 2
    upgradeAttempt.fee = event.params.fee
    upgradeAttempt.timestamp = event.block.timestamp
    
    // 處理材料 IDs（轉換為字符串）
    upgradeAttempt.materialIds = []
    for (let i = 0; i < event.params.burnedTokenIds.length; i++) {
        upgradeAttempt.materialIds.push(event.params.burnedTokenIds[i].toString())
    }
    upgradeAttempt.materials = upgradeAttempt.materialIds
    
    if (event.params.outcome >= 2) {
        upgradeAttempt.newRarity = event.params.targetRarity
    }
    
    upgradeAttempt.save()
    
    // 更新統計數據
    updateGlobalStats(TOTAL_UPGRADE_ATTEMPTS, 1, event.block.timestamp)
    updatePlayerStats(event.params.player, TOTAL_UPGRADE_ATTEMPTS_PLAYER, 1, event.block.timestamp)
    
    if (event.params.outcome >= 2) {
        updateGlobalStats(SUCCESSFUL_UPGRADES, 1, event.block.timestamp)
        updatePlayerStats(event.params.player, SUCCESSFUL_UPGRADES_PLAYER, 1, event.block.timestamp)
    }
    
    // 更新 V2 全局統計
    let globalStats = GlobalUpgradeStats.load("global")
    if (!globalStats) {
        globalStats = new GlobalUpgradeStats("global")
        globalStats.totalAttempts = BigInt.fromI32(0)
        globalStats.totalBurned = BigInt.fromI32(0)
        globalStats.totalMinted = BigInt.fromI32(0)
        globalStats.totalFeesCollected = BigInt.fromI32(0)
    }
    
    globalStats.totalAttempts = globalStats.totalAttempts.plus(BigInt.fromI32(1))
    globalStats.totalBurned = globalStats.totalBurned.plus(BigInt.fromI32(event.params.burnedTokenIds.length))
    globalStats.totalMinted = globalStats.totalMinted.plus(BigInt.fromI32(event.params.mintedTokenIds.length))
    globalStats.totalFeesCollected = globalStats.totalFeesCollected.plus(event.params.fee)
    globalStats.lastUpdated = event.block.timestamp
    globalStats.save()
}

// 處理玩家統計更新事件
export function handlePlayerStatsUpdated(event: PlayerStatsUpdated): void {
    let stats = PlayerUpgradeStats.load(event.params.player.toHexString())
    if (!stats) {
        stats = new PlayerUpgradeStats(event.params.player.toHexString())
    }
    
    stats.totalAttempts = event.params.totalAttempts
    stats.totalBurned = event.params.totalBurned
    stats.totalMinted = event.params.totalMinted
    // V2Fixed 合約沒有 totalFeesSpent，設為 0
    stats.totalFeesSpent = BigInt.fromI32(0)
    stats.lastUpdated = event.block.timestamp
    stats.save()
}

// 注意：V2Fixed 合約沒有 GlobalStatsUpdated 事件
// 全局統計將通過累加個別升級事件來計算