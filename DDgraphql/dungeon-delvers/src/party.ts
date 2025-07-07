import { BigInt } from "@graphprotocol/graph-ts"
import {
  PartyCreated,
  Transfer as PartyTransfer,
} from "../generated/Party/Party"
import { Player, Party, Hero, Relic } from "../generated/schema"

// 建議：將合約地址定義為常數，方便管理
const HERO_CONTRACT = "0xfc2a24e894236a6169d2353be430a3d5828111d2"
const RELIC_CONTRACT = "0xd86245ddce19e8f94bc30f0facf7bd111069faf9"

// 處理創建隊伍事件
export function handlePartyCreated(event: PartyCreated): void {
  let player = Player.load(event.params.owner)
  if (!player) {
    player = new Player(event.params.owner)
    player.save()
  }

  let partyId = event.address.toHexString() + "-" + event.params.partyId.toString()
  let party = new Party(partyId)
  party.tokenId = event.params.partyId
  party.owner = player.id
  
  // 處理英雄關聯
  let heroIds = event.params.heroIds
  for (let i = 0; i < heroIds.length; i++) {
    let heroId = HERO_CONTRACT + "-" + heroIds[i].toString()
    let hero = Hero.load(heroId)
    if (hero) {
      hero.party = party.id
      hero.save()
    }
  }

  // 處理聖物關聯
  let relicIds = event.params.relicIds
  for (let i = 0; i < relicIds.length; i++) {
    let relicId = RELIC_CONTRACT + "-" + relicIds[i].toString()
    let relic = Relic.load(relicId)
    if (relic) {
      relic.party = party.id
      relic.save()
    }
  }
  
  // 初始化隊伍狀態
  party.provisionsRemaining = BigInt.fromI32(0)
  party.cooldownEndsAt = BigInt.fromI32(0)
  party.unclaimedRewards = BigInt.fromI32(0)
  party.fatigueLevel = 0
  
  // 這些數據需要從合約讀取，但 mapping 中無法直接 call 合約
  // 理想情況下，這些數據也應該包含在 PartyCreated 事件的參數中
  // 此處暫時設為 0，未來可透過 call handlers 或其他方式補全
  party.totalPower = BigInt.fromI32(0)
  party.totalCapacity = BigInt.fromI32(0)
  party.partyRarity = 0

  party.save()
}

// 處理隊伍 NFT 轉移事件
export function handlePartyTransfer(event: PartyTransfer): void {
  let partyId = event.address.toHexString() + "-" + event.params.tokenId.toString()
  let party = Party.load(partyId)
  if (party) {
    let newOwner = Player.load(event.params.to)
    if (!newOwner) {
      newOwner = new Player(event.params.to)
      newOwner.save()
    }
    party.owner = newOwner.id
    party.save()
  }
}
