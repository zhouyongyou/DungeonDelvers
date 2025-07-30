// DDgraphql/dungeondelvers/src/vip-staking.ts (最終加固版)
import { Staked, UnstakeRequested, UnstakeClaimed, Transfer } from "../generated/VIPStaking/VIPStaking"
import { VIP } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { BigInt, log } from "@graphprotocol/graph-ts"

// 注意：不再在子圖中計算 VIP 等級
// VIP 等級由前端直接從合約讀取，確保使用動態價格計算

export function handleStaked(event: Staked): void {
    const player = getOrCreatePlayer(event.params.user)
    
    const vipId = event.params.user
    let vip = VIP.load(vipId)
    if (!vip) {
        vip = new VIP(vipId)
        vip.owner = player.id
        // 移除 tier 計算 - 由前端從合約讀取
        vip.stakedAmount = BigInt.fromI32(0)
        vip.stakedAt = event.block.timestamp
        vip.isUnlocking = false
        vip.createdAt = event.block.timestamp
    }

    vip.stakedAmount = vip.stakedAmount.plus(event.params.amount)
    vip.lastUpdatedAt = event.block.timestamp
    vip.save()
  
    player.vip = vip.id
    player.save()
}

export function handleUnstakeRequested(event: UnstakeRequested): void {
    const vipId = event.params.user
    const vip = VIP.load(vipId)
    if (vip) {
        vip.isUnlocking = true
        vip.unlockRequestedAt = event.block.timestamp
        vip.save()
    } else {
        log.warning("UnstakeRequested handled for a VIP that doesn't exist: {}", [vipId.toHexString()])
    }
}

export function handleUnstakeClaimed(event: UnstakeClaimed): void {
    const vipId = event.params.user
    const vip = VIP.load(vipId)
    if (vip) {
        vip.stakedAmount = vip.stakedAmount.minus(event.params.amount)
        // 移除 tier 計算 - 由前端從合約讀取
        vip.isUnlocking = false
        vip.unlockRequestedAt = null
        vip.lastUpdatedAt = event.block.timestamp
        if (vip.stakedAmount.isZero()) {
            const player = getOrCreatePlayer(event.params.user)
            player.vip = null
            player.save()
        }
        vip.save()
    } else {
        log.warning("UnstakeClaimed handled for a VIP that doesn't exist: {}", [vipId.toHexString()])
    }
}

export function handleTransfer(event: Transfer): void {
    if (event.params.from.toHexString() != "0x0000000000000000000000000000000000000000") {
        return // 只處理鑄造事件
    }

    const player = getOrCreatePlayer(event.params.to)
    const vipId = event.params.to

    let vip = VIP.load(vipId)
    if (!vip) {
        vip = new VIP(vipId)
        vip.owner = player.id
        // 移除 tier 計算 - 由前端從合約讀取
        vip.stakedAmount = BigInt.fromI32(0)
        vip.stakedAt = event.block.timestamp
        vip.isUnlocking = false
        vip.createdAt = event.block.timestamp
    }

    vip.lastUpdatedAt = event.block.timestamp
    vip.save()

    player.vip = vip.id
    player.save()
}
