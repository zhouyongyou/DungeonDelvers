import { BigInt, log } from "@graphprotocol/graph-ts"
import {
  ProfileCreated,
  ExperienceAdded,
  Transfer as ProfileTransfer,
} from "../generated/PlayerProfile/PlayerProfile"
import { Player, PlayerProfile } from "../generated/schema"

// 這個函式根據經驗值計算等級，是 Solidity 邏輯的 TypeScript 版本。
function calculateLevel(exp: BigInt): number {
  if (exp.lt(BigInt.fromI32(100))) {
    return 1
  }
  // 注意：AssemblyScript 不直接支援 BigInt 的開根，
  // 在真實的複雜應用中可能需要使用更高效的數學庫或近似算法。
  // 這裡使用一個簡單的循環來模擬，對於遊戲等級計算已足夠。
  let level = 1
  while (true) {
    let nextLevel = level + 1
    let requiredExp = BigInt.fromI32(nextLevel * nextLevel * 100)
    if (exp < requiredExp) {
      break
    }
    level++
  }
  return level
}

// 處理 ProfileCreated 事件，當玩家首次獲得經驗時觸發
export function handleProfileCreated(event: ProfileCreated): void {
  // 確保 Player 實體存在
  let player = Player.load(event.params.player)
  if (!player) {
    player = new Player(event.params.player)
    player.save()
  }

  // 創建一個新的 PlayerProfile 實體，使用玩家地址作為其唯一 ID
  let profile = new PlayerProfile(event.params.player)
  profile.experience = BigInt.fromI32(0)
  profile.level = 1
  profile.save()
}

// +++ 修改後的 handleExperienceAdded 函式 +++
export function handleExperienceAdded(event: ExperienceAdded): void {
  // 現在可以直接從事件參數中獲取 player 地址！
  let playerAddress = event.params.player;

  // 注意：PlayerProfile 的 ID 就是玩家的地址
  let profile = PlayerProfile.load(playerAddress);

  if (profile) {
    profile.experience = event.params.newTotalExperience;

    // 您可以在這裡也計算並儲存等級
    // (假設您已經有 calculateLevel 函式)
    // profile.level = calculateLevel(profile.experience);

    profile.save();
  } else {
    // 正常情況下，有經驗增加時 profile 必定存在。
    // 但為了程式健壯性，可以加上日誌。
    log.warning("ExperienceAdded event for a non-existent profile: {}", [
      playerAddress.toHexString()
    ]);
  }
}