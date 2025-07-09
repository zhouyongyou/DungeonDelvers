// =================================================================
// 檔案: DDgraphql/dungeondelvers/src/altar-of-ascension.ts
// =================================================================
import { UpgradeProcessed } from "../generated/AltarOfAscension/AltarOfAscension"
import { UpgradeAttempt, Player } from "../generated/schema"

export function handleUpgradeProcessed(event: UpgradeProcessed): void {
  let player = Player.load(event.params.player)
  if (!player) {
    player = new Player(event.params.player)
    player.save()
  }

  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let attempt = new UpgradeAttempt(id)

  attempt.player = player.id
  attempt.tokenContract = event.params.tokenContract
  attempt.targetRarity = event.params.targetRarity
  
  let outcomeString: string;
  if (event.params.outcome == 3) { outcomeString = "GreatSuccess"; } 
  else if (event.params.outcome == 2) { outcomeString = "Success"; } 
  else if (event.params.outcome == 1) { outcomeString = "PartialFailure"; } 
  else { outcomeString = "TotalFailure"; }
  attempt.outcome = outcomeString;

  attempt.timestamp = event.block.timestamp
  
  attempt.save()
}
