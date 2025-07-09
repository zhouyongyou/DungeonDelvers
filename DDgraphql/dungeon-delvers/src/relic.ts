// =================================================================
// 檔案: DDgraphql/dungeondelvers/src/relic.ts
// =================================================================
import { Transfer as RelicTransfer, RelicMinted } from "../generated/Relic/Relic"
import { Player, Relic } from "../generated/schema"

export function handleRelicMinted(event: RelicMinted): void {
  let player = Player.load(event.params.owner)
  if (!player) {
    player = new Player(event.params.owner)
    player.save()
  }
  let relicId = event.address.toHexString() + "-" + event.params.tokenId.toString()
  let relic = new Relic(relicId)
  relic.tokenId = event.params.tokenId
  relic.owner = player.id
  relic.rarity = event.params.rarity
  relic.capacity = event.params.capacity
  relic.save()
}

export function handleTransfer(event: RelicTransfer): void {
  let relicId = event.address.toHexString() + "-" + event.params.tokenId.toString()
  let relic = Relic.load(relicId)
  if (relic) {
    let newOwner = Player.load(event.params.to)
    if (!newOwner) {
      newOwner = new Player(event.params.to)
      newOwner.save()
    }
    relic.owner = newOwner.id
    relic.save()
  }
}