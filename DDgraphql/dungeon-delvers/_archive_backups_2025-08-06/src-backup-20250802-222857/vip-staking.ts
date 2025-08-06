// DDgraphql/dungeondelvers/src/vip-staking.ts (SBT 版本)
import { Staked, UnstakeRequested, UnstakeClaimed, Transfer } from "../generated/VIPStaking/VIPStaking"
import { VIP } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { BigInt, log, ethereum } from "@graphprotocol/graph-ts"
// import { createPausedEvent, createUnpausedEvent } from "./pausable-handler"

// 注意：VIP 卡現在是 SBT (Soul Bound Token)，不可轉移
// VIP 等級由前端直接從合約讀取，確保使用動態價格計算
// tokenId 一旦生成將永久保留，不會因 unstake 而清除

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
        vip.hasVIPCard = false  // 初始化 hasVIPCard 標記
        vip.firstStakedAt = null  // 初始化首次質押時間
        vip.tokenId = null  // 初始化 tokenId
    }

    vip.stakedAmount = vip.stakedAmount.plus(event.params.amount)
    vip.lastUpdatedAt = event.block.timestamp
    
    // 設置 VIP 卡擁有標記（一旦質押就擁有，永不清除）
    if (!vip.hasVIPCard) {
        vip.hasVIPCard = true
        vip.firstStakedAt = event.block.timestamp
    }
    
    vip.save()
  
    player.vip = vip.id
    player.hasVIPCard = true  // 在 Player 實體中也標記擁有 VIP 卡
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
        
        // 🔴 重要變更：即使 stakedAmount 變為 0，也不清除 VIP 關聯
        // VIP 卡是 SBT，一旦擁有就永久保留
        // 註釋掉的舊邏輯：
        // if (vip.stakedAmount.isZero()) {
        //     const player = getOrCreatePlayer(event.params.user)
        //     player.vip = null  // ❌ 不再清除
        //     player.save()
        // }
        
        vip.save()
        
        // Player 的 vip 和 hasVIPCard 保持不變
    } else {
        log.warning("UnstakeClaimed handled for a VIP that doesn't exist: {}", [vipId.toHexString()])
    }
}

export function handleTransfer(event: Transfer): void {
    // 🔴 重要：VIP 卡現在是 SBT (Soul Bound Token)，理論上不應該有轉移
    // 但我們仍然處理鑄造事件 (from = 0x0)
    
    const fromAddress = event.params.from.toHexString()
    const toAddress = event.params.to.toHexString()
    
    if (fromAddress != "0x0000000000000000000000000000000000000000") {
        // 如果不是鑄造事件，記錄警告（SBT 不應該被轉移）
        log.warning("VIP Transfer event detected (should not happen for SBT): from {} to {} tokenId {}", [
            fromAddress, toAddress, event.params.tokenId.toString()
        ])
        return
    }

    // 處理鑄造事件
    const player = getOrCreatePlayer(event.params.to)
    const vipId = event.params.to

    let vip = VIP.load(vipId)
    if (!vip) {
        vip = new VIP(vipId)
        vip.owner = player.id
        vip.stakedAmount = BigInt.fromI32(0)
        vip.stakedAt = event.block.timestamp
        vip.isUnlocking = false
        vip.createdAt = event.block.timestamp
        vip.hasVIPCard = true  // 鑄造時立即設置為 true
        vip.firstStakedAt = event.block.timestamp
    }

    vip.tokenId = event.params.tokenId  // 記錄 token ID
    vip.lastUpdatedAt = event.block.timestamp
    vip.save()

    player.vip = vip.id
    player.hasVIPCard = true  // 確保 Player 實體也有標記
    player.save()
}

// ===== 處理合約暫停事件 =====
// 注意：當新版本 VIPStaking 合約部署後，需要在 ABI 中添加 Paused/Unpaused 事件
// 並在 subgraph.yaml 中配置這些事件處理器
// 以下函數暫時註釋，等 ABI 更新後啟用

// export function handlePaused(event: ethereum.Event): void {
//     createPausedEvent(event.params.account, event, "VIPStaking")
// }

// export function handleUnpaused(event: ethereum.Event): void {
//     createUnpausedEvent(event.params.account, event, "VIPStaking")
// }
