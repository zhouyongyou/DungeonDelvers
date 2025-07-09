// DDgraphql/dungeondelvers/src/player-profile.ts (最終加固版)
import { BigInt, log } from "@graphprotocol/graph-ts"
import { ExperienceAdded, ProfileCreated } from "../generated/PlayerProfile/PlayerProfile"
import { PlayerProfile } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { calculateLevel } from "./utils"

export function handleProfileCreated(event: ProfileCreated): void {
    let player = getOrCreatePlayer(event.params.player)

    let profileId = event.params.player.toHexString()
    let profile = PlayerProfile.load(profileId)
    if (!profile) {
        profile = new PlayerProfile(profileId)
        profile.player = player.id
        profile.experience = BigInt.fromI32(0)
    }
    
    profile.tokenId = event.params.tokenId
    profile.level = 1
    profile.save()

    player.profile = profile.id
    player.save()
}

export function handleExperienceAdded(event: ExperienceAdded): void {
    let profileId = event.params.player.toHexString()
    let profile = PlayerProfile.load(profileId)

    if (profile) {
        profile.experience = event.params.newTotalExperience
        profile.level = calculateLevel(profile.experience)
        profile.save()
    } else {
        log.warning("ExperienceAdded for a non-existent profile: {}. A profile should be created first.", [profileId])
    }
}
