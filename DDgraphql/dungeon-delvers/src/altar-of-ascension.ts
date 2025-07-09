// DDgraphql/dungeondelvers/src/altar-of-ascension.ts (穩定性加固版)
import { UpgradeProcessed } from "../generated/AltarOfAscension/AltarOfAscension"
import { UpgradeAttempt } from "../generated/schema"
import { getOrCreatePlayer } from "./common"

export function handleUpgradeProcessed(event: UpgradeProcessed): void {
    // 使用 getOrCreatePlayer 確保玩家實體存在
    let player = getOrCreatePlayer(event.params.player)
    
    // 使用交易雜湊 + 日誌索引作為唯一 ID，因為每次升級都是獨立事件
    let attemptId = event.transaction.hash.toHexString().concat("-").concat(event.logIndex.toString())
    
    let upgradeAttempt = new UpgradeAttempt(attemptId)
    upgradeAttempt.player = player.id
    upgradeAttempt.tokenContract = event.params.tokenContract
    upgradeAttempt.targetRarity = event.params.targetRarity
    upgradeAttempt.outcome = event.params.outcome
    upgradeAttempt.timestamp = event.block.timestamp
    upgradeAttempt.save()
}
