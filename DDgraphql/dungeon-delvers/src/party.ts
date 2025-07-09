import { PartyCreated, Transfer } from "../generated/Party/Party"
import { Party } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { log } from "@graphprotocol/graph-ts"

// ★ 核心修正：直接在此處硬編碼合約地址
let heroContractAddress = "0x347752f8166D270EDE722C3F31A10584bC2867b3"
let relicContractAddress = "0x06994Fb1eC1Ba0238d8CA9539dAbdbEF090A5b53"

export function handlePartyCreated(event: PartyCreated): void {
    let player = getOrCreatePlayer(event.params.owner)

    let partyId = event.address.toHexString().concat("-").concat(event.params.partyId.toString())
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

    let heroIds: string[] = []
    for (let i = 0; i < event.params.heroIds.length; i++) {
        // ★ 核心修正：使用硬編碼的地址
        let heroId = heroContractAddress.toLowerCase().concat("-").concat(event.params.heroIds[i].toString())
        heroIds.push(heroId)
    }
    party.heroes = heroIds

    let relicIds: string[] = []
    for (let i = 0; i < event.params.relicIds.length; i++) {
        // ★ 核心修正：使用硬編碼的地址
        let relicId = relicContractAddress.toLowerCase().concat("-").concat(event.params.relicIds[i].toString())
        relicIds.push(relicId)
    }
    party.relics = relicIds
    
    party.save()
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
