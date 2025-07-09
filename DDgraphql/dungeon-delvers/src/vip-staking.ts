// DDgraphql/dungeondelvers/src/vip-staking.ts (防崩潰修正版)
import { Staked, UnstakeRequested, Transfer } from "../generated/VIPStaking/VIPStaking"
import { Player, VIP } from "../generated/schema"
import { BigInt, log } from "@graphprotocol/graph-ts"

// --- Helper: Load or create a Player entity ---
function getOrCreatePlayer(id: string): Player {
    let player = Player.load(id)
    if (!player) {
        player = new Player(id)
        player.save()
    }
    return player
}

export function handleStaked(event: Staked): void {
    let player = getOrCreatePlayer(event.params.user.toHexString())
    
    // ★ 安全模式：先載入，若不存在則創建
    let vip = VIP.load(event.params.user.toHexString())
    if (!vip) {
        vip = new VIP(event.params.user.toHexString())
        vip.player = player.id
        vip.tokenId = event.params.tokenId
        vip.stakedAmount = BigInt.fromI32(0)
        vip.level = 0
    }

    vip.stakedAmount = vip.stakedAmount.plus(event.params.amount)
    vip.save()
  
    // 建立從 Player 到 VIP 的反向關聯
    player.vip = vip.id
    player.save()
}

export function handleUnstakeRequested(event: UnstakeRequested): void {
    let vip = VIP.load(event.params.user.toHexString())
    if (vip) {
        vip.stakedAmount = vip.stakedAmount.minus(event.params.amount)
        if (vip.stakedAmount.isZero()) {
            let player = Player.load(event.params.user.toHexString())
            if (player) {
                player.vip = null
                player.save()
            }
        }
        vip.save()
    } else {
        log.warning("Unstake handled for a VIP that doesn't exist: {}", [event.params.user.toHexString()])
    }
}

// This handles the minting of the VIP card (SBT)
export function handleVipTransfer(event: Transfer): void {
    // 只處理鑄造事件
    if (event.params.from.toHexString() != "0x0000000000000000000000000000000000000000") {
        return
    }

    let player = getOrCreatePlayer(event.params.to.toHexString())

    // ★ 核心修正：嚴格使用「先載入，若不存在則創建」模式，避免崩潰
    let vip = VIP.load(event.params.to.toHexString())
    if (!vip) {
        vip = new VIP(event.params.to.toHexString())
        vip.player = player.id
        vip.stakedAmount = BigInt.fromI32(0)
        vip.level = 0
    }

    // 無論是新創建還是已存在，都更新 tokenId
    vip.tokenId = event.params.tokenId
    vip.save()

    // 建立反向關聯
    player.vip = vip.id
    player.save()
}
