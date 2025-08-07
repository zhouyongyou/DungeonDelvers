import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  RandomRequested,
  RandomFulfilled,
  AuthorizationUpdated,
  VRFPriceUpdated,
  PlatformFeeUpdated
} from "../generated/VRFManagerV2Plus/VRFManagerV2Plus"
import { VRFRequest, VRFConfig, VRFAuthorization } from "../generated/schema"

export function handleRandomRequested(event: RandomRequested): void {
  let request = new VRFRequest(event.params.requestId.toString())
  request.requester = event.params.requester
  request.requestType = event.params.requestType
  request.fulfilled = false
  request.randomWords = []
  request.transactionHash = event.transaction.hash
  request.blockNumber = event.block.number
  request.timestamp = event.block.timestamp
  request.save()
}

export function handleRandomFulfilled(event: RandomFulfilled): void {
  let request = VRFRequest.load(event.params.requestId.toString())
  if (request != null) {
    request.fulfilled = true
    request.randomWords = event.params.randomWords
    request.save()
  }
}

export function handleAuthorizationUpdated(event: AuthorizationUpdated): void {
  let auth = new VRFAuthorization(event.params.contract_.toHexString())
  auth.authorized = event.params.authorized
  auth.timestamp = event.block.timestamp
  auth.save()
}

export function handleVRFPriceUpdated(event: VRFPriceUpdated): void {
  let config = VRFConfig.load("current")
  if (config == null) {
    config = new VRFConfig("current")
    config.managerAddress = event.address
    config.platformFee = BigInt.fromI32(0)
  }
  config.vrfPrice = event.params.newPrice
  config.lastUpdated = event.block.timestamp
  config.save()
}

export function handlePlatformFeeUpdated(event: PlatformFeeUpdated): void {
  let config = VRFConfig.load("current")
  if (config == null) {
    config = new VRFConfig("current")
    config.managerAddress = event.address
    config.vrfPrice = BigInt.fromI32(0)
  }
  config.platformFee = event.params.newFee
  config.lastUpdated = event.block.timestamp
  config.save()
}