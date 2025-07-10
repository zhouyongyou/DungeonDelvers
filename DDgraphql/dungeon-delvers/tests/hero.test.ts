import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { Hero, Player } from "../generated/schema"
import { HeroMinted } from "../generated/Hero/Hero"
import { handleHeroMinted } from "../src/hero"
import { createHeroMintedEvent } from "./hero-utils"

// 測試 HeroMinted 事件的處理邏輯
describe("Hero Entity", () => {
  // 在所有測試開始前，執行一次
  beforeAll(() => {
    // 1. 準備測試數據
    const ownerAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const tokenId = BigInt.fromI32(1)
    const rarity = 3 // 稀有
    const power = BigInt.fromI32(125)

    // 2. 創建一個模擬的 HeroMinted 事件
    const newHeroMintedEvent = createHeroMintedEvent(
      tokenId,
      ownerAddress,
      rarity,
      power
    )

    // 3. 呼叫我們真正要測試的處理函式
    handleHeroMinted(newHeroMintedEvent)
  })

  // 在所有測試結束後，清除儲存以保持測試獨立性
  afterAll(() => {
    clearStore()
  })

  // 測試案例：檢查 Player 和 Hero 實體是否正確創建
  test("Player and Hero entities created and stored correctly", () => {
    // 斷言：應該只有一個 Player 實體被創建
    assert.entityCount("Player", 1)
    // 斷言：Player 實體的 ID 應該是擁有者的地址
    assert.fieldEquals(
      "Player",
      "0x0000000000000000000000000000000000000001",
      "id",
      "0x0000000000000000000000000000000000000001"
    )

    // 斷言：應該只有一個 Hero 實體被創建
    assert.entityCount("Hero", 1)
    
    // 構造 Hero 的唯一 ID (合約地址-tokenId)
    // 注意：`event.address` 在 matchstick-as 中有預設值
    const heroId = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1"

    // 斷言：Hero 實體的各個欄位值是否與我們模擬事件中的數據一致
    assert.fieldEquals("Hero", heroId, "tokenId", "1")
    assert.fieldEquals("Hero", heroId, "owner", "0x0000000000000000000000000000000000000001")
    assert.fieldEquals("Hero", heroId, "rarity", "3")
    assert.fieldEquals("Hero", heroId, "power", "125")
  })
})
