import { Address, BigInt } from "@graphprotocol/graph-ts"
import {
  RequestSent,
  RequestFulfilled,
  AuthorizationChanged
} from "../generated/VRFConsumerV2Plus/VRFConsumerV2Plus"
import {
  VRFRequest,
  VRFAuthorization
} from "../generated/schema"

export function handleRequestSent(event: RequestSent): void {
  let request = new VRFRequest(event.params.requestId.toString())
  request.requester = event.transaction.from
  request.requestType = 0 // Unknown, will be determined from context
  request.fulfilled = false
  request.randomWords = []
  request.transactionHash = event.transaction.hash
  request.blockNumber = event.block.number
  request.timestamp = event.block.timestamp
  request.save()
}

export function handleRequestFulfilled(event: RequestFulfilled): void {
  let request = VRFRequest.load(event.params.requestId.toString())
  if (request) {
    request.fulfilled = true
    request.randomWords = event.params.randomWords
    request.save()
  }
}

export function handleAuthorizationChanged(event: AuthorizationChanged): void {
  let authorization = VRFAuthorization.load(event.params.contractAddress.toHex())
  if (!authorization) {
    authorization = new VRFAuthorization(event.params.contractAddress.toHex())
  }
  authorization.authorized = event.params.authorized
  authorization.timestamp = event.block.timestamp
  authorization.save()
}