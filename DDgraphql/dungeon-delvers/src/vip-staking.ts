// DDgraphql/dungeondelvers/src/vip-staking.ts (最終加固版)
import { Staked, UnstakeRequested, Transfer } from "../generated/VIPStaking/VIPStaking"
import { VIP } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { BigInt, log } from "@graphprotocol/graph-ts"

export function handleStaked(event: Staked): void {
    const player = getOrCreatePlayer(event.params.user)
    
    const vipId = event.params.user.toHexString()
    let vip = VIP.load(vipId)
    if (!vip) {
        vip = new VIP(vipId)
        vip.player = player.id
        vip.tokenId = event.params.tokenId
        vip.stakedAmount = BigInt.fromI32(0)
        vip.level = 0 // Level is calculated off-chain
    }

    vip.stakedAmount = vip.stakedAmount.plus(event.params.amount)
    vip.save()
  
    player.vip = vip.id
    player.save()
}

export function handleUnstakeRequested(event: UnstakeRequested): void {
    const vipId = event.params.user.toHexString()
    const vip = VIP.load(vipId)
    if (vip) {
        vip.stakedAmount = vip.stakedAmount.minus(event.params.amount)
        if (vip.stakedAmount.isZero()) {
            const player = getOrCreatePlayer(event.params.user)
            player.vip = null
            player.save()
        }
        vip.save()
    } else {
        log.warning("Unstake handled for a VIP that doesn't exist: {}", [vipId])
    }
}

export function handleVipTransfer(event: Transfer): void {
    if (event.params.from.toHexString() != "0x0000000000000000000000000000000000000000") {
        return // 只處理鑄造事件
    }

    const player = getOrCreatePlayer(event.params.to)
    const vipId = event.params.to.toHexString()

    let vip = VIP.load(vipId)
    if (!vip) {
        vip = new VIP(vipId)
        vip.player = player.id
        vip.stakedAmount = BigInt.fromI32(0)
        vip.level = 0
    }

    vip.tokenId = event.params.tokenId
    vip.save()

    player.vip = vip.id
    player.save()
}
