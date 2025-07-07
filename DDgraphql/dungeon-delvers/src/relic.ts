// 檔案路徑: src/relic.ts
// 請將此檔案的全部內容，完整地複製並覆蓋您現有的 src/relic.ts 檔案。

import {
  Transfer as RelicTransfer,
  RelicMinted
} from "../generated/Relic/Relic"
import { Player, Relic } from "../generated/schema"

// 處理 RelicMinted 事件
export function handleRelicMinted(event: RelicMinted): void {
  // 確保玩家實體存在，如果不存在則創建
  let player = Player.load(event.params.owner)
  if (!player) {
    player = new Player(event.params.owner)
    player.save()
  }

  // 創建一個新的 Relic 實體，使用 "合約地址-TokenID" 作為唯一 ID
  let relicId = event.address.toHexString() + "-" + event.params.tokenId.toString()
  let relic = new Relic(relicId)
  relic.tokenId = event.params.tokenId
  relic.owner = player.id
  relic.rarity = event.params.rarity
  relic.capacity = event.params.capacity
  
  relic.save()
}

// 處理 Transfer 事件，用來更新 Relic 的擁有者
export function handleTransfer(event: RelicTransfer): void {
  let relicId = event.address.toHexString() + "-" + event.params.tokenId.toString()
  let relic = Relic.load(relicId)

  // 聖物實體應該在 RelicMinted 事件中被創建，所以這裡它應該存在
  if (relic) {
    // 確保新的擁有者（玩家）實體存在
    let newOwner = Player.load(event.params.to)
    if (!newOwner) {
      newOwner = new Player(event.params.to)
      newOwner.save()
    }
    relic.owner = newOwner.id
    relic.save()
  }
}