// DDgraphql/dungeondelvers/src/dungeon-master.ts (統一配置系統版)
import { BigInt, log } from "@graphprotocol/graph-ts"
import { ExpeditionFulfilled, ExpeditionRequested, ProvisionsBought } from "../generated/DungeonMaster/DungeonMaster"
import { Party, PlayerProfile, Expedition } from "../generated/schema"
import { calculateLevel } from "./utils"
import { getOrCreatePlayer } from "./common"
import { getPartyContractAddress, createEntityId } from "./config"
import { updatePlayerStats, updatePlayerStatsBigInt, TOTAL_EXPEDITIONS, SUCCESSFUL_EXPEDITIONS } from "./stats"

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
    "混沌深淵"       // 10
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
    BigInt.fromI32(3000)  // 10 - 混沌深淵
  ]
  return id >= 0 && id < powerRequirements.length ? powerRequirements[id] : BigInt.fromI32(0)
}

export function handleExpeditionFulfilled(event: ExpeditionFulfilled): void {
  const partyId = createEntityId(getPartyContractAddress(), event.params.partyId.toString())
  const party = Party.load(partyId)

  if (party) {
    // 創建 Expedition 實體
    const expeditionId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    const expedition = new Expedition(expeditionId)
    
    // 從事件中獲取真實的 dungeonId
    const dungeonId = event.params.dungeonId
    
    expedition.player = event.params.requester
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
    party.cooldownEndsAt = event.block.timestamp.plus(BigInt.fromI32(3600)) // 1小時冷卻時間
    party.lastUpdatedAt = event.block.timestamp
    party.save()

    const playerAddress = event.params.requester
    getOrCreatePlayer(playerAddress)
    
    // 更新玩家統計數據
    updatePlayerStats(playerAddress, TOTAL_EXPEDITIONS, 1, event.block.timestamp)
    if (event.params.success) {
      updatePlayerStats(playerAddress, SUCCESSFUL_EXPEDITIONS, 1, event.block.timestamp)
      updatePlayerStatsBigInt(playerAddress, "totalRewardsEarned", event.params.reward, event.block.timestamp)
    }
    
    const profile = PlayerProfile.load(playerAddress);
    if (profile) {
      profile.totalRewardsEarned = profile.totalRewardsEarned.plus(event.params.expGained);
      profile.lastUpdatedAt = event.block.timestamp;
      profile.save();
    } else {
        log.warning("ExpeditionFulfilled for a non-existent profile: {}", [playerAddress.toHexString()])
    }
  } else {
      log.warning("ExpeditionFulfilled for a non-existent party: {}", [partyId])
  }
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

export function handleExpeditionRequested(event: ExpeditionRequested): void {
  // 記錄探險請求事件，用於追踪和分析
  log.info("Expedition requested - Party: {}, Dungeon: {}, PartyPower: {}, RequiredPower: {}", [
    event.params.partyId.toString(),
    event.params.dungeonId.toString(),
    event.params.partyPower.toString(),
    event.params.requiredPower.toString()
  ])
  
  // 可以在這裡添加更多邏輯，例如創建一個 PendingExpedition 實體
  // 或更新隊伍的狀態為 "正在探險中"
}

export function handleProvisionsBought(event: ProvisionsBought): void {
  const partyId = createEntityId(getPartyContractAddress(), event.params.partyId.toString())
  const party = Party.load(partyId)
  if (party) {
    // 增加補給品數量
    party.provisionsRemaining = party.provisionsRemaining + event.params.amount.toI32()
    party.lastUpdatedAt = event.block.timestamp
    party.save()
  }
}
