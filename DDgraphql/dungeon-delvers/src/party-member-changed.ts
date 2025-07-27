import { PartyMemberChanged } from "../generated/PartyV3/PartyV3"
import { Party, PartyMemberChange } from "../generated/schema"
import { createEntityId } from "./config"
import { log, BigInt } from "@graphprotocol/graph-ts"

export function handlePartyMemberChanged(event: PartyMemberChanged): void {
    const partyId = createEntityId(event.address.toHexString(), event.params.partyId.toString())
    const party = Party.load(partyId)
    
    if (!party) {
        log.error('Party not found for member change event: {}', [partyId])
        return
    }

    // 更新隊伍的英雄列表
    const heroIds: string[] = []
    const heroIdStrings: string[] = []
    for (let i = 0; i < event.params.heroIds.length; i++) {
        const heroId = createEntityId(event.address.toHexString(), event.params.heroIds[i].toString())
        heroIds.push(heroId)
        heroIdStrings.push(event.params.heroIds[i].toString())
    }
    
    party.heroIds = heroIdStrings
    party.heroes = heroIds
    party.save()

    // 創建成員變更記錄
    const changeId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    const change = new PartyMemberChange(changeId)
    change.party = partyId
    change.owner = party.owner // 使用隊伍的擁有者
    change.changeType = 2 // 2 表示更新
    change.hero = heroIds.length > 0 ? heroIds[0] : "" // 使用第一個英雄作為代表
    change.timestamp = event.block.timestamp
    change.save()

    log.info('Successfully processed PartyMemberChanged event: {}', [partyId])
}