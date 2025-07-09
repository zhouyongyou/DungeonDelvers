// DDgraphql/dungeondelvers/src/relic.ts (最終加固版)
import { RelicMinted, Transfer } from "../generated/Relic/Relic"
import { Relic } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { log } from "@graphprotocol/graph-ts"

export function handleRelicMinted(event: RelicMinted): void {
    let player = getOrCreatePlayer(event.params.owner)
    
    let relicId = event.address.toHexString().concat("-").concat(event.params.tokenId.toString())
    
    let relic = new Relic(relicId)
    relic.owner = player.id
    relic.tokenId = event.params.tokenId
    relic.contractAddress = event.address
    relic.rarity = event.params.rarity
    relic.capacity = event.params.capacity
    relic.save()
}

export function handleTransfer(event: Transfer): void {
    let relicId = event.address.toHexString().concat("-").concat(event.params.tokenId.toString())
    let relic = Relic.load(relicId)
    if (relic) {
        let newOwner = getOrCreatePlayer(event.params.to)
        relic.owner = newOwner.id
        relic.save()
    } else {
        log.warning("Transfer handled for a Relic that doesn't exist in the subgraph: {}", [relicId])
    }
}
