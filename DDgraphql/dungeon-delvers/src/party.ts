// =================================================================
// 檔案: DDgraphql/dungeondelvers/src/party.ts
// =================================================================
import { BigInt, dataSource, Address } from "@graphprotocol/graph-ts"
import { PartyCreated, Transfer as PartyTransfer } from "../generated/Party/Party"
import { Player, Party, Hero, Relic } from "../generated/schema"

// ★ 修正：將地址定義為常數，並從環境變數或預設值讀取
const HERO_CONTRACT = Address.fromString("0x347752f8166d270ede722c3f31a10584bc2867b3");
const RELIC_CONTRACT = Address.fromString("0x06994fb1ec1ba0238d8ca9539dabdbef090a5b53");

export function handlePartyCreated(event: PartyCreated): void {
  let player = Player.load(event.params.owner)
  if (!player) {
    player = new Player(event.params.owner);
    player.save()
  }
  let partyId = event.address.toHexString() + "-" + event.params.partyId.toString()
  let party = new Party(partyId)
  party.tokenId = event.params.partyId
  party.owner = player.id
  
  let heroIds = event.params.heroIds
  for (let i = 0; i < heroIds.length; i++) {
    let heroId = HERO_CONTRACT.toHexString() + "-" + heroIds[i].toString()
    let hero = Hero.load(heroId)
    if (hero) {
      hero.party = party.id
      hero.save()
    }
  }

  let relicIds = event.params.relicIds
  for (let i = 0; i < relicIds.length; i++) {
    let relicId = RELIC_CONTRACT.toHexString() + "-" + relicIds[i].toString()
    let relic = Relic.load(relicId)
    if (relic) {
      relic.party = party.id
      relic.save()
    }
  }
  
  party.provisionsRemaining = BigInt.fromI32(0)
  party.cooldownEndsAt = BigInt.fromI32(0)
  party.unclaimedRewards = BigInt.fromI32(0)
  party.fatigueLevel = 0
  party.totalPower = event.params.totalPower
  party.totalCapacity = event.params.totalCapacity
  party.partyRarity = event.params.partyRarity
  party.save()
}

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