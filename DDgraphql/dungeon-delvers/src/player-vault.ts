// DDgraphql/dungeondelvers/src/player-vault.ts (V25 最小版本)
import { Address, BigInt, log } from "@graphprotocol/graph-ts"
import { 
    Deposited, 
    Withdrawn, 
    CommissionPaid,
    GameSpending,
    ReferralSet
} from "../generated/PlayerVault/PlayerVault"
import { getOrCreatePlayer } from "./common"

export function handleDeposited(event: Deposited): void {
    log.info("PlayerVault Deposited: player={}, amount={}", [
        event.params.player.toHexString(),
        event.params.amount.toString()
    ])
    
    // 確保玩家實體存在
    getOrCreatePlayer(event.params.player)
}

export function handleWithdrawn(event: Withdrawn): void {
    log.info("PlayerVault Withdrawn: player={}, amount={}, tax={}", [
        event.params.player.toHexString(),
        event.params.amount.toString(),
        event.params.taxAmount.toString()
    ])
    
    // 確保玩家實體存在
    getOrCreatePlayer(event.params.player)
}

export function handleCommissionPaid(event: CommissionPaid): void {
    // V25: CommissionPaid 事件參數: user, referrer, amount
    log.info("PlayerVault CommissionPaid: user={}, referrer={}, amount={}", [
        event.params.user.toHexString(),
        event.params.referrer.toHexString(), 
        event.params.amount.toString()
    ])
    
    // 確保相關玩家實體存在
    getOrCreatePlayer(event.params.user)
    getOrCreatePlayer(event.params.referrer)
}

export function handleGameSpending(event: GameSpending): void {
    // V25: GameSpending 事件參數: player, spender, amount
    log.info("PlayerVault GameSpending: player={}, spender={}, amount={}", [
        event.params.player.toHexString(),
        event.params.spender.toHexString(),
        event.params.amount.toString()
    ])
    
    // 確保相關玩家實體存在
    getOrCreatePlayer(event.params.player)
    getOrCreatePlayer(event.params.spender)
}

export function handleReferralSet(event: ReferralSet): void {
    // V25: ReferralSet 事件參數: user, referrer
    log.info("PlayerVault ReferralSet: user={}, referrer={}", [
        event.params.user.toHexString(),
        event.params.referrer.toHexString()
    ])
    
    // 確保相關玩家實體存在
    getOrCreatePlayer(event.params.user)
    getOrCreatePlayer(event.params.referrer)
}