// DDgraphql/dungeondelvers/src/altar-of-ascension.ts (V2Fixed)
import { BigInt } from "@graphprotocol/graph-ts"
import { UpgradeAttempted } from "../generated/AltarOfAscension/AltarOfAscensionV2Fixed"
import { UpgradeAttempt } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { updateGlobalStats, updatePlayerStats, TOTAL_UPGRADE_ATTEMPTS, SUCCESSFUL_UPGRADES, TOTAL_UPGRADE_ATTEMPTS_PLAYER, SUCCESSFUL_UPGRADES_PLAYER } from "./stats"

export function handleUpgradeAttempted(event: UpgradeAttempted): void {
    // 使用 getOrCreatePlayer 確保玩家實體存在
    const player = getOrCreatePlayer(event.params.player)
    
    // 使用交易雜湊 + 日誌索引作為唯一 ID，因為每次升級都是獨立事件
    const attemptId = event.transaction.hash.toHexString().concat("-").concat(event.logIndex.toString())
    
    const upgradeAttempt = new UpgradeAttempt(attemptId)
    upgradeAttempt.player = player.id
    upgradeAttempt.type = event.params.tokenContract.toHexString() // 使用合約地址來確定類型
    upgradeAttempt.targetId = event.params.targetRarity.toString() // 使用目標稀有度作為 ID
    upgradeAttempt.materialIds = event.params.burnedTokenIds.map<string>((id: BigInt) => id.toString()) // 燒毀的 NFT IDs
    upgradeAttempt.materials = [] // 無法從事件中獲取材料實體，設為空陣列
    upgradeAttempt.isSuccess = event.params.outcome >= 2 // 2 = success, 3 = great success
    if (event.params.outcome >= 2) {
        upgradeAttempt.newRarity = event.params.targetRarity // 成功升級到目標稀有度
    }
    upgradeAttempt.timestamp = event.block.timestamp
    upgradeAttempt.save()
    
    // 更新統計數據
    updateGlobalStats(TOTAL_UPGRADE_ATTEMPTS, 1, event.block.timestamp)
    updatePlayerStats(event.params.player, TOTAL_UPGRADE_ATTEMPTS_PLAYER, 1, event.block.timestamp)
    
    // 如果升級成功（outcome >= 2），更新成功統計
    if (event.params.outcome >= 2) {
        updateGlobalStats(SUCCESSFUL_UPGRADES, 1, event.block.timestamp)
        updatePlayerStats(event.params.player, SUCCESSFUL_UPGRADES_PLAYER, 1, event.block.timestamp)
    }
}