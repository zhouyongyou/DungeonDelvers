// DDgraphql/dungeondelvers/src/dungeon-master.ts (V25 簡化版)
import { BigInt, log } from "@graphprotocol/graph-ts"
import { ExpeditionCommitted, ExpeditionFulfilled, RewardsBanked } from "../generated/DungeonMaster/DungeonMaster"
import { Expedition, PlayerProfile, VRFCommitment } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { updatePlayerStats, updatePlayerStatsBigInt, updateGlobalStats, TOTAL_EXPEDITIONS, SUCCESSFUL_EXPEDITIONS } from "./stats"

// 地下城名稱映射
function getDungeonName(dungeonId: BigInt): string {
  const id = dungeonId.toI32()
  const dungeonNames = [
    "", // 0 - 無效
    "新手礦洞",      // 1
    "哥布林洞穴",    // 2
    "食人魔山谷",    // 3
    "蜘蛛巢穴",      // 4
    "石化蜥蜴沼澤",  // 5
    "火焰地獄",      // 6
    "冰霜王國",      // 7
    "暗影神殿",      // 8
    "龍之巢穴",      // 9
    "深淵之門"       // 10
  ]
  
  return id < dungeonNames.length ? dungeonNames[id] : "未知地下城"
}

// V25 ExpeditionFulfilled 事件處理器  
// ABI 事件參數：player, partyId, success, reward, expGained (dungeonId已移除)
export function handleExpeditionFulfilled(event: ExpeditionFulfilled): void {
  log.info("=== ExpeditionFulfilled Event ===", [])
  log.info("Player: {}", [event.params.player.toHexString()])
  log.info("Party ID: {}", [event.params.partyId.toString()])
  log.info("Success: {}", [event.params.success ? "true" : "false"])
  log.info("Reward: {}", [event.params.reward.toString()])
  log.info("Exp Gained: {}", [event.params.expGained.toString()])

  // 創建探險記錄
  const expeditionId = event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  
  const expedition = new Expedition(expeditionId)
  expedition.player = getOrCreatePlayer(event.params.player).id
  expedition.party = event.params.partyId.toString()
  expedition.dungeonId = BigInt.fromI32(0)  // V25 版本不再從事件中獲取dungeonId
  expedition.dungeonName = "未知地下城"  // V25 版本簡化，不再區分地下城
  expedition.dungeonPowerRequired = BigInt.fromI32(0)  // 暫時使用默認值
  expedition.partyPower = BigInt.fromI32(0)  // 暫時使用默認值
  expedition.success = event.params.success
  expedition.reward = event.params.reward
  expedition.expGained = event.params.expGained
  expedition.timestamp = event.block.timestamp
  expedition.transactionHash = event.transaction.hash
  
  expedition.save()

  // 更新全域統計
  log.info("Updating global stats for expedition", [])
  updateGlobalStats(TOTAL_EXPEDITIONS, 1, event.block.timestamp)
  
  if (event.params.success) {
    updateGlobalStats(SUCCESSFUL_EXPEDITIONS, 1, event.block.timestamp)
  }

  // 更新玩家統計
  const playerAddress = event.params.player
  getOrCreatePlayer(playerAddress)
  updatePlayerStats(playerAddress, TOTAL_EXPEDITIONS, 1, event.block.timestamp)
  
  if (event.params.success) {
    updatePlayerStats(playerAddress, SUCCESSFUL_EXPEDITIONS, 1, event.block.timestamp)
    updatePlayerStatsBigInt(playerAddress, "totalRewardsEarned", event.params.reward, event.block.timestamp)
  }

  log.info("=== ExpeditionFulfilled Event Complete ===", [])
}

// V25 RewardsBanked 事件處理器
// 事件參數：user, partyId, amount
export function handleRewardsBanked(event: RewardsBanked): void {
  log.info("=== RewardsBanked Event ===", [])
  log.info("User: {}", [event.params.user.toHexString()])
  log.info("Party ID: {}", [event.params.partyId.toString()])
  log.info("Amount: {}", [event.params.amount.toString()])

  // 更新玩家統計
  const playerAddress = event.params.user
  getOrCreatePlayer(playerAddress)
  updatePlayerStatsBigInt(playerAddress, "totalRewardsClaimed", event.params.amount, event.block.timestamp)

  log.info("=== RewardsBanked Event Complete ===", [])
}

// VRF ExpeditionCommitted 事件處理器  
// ABI: ExpeditionCommitted(indexed address player, uint256 partyId, uint256 dungeonId, uint256 blockNumber)
export function handleExpeditionCommitted(event: ExpeditionCommitted): void {
  log.info("=== ExpeditionCommitted Event ===", [])
  log.info("Player: {}", [event.params.player.toHexString()])
  log.info("Party ID: {}", [event.params.partyId.toString()])
  log.info("Dungeon ID: {}", [event.params.dungeonId.toString()])
  log.info("Block Number: {}", [event.params.blockNumber.toString()])

  let commitment = new VRFCommitment(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  commitment.player = event.params.player
  commitment.partyId = event.params.partyId
  commitment.dungeonId = event.params.dungeonId
  commitment.commitmentType = "EXPEDITION"
  commitment.fulfilled = false
  commitment.timestamp = event.block.timestamp
  commitment.blockNumber = event.block.number
  commitment.transactionHash = event.transaction.hash
  commitment.save()

  // Update player
  getOrCreatePlayer(event.params.player)

  log.info("=== ExpeditionCommitted Event Complete ===", [])
}