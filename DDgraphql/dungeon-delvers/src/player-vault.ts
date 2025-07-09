// DDgraphql/dungeondelvers/src/player-vault.ts (參數名稱修正版)
import { Address, BigInt } from "@graphprotocol/graph-ts"
import { Deposited, Withdrawn, CommissionPaid } from "../generated/PlayerVault/PlayerVault"
import { PlayerVault } from "../generated/schema"
import { getOrCreatePlayer } from "./common"

function getOrCreatePlayerVault(playerAddress: Address): PlayerVault {
    let player = getOrCreatePlayer(playerAddress)
    
    let vaultId = playerAddress.toHexString()
    let vault = PlayerVault.load(vaultId)

    if (!vault) {
        vault = new PlayerVault(vaultId)
        vault.player = player.id
        vault.totalDeposited = BigInt.fromI32(0)
        vault.totalWithdrawn = BigInt.fromI32(0)
        vault.balance = BigInt.fromI32(0)
    }
    return vault
}

export function handleDeposited(event: Deposited): void {
    // ★ 核心修正 #1：事件參數是 `player` 而不是 `user`
    let vault = getOrCreatePlayerVault(event.params.player)
    vault.totalDeposited = vault.totalDeposited.plus(event.params.amount)
    vault.balance = vault.balance.plus(event.params.amount)
    vault.save()
}

export function handleWithdrawn(event: Withdrawn): void {
    // ★ 核心修正 #2：事件參數是 `player` 而不是 `user`
    let vault = getOrCreatePlayerVault(event.params.player)
    // ★ 核心修正 #3：事件參數是 `taxAmount` 而不是 `fee`
    let totalAmount = event.params.amount.plus(event.params.taxAmount)
    vault.totalWithdrawn = vault.totalWithdrawn.plus(totalAmount)
    vault.balance = vault.balance.minus(totalAmount)
    vault.save()
}

export function handleCommissionPaid(event: CommissionPaid): void {
    // ★ 核心修正 #4：事件參數是 `referrer` 而不是 `recipient`
    let vault = getOrCreatePlayerVault(event.params.referrer)
    vault.totalDeposited = vault.totalDeposited.plus(event.params.amount)
    vault.balance = vault.balance.plus(event.params.amount)
    vault.save()
}
