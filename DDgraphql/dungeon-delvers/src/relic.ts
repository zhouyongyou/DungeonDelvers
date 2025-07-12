// DDgraphql/dungeondelvers/src/relic.ts (修復版)
import { RelicMinted, Transfer } from "../generated/Relic/Relic"
import { Relic } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { log } from "@graphprotocol/graph-ts"
import { createEntityId } from "./config"
import { updateGlobalStats, updatePlayerStats, TOTAL_RELICS, TOTAL_RELICS_MINTED } from "./stats"

export function handleRelicMinted(event: RelicMinted): void {
    // 參數驗證
    if (!event.params.owner || event.params.owner.toHexString() === '0x0000000000000000000000000000000000000000') {
        log.error('Invalid owner address in RelicMinted event: {}', [event.transaction.hash.toHexString()]);
        return;
    }

    if (event.params.rarity < 1 || event.params.rarity > 5) {
        log.error('Invalid rarity {} in RelicMinted event: {}', [event.params.rarity.toString(), event.transaction.hash.toHexString()]);
        return;
    }

    const player = getOrCreatePlayer(event.params.owner)
    
    // 使用統一的 ID 創建方式
    const relicId = createEntityId(event.address.toHexString(), event.params.tokenId.toString())
    
    // 檢查是否已存在（防止重複處理）
    const existingRelic = Relic.load(relicId);
    if (existingRelic) {
        log.warning('Relic already exists: {}', [relicId]);
        return;
    }
    
    const relic = new Relic(relicId)
    relic.owner = player.id
    relic.tokenId = event.params.tokenId
    relic.contractAddress = event.address
    relic.rarity = event.params.rarity
    relic.capacity = event.params.capacity
    relic.createdAt = event.block.timestamp
    relic.save()
    
    // 更新統計數據
    updateGlobalStats(TOTAL_RELICS, 1, event.block.timestamp)
    updatePlayerStats(event.params.owner, TOTAL_RELICS_MINTED, 1, event.block.timestamp)
    
    log.info('Successfully processed RelicMinted event: {}', [relicId]);
}

export function handleTransfer(event: Transfer): void {
    const relicId = createEntityId(event.address.toHexString(), event.params.tokenId.toString())
    const relic = Relic.load(relicId)
    
    // 處理 burn 操作 (to = 0x0)
    if (event.params.to.toHexString() === '0x0000000000000000000000000000000000000000') {
        if (relic) {
            // 減少統計數據
            updateGlobalStats(TOTAL_RELICS, -1, event.block.timestamp)
            // 注意：relic.owner 是 Bytes 類型，需要轉換為 Address
            const ownerAddress = event.params.from // 使用 from 地址，因為這是 burn 前的擁有者
            updatePlayerStats(ownerAddress, TOTAL_RELICS_MINTED, -1, event.block.timestamp)
            
            // 從資料庫中移除 Relic 實體
            relic.save() // 先保存任何變更
            log.info('Relic burned: {} from {}', [relicId, event.params.from.toHexString()]);
        } else {
            log.warning('Burn event for Relic that does not exist: {}', [relicId]);
        }
        return;
    }

    // 處理一般轉移
    if (relic) {
        // 更新 Relic 實體的 owner 字段
        const newOwner = getOrCreatePlayer(event.params.to)
        relic.owner = newOwner.id
        relic.save()
        log.info('Successfully transferred relic {} from {} to {}', [relicId, event.params.from.toHexString(), event.params.to.toHexString()]);
    } else {
        // 如果 Relic 實體不存在，我們不應該創建占位實體
        // 因為這會導致所有 NFT 顯示為默認 rarity 1
        // 只有 RelicMinted 事件才應該創建 Relic 實體
        log.warning("Transfer event for Relic that doesn't exist in subgraph: {} (skipping placeholder creation)", [relicId]);
        return;
    }
}
