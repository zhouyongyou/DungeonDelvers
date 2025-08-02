import { UpgradeAttempted } from "../generated/AltarOfAscension/AltarOfAscensionV2Fixed"
import { UpgradeAttempt } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { log } from "@graphprotocol/graph-ts"

export function handleUpgradeAttempted(event: UpgradeAttempted): void {
    const player = getOrCreatePlayer(event.params.player)
    
    // 創建升級嘗試記錄
    const attemptId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    const attempt = new UpgradeAttempt(attemptId)
    
    attempt.player = player.id
    attempt.nftType = event.params.nftType
    attempt.targetRarity = event.params.targetRarity
    attempt.burnedTokenIds = event.params.burnedTokenIds
    attempt.burnedRarities = event.params.burnedRarities
    attempt.resultRarity = event.params.resultRarity
    attempt.totalBurned = event.params.burnedTokenIds.length
    attempt.soulShardCost = event.params.soulShardCost
    attempt.timestamp = event.block.timestamp
    attempt.transactionHash = event.transaction.hash
    
    // 判斷成功或失敗
    attempt.success = event.params.resultRarity > 0
    
    attempt.save()
    
    log.info('Successfully processed UpgradeAttempted event: player {}, nftType {}, targetRarity {}, success {}', [
        event.params.player.toHexString(),
        event.params.nftType.toString(),
        event.params.targetRarity.toString(),
        attempt.success ? 'true' : 'false'
    ])
}