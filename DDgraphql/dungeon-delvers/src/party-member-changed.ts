import { PartyMemberChanged } from "../generated/Party/Party"
import { Party, PartyMemberChange } from "../generated/schema"
import { createEntityId, getHeroContractAddress, getRelicContractAddress } from "./config"
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
    const heroContractAddress = getHeroContractAddress()
    for (let i = 0; i < event.params.heroIds.length; i++) {
        const heroIdString = event.params.heroIds[i].toString()
        const heroId = createEntityId(heroContractAddress, heroIdString)
        heroIds.push(heroId)
        heroIdStrings.push(heroIdString)
    }
    
    party.heroIds = heroIdStrings
    party.heroes = heroIds
    
    // 更新隊伍的聖物列表
    const relicIds: string[] = []
    const relicIdStrings: string[] = []
    const relicContractAddress = getRelicContractAddress()
    for (let i = 0; i < event.params.relicIds.length; i++) {
        const relicIdString = event.params.relicIds[i].toString()
        const relicId = createEntityId(relicContractAddress, relicIdString)
        relicIds.push(relicId)
        relicIdStrings.push(relicIdString)
    }
    
    party.relicIds = relicIdStrings
    party.relics = relicIds
    
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

    // log.info('Successfully processed PartyMemberChanged event: {}', [partyId])
}