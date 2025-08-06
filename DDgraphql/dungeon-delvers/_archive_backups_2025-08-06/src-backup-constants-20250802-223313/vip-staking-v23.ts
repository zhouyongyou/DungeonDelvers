import { Staked, UnstakeRequested, UnstakeClaimed, Transfer } from "../generated/VIPStaking/VIPStaking"
import { VIP, Player } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { log, BigInt } from "@graphprotocol/graph-ts"
import { createEntityId } from "./config"
import { updateGlobalStats, updatePlayerStats, TOTAL_VIPS, TOTAL_VIPS_MINTED } from "./stats"

export function handleStaked(event: Staked): void {
    const player = getOrCreatePlayer(event.params.user)
    
    // 創建或更新 VIP 實體
    const vipId = event.params.user.toHexString() + "-vip"
    let vip = VIP.load(vipId)
    
    if (!vip) {
        vip = new VIP(vipId)
        vip.owner = player.id
        vip.tokenId = BigInt.fromI32(0) // VIP staking 沒有實際的 tokenId
        vip.contractAddress = event.address
        vip.isStaked = true
        vip.stakedAmount = event.params.amount
        vip.stakedAt = event.block.timestamp
        vip.unstakeRequestedAt = null
        vip.cooldownEndsAt = null
        vip.createdAt = event.block.timestamp
        vip.isBurned = false
        
        // 更新統計數據
        updateGlobalStats(TOTAL_VIPS, 1, event.block.timestamp)
        updatePlayerStats(event.params.user, TOTAL_VIPS_MINTED, 1, event.block.timestamp)
    } else {
        vip.isStaked = true
        vip.stakedAmount = vip.stakedAmount.plus(event.params.amount)
        vip.stakedAt = event.block.timestamp
    }
    
    // 計算 tier 基於質押數量
    const stakedAmount = vip.stakedAmount
    if (stakedAmount.ge(BigInt.fromI32(1000000))) {
        vip.tier = 5
    } else if (stakedAmount.ge(BigInt.fromI32(500000))) {
        vip.tier = 4
    } else if (stakedAmount.ge(BigInt.fromI32(100000))) {
        vip.tier = 3
    } else if (stakedAmount.ge(BigInt.fromI32(50000))) {
        vip.tier = 2
    } else {
        vip.tier = 1
    }
    
    vip.save()
    
    // 將 VIP 關聯到玩家
    player.vip = vipId
    player.save()
    
    // log.info('Successfully processed Staked event: {} staked {} tokens', [
        event.params.user.toHexString(),
        event.params.amount.toString()
    ])
}

export function handleUnstakeRequested(event: UnstakeRequested): void {
    const vipId = event.params.user.toHexString() + "-vip"
    const vip = VIP.load(vipId)
    
    if (!vip) {
        log.error('VIP not found for unstake request: {}', [vipId])
        return
    }
    
    vip.unstakeRequestedAt = event.block.timestamp
    vip.cooldownEndsAt = event.params.cooldownEnd
    vip.save()
    
    // log.info('Successfully processed UnstakeRequested event: {} requested unstake', [
        event.params.user.toHexString()
    ])
}

export function handleUnstakeClaimed(event: UnstakeClaimed): void {
    const vipId = event.params.user.toHexString() + "-vip"
    const vip = VIP.load(vipId)
    
    if (!vip) {
        log.error('VIP not found for unstake claim: {}', [vipId])
        return
    }
    
    vip.isStaked = false
    vip.stakedAmount = BigInt.fromI32(0)
    vip.unstakeRequestedAt = null
    vip.cooldownEndsAt = null
    vip.unstakedAt = event.block.timestamp
    vip.save()
    
    // log.info('Successfully processed UnstakeClaimed event: {} claimed {} tokens', [
        event.params.user.toHexString(),
        event.params.amount.toString()
    ])
}

export function handleTransfer(event: Transfer): void {
    // VIP NFTs 是 SBT (靈魂綁定代幣)，不應該被轉移
    // 但仍需要處理 mint/burn 的情況
    
    if (event.params.from.toHexString() === '0x0000000000000000000000000000000000000000') {
        // Mint case - handled by Staked event
    // log.info('VIP minted to: {}', [event.params.to.toHexString()])
    } else if (event.params.to.toHexString() === '0x0000000000000000000000000000000000000000') {
        // Burn case
        const vipId = event.params.from.toHexString() + "-vip"
        const vip = VIP.load(vipId)
        
        if (vip) {
            vip.isBurned = true
            vip.burnedAt = event.block.timestamp
            vip.save()
            
            // 更新統計數據
            updateGlobalStats(TOTAL_VIPS, -1, event.block.timestamp)
            updatePlayerStats(event.params.from, TOTAL_VIPS_MINTED, -1, event.block.timestamp)
            
            // 從玩家移除 VIP 關聯
            const player = Player.load(event.params.from)
            if (player) {
                player.vip = null
                player.save()
            }
        }
    } else {
        log.warning('Unexpected VIP transfer from {} to {}', [
            event.params.from.toHexString(),
            event.params.to.toHexString()
        ])
    }
}