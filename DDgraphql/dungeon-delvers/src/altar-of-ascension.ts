// DDgraphql/dungeon-delvers/src/altar-of-ascension.ts

import {
  UpgradeProcessed
} from "../generated/AltarOfAscension/AltarOfAscension"
import { UpgradeAttempt } from "../generated/schema"

export function handleUpgradeProcessed(event: UpgradeProcessed): void {
  // 使用交易雜湊和日誌索引作為唯一 ID
  let id = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  let attempt = new UpgradeAttempt(id)

  attempt.player = event.params.player
  attempt.tokenContract = event.params.tokenContract
  attempt.targetRarity = event.params.targetRarity
  
  // 將數字的 outcome 轉換為更易讀的字串
  let outcomeString: string;
  if (event.params.outcome == 3) {
    outcomeString = "GreatSuccess";
  } else if (event.params.outcome == 2) {
    outcomeString = "Success";
  } else if (event.params.outcome == 1) {
    outcomeString = "PartialFailure";
  } else {
    outcomeString = "TotalFailure";
  }
  attempt.outcome = outcomeString;

  attempt.timestamp = event.block.timestamp
  
  attempt.save()
}
