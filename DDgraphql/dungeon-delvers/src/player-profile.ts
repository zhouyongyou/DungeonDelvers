// DDgraphql/dungeondelvers/src/player-profile.ts (防崩潰修正版)
import { BigInt, log } from "@graphprotocol/graph-ts"
import { ExperienceAdded, ProfileCreated } from "../generated/PlayerProfile/PlayerProfile"
import { Player, PlayerProfile } from "../generated/schema"
import { calculateLevel } from "./utils"

// --- Helper: Load or create a Player entity ---
function getOrCreatePlayer(id: string): Player {
    let player = Player.load(id)
    if (!player) {
        player = new Player(id)
        player.save()
    }
    return player
}

export function handleProfileCreated(event: ProfileCreated): void {
    let playerAddress = event.params.player
    let player = getOrCreatePlayer(playerAddress.toHexString())

    // ★ 安全模式：先載入，若不存在則創建
    let profile = PlayerProfile.load(playerAddress.toHexString())
    if (!profile) {
        profile = new PlayerProfile(playerAddress.toHexString())
        profile.player = player.id
        profile.experience = BigInt.fromI32(0)
    }
    
    // 無論是新創建還是已存在，都更新 tokenId 和 level
    profile.tokenId = event.params.tokenId
    profile.level = 1
    profile.save()

    // 建立反向關聯
    player.profile = profile.id
    player.save()
}

export function handleExperienceAdded(event: ExperienceAdded): void {
    let playerAddress = event.params.player
    let profile = PlayerProfile.load(playerAddress.toHexString())

    if (!profile) {
        log.warning("ExperienceAdded handled for a profile that doesn't exist for {}. Creating one.", [playerAddress.toHexString()])
        // 雖然理論上不該發生，但做一個防禦性創建
        let player = getOrCreatePlayer(playerAddress.toHexString())
        profile = new PlayerProfile(playerAddress.toHexString())
        profile.player = player.id
        profile.experience = BigInt.fromI32(0)
        profile.tokenId = BigInt.fromI32(0) // TokenId is unknown here, but it's better than crashing
        player.profile = profile.id
        player.save()
    }

    profile.experience = event.params.newTotalExperience
    profile.level = calculateLevel(profile.experience)
    profile.save()
}
