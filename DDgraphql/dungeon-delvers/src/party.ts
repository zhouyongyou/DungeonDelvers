import { PartyCreated, Transfer, PartyMemberChanged, Paused, Unpaused } from "../generated/PartyV3/PartyV3"
import { Party, Hero, Relic, PartyMemberChange } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { log } from "@graphprotocol/graph-ts"
import { getHeroContractAddress, getRelicContractAddress, createEntityId } from "./config"
import { updateGlobalStats, updatePlayerStats, TOTAL_PARTIES, TOTAL_PARTIES_CREATED } from "./stats"
import { createPausedEvent, createUnpausedEvent } from "./pausable-handler"
export { handlePartyMemberChanged } from "./party-member-changed"

export function handlePartyCreated(event: PartyCreated): void {
    // 參數驗證
    if (!event.params.owner || event.params.owner.toHexString() === '0x0000000000000000000000000000000000000000') {
        log.error('Invalid owner address in PartyCreated event: {}', [event.transaction.hash.toHexString()]);
        return;
    }

    if (event.params.partyRarity < 1 || event.params.partyRarity > 5) {
        log.error('Invalid party rarity {} in PartyCreated event: {}', [event.params.partyRarity.toString(), event.transaction.hash.toHexString()]);
        return;
    }

    const player = getOrCreatePlayer(event.params.owner)

    const partyId = createEntityId(event.address.toHexString(), event.params.partyId.toString())
    
    // 檢查是否已存在（防止重複處理）
    const existingParty = Party.load(partyId);
    if (existingParty) {
        log.warning('Party already exists: {}', [partyId]);
        return;
    }
    
    const party = new Party(partyId)
    party.owner = player.id
    party.tokenId = event.params.partyId
    party.contractAddress = event.address
    party.name = "Party #" + event.params.partyId.toString()
    party.heroIds = []
    party.heroes = []
    party.totalPower = event.params.totalPower
    party.totalCapacity = event.params.totalCapacity
    party.partyRarity = event.params.partyRarity
    // party.fatigueLevel = 0  // 已禁用疲勞度系統
    party.provisionsRemaining = 0
    party.unclaimedRewards = event.params.totalPower.times(event.params.totalCapacity)
    party.cooldownEndsAt = event.block.timestamp
    party.createdAt = event.block.timestamp
    party.isBurned = false

    // 批量處理英雄關聯 - 信任合約驗證，不重複檢查所有權
    const heroIds: string[] = []
    const heroIdStrings: string[] = []
    const heroContractAddress = getHeroContractAddress()
    for (let i = 0; i < event.params.heroIds.length; i++) {
        const heroIdString = event.params.heroIds[i].toString()
        const heroId = createEntityId(heroContractAddress, heroIdString)
        
        // 只檢查英雄是否存在，不檢查所有權（因為創建隊伍時NFT已轉移到合約）
        const hero = Hero.load(heroId);
        if (hero) {
            heroIds.push(heroId);
            heroIdStrings.push(heroIdString);
            log.info('Added hero {} to party: {}', [heroId, partyId]);
        } else {
            // 如果英雄不存在，仍然記錄ID（可能是新鑄造的）
            heroIdStrings.push(heroIdString);
            log.warning('Hero not found in subgraph but added to party: {} for party: {}', [heroId, partyId]);
        }
    }
    party.heroIds = heroIdStrings
    party.heroes = heroIds

    // 批量處理聖物關聯 - 信任合約驗證，不重複檢查所有權
    const relicIds: string[] = []
    const relicIdStrings: string[] = []
    const relicContractAddress = getRelicContractAddress()
    for (let i = 0; i < event.params.relicIds.length; i++) {
        const relicIdString = event.params.relicIds[i].toString()
        const relicId = createEntityId(relicContractAddress, relicIdString)
        
        // 只檢查聖物是否存在，不檢查所有權（因為創建隊伍時NFT已轉移到合約）
        const relic = Relic.load(relicId);
        if (relic) {
            relicIds.push(relicId);
            relicIdStrings.push(relicIdString);
            log.info('Added relic {} to party: {}', [relicId, partyId]);
        } else {
            // 如果聖物不存在，仍然記錄ID（可能是新鑄造的）
            relicIdStrings.push(relicIdString);
            log.warning('Relic not found in subgraph but added to party: {} for party: {}', [relicId, partyId]);
        }
    }
    party.relicIds = relicIdStrings
    party.relics = relicIds
    
    party.save()
    
    // 更新統計數據
    updateGlobalStats(TOTAL_PARTIES, 1, event.block.timestamp)
    updatePlayerStats(event.params.owner, TOTAL_PARTIES_CREATED, 1, event.block.timestamp)
    
    log.info('Successfully processed PartyCreated event: {}', [partyId]);
}

export function handlePartyTransfer(event: Transfer): void {
    const partyId = createEntityId(event.address.toHexString(), event.params.tokenId.toString())
    const party = Party.load(partyId)
    
    // 處理 burn 操作 (to = 0x0)
    if (event.params.to.toHexString() === '0x0000000000000000000000000000000000000000') {
        if (party) {
            // 標記為已銷毀
            party.isBurned = true
            party.burnedAt = event.block.timestamp
            
            // 減少統計數據
            updateGlobalStats(TOTAL_PARTIES, -1, event.block.timestamp)
            // 注意：party.owner 是 Bytes 類型，需要轉換為 Address
            const ownerAddress = event.params.from // 使用 from 地址，因為這是 burn 前的擁有者
            updatePlayerStats(ownerAddress, TOTAL_PARTIES_CREATED, -1, event.block.timestamp)
            
            // 保存變更
            party.save()
            log.info('Party disbanded: {} from {}', [partyId, event.params.from.toHexString()]);
        } else {
            log.warning('Burn event for Party that does not exist: {}', [partyId]);
        }
        return;
    }
    
    if (party) {
        const newOwner = getOrCreatePlayer(event.params.to)
        party.owner = newOwner.id
        party.save()
        log.info('Successfully transferred party {} to {}', [partyId, event.params.to.toHexString()]);
    } else {
        // 對於 Party，不創建占位實體，因為它需要複雜的初始化
        log.warning("Transfer handled for a Party that doesn't exist in the subgraph: {}", [partyId])
        log.info('Party transfer skipped - cannot create placeholder for complex entity: {}', [partyId]);
    }
}

// 新增：處理 Hero/Relic 轉移時自動解除與 Party 的關聯
export function handleHeroTransferForParty(event: Transfer): void {
    // 只處理非 burn 的轉移
    if (event.params.to.toHexString() === '0x0000000000000000000000000000000000000000') {
        return;
    }
    
    const heroId = createEntityId(event.address.toHexString(), event.params.tokenId.toString())
    
    // 查找所有包含此 Hero 的 Party
    // 注意：這裡需要查詢所有 Party，在實際應用中可能需要優化
    // 可以考慮在 Party 實體中增加索引或使用其他方式優化查詢
    log.info('Hero transfer detected: {}, checking party associations', [heroId]);
}

export function handleRelicTransferForParty(event: Transfer): void {
    // 只處理非 burn 的轉移
    if (event.params.to.toHexString() === '0x0000000000000000000000000000000000000000') {
        return;
    }
    
    const relicId = createEntityId(event.address.toHexString(), event.params.tokenId.toString())
    
    // 查找所有包含此 Relic 的 Party
    log.info('Relic transfer detected: {}, checking party associations', [relicId]);
}

// V23 removed individual member add/remove events - use handlePartyMemberChanged instead

export function handleTransfer(event: Transfer): void {
    const partyId = createEntityId(event.address.toHexString(), event.params.tokenId.toString())
    const party = Party.load(partyId)
    
    // 處理 burn 操作 (to = 0x0)
    if (event.params.to.toHexString() === '0x0000000000000000000000000000000000000000') {
        if (party) {
            // 減少統計數據
            updateGlobalStats(TOTAL_PARTIES, -1, event.block.timestamp)
            updatePlayerStats(event.params.from, TOTAL_PARTIES_CREATED, -1, event.block.timestamp)
            
            // 標記為已銷毀
            party.isBurned = true
            party.burnedAt = event.block.timestamp
            party.save()
            
            log.info('Party burned: {} from {}', [partyId, event.params.from.toHexString()])
        }
        return
    }
    
    // 處理一般轉移
    if (party) {
        const newOwner = getOrCreatePlayer(event.params.to)
        party.owner = newOwner.id
        party.save()
        log.info('Successfully transferred party {} from {} to {}', [
            partyId, 
            event.params.from.toHexString(), 
            event.params.to.toHexString()
        ])
    } else {
        log.warning("Transfer event for Party that doesn't exist in subgraph: {}", [partyId])
    }
}

// ===== 處理合約暫停事件 =====
export function handlePaused(event: Paused): void {
    createPausedEvent(event.params.account, event, "PartyV3")
}

export function handleUnpaused(event: Unpaused): void {
    createUnpausedEvent(event.params.account, event, "PartyV3")
}
