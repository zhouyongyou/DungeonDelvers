import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt } from "@graphprotocol/graph-ts"
import {
  Approval,
  ApprovalForAll,
  AscensionAltarSet,
  ContractsSet,
  DungeonSvgLibrarySet,
  DynamicSeedUpdated,
  OwnershipTransferred,
  Paused,
  RelicMinted,
  Transfer,
  Unpaused
} from "../generated/Relic/Relic"

export function createApprovalEvent(
  owner: Address,
  approved: Address,
  tokenId: BigInt
): Approval {
  let approvalEvent = changetype<Approval>(newMockEvent())

  approvalEvent.parameters = new Array()

  approvalEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  approvalEvent.parameters.push(
    new ethereum.EventParam("approved", ethereum.Value.fromAddress(approved))
  )
  approvalEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )

  return approvalEvent
}

export function createApprovalForAllEvent(
  owner: Address,
  operator: Address,
  approved: boolean
): ApprovalForAll {
  let approvalForAllEvent = changetype<ApprovalForAll>(newMockEvent())

  approvalForAllEvent.parameters = new Array()

  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("operator", ethereum.Value.fromAddress(operator))
  )
  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("approved", ethereum.Value.fromBoolean(approved))
  )

  return approvalForAllEvent
}

export function createAscensionAltarSetEvent(
  newAddress: Address
): AscensionAltarSet {
  let ascensionAltarSetEvent = changetype<AscensionAltarSet>(newMockEvent())

  ascensionAltarSetEvent.parameters = new Array()

  ascensionAltarSetEvent.parameters.push(
    new ethereum.EventParam(
      "newAddress",
      ethereum.Value.fromAddress(newAddress)
    )
  )

  return ascensionAltarSetEvent
}

export function createContractsSetEvent(
  core: Address,
  token: Address
): ContractsSet {
  let contractsSetEvent = changetype<ContractsSet>(newMockEvent())

  contractsSetEvent.parameters = new Array()

  contractsSetEvent.parameters.push(
    new ethereum.EventParam("core", ethereum.Value.fromAddress(core))
  )
  contractsSetEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )

  return contractsSetEvent
}

export function createDungeonSvgLibrarySetEvent(
  newAddress: Address
): DungeonSvgLibrarySet {
  let dungeonSvgLibrarySetEvent =
    changetype<DungeonSvgLibrarySet>(newMockEvent())

  dungeonSvgLibrarySetEvent.parameters = new Array()

  dungeonSvgLibrarySetEvent.parameters.push(
    new ethereum.EventParam(
      "newAddress",
      ethereum.Value.fromAddress(newAddress)
    )
  )

  return dungeonSvgLibrarySetEvent
}

export function createDynamicSeedUpdatedEvent(
  newSeed: BigInt
): DynamicSeedUpdated {
  let dynamicSeedUpdatedEvent = changetype<DynamicSeedUpdated>(newMockEvent())

  dynamicSeedUpdatedEvent.parameters = new Array()

  dynamicSeedUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      "newSeed",
      ethereum.Value.fromUnsignedBigInt(newSeed)
    )
  )

  return dynamicSeedUpdatedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createPausedEvent(account: Address): Paused {
  let pausedEvent = changetype<Paused>(newMockEvent())

  pausedEvent.parameters = new Array()

  pausedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return pausedEvent
}

export function createRelicMintedEvent(
  tokenId: BigInt,
  owner: Address,
  rarity: i32,
  capacity: i32
): RelicMinted {
  let relicMintedEvent = changetype<RelicMinted>(newMockEvent())

  relicMintedEvent.parameters = new Array()

  relicMintedEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )
  relicMintedEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  relicMintedEvent.parameters.push(
    new ethereum.EventParam(
      "rarity",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(rarity))
    )
  )
  relicMintedEvent.parameters.push(
    new ethereum.EventParam(
      "capacity",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(capacity))
    )
  )

  return relicMintedEvent
}

export function createTransferEvent(
  from: Address,
  to: Address,
  tokenId: BigInt
): Transfer {
  let transferEvent = changetype<Transfer>(newMockEvent())

  transferEvent.parameters = new Array()

  transferEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )

  return transferEvent
}

export function createUnpausedEvent(account: Address): Unpaused {
  let unpausedEvent = changetype<Unpaused>(newMockEvent())

  unpausedEvent.parameters = new Array()

  unpausedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return unpausedEvent
}
