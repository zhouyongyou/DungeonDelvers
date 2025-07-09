// =================================================================
// 檔案: DDgraphql/dungeondelvers/src/player-profile.ts
// =================================================================
import { BigInt, log, Address } from "@graphprotocol/graph-ts"
import { ExperienceAdded, ProfileCreated } from "../generated/PlayerProfile/PlayerProfile"
import { Player, PlayerProfile } from "../generated/schema"
// ★ 核心修正 #1：從新的 utils 檔案中引入 calculateLevel 函式
import { calculateLevel } from "./utils"

// ★ 核心修正 #2：將 calculateLevel 函式移至 utils.ts，避免重複定義

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
