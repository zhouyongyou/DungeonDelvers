// DDgraphql/dungeondelvers/src/dungeon-master.ts (統一配置系統版)
import { BigInt, log } from "@graphprotocol/graph-ts"
import { ExpeditionFulfilled, PartyRested, ProvisionsBought } from "../generated/DungeonMaster/DungeonMaster"
import { Party, PlayerProfile } from "../generated/schema"
import { calculateLevel } from "./utils"
import { getOrCreatePlayer } from "./common"
import { getPartyContractAddress, createEntityId } from "./config"
import { updatePlayerStats, updatePlayerStatsBigInt, TOTAL_EXPEDITIONS, SUCCESSFUL_EXPEDITIONS } from "./stats"

export function handleExpeditionFulfilled(event: ExpeditionFulfilled): void {
  const partyId = createEntityId(getPartyContractAddress(), event.params.partyId.toString())
  const party = Party.load(partyId)

  if (party) {
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

export function handlePartyRested(event: PartyRested): void {
  const partyId = createEntityId(getPartyContractAddress(), event.params.partyId.toString())
  const party = Party.load(partyId)
  if (party) {
    // 已禁用疲勞度系統
    // party.fatigueLevel = 0
    party.cooldownEndsAt = event.block.timestamp
    party.lastUpdatedAt = event.block.timestamp
    party.save()
  }
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
