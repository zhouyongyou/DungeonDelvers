// 檔案路徑: src/hero.ts
// 請將此檔案的全部內容，完整地複製並覆蓋您現有的 src/hero.ts 檔案。

import {
  Transfer as HeroTransfer,
  HeroMinted
} from "../generated/Hero/Hero"
import { Player, Hero } from "../generated/schema"

// 處理 HeroMinted 事件
export function handleHeroMinted(event: HeroMinted): void {
  // 確保玩家實體存在，如果不存在則創建
  let player = Player.load(event.params.owner)
  if (!player) {
    player = new Player(event.params.owner)
    player.save()
  }

  // 創建一個新的 Hero 實體，使用 "合約地址-TokenID" 作為唯一 ID
  let heroId = event.address.toHexString() + "-" + event.params.tokenId.toString()
  let hero = new Hero(heroId)
  hero.tokenId = event.params.tokenId
  hero.owner = player.id
  hero.rarity = event.params.rarity
  hero.power = event.params.power
  
  hero.save()
}

// 處理 Transfer 事件，用來更新 Hero 的擁有者
export function handleTransfer(event: HeroTransfer): void {
  let heroId = event.address.toHexString() + "-" + event.params.tokenId.toString()
  let hero = Hero.load(heroId)

  // 英雄實體應該在 HeroMinted 事件中被創建，所以這裡它應該存在
  if (hero) {
    // 確保新的擁有者（玩家）實體存在
    let newOwner = Player.load(event.params.to)
    if (!newOwner) {
      newOwner = new Player(event.params.to)
      newOwner.save()
    }
    hero.owner = newOwner.id
    hero.save()
  }
}