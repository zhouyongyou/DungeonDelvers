// DDgraphql/dungeondelvers/src/altar-of-ascension.ts (穩定性加固版)
import { UpgradeProcessed } from "../generated/AltarOfAscension/AltarOfAscension"
import { UpgradeAttempt, Player } from "../generated/schema"

function getOrCreatePlayer(id: string): Player {
    let player = Player.load(id)
    if (!player) {
        player = new Player(id)
        player.save()
    }
    return player
}

export function handleUpgradeProcessed(event: UpgradeProcessed): void {
    let player = getOrCreatePlayer(event.params.player.toHexString())
    
    let upgradeAttempt = new UpgradeAttempt(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
    upgradeAttempt.player = player.id
    upgradeAttempt.tokenContract = event.params.tokenContract
    upgradeAttempt.targetRarity = event.params.targetRarity
    upgradeAttempt.outcome = event.params.outcome
    upgradeAttempt.timestamp = event.block.timestamp
    upgradeAttempt.save()
}
