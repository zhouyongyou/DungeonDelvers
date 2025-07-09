// =================================================================
// 檔案: DDgraphql/dungeondelvers/src/player-profile.ts
// =================================================================
import { BigInt, log, Address } from "@graphprotocol/graph-ts"
import { ExperienceAdded, ProfileCreated } from "../generated/PlayerProfile/PlayerProfile"
import { Player, PlayerProfile } from "../generated/schema"

function calculateLevel(exp: BigInt): i32 {
  if (exp.lt(BigInt.fromI32(100))) { return 1 }
  let x = exp.div(BigInt.fromI32(100));
  let root = x;
  if (x.gt(BigInt.fromI32(0))) {
    let y = x.plus(BigInt.fromI32(1)).div(BigInt.fromI32(2));
    while (y.lt(root)) {
      root = y;
      y = x.div(y).plus(y).div(BigInt.fromI32(2));
    }
  }
  return root.toI32() + 1
}

// ★★★ 新增的函式，處理 Profile 創建事件 ★★★
export function handleProfileCreated(event: ProfileCreated): void {
  let playerAddress = event.params.player;

  let player = Player.load(playerAddress);
  if (!player) {
    player = new Player(playerAddress);
    player.save();
  }

  let profile = new PlayerProfile(playerAddress.toHexString());
  profile.player = player.id;
  profile.tokenId = event.params.tokenId;
  profile.experience = BigInt.fromI32(0);
  profile.level = 1;
  profile.save();
}

export function handleExperienceAdded(event: ExperienceAdded): void {
  let playerAddress = event.params.player;
  let profile = PlayerProfile.load(playerAddress.toHexString());

  if (!profile) {
    log.warning("ExperienceAdded handled for a profile that doesn't exist yet for {}. This should ideally not happen if ProfileCreated is handled correctly.", [playerAddress.toHexString()]);
    return;
  }

  profile.experience = event.params.newTotalExperience;
  profile.level = calculateLevel(profile.experience);
  profile.save();
}