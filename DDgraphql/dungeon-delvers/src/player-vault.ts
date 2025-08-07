// DDgraphql/dungeondelvers/src/player-vault.ts (虛擬記帳支援版)
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { 
    Deposited, 
    Withdrawn, 
    CommissionPaid,
    GameSpending,
    ReferralSet
} from "../generated/PlayerVault/PlayerVault"
import { PlayerVault, PlayerProfile, VirtualTaxRecord, TaxStatistics, WithdrawalEvent } from "../generated/schema"
import { getOrCreatePlayer } from "./common"

function getOrCreatePlayerVault(playerAddress: Address): PlayerVault {
    const player = getOrCreatePlayer(playerAddress)
    
    const vaultId = playerAddress
    let vault = PlayerVault.load(vaultId)

    if (!vault) {
        vault = new PlayerVault(vaultId)
        vault.owner = player.id
        vault.pendingRewards = BigInt.fromI32(0)
        vault.claimedRewards = BigInt.fromI32(0)
        vault.totalProvisionSpent = BigInt.fromI32(0)
        vault.totalVirtualGameSpending = BigInt.fromI32(0)
        vault.totalVirtualCommissionEarned = BigInt.fromI32(0)
        vault.createdAt = BigInt.fromI32(0)
    }
    return vault
}

export function handleDeposited(event: Deposited): void {
    // ★ 核心修正 #1：事件參數是 `player` 而不是 `user`
    const vault = getOrCreatePlayerVault(event.params.player)
    vault.pendingRewards = vault.pendingRewards.plus(event.params.amount)
    vault.lastUpdatedAt = event.block.timestamp
    vault.save()
}

export function handleWithdrawn(event: Withdrawn): void {
    // ★ 核心修正 #2：事件參數是 `player` 而不是 `user`
    const vault = getOrCreatePlayerVault(event.params.player)
    // ★ 核心修正 #3：事件參數是 `taxAmount` 而不是 `fee`
    const totalAmount = event.params.amount.plus(event.params.taxAmount)
    vault.claimedRewards = vault.claimedRewards.plus(totalAmount)
    vault.pendingRewards = vault.pendingRewards.minus(totalAmount)
    vault.lastClaimedAt = event.block.timestamp
    vault.lastUpdatedAt = event.block.timestamp
    vault.save()
    
    // 創建 WithdrawalEvent 記錄
    const withdrawalEventId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    const withdrawalEvent = new WithdrawalEvent(withdrawalEventId)
    withdrawalEvent.player = event.params.player
    withdrawalEvent.amount = totalAmount // 總金額（包含稅）
    withdrawalEvent.taxAmount = event.params.taxAmount
    withdrawalEvent.netAmount = event.params.amount // 實際收到的金額
    withdrawalEvent.freeWithdraw = event.params.taxAmount.equals(BigInt.fromI32(0))
    
    // 計算稅率百分比
    let taxRate = 0
    if (totalAmount.gt(BigInt.fromI32(0))) {
        taxRate = event.params.taxAmount.times(BigInt.fromI32(100)).div(totalAmount).toI32()
    }
    withdrawalEvent.taxRate = taxRate
    
    withdrawalEvent.txHash = event.transaction.hash
    withdrawalEvent.blockNumber = event.block.number
    withdrawalEvent.timestamp = event.block.timestamp
    withdrawalEvent.save()
}

export function handleCommissionPaid(event: CommissionPaid): void {
    // ★ 核心修正 #4：事件參數是 `referrer` 而不是 `recipient`
    const vault = getOrCreatePlayerVault(event.params.referrer)
    vault.pendingRewards = vault.pendingRewards.plus(event.params.amount)
    vault.lastUpdatedAt = event.block.timestamp
    vault.save()
    
    // ★ 新增修正：同步更新 PlayerProfile 的 commissionEarned 字段
    const player = getOrCreatePlayer(event.params.referrer)
    if (player.profile) {
        const profile = PlayerProfile.load(player.profile!)
        if (profile) {
            profile.commissionEarned = profile.commissionEarned.plus(event.params.amount)
            profile.lastUpdatedAt = event.block.timestamp
            profile.save()
        }
    }
}

export function handleGameSpending(event: GameSpending): void {
    const vault = getOrCreatePlayerVault(event.params.player)
    vault.totalProvisionSpent = vault.totalProvisionSpent.plus(event.params.amount)
    vault.totalVirtualGameSpending = vault.totalVirtualGameSpending.plus(event.params.amount)
    vault.lastUpdatedAt = event.block.timestamp
    vault.save()
}

// Removed: handleVirtualCommissionAdded - no longer exists in V25
// export function handleVirtualCommissionAdded(event: VirtualCommissionAdded): void {
    const vault = getOrCreatePlayerVault(event.params.referrer)
    vault.pendingRewards = vault.pendingRewards.plus(event.params.amount)
    vault.totalVirtualCommissionEarned = vault.totalVirtualCommissionEarned.plus(event.params.amount)
    vault.lastUpdatedAt = event.block.timestamp
    vault.save()
    
    // 同步更新 PlayerProfile 的 commissionEarned 字段
    const player = getOrCreatePlayer(event.params.referrer)
    if (player.profile) {
        const profile = PlayerProfile.load(player.profile!)
        if (profile) {
            profile.commissionEarned = profile.commissionEarned.plus(event.params.amount)
            profile.lastUpdatedAt = event.block.timestamp
            profile.save()
        }
    }
}

// Removed: handleVirtualTaxCollected - no longer exists in V25
// export function handleVirtualTaxCollected(event: VirtualTaxCollected): void {
    // 創建個別稅收記錄
    const recordId = event.transaction.hash.toHex() + "-" + event.logIndex.toString()
    const record = new VirtualTaxRecord(recordId)
    record.amount = event.params.amount
    record.timestamp = event.block.timestamp
    record.blockNumber = event.block.number
    record.transactionHash = event.transaction.hash
    record.save()
    
    // 更新全域稅收統計
    let stats = TaxStatistics.load("global")
    if (!stats) {
        stats = new TaxStatistics("global")
        stats.totalVirtualTaxCollected = BigInt.fromI32(0)
        stats.totalTaxRecords = BigInt.fromI32(0)
    }
    
    stats.totalVirtualTaxCollected = stats.totalVirtualTaxCollected.plus(event.params.amount)
    stats.totalTaxRecords = stats.totalTaxRecords.plus(BigInt.fromI32(1))
    stats.lastUpdated = event.block.timestamp
    stats.save()
}

export function handleReferralSet(event: ReferralSet): void {
    // 獲取或創建推薦人的 PlayerProfile
    const referrerPlayer = getOrCreatePlayer(event.params.referrer)
    if (referrerPlayer.profile) {
        const referrerProfile = PlayerProfile.load(referrerPlayer.profile!)
        if (referrerProfile) {
            // 將新用戶添加到推薦人的 invitees 列表
            const invitees = referrerProfile.invitees
            invitees.push(event.params.user)
            referrerProfile.invitees = invitees
            referrerProfile.lastUpdatedAt = event.block.timestamp
            referrerProfile.save()
        }
    }
    
    // 獲取或創建被推薦人的 PlayerProfile
    const userPlayer = getOrCreatePlayer(event.params.user)
    if (userPlayer.profile) {
        const userProfile = PlayerProfile.load(userPlayer.profile!)
        if (userProfile) {
            // 設置被推薦人的 inviter
            userProfile.inviter = event.params.referrer
            userProfile.lastUpdatedAt = event.block.timestamp
            userProfile.save()
        }
    }
}
