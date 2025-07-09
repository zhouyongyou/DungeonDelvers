// =================================================================
// 檔案: DDgraphql/dungeondelvers/src/hero.ts
// =================================================================
import { Transfer as HeroTransfer, HeroMinted } from "../generated/Hero/Hero"
import { Player, Hero } from "../generated/schema"

export function handleHeroMinted(event: HeroMinted): void {
  let player = Player.load(event.params.owner)
  if (!player) {
    player = new Player(event.params.owner)
    player.save()
  }
  let heroId = event.address.toHexString() + "-" + event.params.tokenId.toString()
  let hero = new Hero(heroId)
  hero.tokenId = event.params.tokenId
  hero.owner = player.id
  hero.rarity = event.params.rarity
  hero.power = event.params.power
  hero.save()
}

export function handleTransfer(event: HeroTransfer): void {
  let heroId = event.address.toHexString() + "-" + event.params.tokenId.toString()
  let hero = Hero.load(heroId)
  if (hero) {
    let newOwner = Player.load(event.params.to)
    if (!newOwner) {
      newOwner = new Player(event.params.to)
      newOwner.save()
    }
    hero.owner = newOwner.id
    hero.save()
  }
}