import { PartyCreated, Transfer } from "../generated/Party/Party"
import { Party, Hero, Relic } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { log } from "@graphprotocol/graph-ts"

// ★ 核心修正：直接在此處硬編碼合約地址
let heroContractAddress = "0xfc2a24E894236a6169d2353BE430a3d5828111D2"
let relicContractAddress = "0xd86245Ddce19E8F94Bc30f0facf7bd111069FAf9"

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

    let player = getOrCreatePlayer(event.params.owner)

    let partyId = event.address.toHexString().concat("-").concat(event.params.partyId.toString())
    
    // 檢查是否已存在（防止重複處理）
    let existingParty = Party.load(partyId);
    if (existingParty) {
        log.warning('Party already exists: {}', [partyId]);
        return;
    }
    
    let party = new Party(partyId)
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

    // 批量處理英雄關聯
    let heroIds: string[] = []
    for (let i = 0; i < event.params.heroIds.length; i++) {
        let heroId = heroContractAddress.toLowerCase().concat("-").concat(event.params.heroIds[i].toString())
        
        // 驗證英雄是否存在
        let hero = Hero.load(heroId);
        if (hero && hero.owner == player.id) {
            heroIds.push(heroId);
        } else {
            log.warning('Hero not found or not owned by player: {} for party: {}', [heroId, partyId]);
        }
    }
    party.heroes = heroIds

    // 批量處理聖物關聯
    let relicIds: string[] = []
    for (let i = 0; i < event.params.relicIds.length; i++) {
        let relicId = relicContractAddress.toLowerCase().concat("-").concat(event.params.relicIds[i].toString())
        
        // 驗證聖物是否存在
        let relic = Relic.load(relicId);
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
    let partyId = event.address.toHexString().concat("-").concat(event.params.tokenId.toString())
    let party = Party.load(partyId)
    if (party) {
        let newOwner = getOrCreatePlayer(event.params.to)
        party.owner = newOwner.id
        party.save()
    } else {
        log.warning("Transfer handled for a Party that doesn't exist in the subgraph: {}", [partyId])
    }
}
