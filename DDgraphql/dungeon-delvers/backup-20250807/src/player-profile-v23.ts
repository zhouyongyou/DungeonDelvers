import { ProfileCreated, ExperienceAdded, Transfer } from "../generated/PlayerProfile/PlayerProfile"
import { PlayerProfile } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { log, BigInt } from "@graphprotocol/graph-ts"
import { createEntityId } from "./config"

export function handleProfileCreated(event: ProfileCreated): void {
    const player = getOrCreatePlayer(event.params.player)
    
    // 創建玩家檔案
    const profileId = event.params.tokenId.toString()
    let profile = PlayerProfile.load(profileId)
    
    if (!profile) {
        profile = new PlayerProfile(profileId)
        profile.owner = player.id
        profile.tokenId = event.params.tokenId
        profile.contractAddress = event.address
        profile.nickname = "Player #" + event.params.tokenId.toString()
        profile.referrer = null
        profile.totalExpeditions = 0
        profile.successfulExpeditions = 0
        profile.totalRewardsEarned = BigInt.fromI32(0)
        profile.reputationPoints = 0
        profile.level = 1
        profile.experience = BigInt.fromI32(0)
        profile.createdAt = event.block.timestamp
        profile.lastUpdatedAt = event.block.timestamp
    }
    
    profile.save()
    
    // 將檔案關聯到玩家
    player.profile = profileId
    player.save()
    
    // log.info('Successfully processed ProfileCreated event: {} for player {}', [
        profileId,
        event.params.player.toHexString()
    ])
}

export function handleExperienceAdded(event: ExperienceAdded): void {
    const player = getOrCreatePlayer(event.params.player)
    
    if (player.profile) {
        const profile = PlayerProfile.load(player.profile)
        if (profile) {
            profile.experience = profile.experience.plus(event.params.amount)
            profile.level = event.params.newLevel.toI32()
            profile.lastUpdatedAt = event.block.timestamp
            profile.save()
            
    // log.info('Successfully processed ExperienceAdded event: {} exp added to player {}, new level: {}', [
                event.params.amount.toString(),
                event.params.player.toHexString(),
                event.params.newLevel.toString()
            ])
        }
    }
}

export function handleTransfer(event: Transfer): void {
    // PlayerProfile 是 SBT，只處理 mint
    if (event.params.from.toHexString() === '0x0000000000000000000000000000000000000000') {
        // Mint case - 由 ProfileCreated 處理
    // log.info('Profile minted to: {}', [event.params.to.toHexString()])
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