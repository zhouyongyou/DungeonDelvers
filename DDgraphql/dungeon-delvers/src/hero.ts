// DDgraphql/dungeondelvers/src/hero.ts (最終加固版)
import { HeroMinted, Transfer, HeroUpgraded, HeroBurned } from "../generated/Hero/Hero"
import { Hero, HeroUpgrade } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { log, BigInt } from "@graphprotocol/graph-ts"
import { createEntityId } from "./config"
import { updateGlobalStats, updatePlayerStats, TOTAL_HEROES, TOTAL_HEROES_MINTED } from "./stats"

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
    
    log.info('Successfully processed HeroMinted event: {}', [heroId]);
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
            log.info('Hero burned: {} from {}', [heroId, event.params.from.toHexString()]);
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
        log.info('Successfully transferred hero {} from {} to {}', [heroId, event.params.from.toHexString(), event.params.to.toHexString()]);
    } else {
        // 如果 Hero 實體不存在，我們不應該創建占位實體
        // 因為這會導致所有 NFT 顯示為默認 rarity 1
        // 只有 HeroMinted 事件才應該創建 Hero 實體
        log.warning("Transfer event for Hero that doesn't exist in subgraph: {} (skipping placeholder creation)", [heroId]);
        return;
    }
}

export function handleHeroUpgraded(event: HeroUpgraded): void {
    const heroId = createEntityId(event.address.toHexString(), event.params.tokenId.toString())
    const hero = Hero.load(heroId)
    
    if (!hero) {
        log.error('Hero not found for upgrade event: {}', [heroId])
        return
    }

    // 更新英雄屬性
    hero.rarity = event.params.newRarity
    hero.power = event.params.newPower
    hero.lastUpgradedAt = event.block.timestamp
    hero.save()

    // 創建升級記錄
    const upgradeId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    const upgrade = new HeroUpgrade(upgradeId)
    upgrade.hero = heroId
    upgrade.owner = event.params.owner
    upgrade.oldRarity = event.params.oldRarity
    upgrade.newRarity = event.params.newRarity
    upgrade.newPower = event.params.newPower
    upgrade.timestamp = event.block.timestamp
    upgrade.save()

    log.info('Successfully processed HeroUpgraded event: {} (Rarity: {} -> {})', [
        heroId,
        event.params.oldRarity.toString(),
        event.params.newRarity.toString()
    ])
}

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

    log.info('Successfully processed HeroBurned event: {} (Rarity: {})', [
        heroId,
        event.params.rarity.toString()
    ])
}
