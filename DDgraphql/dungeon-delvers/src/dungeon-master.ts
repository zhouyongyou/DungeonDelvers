import { BigInt, dataSource } from "@graphprotocol/graph-ts"
import {
  ExpeditionFulfilled,
  PartyRested,
  ProvisionsBought,
} from "../generated/DungeonMaster/DungeonMaster"
import { Party, PlayerProfile } from "../generated/schema"

// 處理遠征完成事件
export function handleExpeditionFulfilled(event: ExpeditionFulfilled): void {
  let partyId = dataSource.address().toHexString() + "-" + event.params.partyId.toString()
  let party = Party.load(partyId)

  if (party) {
    // 每次遠征後，疲勞度增加，儲備減少
    party.fatigueLevel = party.fatigueLevel + 1
    party.provisionsRemaining = party.provisionsRemaining.minus(BigInt.fromI32(1))
    
    // 如果成功，增加未領取獎勵
    if (event.params.success) {
      party.unclaimedRewards = party.unclaimedRewards.plus(event.params.reward)
    }
    
    // 更新冷卻時間
    party.cooldownEndsAt = event.block.timestamp.plus(BigInt.fromI32(24 * 60 * 60)) // 24 小時冷卻
    party.save()

    // 更新玩家經驗值
    let ownerAddress = party.owner
    let profile = PlayerProfile.load(ownerAddress)
    if (profile) {
      profile.experience = profile.experience.plus(event.params.expGained)
      // 等級的計算可以在前端完成，或在此處也計算一次
      profile.save()
    }
  }
}

// 處理隊伍休息事件
export function handlePartyRested(event: PartyRested): void {
  let partyId = dataSource.address().toHexString() + "-" + event.params.partyId.toString()
  let party = Party.load(partyId)
  if (party) {
    party.fatigueLevel = 0 // 疲勞度清零
    party.save()
  }
}

// 處理購買儲備事件
export function handleProvisionsBought(event: ProvisionsBought): void {
  let partyId = dataSource.address().toHexString() + "-" + event.params.partyId.toString()
  let party = Party.load(partyId)
  if (party) {
    party.provisionsRemaining = party.provisionsRemaining.plus(event.params.amount)
    party.save()
  }
}
