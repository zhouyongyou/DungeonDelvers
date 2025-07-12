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
    party.fatigueLevel = party.fatigueLevel + 1
    party.provisionsRemaining = party.provisionsRemaining - 1
    
    if (event.params.success) {
      party.unclaimedRewards = party.unclaimedRewards.plus(event.params.reward)
    }
    party.cooldownEndsAt = event.block.timestamp.plus(BigInt.fromI32(24 * 60 * 60))
    party.save()

    const playerAddress = event.params.player
    getOrCreatePlayer(playerAddress)
    
    // 更新玩家統計數據
    updatePlayerStats(playerAddress, TOTAL_EXPEDITIONS, 1, event.block.timestamp)
    if (event.params.success) {
      updatePlayerStats(playerAddress, SUCCESSFUL_EXPEDITIONS, 1, event.block.timestamp)
      updatePlayerStatsBigInt(playerAddress, "totalRewardsEarned", event.params.reward, event.block.timestamp)
    }
    
    const profile = PlayerProfile.load(playerAddress.toHexString());
    if (profile) {
      profile.experience = profile.experience.plus(event.params.expGained);
      profile.level = calculateLevel(profile.experience);
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
    party.fatigueLevel = 0
    party.save()
  }
}

export function handleProvisionsBought(event: ProvisionsBought): void {
  const partyId = createEntityId(getPartyContractAddress(), event.params.partyId.toString())
  const party = Party.load(partyId)
  if (party) {
    party.provisionsRemaining = party.provisionsRemaining + event.params.amount.toI32()
    party.save()
  }
}
