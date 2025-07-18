// DDgraphql/dungeondelvers/src/altar-of-ascension.ts (穩定性加固版)
import { UpgradeProcessed } from "../generated/AltarOfAscension/AltarOfAscension"
import { UpgradeAttempt } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { updateGlobalStats, updatePlayerStats, TOTAL_UPGRADE_ATTEMPTS, SUCCESSFUL_UPGRADES, TOTAL_UPGRADE_ATTEMPTS_PLAYER, SUCCESSFUL_UPGRADES_PLAYER } from "./stats"

export function handleUpgradeProcessed(event: UpgradeProcessed): void {
    // 使用 getOrCreatePlayer 確保玩家實體存在
    const player = getOrCreatePlayer(event.params.player)
    
    // 使用交易雜湊 + 日誌索引作為唯一 ID，因為每次升級都是獨立事件
    const attemptId = event.transaction.hash.toHexString().concat("-").concat(event.logIndex.toString())
    
    const upgradeAttempt = new UpgradeAttempt(attemptId)
    upgradeAttempt.player = player.id
    upgradeAttempt.type = event.params.tokenContract.toHexString() // 使用合約地址來確定類型
    upgradeAttempt.targetId = event.params.targetRarity.toString() // 將目標稀有度轉換為字符串
    upgradeAttempt.materialIds = [] // 無法從事件中獲取，設為空陣列
    upgradeAttempt.materials = [] // 無法從事件中獲取，設為空陣列
    upgradeAttempt.isSuccess = event.params.outcome >= 2
    if (event.params.outcome >= 2) {
        upgradeAttempt.newRarity = event.params.targetRarity
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
