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
  const approvalEvent = changetype<Approval>(newMockEvent())

  approvalEvent.parameters = []

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
  const approvalForAllEvent = changetype<ApprovalForAll>(newMockEvent())

  approvalForAllEvent.parameters = []

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
  const ascensionAltarSetEvent = changetype<AscensionAltarSet>(newMockEvent())

  ascensionAltarSetEvent.parameters = []

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
  const contractsSetEvent = changetype<ContractsSet>(newMockEvent())

  contractsSetEvent.parameters = []

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
  const dungeonSvgLibrarySetEvent =
    changetype<DungeonSvgLibrarySet>(newMockEvent())

  dungeonSvgLibrarySetEvent.parameters = []

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
  const dynamicSeedUpdatedEvent = changetype<DynamicSeedUpdated>(newMockEvent())

  dynamicSeedUpdatedEvent.parameters = []

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
  const ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = []

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
  const pausedEvent = changetype<Paused>(newMockEvent())

  pausedEvent.parameters = []

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
  const relicMintedEvent = changetype<RelicMinted>(newMockEvent())

  relicMintedEvent.parameters = []

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
  const transferEvent = changetype<Transfer>(newMockEvent())

  transferEvent.parameters = []

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
  const unpausedEvent = changetype<Unpaused>(newMockEvent())

  unpausedEvent.parameters = []

  unpausedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )

  return unpausedEvent
}
