import { PartyCreated, Transfer } from "../generated/Party/Party"
import { Party, Hero, Relic } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { log } from "@graphprotocol/graph-ts"
import { getHeroContractAddress, getRelicContractAddress, createEntityId } from "./config"

export function handlePartyCreated(event: PartyCreated): void {
    // 參數驗證
    if (!event.params.owner || event.params.owner.toHexString() === '0x0000000000000000000000000000000000000000') {
        log.error('Invalid owner address in PartyCreated event: {}', [event.transaction.hash.toHexString()]);
        return;
    }

    if (event.params.partyRarity < 1 || event.params.partyRarity > 5) {
        log.error('Invalid party rarity {} in PartyCreated event: {}', [event.params.partyRarity.toString(), event.transaction.hash.toHexString()]);
        return;
    }

    const player = getOrCreatePlayer(event.params.owner)

    const partyId = createEntityId(event.address.toHexString(), event.params.partyId.toString())
    
    // 檢查是否已存在（防止重複處理）
    const existingParty = Party.load(partyId);
    if (existingParty) {
        log.warning('Party already exists: {}', [partyId]);
        return;
    }
    
    const party = new Party(partyId)
    party.owner = player.id
    party.tokenId = event.params.partyId
    party.contractAddress = event.address
    party.totalPower = event.params.totalPower
    party.totalCapacity = event.params.totalCapacity
    party.partyRarity = event.params.partyRarity
    party.fatigueLevel = 0
    party.provisionsRemaining = event.params.relicIds.length
    party.cooldownEndsAt = event.block.timestamp
    party.unclaimedRewards = event.params.totalPower 
    party.createdAt = event.block.timestamp

    // 批量處理英雄關聯 - 使用配置系統
    const heroIds: string[] = []
    const heroContractAddress = getHeroContractAddress()
    for (let i = 0; i < event.params.heroIds.length; i++) {
        const heroId = createEntityId(heroContractAddress, event.params.heroIds[i].toString())
        
        // 驗證英雄是否存在
        const hero = Hero.load(heroId);
        if (hero && hero.owner == player.id) {
            heroIds.push(heroId);
        } else {
            log.warning('Hero not found or not owned by player: {} for party: {}', [heroId, partyId]);
        }
    }
    party.heroes = heroIds

    // 批量處理聖物關聯 - 使用配置系統
    const relicIds: string[] = []
    const relicContractAddress = getRelicContractAddress()
    for (let i = 0; i < event.params.relicIds.length; i++) {
        const relicId = createEntityId(relicContractAddress, event.params.relicIds[i].toString())
        
        // 驗證聖物是否存在
        const relic = Relic.load(relicId);
        if (relic && relic.owner == player.id) {
            relicIds.push(relicId);
        } else {
            log.warning('Relic not found or not owned by player: {} for party: {}', [relicId, partyId]);
        }
    }
    party.relics = relicIds
    
    party.save()
    
    log.info('Successfully processed PartyCreated event: {}', [partyId]);
}

export function handlePartyTransfer(event: Transfer): void {
    const partyId = createEntityId(event.address.toHexString(), event.params.tokenId.toString())
    const party = Party.load(partyId)
    if (party) {
        const newOwner = getOrCreatePlayer(event.params.to)
        party.owner = newOwner.id
        party.save()
    } else {
        log.warning("Transfer handled for a Party that doesn't exist in the subgraph: {}", [partyId])
    }
}
