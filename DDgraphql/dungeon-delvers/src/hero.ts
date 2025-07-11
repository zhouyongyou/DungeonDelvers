// DDgraphql/dungeondelvers/src/hero.ts (最終加固版)
import { HeroMinted, Transfer } from "../generated/Hero/Hero"
import { Hero } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { log, BigInt } from "@graphprotocol/graph-ts"
import { createEntityId } from "./config"

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
    hero.save()
    
    log.info('Successfully processed HeroMinted event: {}', [heroId]);
}

export function handleTransfer(event: Transfer): void {
    // 跳過零地址轉移（通常是銷毀操作）
    if (event.params.to.toHexString() === '0x0000000000000000000000000000000000000000') {
        log.info('Skipping transfer to zero address (burn): {}', [event.params.tokenId.toString()]);
        return;
    }

    const heroId = createEntityId(event.address.toHexString(), event.params.tokenId.toString())
    const hero = Hero.load(heroId)
    
    if (hero) {
        // 對於 immutable 實體，我們不能更新現有實體
        // 只能記錄轉移事件，但不能修改實體本身
        log.info('Transfer event for existing immutable hero {} from {} to {} (entity cannot be updated)', [heroId, event.params.from.toHexString(), event.params.to.toHexString()]);
        return;
    } else {
        // 創建一個占位實體以避免後續錯誤
        log.warning("Transfer handled for a Hero that doesn't exist in the subgraph: {}, creating placeholder", [heroId])
        
        const placeholderHero = new Hero(heroId)
        const newOwner = getOrCreatePlayer(event.params.to)
        placeholderHero.owner = newOwner.id
        placeholderHero.tokenId = event.params.tokenId
        placeholderHero.contractAddress = event.address
        placeholderHero.rarity = 1  // 默認稀有度
        placeholderHero.power = BigInt.fromI32(100)  // 默認力量
        placeholderHero.createdAt = event.block.timestamp
        placeholderHero.save()
        
        log.info('Created placeholder hero: {}', [heroId]);
    }
}
