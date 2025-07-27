// DDgraphql/dungeondelvers/src/player-profile.ts (最終加固版)
import { BigInt, log } from "@graphprotocol/graph-ts"
import { ExperienceAdded, ProfileCreated, Transfer } from "../generated/PlayerProfile/PlayerProfile"
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
        // 修正：ExperienceAdded 事件不應該影響 totalRewardsEarned
        // totalRewardsEarned 只應該在獲得 SOUL 獎勵時更新
        profile.lastUpdatedAt = event.block.timestamp
        profile.save()
    } else {
        log.warning("ExperienceAdded for a non-existent profile: {}. A profile should be created first.", [profileId.toHexString()])
    }
}

export function handleTransfer(event: Transfer): void {
    // PlayerProfile 是 SBT，只處理 mint
    if (event.params.from.toHexString() === '0x0000000000000000000000000000000000000000') {
        // Mint case - 由 ProfileCreated 處理
        log.info('Profile minted to: {}', [event.params.to.toHexString()])
    } else if (event.params.to.toHexString() === '0x0000000000000000000000000000000000000000') {
        // Burn case - 不應該發生
        log.warning('Unexpected profile burn from: {}', [event.params.from.toHexString()])
    } else {
        // Transfer case - 不應該發生（SBT）
        log.warning('Unexpected profile transfer from {} to {}', [
            event.params.from.toHexString(),
            event.params.to.toHexString()
        ])
    }
}
