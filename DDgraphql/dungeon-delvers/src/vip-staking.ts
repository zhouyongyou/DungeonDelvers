// DDgraphql/dungeondelvers/src/vip-staking.ts (最終加固版)
import { Staked, UnstakeRequested, UnstakeClaimed, Transfer } from "../generated/VIPStaking/VIPStaking"
import { VIP } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { BigInt, log } from "@graphprotocol/graph-ts"

// 安全的 BigInt 平方根計算
function sqrtBigInt(value: BigInt): BigInt {
    if (value.isZero()) return BigInt.fromI32(0)
    if (value.equals(BigInt.fromI32(1))) return BigInt.fromI32(1)
    
    // 使用牛頓法計算平方根
    let x = value
    let y = value.plus(BigInt.fromI32(1)).div(BigInt.fromI32(2))
    
    // 限制迭代次數防止無限循環
    let iterations = 0
    const maxIterations = 100
    
    while (y.lt(x) && iterations < maxIterations) {
        x = y
        y = x.plus(value.div(x)).div(BigInt.fromI32(2))
        iterations++
    }
    
    return x
}

// 根據質押金額計算VIP等級（安全版本）
function calculateVipTier(stakedAmount: BigInt): i32 {
    // 假設每100 SoulShard = 1 USD，需要100 USD才有VIP 1
    const usdValue = stakedAmount.div(BigInt.fromI32(100))
    if (usdValue.lt(BigInt.fromI32(100))) return 0
    
    // 使用平方根計算等級（與合約邏輯一致）
    // level = sqrt(usdValue / 100)
    const valueFor100 = usdValue.div(BigInt.fromI32(100))
    
    if (valueFor100.isZero()) return 0
    
    // 使用安全的BigInt平方根
    const sqrtResult = sqrtBigInt(valueFor100)
    
    // 安全轉換為 i32，設定合理上限
    const maxTier = BigInt.fromI32(255)
    const tier = sqrtResult.gt(maxTier) ? maxTier : sqrtResult
    
    return tier.toI32()
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
