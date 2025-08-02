// DDgraphql/dungeondelvers/src/dungeon-master.ts (統一配置系統版)
import { BigInt, log, Address, ethereum } from "@graphprotocol/graph-ts"
import { ExpeditionFulfilled, RewardsBanked } from "../generated/DungeonMaster/DungeonMaster"
import { Party, PlayerProfile, Expedition } from "../generated/schema"
import { calculateLevel } from "./utils"
import { getOrCreatePlayer } from "./common"
import { getPartyContractAddress, createEntityId } from "./config"
import { updatePlayerStats, updatePlayerStatsBigInt, TOTAL_EXPEDITIONS, SUCCESSFUL_EXPEDITIONS } from "./stats"
// import { createPausedEvent, createUnpausedEvent } from "./pausable-handler"

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
    "巫妖墓穴",      // 6
    "奇美拉之巢",    // 7
    "惡魔前哨站",    // 8
    "巨龍之巔",      // 9
    "混沌深淵",      // 10
    "冥界之門",      // 11
    "虛空裂隙"       // 12
  ]
  return id >= 0 && id < dungeonNames.length ? dungeonNames[id] : "未知地城"
}

// 地下城戰力需求映射
function getDungeonPowerRequired(dungeonId: BigInt): BigInt {
  const id = dungeonId.toI32()
  const powerRequirements = [
    BigInt.fromI32(0),    // 0 - 無效
    BigInt.fromI32(300),  // 1 - 新手礦洞
    BigInt.fromI32(600),  // 2 - 哥布林洞穴
    BigInt.fromI32(900),  // 3 - 食人魔山谷
    BigInt.fromI32(1200), // 4 - 蜘蛛巢穴
    BigInt.fromI32(1500), // 5 - 石化蜥蜴沼澤
    BigInt.fromI32(1800), // 6 - 巫妖墓穴
    BigInt.fromI32(2100), // 7 - 奇美拉之巢
    BigInt.fromI32(2400), // 8 - 惡魔前哨站
    BigInt.fromI32(2700), // 9 - 巨龍之巔
    BigInt.fromI32(3000), // 10 - 混沌深淵
    BigInt.fromI32(3300), // 11 - 冥界之門
    BigInt.fromI32(3600)  // 12 - 虛空裂隙
  ]
  return id >= 0 && id < powerRequirements.length ? powerRequirements[id] : BigInt.fromI32(0)
}

// 新增：通過經驗值反推地城ID的函數
function getDungeonIdFromExp(expGained: BigInt, success: boolean): i32 {
  // 基於合約邏輯反推：
  // 成功: expGained = requiredPower / 10  =>  requiredPower = expGained * 10
  // 失敗: expGained = requiredPower / 20  =>  requiredPower = expGained * 20
  const requiredPower = success ? expGained.times(BigInt.fromI32(10)) : expGained.times(BigInt.fromI32(20))
  
  // 根據戰力需求匹配地城ID
  if (requiredPower.equals(BigInt.fromI32(300))) return 1    // 新手礦洞
  if (requiredPower.equals(BigInt.fromI32(600))) return 2    // 哥布林洞穴
  if (requiredPower.equals(BigInt.fromI32(900))) return 3    // 食人魔山谷
  if (requiredPower.equals(BigInt.fromI32(1200))) return 4   // 蜘蛛巢穴
  if (requiredPower.equals(BigInt.fromI32(1500))) return 5   // 石化蜥蜴沼澤
  if (requiredPower.equals(BigInt.fromI32(1800))) return 6   // 巫妖墓穴
  if (requiredPower.equals(BigInt.fromI32(2100))) return 7   // 奇美拉之巢
  if (requiredPower.equals(BigInt.fromI32(2400))) return 8   // 惡魔前哨站
  if (requiredPower.equals(BigInt.fromI32(2700))) return 9   // 巨龍之巔
  if (requiredPower.equals(BigInt.fromI32(3000))) return 10  // 混沌深淵
  if (requiredPower.equals(BigInt.fromI32(3300))) return 11  // 冥界之門
  if (requiredPower.equals(BigInt.fromI32(3600))) return 12  // 虛空裂隙
  
  // 如果找不到匹配，記錄警告並返回默認值
  log.warning("無法從經驗值反推地城ID: expGained={}, success={}, requiredPower={}", [
    expGained.toString(), 
    success.toString(), 
    requiredPower.toString()
  ])
  return 1 // 默認為新手礦洞
}

export function handleExpeditionFulfilled(event: ExpeditionFulfilled): void {
  const partyId = createEntityId(getPartyContractAddress(), event.params.partyId.toString())
  let party = Party.load(partyId)

  // 如果隊伍不存在，創建一個基本的隊伍實體來確保遠征記錄不丟失
  if (!party) {
    log.warning("Party {} not found, creating basic party entity for expedition tracking", [partyId])
    party = new Party(partyId)
    party.owner = event.params.player
    party.tokenId = event.params.partyId
    party.contractAddress = Address.fromString(getPartyContractAddress())
    party.name = "Party #" + event.params.partyId.toString()
    party.heroIds = []
    party.heroes = []
    party.totalPower = BigInt.fromI32(0) // 將在後面通過遠征反推
    party.totalCapacity = BigInt.fromI32(0)
    party.partyRarity = 1 // 默認稀有度
    party.provisionsRemaining = 0
    party.unclaimedRewards = BigInt.fromI32(0)
    party.cooldownEndsAt = event.block.timestamp
    party.createdAt = event.block.timestamp
    party.isBurned = false
    party.lastUpdatedAt = event.block.timestamp
    party.save()
    
    // log.info("Created fallback party entity: {}", [partyId])
  }

  // 現在 party 一定存在，繼續處理遠征
  {
    // 創建 Expedition 實體
    const expeditionId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    const expedition = new Expedition(expeditionId)
    
    // ✅ 修復：通過經驗值反推地城ID (臨時解決方案)
    const dungeonIdInt = getDungeonIdFromExp(event.params.expGained, event.params.success)
    const dungeonId = BigInt.fromI32(dungeonIdInt)
    
    // log.info("反推地城ID: expGained={}, success={}, dungeonId={}", [
      event.params.expGained.toString(),
      event.params.success.toString(),
      dungeonIdInt.toString()
    ])
    
    expedition.player = event.params.player
    expedition.party = partyId
    expedition.dungeonId = dungeonId
    expedition.dungeonName = getDungeonName(dungeonId)
    expedition.dungeonPowerRequired = getDungeonPowerRequired(dungeonId)
    expedition.partyPower = party.totalPower
    expedition.success = event.params.success
    expedition.reward = event.params.reward
    expedition.expGained = event.params.expGained
    expedition.timestamp = event.block.timestamp
    expedition.transactionHash = event.transaction.hash
    expedition.save()
    // 更新隊伍狀態 - 已禁用疲勞度系統
    // if (event.params.success) {
    //   party.fatigueLevel = party.fatigueLevel + 10 // 成功遠征增加10疲勞度
    // } else {
    //   party.fatigueLevel = party.fatigueLevel + 5  // 失敗遠征增加5疲勞度
    // }
    party.unclaimedRewards = party.unclaimedRewards.plus(event.params.reward)
    party.cooldownEndsAt = event.block.timestamp.plus(BigInt.fromI32(86400)) // 24小時冷卻時間 (與合約一致)
    party.lastUpdatedAt = event.block.timestamp
    party.save()

    const playerAddress = event.params.player
    getOrCreatePlayer(playerAddress)
    
    // 更新玩家統計數據
    updatePlayerStats(playerAddress, TOTAL_EXPEDITIONS, 1, event.block.timestamp)
    if (event.params.success) {
      updatePlayerStats(playerAddress, SUCCESSFUL_EXPEDITIONS, 1, event.block.timestamp)
      updatePlayerStatsBigInt(playerAddress, "totalRewardsEarned", event.params.reward, event.block.timestamp)
    }
    
    const profile = PlayerProfile.load(playerAddress);
    if (profile) {
      // 同步更新 PlayerProfile 的統計數據，確保與 PlayerStats 一致
      if (event.params.success) {
        profile.successfulExpeditions = profile.successfulExpeditions + 1;
        // ✅ 修復：同步更新 totalRewardsEarned
        profile.totalRewardsEarned = profile.totalRewardsEarned.plus(event.params.reward);
      }
      profile.lastUpdatedAt = event.block.timestamp;
      profile.save();
    } else {
        log.warning("ExpeditionFulfilled for a non-existent profile: {}", [playerAddress.toHexString()])
    }
  } // 移除了舊的 party 不存在的 else 分支，因為現在 party 總是存在
}

// 已移除疲勞度系統，不再需要 handlePartyRested
// export function handlePartyRested(event: PartyRested): void {
//   const partyId = createEntityId(getPartyContractAddress(), event.params.partyId.toString())
//   const party = Party.load(partyId)
//   if (party) {
//     // 已禁用疲勞度系統
//     // party.fatigueLevel = 0
//     party.cooldownEndsAt = event.block.timestamp
//     party.lastUpdatedAt = event.block.timestamp
//     party.save()
//   }
// }

// ExpeditionRequested 事件已在 V25 版本中移除
// export function handleExpeditionRequested(event: ExpeditionRequested): void {
//   // 記錄探險請求事件，用於追踪和分析
//   log.info("Expedition requested - Party: {}, Dungeon: {}, PartyPower: {}, RequiredPower: {}", [
//     event.params.partyId.toString(),
//     event.params.dungeonId.toString(),
//     event.params.partyPower.toString(),
//     event.params.requiredPower.toString()
//   ])
//   
//   // 可以在這裡添加更多邏輯，例如創建一個 PendingExpedition 實體
//   // 或更新隊伍的狀態為 "正在探險中"
// }


export function handleRewardsBanked(event: RewardsBanked): void {
  const partyId = createEntityId(getPartyContractAddress(), event.params.partyId.toString())
  const party = Party.load(partyId)
  
  if (party) {
    // 將未領取獎勵設為 0，因為獎勵已經被領取
    party.unclaimedRewards = BigInt.fromI32(0)
    party.lastUpdatedAt = event.block.timestamp
    party.save()
    
    // 更新玩家的總獎勵收入
    const playerAddress = event.params.user
    const profile = PlayerProfile.load(playerAddress)
    
    if (profile) {
      // 注意：RewardsBanked 不應該增加 totalRewardsEarned
      // 因為這些獎勵在 ExpeditionFulfilled 時已經計算過了
      // 這裡只是把獎勵從隊伍轉移到金庫
      profile.lastUpdatedAt = event.block.timestamp
      profile.save()
      
      // 不需要更新 totalRewardsEarned，避免重複計算
      // updatePlayerStatsBigInt(playerAddress, "totalRewardsEarned", event.params.amount, event.block.timestamp)
    } else {
      log.warning("RewardsBanked for a non-existent profile: {}", [playerAddress.toHexString()])
    }
    
    // log.info("Rewards banked - Player: {}, Party: {}, Amount: {}", [
      playerAddress.toHexString(),
      event.params.partyId.toString(),
      event.params.amount.toString()
    ])
  } else {
    log.warning("RewardsBanked for a non-existent party: {}", [partyId])
  }
}

// ===== 處理合約暫停事件 =====
// 注意：當新版本 DungeonMaster 合約部署後，需要在 ABI 中添加 Paused/Unpaused 事件
// 並在 subgraph.yaml 中配置這些事件處理器
// 以下函數暫時註釋，等 ABI 更新後啟用

// export function handlePaused(event: ethereum.Event): void {
//     createPausedEvent(event.params.account, event, "DungeonMaster")
// }

// export function handleUnpaused(event: ethereum.Event): void {
//     createUnpausedEvent(event.params.account, event, "DungeonMaster")
// }
