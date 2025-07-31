// DDgraphql/dungeondelvers/src/player-vault.ts (虛擬記帳支援版)
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { 
    Deposited, 
    Withdrawn, 
    CommissionPaid,
    VirtualGameSpending,
    VirtualCommissionAdded,
    VirtualTaxCollected
} from "../generated/PlayerVault/PlayerVault"
import { PlayerVault, PlayerProfile } from "../generated/schema"
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

export function handleVirtualGameSpending(event: VirtualGameSpending): void {
    const vault = getOrCreatePlayerVault(event.params.player)
    vault.totalProvisionSpent = vault.totalProvisionSpent.plus(event.params.amount)
    vault.totalVirtualGameSpending = vault.totalVirtualGameSpending.plus(event.params.amount)
    vault.lastUpdatedAt = event.block.timestamp
    vault.save()
}

export function handleVirtualCommissionAdded(event: VirtualCommissionAdded): void {
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

export function handleVirtualTaxCollected(event: VirtualTaxCollected): void {
    // 目前不需要特別處理稅收事件，可用於統計分析
    // 未來可考慮添加全域稅收統計實體
}
