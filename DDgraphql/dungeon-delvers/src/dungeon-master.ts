// DDgraphql/dungeondelvers/src/dungeon-master.ts (Context 移除 + 類型錯誤修正版)
import { BigInt, log } from "@graphprotocol/graph-ts"
import { ExpeditionFulfilled, PartyRested, ProvisionsBought } from "../generated/DungeonMaster/DungeonMaster"
import { Party, PlayerProfile } from "../generated/schema"
import { calculateLevel } from "./utils"
import { getOrCreatePlayer } from "./common"

// ★ 核心修正：直接在此處硬編碼 Party 合約地址
let partyContractAddress = "0x4F4796b04e3BD3E8d5B447e32944d8B04eF53EB2"

export function handleExpeditionFulfilled(event: ExpeditionFulfilled): void {
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
  let partyId = partyContractAddress.toLowerCase() + "-" + event.params.partyId.toString()
  let party = Party.load(partyId)
  if (party) {
    party.fatigueLevel = 0
    party.save()
  }
}

export function handleProvisionsBought(event: ProvisionsBought): void {
  let partyId = partyContractAddress.toLowerCase() + "-" + event.params.partyId.toString()
  let party = Party.load(partyId)
  if (party) {
    party.provisionsRemaining = party.provisionsRemaining + event.params.amount.toI32()
    party.save()
  }
}
