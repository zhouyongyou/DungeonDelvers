import { BigInt } from "@graphprotocol/graph-ts"
import {
  Staked,
  UnstakeClaimed,
  Transfer as VipTransfer,
} from "../generated/VIPStaking/VIPStaking"
import { Player, VIP } from "../generated/schema"

// 處理質押事件
export function handleStaked(event: Staked): void {
  let player = Player.load(event.params.user)
  if (!player) {
    player = new Player(event.params.user)
    player.save()
  }

  let vip = VIP.load(event.params.user)
  if (!vip) {
    vip = new VIP(event.params.user)
    vip.stakedAmount = BigInt.fromI32(0)
    // ★★★ 核心修正 #1：確保新創建的 VIP 實體有關聯的 player ★★★
    vip.player = player.id
  }
  
  vip.stakedAmount = vip.stakedAmount.plus(event.params.amount)
  vip.tokenId = event.params.tokenId
  vip.save()
}

// 處理領取已贖回的代幣事件
export function handleUnstakeClaimed(event: UnstakeClaimed): void {
  let vip = VIP.load(event.params.user)
  if (vip) {
    // UnstakeRequested 事件會減少質押數量，這裡只需確認領取
    // 如果需要，可以在此處添加額外邏輯
  }
}

// 處理 VIP 卡 (SBT) 的鑄造
export function handleVipTransfer(event: VipTransfer): void {
  // 只處理鑄造事件 (from a zero address)
  if (event.params.from.toHexString() == "0x0000000000000000000000000000000000000000") {
    let player = Player.load(event.params.to)
    if (!player) {
      player = new Player(event.params.to)
      player.save()
    }

    let vip = VIP.load(event.params.to)
    if (!vip) {
      vip = new VIP(event.params.to)
      vip.stakedAmount = BigInt.fromI32(0)
    }
    
    // ★★★ 核心修正 #2：為 VIP 實體設定必要的 player 關聯欄位 ★★★
    vip.player = player.id
    vip.tokenId = event.params.tokenId
    vip.save()
  }
}
