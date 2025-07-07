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

// 處理 ExperienceAdded 事件
export function handleExperienceAdded(event: ExperienceAdded): void {
  // 發現一個教學點：目前的 ExperienceAdded 事件只提供了 tokenId，
  // 沒有直接提供 player address，這使得我們很難將經驗值更新到對應的 PlayerProfile。
  // 一個健壯的解決方案是在 PlayerProfile.sol 的 ExperienceAdded 事件中也把 player address 作為 indexed 參數。

  // 鑑於目前的合約，我們只能記錄一個警告。
  // 在一個完整的專案中，我們會回頭去修改合約事件來解決這個問題。
  log.warning(
    "handleExperienceAdded was called for tokenId {}, but the event does not include the player address. Cannot update experience. Please consider adding 'indexed address player' to the ExperienceAdded event in PlayerProfile.sol",
    [event.params.tokenId.toString()]
  );

  // 如果事件包含 player address，正確的邏輯會是這樣：
  /*
  let playerAddress = event.params.player 
  let profile = PlayerProfile.load(playerAddress)
  if (profile) {
    profile.experience = event.params.newTotalExperience
    profile.level = calculateLevel(profile.experience)
    profile.save()
  }
  */
}

