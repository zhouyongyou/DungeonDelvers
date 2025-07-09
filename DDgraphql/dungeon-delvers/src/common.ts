// DDgraphql/dungeondelvers/src/common.ts
// 說明：這個檔案用於存放可以在多個 mapping 檔案中重複使用的共用函式。

import { Address } from "@graphprotocol/graph-ts"
import { Player } from "../generated/schema"

/**
 * @notice 安全地獲取或創建一個 Player 實體。
 * @dev    使用玩家的錢包地址 (Bytes) 作為唯一 ID。
 * @param  address 玩家的錢包地址。
 * @return 返回已存在或新創建的 Player 實體。
 */
export function getOrCreatePlayer(address: Address): Player {
    // 直接使用 Address (Bytes) 類型來載入和創建，確保與 schema.graphql 中的 `id: Bytes!` 匹配
    let player = Player.load(address)
    if (!player) {
        player = new Player(address)
        player.save()
    }
    return player
}
