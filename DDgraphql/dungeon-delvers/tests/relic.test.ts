import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { Relic, Player } from "../generated/schema"
import { RelicMinted } from "../generated/Relic/Relic"
import { handleRelicMinted } from "../src/relic"
import { createRelicMintedEvent } from "./relic-utils"

// 測試 RelicMinted 事件的處理邏輯
describe("Relic Entity", () => {
  beforeAll(() => {
    // 1. 準備測試數據
    const ownerAddress = Address.fromString("0x0000000000000000000000000000000000000001")
    const tokenId = BigInt.fromI32(1)
    const rarity = 4 // 史詩
    const capacity = 4

    // 2. 創建一個模擬的 RelicMinted 事件
    const newRelicMintedEvent = createRelicMintedEvent(
      tokenId,
      ownerAddress,
      rarity,
      capacity
    )

    // 3. 呼叫我們真正要測試的處理函式
    handleRelicMinted(newRelicMintedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  test("Player and Relic entities created and stored correctly", () => {
    // 斷言 Player 實體
    assert.entityCount("Player", 1)
    assert.fieldEquals(
      "Player",
      "0x0000000000000000000000000000000000000001",
      "id",
      "0x0000000000000000000000000000000000000001"
    )

    // 斷言 Relic 實體
    assert.entityCount("Relic", 1)
    
    const relicId = "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1"
    
    assert.fieldEquals("Relic", relicId, "tokenId", "1")
    assert.fieldEquals("Relic", relicId, "owner", "0x0000000000000000000000000000000000000001")
    assert.fieldEquals("Relic", relicId, "rarity", "4")
    assert.fieldEquals("Relic", relicId, "capacity", "4")
  })
})
