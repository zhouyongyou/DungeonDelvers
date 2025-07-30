// DDgraphql/dungeondelvers/src/vip-staking.ts (最終加固版)
import { Staked, UnstakeRequested, UnstakeClaimed, Transfer } from "../generated/VIPStaking/VIPStaking"
import { VIP } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { BigInt, log } from "@graphprotocol/graph-ts"

// 根據質押金額計算VIP等級（模擬合約邏輯）
function calculateVipTier(stakedAmount: BigInt): i32 {
    // 假設每100 SoulShard = 1 USD，需要100 USD才有VIP 1
    // 這裡簡化處理，實際應該使用Oracle價格
    const usdValue = stakedAmount.div(BigInt.fromI32(100))
    if (usdValue.lt(BigInt.fromI32(100))) return 0
    
    // 使用平方根計算等級（與合約邏輯一致）
    // level = sqrt(usdValue / 100)
    const valueFor100 = usdValue.div(BigInt.fromI32(100))
    
    // 簡單的平方根實現
    // 對於 400 USD: valueFor100 = 4, sqrt(4) = 2, 所以 VIP 2
    if (valueFor100.isZero()) return 0
    
    // 轉換為 i32 進行平方根計算
    const valueI32 = valueFor100.toI32()
    if (valueI32 > 2147483647) {
        return 255 // 防止溢出
    }
    
    // 簡單的整數平方根算法
    let result = 0
    let x = valueI32
    let bit = 1 << 30 // 最高位開始
    
    while (bit > x) {
        bit >>= 2
    }
    
    while (bit != 0) {
        if (x >= result + bit) {
            x -= result + bit
            result = (result >> 1) + bit
        } else {
            result >>= 1
        }
        bit >>= 2
    }
    
    return result > 255 ? 255 : result
}

export function handleStaked(event: Staked): void {
    const player = getOrCreatePlayer(event.params.user)
    
    const vipId = event.params.user
    let vip = VIP.load(vipId)
    if (!vip) {
        vip = new VIP(vipId)
        vip.owner = player.id
        vip.tier = calculateVipTier(BigInt.fromI32(0)) // 根據質押金額計算
        vip.stakedAmount = BigInt.fromI32(0)
        vip.stakedAt = event.block.timestamp
        vip.isUnlocking = false
        vip.createdAt = event.block.timestamp
    }

    vip.stakedAmount = vip.stakedAmount.plus(event.params.amount)
    vip.tier = calculateVipTier(vip.stakedAmount) // 更新tier
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
        vip.tier = calculateVipTier(vip.stakedAmount) // 更新tier
        vip.isUnlocking = false
        vip.unlockRequestedAt = null
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
        vip.tier = calculateVipTier(BigInt.fromI32(0)) // 根據質押金額計算
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
