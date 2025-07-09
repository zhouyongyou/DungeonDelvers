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
    // 修正：使用 event.params.player 而不是 event.params.user
    let vault = getOrCreatePlayerVault(event.params.player)
    vault.totalDeposited = vault.totalDeposited.plus(event.params.amount)
    vault.balance = vault.balance.plus(event.params.amount)
    vault.save()
}

export function handleWithdrawn(event: Withdrawn): void {
    // 修正：使用 event.params.player 和 event.params.taxAmount
    let vault = getOrCreatePlayerVault(event.params.player)
    let totalAmount = event.params.amount.plus(event.params.taxAmount)
    vault.totalWithdrawn = vault.totalWithdrawn.plus(totalAmount)
    vault.balance = vault.balance.minus(totalAmount)
    vault.save()
}

export function handleCommissionPaid(event: CommissionPaid): void {
    // 修正：使用 event.params.referrer 而不是 event.params.recipient
    let vault = getOrCreatePlayerVault(event.params.referrer)
    vault.totalDeposited = vault.totalDeposited.plus(event.params.amount)
    vault.balance = vault.balance.plus(event.params.amount)
    vault.save()
}
