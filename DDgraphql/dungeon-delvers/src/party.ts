import { PartyCreated, Transfer, PartyMemberAdded, PartyMemberRemoved } from "../generated/Party/Party"
import { Party, Hero, Relic, PartyMemberChange } from "../generated/schema"
import { getOrCreatePlayer } from "./common"
import { log } from "@graphprotocol/graph-ts"
import { getHeroContractAddress, getRelicContractAddress, createEntityId } from "./config"
import { updateGlobalStats, updatePlayerStats, TOTAL_PARTIES, TOTAL_PARTIES_CREATED } from "./stats"

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
    party.totalPower = event.params.totalPower
    party.totalCapacity = event.params.totalCapacity
    party.partyRarity = event.params.partyRarity
    party.fatigueLevel = 0
    party.provisionsRemaining = event.params.relicIds.length
    party.cooldownEndsAt = event.block.timestamp
    party.unclaimedRewards = event.params.totalPower 
    party.createdAt = event.block.timestamp
    party.isDisbanded = false

    // 批量處理英雄關聯 - 使用配置系統
    const heroIds: string[] = []
    const heroContractAddress = getHeroContractAddress()
    for (let i = 0; i < event.params.heroIds.length; i++) {
        const heroId = createEntityId(heroContractAddress, event.params.heroIds[i].toString())
        
        // 驗證英雄是否存在
        const hero = Hero.load(heroId);
        if (hero && hero.owner == player.id) {
            heroIds.push(heroId);
        } else {
            log.warning('Hero not found or not owned by player: {} for party: {}', [heroId, partyId]);
        }
    }
    party.heros = heroIds

    // 批量處理聖物關聯 - 使用配置系統
    const relicIds: string[] = []
    const relicContractAddress = getRelicContractAddress()
    for (let i = 0; i < event.params.relicIds.length; i++) {
        const relicId = createEntityId(relicContractAddress, event.params.relicIds[i].toString())
        
        // 驗證聖物是否存在
        const relic = Relic.load(relicId);
        if (relic && relic.owner == player.id) {
            relicIds.push(relicId);
        } else {
            log.warning('Relic not found or not owned by player: {} for party: {}', [relicId, partyId]);
        }
    }
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
            // 標記為已解散
            party.isDisbanded = true
            party.disbandedAt = event.block.timestamp
            
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

export function handlePartyMemberAdded(event: PartyMemberAdded): void {
    const partyId = createEntityId(event.address.toHexString(), event.params.partyId.toString())
    const party = Party.load(partyId)
    
    if (!party) {
        log.error('Party not found for member add event: {}', [partyId])
        return
    }

    // 創建成員變更記錄
    const changeId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    const change = new PartyMemberChange(changeId)
    change.party = partyId
    change.owner = event.params.owner
    change.changeType = 0 // 0 表示添加
    change.hero = createEntityId(getHeroContractAddress(), event.params.heroId.toString())
    change.timestamp = event.block.timestamp
    change.save()

    // 更新隊伍的英雄列表
    const heroIds = party.heros
    const heroId = createEntityId(getHeroContractAddress(), event.params.heroId.toString())
    if (!heroIds.includes(heroId)) {
        heroIds.push(heroId)
        party.heros = heroIds
        party.save()
    }

    log.info('Successfully processed PartyMemberAdded event: {} (Hero: {})', [
        partyId,
        event.params.heroId.toString()
    ])
}

export function handlePartyMemberRemoved(event: PartyMemberRemoved): void {
    const partyId = createEntityId(event.address.toHexString(), event.params.partyId.toString())
    const party = Party.load(partyId)
    
    if (!party) {
        log.error('Party not found for member remove event: {}', [partyId])
        return
    }

    // 創建成員變更記錄
    const changeId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
    const change = new PartyMemberChange(changeId)
    change.party = partyId
    change.owner = event.params.owner
    change.changeType = 1 // 1 表示移除
    change.hero = createEntityId(getHeroContractAddress(), event.params.heroId.toString())
    change.timestamp = event.block.timestamp
    change.save()

    // 更新隊伍的英雄列表
    const heroIds = party.heros
    const heroId = createEntityId(getHeroContractAddress(), event.params.heroId.toString())
    const index = heroIds.indexOf(heroId)
    if (index > -1) {
        heroIds.splice(index, 1)
        party.heros = heroIds
        party.save()
    }

    log.info('Successfully processed PartyMemberRemoved event: {} (Hero: {})', [
        partyId,
        event.params.heroId.toString()
    ])
}
