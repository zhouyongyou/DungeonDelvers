// DDgraphql/dungeondelvers/src/party.ts (最終加固版)
import { PartyCreated, Transfer } from "../generated/Party/Party"
import { Party } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
// ★ 核心修正：從 @graphprotocol/graph-ts 中引入 dataSource
import { log, dataSource } from "@graphprotocol/graph-ts"

export function handlePartyCreated(event: PartyCreated): void {
    // 在函式內部獲取 context，這是更穩健的做法
    let context = dataSource.context()
    let heroContractAddress = context.getString("heroAddress")
    let relicContractAddress = context.getString("relicAddress")
    
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
        let heroId = heroContractAddress.toLowerCase().concat("-").concat(event.params.heroIds[i].toString())
        heroIds.push(heroId)
    }
    party.heroes = heroIds

    let relicIds: string[] = []
    for (let i = 0; i < event.params.relicIds.length; i++) {
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
