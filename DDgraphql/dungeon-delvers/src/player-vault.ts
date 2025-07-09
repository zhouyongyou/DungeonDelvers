// =================================================================
// 檔案: DDgraphql/dungeondelvers/src/player-vault.ts
// =================================================================
import { BigInt } from "@graphprotocol/graph-ts"
import { Deposited, Withdrawn, CommissionPaid } from "../generated/PlayerVault/PlayerVault"
import { Player, PlayerVault } from "../generated/schema"

export function handleDeposited(event: Deposited): void {
  let player = Player.load(event.params.player)
  if(!player) {
    player = new Player(event.params.player)
    player.save()
  }

  let vault = PlayerVault.load(event.params.player.toHexString())
  if (!vault) {
    vault = new PlayerVault(event.params.player.toHexString())
    vault.player = player.id
    vault.withdrawableBalance = BigInt.fromI32(0)
    vault.totalCommissionPaid = BigInt.fromI32(0)
  }
  vault.withdrawableBalance = vault.withdrawableBalance.plus(event.params.amount)
  vault.save()
}

export function handleWithdrawn(event: Withdrawn): void {
  let vault = PlayerVault.load(event.params.player.toHexString())
  if (vault) {
    vault.withdrawableBalance = vault.withdrawableBalance.minus(event.params.amount)
    vault.save()
  }
}

export function handleCommissionPaid(event: CommissionPaid): void {
  let referrer = Player.load(event.params.referrer)
  if(!referrer) {
    referrer = new Player(event.params.referrer)
    referrer.save()
  }

  let referrerVault = PlayerVault.load(event.params.referrer.toHexString())
  if (!referrerVault) {
    referrerVault = new PlayerVault(event.params.referrer.toHexString())
    referrerVault.player = referrer.id
    referrerVault.withdrawableBalance = BigInt.fromI32(0)
    referrerVault.totalCommissionPaid = BigInt.fromI32(0)
  }
  referrerVault.totalCommissionPaid = referrerVault.totalCommissionPaid.plus(event.params.amount)
  referrerVault.save()
}