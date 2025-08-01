// DDgraphql/dungeondelvers/src/hero.ts (最終加固版)
import { HeroMinted, Transfer, HeroBurned, BatchMintCompleted, Paused, Unpaused } from "../generated/Hero/Hero"
import { Hero, HeroUpgrade } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { log, BigInt, ethereum } from "@graphprotocol/graph-ts"
import { createEntityId } from "./config"
import { updateGlobalStats, updatePlayerStats, TOTAL_HEROES, TOTAL_HEROES_MINTED } from "./stats"
import { createPausedEvent, createUnpausedEvent } from "./pausable-handler"

export function handleHeroMinted(event: HeroMinted): void {
    // 參數驗證
    if (!event.params.owner || event.params.owner.toHexString() === '0x0000000000000000000000000000000000000000') {
        log.error('Invalid owner address in HeroMinted event: {}', [event.transaction.hash.toHexString()]);
        return;
    }

    if (event.params.rarity < 1 || event.params.rarity > 5) {
        log.error('Invalid rarity {} in HeroMinted event: {}', [event.params.rarity.toString(), event.transaction.hash.toHexString()]);
        return;
    }

    const player = getOrCreatePlayer(event.params.owner)
    
    // 使用配置系統創建全域唯一 ID
    const heroId = createEntityId(event.address.toHexString(), event.params.tokenId.toString())
    
    // 檢查是否已存在（防止重複處理）
    const existingHero = Hero.load(heroId);
    if (existingHero) {
        log.warning('Hero already exists: {}', [heroId]);
        return;
    }
    
    const hero = new Hero(heroId)
    hero.owner = player.id
    hero.tokenId = event.params.tokenId
    hero.contractAddress = event.address
    hero.rarity = event.params.rarity
    hero.power = event.params.power
    hero.createdAt = event.block.timestamp
    hero.isBurned = false
    hero.save()
    
    // 更新統計數據
    updateGlobalStats(TOTAL_HEROES, 1, event.block.timestamp)
    updatePlayerStats(event.params.owner, TOTAL_HEROES_MINTED, 1, event.block.timestamp)
    
    // log.info('Successfully processed HeroMinted event: {}', [heroId]);
}

export function handleTransfer(event: Transfer): void {
    const heroId = createEntityId(event.address.toHexString(), event.params.tokenId.toString())
    const hero = Hero.load(heroId)
    
    // 處理 burn 操作 (to = 0x0)
    if (event.params.to.toHexString() === '0x0000000000000000000000000000000000000000') {
        if (hero) {
            // 減少統計數據
            updateGlobalStats(TOTAL_HEROES, -1, event.block.timestamp)
            // 注意：hero.owner 是 Bytes 類型，需要轉換為 Address
            const ownerAddress = event.params.from // 使用 from 地址，因為這是 burn 前的擁有者
            updatePlayerStats(ownerAddress, TOTAL_HEROES_MINTED, -1, event.block.timestamp)
            
            // 從資料庫中移除 Hero 實體
            hero.save() // 先保存任何變更
    // log.info('Hero burned: {} from {}', [heroId, event.params.from.toHexString()]);
        } else {
            log.warning('Burn event for Hero that does not exist: {}', [heroId]);
        }
        return;
    }

    // 處理一般轉移
    if (hero) {
        // 更新 Hero 實體的 owner 字段
        const newOwner = getOrCreatePlayer(event.params.to)
        hero.owner = newOwner.id
        hero.save()
    // log.info('Successfully transferred hero {} from {} to {}', [heroId, event.params.from.toHexString(), event.params.to.toHexString()]);
    } else {
        // 如果 Hero 實體不存在，我們不應該創建占位實體
        // 因為這會導致所有 NFT 顯示為默認 rarity 1
        // 只有 HeroMinted 事件才應該創建 Hero 實體
        log.warning("Transfer event for Hero that doesn't exist in subgraph: {} (skipping placeholder creation)", [heroId]);
        return;
    }
}

// HeroUpgraded event handler removed - no longer exists in V23 contract

export function handleHeroBurned(event: HeroBurned): void {
    const heroId = createEntityId(event.address.toHexString(), event.params.tokenId.toString())
    const hero = Hero.load(heroId)
    
    if (!hero) {
        log.error('Hero not found for burn event: {}', [heroId])
        return
    }

    // 標記英雄為已銷毀
    hero.isBurned = true
    hero.burnedAt = event.block.timestamp
    hero.save()

    // 更新統計數據
    updateGlobalStats(TOTAL_HEROES, -1, event.block.timestamp)
    updatePlayerStats(event.params.owner, TOTAL_HEROES_MINTED, -1, event.block.timestamp)

    // log.info('Successfully processed HeroBurned event: {} (Rarity: {}, Power: {})', [
        heroId,
        event.params.rarity.toString(),
        event.params.power.toString()
    ])
}

export function handleBatchMintCompleted(event: BatchMintCompleted): void {
    // 記錄批量鑄造事件
    // log.info('BatchMintCompleted: Player {} minted {} heroes with max rarity {}', [
        event.params.player.toHexString(),
        event.params.quantity.toString(),
        event.params.maxRarity.toString()
    ])
    
    // 批量鑄造完成事件本身不需要特別處理
    // 因為每個英雄的創建已經在 HeroMinted 事件中處理了
    // 這個事件主要用於前端追踪批量鑄造的完成狀態
    
    // 可以選擇性地更新玩家統計或創建批量鑄造記錄
    // 但為了避免重複計算，我們不在這裡更新英雄數量統計
}

// ===== 處理合約暫停事件 =====
export function handlePaused(event: Paused): void {
    createPausedEvent(event.params.account, event, "Hero")
}

export function handleUnpaused(event: Unpaused): void {
    createUnpausedEvent(event.params.account, event, "Hero")
}
