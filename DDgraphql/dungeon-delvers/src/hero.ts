// DDgraphql/dungeondelvers/src/hero.ts (最終加固版)
import { HeroMinted, Transfer } from "../generated/Hero/Hero"
import { Hero } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { log } from "@graphprotocol/graph-ts"

export function handleHeroMinted(event: HeroMinted): void {
    let player = getOrCreatePlayer(event.params.owner)
    
    // 使用 "合約地址-TokenID" 作為全域唯一 ID
    let heroId = event.address.toHexString().concat("-").concat(event.params.tokenId.toString())
    
    let hero = new Hero(heroId)
    hero.owner = player.id
    hero.tokenId = event.params.tokenId
    hero.contractAddress = event.address
    hero.rarity = event.params.rarity
    hero.power = event.params.power
    hero.save()
}

export function handleTransfer(event: Transfer): void {
    let heroId = event.address.toHexString().concat("-").concat(event.params.tokenId.toString())
    let hero = Hero.load(heroId)
    if (hero) {
        let newOwner = getOrCreatePlayer(event.params.to)
        hero.owner = newOwner.id
        hero.save()
    } else {
        // 如果 NFT 在 startBlock 之前就已存在，它的鑄造事件不會被索引，這是正常現象。
        log.warning("Transfer handled for a Hero that doesn't exist in the subgraph: {}", [heroId])
    }
}
