// =================================================================
// 檔案: DDgraphql/dungeondelvers/src/dungeon-master.ts
// =================================================================
import { BigInt, dataSource, Address } from "@graphprotocol/graph-ts"
import { ExpeditionFulfilled, PartyRested, ProvisionsBought } from "../generated/DungeonMaster/DungeonMaster"
import { Party, PlayerProfile } from "../generated/schema"
// ★ 核心修正 #1：從新的 utils 檔案中引入 calculateLevel 函式
import { calculateLevel } from "./utils"

// ★★★ 您需要在此手動填入您已部署的 Party 合約地址 ★★★
const PARTY_CONTRACT_ADDRESS = Address.fromString("0x4F4796b04e3BD3E8d5B447e32944d8B04eF53EB2");

export function handleExpeditionFulfilled(event: ExpeditionFulfilled): void {
  let partyId = PARTY_CONTRACT_ADDRESS.toHexString() + "-" + event.params.partyId.toString()
  let party = Party.load(partyId)

  if (party) {
    party.fatigueLevel = party.fatigueLevel + 1
    party.provisionsRemaining = party.provisionsRemaining.minus(BigInt.fromI32(1))
    if (event.params.success) {
      party.unclaimedRewards = party.unclaimedRewards.plus(event.params.reward)
    }
    party.cooldownEndsAt = event.block.timestamp.plus(BigInt.fromI32(24 * 60 * 60))
    party.save()

    let playerAddress = event.params.player;
    let profile = PlayerProfile.load(playerAddress.toHexString());
    if (profile) {
      profile.experience = profile.experience.plus(event.params.expGained);
      // ★ 核心修正 #2：現在可以正常呼叫 calculateLevel
      profile.level = calculateLevel(profile.experience);
      profile.save();
    }
  }
}

export function handlePartyRested(event: PartyRested): void {
  let partyId = PARTY_CONTRACT_ADDRESS.toHexString() + "-" + event.params.partyId.toString()
  let party = Party.load(partyId)
  if (party) {
    party.fatigueLevel = 0
    party.save()
  }
}

export function handleProvisionsBought(event: ProvisionsBought): void {
  let partyId = PARTY_CONTRACT_ADDRESS.toHexString() + "-" + event.params.partyId.toString()
  let party = Party.load(partyId)
  if (party) {
    party.provisionsRemaining = party.provisionsRemaining.plus(event.params.amount)
    party.save()
  }
}
