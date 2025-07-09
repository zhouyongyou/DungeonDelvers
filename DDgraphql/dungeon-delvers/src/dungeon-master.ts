// DDgraphql/dungeondelvers/src/dungeon-master.ts (最終加固版)
import { BigInt, log } from "@graphprotocol/graph-ts"
import { ExpeditionFulfilled, PartyRested, ProvisionsBought } from "../generated/DungeonMaster/DungeonMaster"
import { Party, PlayerProfile } from "../generated/schema"
import { calculateLevel } from "./utils"
import { getOrCreatePlayer } from "./common"
// ★ 核心修正：從 @graphprotocol/graph-ts 中引入 dataSource
import { dataSource } from "@graphprotocol/graph-ts"

export function handleExpeditionFulfilled(event: ExpeditionFulfilled): void {
  // 在函式內部獲取 context
  let context = dataSource.context()
  let partyContractAddress = context.getString("partyAddress")
  
  let partyId = partyContractAddress.toLowerCase() + "-" + event.params.partyId.toString()
  let party = Party.load(partyId)

  if (party) {
    party.fatigueLevel = party.fatigueLevel + 1
    party.provisionsRemaining = party.provisionsRemaining - 1
    if (event.params.success) {
      party.unclaimedRewards = party.unclaimedRewards.plus(event.params.reward)
    }
    party.cooldownEndsAt = event.block.timestamp.plus(BigInt.fromI32(24 * 60 * 60))
    party.save()

    let playerAddress = event.params.player
    getOrCreatePlayer(playerAddress)
    
    let profile = PlayerProfile.load(playerAddress.toHexString());
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
  let context = dataSource.context()
  let partyContractAddress = context.getString("partyAddress")
  
  let partyId = partyContractAddress.toLowerCase() + "-" + event.params.partyId.toString()
  let party = Party.load(partyId)
  if (party) {
    party.fatigueLevel = 0
    party.save()
  }
}

export function handleProvisionsBought(event: ProvisionsBought): void {
  let context = dataSource.context()
  let partyContractAddress = context.getString("partyAddress")
  
  let partyId = partyContractAddress.toLowerCase() + "-" + event.params.partyId.toString()
  let party = Party.load(partyId)
  if (party) {
    party.provisionsRemaining = party.provisionsRemaining + event.params.amount.toI32()
    party.save()
  }
}
