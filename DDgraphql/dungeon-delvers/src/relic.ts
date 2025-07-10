// DDgraphql/dungeondelvers/src/relic.ts (修復版)
import { RelicMinted, Transfer } from "../generated/Relic/Relic"
import { Relic } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { log } from "@graphprotocol/graph-ts"
import { createEntityId } from "./config"

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
    
    log.info('Successfully processed RelicMinted event: {}', [relicId]);
}

export function handleTransfer(event: Transfer): void {
    // 跳過零地址轉移（通常是銷毀操作）
    if (event.params.to.toHexString() === '0x0000000000000000000000000000000000000000') {
        log.info('Skipping transfer to zero address (burn): {}', [event.params.tokenId.toString()]);
        return;
    }

    // 使用統一的 ID 創建方式
    const relicId = createEntityId(event.address.toHexString(), event.params.tokenId.toString())
    const relic = Relic.load(relicId)
    
    if (relic) {
        const newOwner = getOrCreatePlayer(event.params.to)
        relic.owner = newOwner.id
        relic.save()
        log.info('Successfully transferred relic {} to {}', [relicId, event.params.to.toHexString()]);
    } else {
        // 創建一個占位實體以避免後續錯誤
        log.warning("Transfer handled for a Relic that doesn't exist in the subgraph: {}, creating placeholder", [relicId])
        
        const placeholderRelic = new Relic(relicId)
        const newOwner = getOrCreatePlayer(event.params.to)
        placeholderRelic.owner = newOwner.id
        placeholderRelic.tokenId = event.params.tokenId
        placeholderRelic.contractAddress = event.address
        placeholderRelic.rarity = 1  // 默認稀有度
        placeholderRelic.capacity = 1  // 默認容量
        placeholderRelic.createdAt = event.block.timestamp
        placeholderRelic.save()
        
        log.info('Created placeholder relic: {}', [relicId]);
    }
}
