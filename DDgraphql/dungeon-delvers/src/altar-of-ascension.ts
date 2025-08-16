// DDgraphql/dungeondelvers/src/altar-of-ascension.ts (V25 Simplified Version)
import { BigInt, log } from "@graphprotocol/graph-ts"
import { UpgradeRequested, UpgradeRevealed } from "../generated/AltarOfAscension/AltarOfAscension"
import { UpgradeAttempt, VRFCommitment } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { updateGlobalStats, updatePlayerStats, TOTAL_UPGRADE_ATTEMPTS, SUCCESSFUL_UPGRADES, TOTAL_UPGRADE_ATTEMPTS_PLAYER, SUCCESSFUL_UPGRADES_PLAYER } from "./stats"

export function handleUpgradeRevealed(event: UpgradeRevealed): void {
    // 使用 getOrCreatePlayer 確保玩家實體存在
    const player = getOrCreatePlayer(event.params.player)
    
    // 使用交易雜湊 + 日誌索引作為唯一 ID，因為每次升級都是獨立事件
    const attemptId = event.transaction.hash.toHexString().concat("-").concat(event.logIndex.toString())
    
    const upgradeAttempt = new UpgradeAttempt(attemptId)
    upgradeAttempt.player = player.id
    upgradeAttempt.type = "ALTAR" // 固定類型，因為來自 AltarOfAscension 合約
    upgradeAttempt.targetId = event.params.targetRarity.toString() // 使用目標稀有度作為 ID
    upgradeAttempt.materialIds = [] // V25 簡化版沒有詳細的 token IDs，設為空陣列
    upgradeAttempt.materials = [] // 無法從事件中獲取材料實體，設為空陣列
    upgradeAttempt.isSuccess = event.params.outcome >= 2 // 2 = success, 3 = great success
    if (event.params.outcome >= 2) {
        upgradeAttempt.newRarity = event.params.targetRarity // 成功升級到目標稀有度
    }
    upgradeAttempt.timestamp = event.block.timestamp
    
    // V25 簡化版欄位設定
    upgradeAttempt.baseRarity = 1 // 預設值
    upgradeAttempt.outcome = event.params.outcome
    upgradeAttempt.fee = BigInt.zero() // 事件中沒有 fee 資訊
    upgradeAttempt.burnedTokenIds = [] // V25 沒有詳細的 tokenId 列表
    upgradeAttempt.mintedTokenIds = [] // V25 沒有詳細的 tokenId 列表
    upgradeAttempt.vipLevel = 0 // 預設值
    upgradeAttempt.totalVipBonus = 0 // 預設值
    
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

// VRF UpgradeRequested 事件處理器  
// 合約實際簽名: UpgradeRequested(address indexed player, address tokenContract, uint8 baseRarity, uint256[] burnedTokenIds)
export function handleUpgradeRequested(event: UpgradeRequested): void {
  log.info("=== UpgradeRequested Event ===", [])
  log.info("Player: {}", [event.params.player.toHexString()])
  log.info("Token Contract: {}", [event.params.tokenContract.toHexString()])
  log.info("Base Rarity: {}", [event.params.baseRarity.toString()])
  log.info("Burned Token IDs length: {}", [event.params.burnedTokenIds.length.toString()])

  let commitment = new VRFCommitment(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  commitment.player = event.params.player
  commitment.targetId = BigInt.fromI32(0) // No specific target ID in this event
  commitment.baseRarity = event.params.baseRarity // Use actual baseRarity from event
  commitment.commitmentType = "UPGRADE"
  commitment.fulfilled = false
  commitment.timestamp = event.block.timestamp
  commitment.blockNumber = event.block.number
  commitment.transactionHash = event.transaction.hash
  commitment.save()

  // Update player
  getOrCreatePlayer(event.params.player)

  log.info("=== UpgradeRequested Event Complete ===", [])
}