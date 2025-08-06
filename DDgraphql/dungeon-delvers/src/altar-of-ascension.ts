// DDgraphql/dungeondelvers/src/altar-of-ascension.ts (VRF Version)
import { BigInt, log } from "@graphprotocol/graph-ts"
import { UpgradeAttempted, UpgradeRequested, UpgradeCommitted, UpgradeRevealed } from "../generated/AltarOfAscension/AltarOfAscensionVRF"
import { UpgradeAttempt } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { updateGlobalStats, updatePlayerStats, TOTAL_UPGRADE_ATTEMPTS, SUCCESSFUL_UPGRADES, TOTAL_UPGRADE_ATTEMPTS_PLAYER, SUCCESSFUL_UPGRADES_PLAYER } from "./stats"

export function handleUpgradeAttempted(event: UpgradeAttempted): void {
    // 使用 getOrCreatePlayer 確保玩家實體存在
    const player = getOrCreatePlayer(event.params.player)
    
    // 使用交易雜湊 + 日誌索引作為唯一 ID，因為每次升級都是獨立事件
    const attemptId = event.transaction.hash.toHexString().concat("-").concat(event.logIndex.toString())
    
    const upgradeAttempt = new UpgradeAttempt(attemptId)
    upgradeAttempt.player = player.id
    upgradeAttempt.type = event.params.tokenContract.toHexString() // 使用合約地址來確定類型
    upgradeAttempt.targetId = event.params.targetRarity.toString() // 使用目標稀有度作為 ID
    upgradeAttempt.materialIds = event.params.burnedTokenIds.map<string>((id: BigInt) => id.toString()) // 燒毀的 NFT IDs
    upgradeAttempt.materials = [] // 無法從事件中獲取材料實體，設為空陣列
    upgradeAttempt.isSuccess = event.params.outcome >= 2 // 2 = success, 3 = great success
    if (event.params.outcome >= 2) {
        upgradeAttempt.newRarity = event.params.targetRarity // 成功升級到目標稀有度
    }
    upgradeAttempt.timestamp = event.block.timestamp
    upgradeAttempt.save()
    
    // 更新統計數據
    updateGlobalStats(TOTAL_UPGRADE_ATTEMPTS, 1, event.block.timestamp)
    updatePlayerStats(event.params.player, TOTAL_UPGRADE_ATTEMPTS_PLAYER, 1, event.block.timestamp)
    
    // 如果升級成功（outcome >= 2），更新成功統計
    if (event.params.outcome >= 2) {
        updateGlobalStats(SUCCESSFUL_UPGRADES, 1, event.block.timestamp)
        updatePlayerStats(event.params.player, SUCCESSFUL_UPGRADES_PLAYER, 1, event.block.timestamp)
    }
}

// ===== VRF 事件處理器 =====

export function handleUpgradeRequested(event: UpgradeRequested): void {
  // VRF 升級請求已發出
  const player = getOrCreatePlayer(event.params.user)
  
  log.info("VRF Upgrade requested - Player: {}, RequestId: {}, TokenIds: [{}]", [
    event.params.user.toHexString(),
    event.params.requestId.toString(),
    event.params.tokenIds.map<string>((id: BigInt) => id.toString()).join(", ")
  ])
  
  // 記錄待處理的升級請求
  // 可以創建一個 PendingUpgrade 實體來追蹤
}

export function handleUpgradeCommitted(event: UpgradeCommitted): void {
  // 舊版 Commit-Reveal 事件，VRF 版本可能不需要
  // 但為了兼容性保留
  const player = getOrCreatePlayer(event.params.player)
  
  log.info("Upgrade committed - Player: {}, Rarity: {}", [
    event.params.player.toHexString(),
    event.params.baseRarity.toString()
  ])
}

export function handleUpgradeRevealed(event: UpgradeRevealed): void {
  // VRF 返回後，升級結果已揭示
  const player = getOrCreatePlayer(event.params.player)
  
  log.info("VRF Upgrade revealed - Player: {}, Outcome: {}, TargetRarity: {}", [
    event.params.player.toHexString(),
    event.params.outcome.toString(),
    event.params.targetRarity.toString()
  ])
  
  // 升級結果已在 UpgradeAttempted 中記錄
  // 這裡可以更新任何額外的狀態
}