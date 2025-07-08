// DDgraphql/dungeon-delvers/src/party.ts (修正後版本)

import { BigInt } from "@graphprotocol/graph-ts"
import {
  PartyCreated,
  Transfer as PartyTransfer,
} from "../generated/Party/Party"
import { Player, Party, Hero, Relic } from "../generated/schema"

// 建議：將合約地址定義為常數，方便管理
// 注意：請確保這些地址是您最終部署的 Hero 和 Relic 合約地址
const HERO_CONTRACT = "0x347752f8166D270EDE722C3F31A10584bC2867b3"
const RELIC_CONTRACT = "0x06994Fb1eC1Ba0238d8CA9539dAbdbEF090A5b53"

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
      // 核心修正：我們只需要設定 Hero 的 party 欄位。
      // The Graph 會自動處理 Party 實體上的 heroes 陣列。
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
      // 核心修正：同樣，只需要設定 Relic 的 party 欄位。
      relic.party = party.id
      relic.save()
    }
  }
  
  // 初始化隊伍狀態
  party.provisionsRemaining = BigInt.fromI32(0)
  party.cooldownEndsAt = BigInt.fromI32(0)
  party.unclaimedRewards = BigInt.fromI32(0)
  party.fatigueLevel = 0
  
  // ★★★ 核心優化 ★★★
  // 這些欄位將在您更新 PartyCreated 事件並重新執行 `graph codegen` 後生效。
  // 在那之前，TypeScript 會報錯，這是正常的。
  party.totalPower = event.params.totalPower
  party.totalCapacity = event.params.totalCapacity
  party.partyRarity = event.params.partyRarity

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
