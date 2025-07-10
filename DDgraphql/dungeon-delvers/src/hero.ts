// DDgraphql/dungeondelvers/src/hero.ts (最終加固版)
import { HeroMinted, Transfer } from "../generated/Hero/Hero"
import { Hero } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { log } from "@graphprotocol/graph-ts"
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

    let player = getOrCreatePlayer(event.params.owner)
    
    // 使用配置系統創建全域唯一 ID
    let heroId = createEntityId(event.address.toHexString(), event.params.tokenId.toString())
    
    // 檢查是否已存在（防止重複處理）
    let existingHero = Hero.load(heroId);
    if (existingHero) {
        log.warning('Hero already exists: {}', [heroId]);
        return;
    }
    
    let hero = new Hero(heroId)
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
    let heroId = createEntityId(event.address.toHexString(), event.params.tokenId.toString())
    let hero = Hero.load(heroId)
    if (hero) {
        let newOwner = getOrCreatePlayer(event.params.to)
        hero.owner = newOwner.id
        hero.save()
    } else {
        log.warning("Transfer handled for a Hero that doesn't exist in the subgraph: {}", [heroId])
    }
}
