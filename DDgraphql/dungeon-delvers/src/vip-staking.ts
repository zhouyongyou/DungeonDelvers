// =================================================================
// 檔案: DDgraphql/dungeondelvers/src/vip-staking.ts
// =================================================================
import { BigInt, log, Address, dataSource } from "@graphprotocol/graph-ts"
import { Staked, UnstakeRequested, Transfer as VipTransfer } from "../generated/VIPStaking/VIPStaking"
import { Player, VIP } from "../generated/schema"
import { Oracle } from "../generated/VIPStaking/Oracle"

// ★★★ 您需要在此手動填入您已部署的合約地址 ★★★
const ORACLE_ADDRESS = Address.fromString("0x4293aa4a23f0B6EB48bB3B5442bAE17d8e6a0EAB");
const SOULSHARD_TOKEN_ADDRESS = Address.fromString("0xc88dAD283Ac209D77Bfe452807d378615AB8B94a");

function calculateVipLevel(stakedAmount: BigInt): i32 {
  if (stakedAmount.isZero()) return 0;
  
  let oracle = Oracle.bind(ORACLE_ADDRESS);
  let stakedValueUSDResult = oracle.try_getAmountOut(SOULSHARD_TOKEN_ADDRESS, stakedAmount);

  if (stakedValueUSDResult.reverted) {
    log.warning("Oracle call reverted in calculateVipLevel", []);
    return 0;
  }

  let usdValue = stakedValueUSDResult.value.div(BigInt.fromI32(10).pow(18));
  if (usdValue.lt(BigInt.fromI32(100))) return 0;
  
  let level = 1;
  while (true) {
    let nextLevel = level + 1;
    let requiredValue = BigInt.fromI32(nextLevel * nextLevel * 100);
    if (usdValue.lt(requiredValue)) break;
    level++;
  }
  return level;
}

export function handleStaked(event: Staked): void {
  let player = Player.load(event.params.user);
  if (!player) {
    player = new Player(event.params.user);
    player.save();
  }

  let vip = VIP.load(event.params.user.toHexString());
  if (!vip) {
    vip = new VIP(event.params.user.toHexString());
    vip.player = player.id;
    vip.stakedAmount = BigInt.fromI32(0);
  }
  
  vip.stakedAmount = vip.stakedAmount.plus(event.params.amount);
  vip.tokenId = event.params.tokenId;
  vip.level = calculateVipLevel(vip.stakedAmount);
  vip.save();
}

// ★ 核心修正：處理 UnstakeRequested 事件來減少質押數量
export function handleUnstakeRequested(event: UnstakeRequested): void {
  let vip = VIP.load(event.params.user.toHexString());
  if (vip) {
    vip.stakedAmount = vip.stakedAmount.minus(event.params.amount);
    vip.level = calculateVipLevel(vip.stakedAmount);
    vip.save();
  }
}

export function handleVipTransfer(event: VipTransfer): void {
  if (event.params.from.toHexString() == "0x0000000000000000000000000000000000000000") {
    let player = Player.load(event.params.to);
    if (!player) {
      player = new Player(event.params.to);
      player.save();
    }
    let vip = VIP.load(event.params.to.toHexString());
    if (!vip) {
      vip = new VIP(event.params.to.toHexString());
      vip.player = player.id;
      vip.stakedAmount = BigInt.fromI32(0);
      vip.tokenId = event.params.tokenId;
      vip.level = 0;
      vip.save();
    }
  }
}