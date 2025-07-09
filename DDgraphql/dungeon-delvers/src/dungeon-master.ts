// DDgraphql/dungeondelvers/src/dungeon-master.ts (類型錯誤修正版)
import { BigInt, log, dataSource } from "@graphprotocol/graph-ts"
import { ExpeditionFulfilled, PartyRested, ProvisionsBought } from "../generated/DungeonMaster/DungeonMaster"
import { Party, PlayerProfile } from "../generated/schema"
import { calculateLevel } from "./utils"
import { getOrCreatePlayer } from "./common"

export function handleExpeditionFulfilled(event: ExpeditionFulfilled): void {
  let context = dataSource.context()
  let partyContractAddress = context.getString("partyAddress")
  
  let partyId = partyContractAddress.toLowerCase() + "-" + event.params.partyId.toString()
  let party = Party.load(partyId)

  if (party) {
    party.fatigueLevel = party.fatigueLevel + 1
    
    // ★ 核心修正 #1：使用標準的 `-` 運算子，因為 provisionsRemaining 是 i32
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
    // ★ 核心修正 #2：使用標準的 `+` 運算子，並將 event.params.amount (BigInt) 轉換為 i32
    party.provisionsRemaining = party.provisionsRemaining + event.params.amount.toI32()
    party.save()
  }
}
