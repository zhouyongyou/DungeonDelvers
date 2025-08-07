// VRF Manager V2Plus 事件處理器（簡化版）
import { 
  RequestSent,
  RequestFulfilled,
  AuthorizationChanged,
  CallbackSuccess,
  CallbackFailed
} from "../generated/VRFManagerV2PlusFixed/VRFManagerV2PlusFixed"
import { VRFRequest, VRFConfig, VRFAuthorization } from "../generated/schema"
import { BigInt } from "@graphprotocol/graph-ts"

export function handleRequestSent(event: RequestSent): void {
  let request = new VRFRequest(event.params.requestId.toString())
  request.requester = event.address  // 使用合約地址作為請求者
  request.requestType = 1  // 默認請求類型
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
  let auth = VRFAuthorization.load(event.params.contractAddress.toHexString())
  if (!auth) {
    auth = new VRFAuthorization(event.params.contractAddress.toHexString())
  }
  auth.authorized = event.params.authorized
  auth.timestamp = event.block.timestamp
  auth.save()
}

export function handleCallbackSuccess(event: CallbackSuccess): void {
  // 記錄成功的回調 - 簡化版本
  // 由於 schema 中沒有 callbackSuccess 欄位，暫時不做任何操作
  // 可以在未來的 schema 更新中添加此功能
}

export function handleCallbackFailed(event: CallbackFailed): void {
  // 記錄失敗的回調 - 簡化版本  
  // 由於 schema 中沒有 callbackSuccess 欄位，暫時不做任何操作
  // 可以在未來的 schema 更新中添加此功能
}