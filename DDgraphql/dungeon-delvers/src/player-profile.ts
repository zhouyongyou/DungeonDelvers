// DDgraphql/dungeondelvers/src/player-profile.ts (最終加固版)
import { BigInt, log } from "@graphprotocol/graph-ts"
import { ExperienceAdded, ProfileCreated } from "../generated/PlayerProfile/PlayerProfile"
import { PlayerProfile } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { calculateLevel } from "./utils"

export function handleProfileCreated(event: ProfileCreated): void {
    const player = getOrCreatePlayer(event.params.player)

    const profileId = event.params.player
    let profile = PlayerProfile.load(profileId)
    if (!profile) {
        profile = new PlayerProfile(profileId)
        profile.owner = player.id
        profile.name = "Player #" + event.params.tokenId.toString()
        profile.successfulExpeditions = 0
        profile.totalRewardsEarned = BigInt.fromI32(0)
        profile.invitees = []
        profile.commissionEarned = BigInt.fromI32(0)
        profile.createdAt = event.block.timestamp
    }
    profile.save()

    player.profile = profile.id
    player.save()
}

export function handleExperienceAdded(event: ExperienceAdded): void {
    const profileId = event.params.player
    const profile = PlayerProfile.load(profileId)

    if (profile) {
        profile.totalRewardsEarned = profile.totalRewardsEarned.plus(event.params.newTotalExperience)
        profile.lastUpdatedAt = event.block.timestamp
        profile.save()
    } else {
        log.warning("ExperienceAdded for a non-existent profile: {}. A profile should be created first.", [profileId.toHexString()])
    }
}
