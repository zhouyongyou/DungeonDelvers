// DDgraphql/dungeondelvers/src/player-vault.ts (最終加固版)
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
    // 現在可以安全地使用 event.params.user
    let vault = getOrCreatePlayerVault(event.params.user)
    vault.totalDeposited = vault.totalDeposited.plus(event.params.amount)
    vault.balance = vault.balance.plus(event.params.amount)
    vault.save()
}

export function handleWithdrawn(event: Withdrawn): void {
    // 現在可以安全地使用 event.params.user 和 event.params.fee
    let vault = getOrCreatePlayerVault(event.params.user)
    let totalAmount = event.params.amount.plus(event.params.fee)
    vault.totalWithdrawn = vault.totalWithdrawn.plus(totalAmount)
    vault.balance = vault.balance.minus(totalAmount)
    vault.save()
}

export function handleCommissionPaid(event: CommissionPaid): void {
    // 現在可以安全地使用 event.params.recipient
    let vault = getOrCreatePlayerVault(event.params.recipient)
    vault.totalDeposited = vault.totalDeposited.plus(event.params.amount)
    vault.balance = vault.balance.plus(event.params.amount)
    vault.save()
}
