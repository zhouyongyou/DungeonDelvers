// DDgraphql/dungeondelvers/src/pausable-handler.ts
// 通用 Pausable 事件處理器 - 用於處理所有合約的暫停/恢復事件

import { Address, Bytes, log } from "@graphprotocol/graph-ts"
import { PausableEvent } from "../generated/schema"
import { ethereum } from "@graphprotocol/graph-ts"

/**
 * 通用函數：處理 Paused 事件
 * @param account 執行暫停的帳戶
 * @param event 事件對象（用於獲取元數據）
 * @param contractName 合約名稱
 */
export function createPausedEvent(account: Address, event: ethereum.Event, contractName: string): void {
    const pausableEventId = `${event.transaction.hash.toHex()}-${event.logIndex.toString()}-${event.address.toHex()}`
    
    let pausableEvent = new PausableEvent(pausableEventId)
    pausableEvent.contractAddress = event.address
    pausableEvent.contractName = contractName
    pausableEvent.eventType = "paused"
    pausableEvent.account = account
    pausableEvent.txHash = event.transaction.hash
    pausableEvent.blockNumber = event.block.number
    pausableEvent.timestamp = event.block.timestamp
    
    pausableEvent.save()
    
    log.info("{} contract paused by {} at block {}", [
        contractName, 
        account.toHex(), 
        event.block.number.toString()
    ])
}

/**
 * 通用函數：處理 Unpaused 事件
 * @param account 執行恢復的帳戶
 * @param event 事件對象（用於獲取元數據）
 * @param contractName 合約名稱
 */
export function createUnpausedEvent(account: Address, event: ethereum.Event, contractName: string): void {
    const pausableEventId = `${event.transaction.hash.toHex()}-${event.logIndex.toString()}-${event.address.toHex()}`
    
    let pausableEvent = new PausableEvent(pausableEventId)
    pausableEvent.contractAddress = event.address
    pausableEvent.contractName = contractName
    pausableEvent.eventType = "unpaused"
    pausableEvent.account = account
    pausableEvent.txHash = event.transaction.hash
    pausableEvent.blockNumber = event.block.number
    pausableEvent.timestamp = event.block.timestamp
    
    pausableEvent.save()
    
    log.info("{} contract unpaused by {} at block {}", [
        contractName, 
        account.toHex(), 
        event.block.number.toString()
    ])
}