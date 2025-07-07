import { BigInt } from "@graphprotocol/graph-ts"
import {
  Deposited,
  Withdrawn,
  CommissionPaid,
} from "../generated/PlayerVault/PlayerVault"
import { Player, PlayerVault } from "../generated/schema"

// 處理存款事件
export function handleDeposited(event: Deposited): void {
  let vault = PlayerVault.load(event.params.player)
  if (!vault) {
    vault = new PlayerVault(event.params.player)
    vault.withdrawableBalance = BigInt.fromI32(0)
    vault.totalCommissionPaid = BigInt.fromI32(0)
  }
  vault.withdrawableBalance = vault.withdrawableBalance.plus(event.params.amount)
  vault.save()
}

// 處理提款事件
export function handleWithdrawn(event: Withdrawn): void {
  let vault = PlayerVault.load(event.params.player)
  if (vault) {
    // 提款金額 (amount) 是稅後的，所以直接減去即可
    vault.withdrawableBalance = vault.withdrawableBalance.minus(event.params.amount)
    vault.save()
  }
}

// 處理佣金支付事件
export function handleCommissionPaid(event: CommissionPaid): void {
  // 這個事件是支付給邀請人的，所以我們更新邀請人的金庫
  let referrerVault = PlayerVault.load(event.params.referrer)
  if (!referrerVault) {
    referrerVault = new PlayerVault(event.params.referrer)
    referrerVault.withdrawableBalance = BigInt.fromI32(0)
    referrerVault.totalCommissionPaid = BigInt.fromI32(0)
  }
  referrerVault.totalCommissionPaid = referrerVault.totalCommissionPaid.plus(event.params.amount)
  referrerVault.save()
}
