#!/bin/bash

echo "🔍 V25 VRF 訂閱快速檢查..."

# VRF 配置
VRF_COORDINATOR="0xd691f04bc0C9a24Edb78af9E005Cf85768F694C9"
SUBSCRIPTION_ID="114131353280130458891383141995968474440293173552039681622016393393251650814328"
BSC_RPC="https://bsc-dataseed1.binance.org/"

echo "📋 配置資訊："
echo "  VRF Coordinator: $VRF_COORDINATOR"
echo "  Subscription ID: ${SUBSCRIPTION_ID:0:20}..."
echo "  網路: BSC Mainnet"
echo ""

# 將 subscription ID 轉換為 hex (需要處理大數字)
# 使用 python3 來處理大數字轉換
SUBSCRIPTION_ID_HEX=$(python3 -c "print(hex($SUBSCRIPTION_ID))")

echo "🔍 查詢 VRF 訂閱資訊..."

# getSubscription(uint256 subId) 的函數選擇器是 0xa47c76961
FUNCTION_SELECTOR="a47c76961"

# 構造完整的 calldata
CALLDATA="0x${FUNCTION_SELECTOR}$(printf "%064s" ${SUBSCRIPTION_ID_HEX#0x})"

echo "  Calldata: ${CALLDATA:0:40}..."

# 呼叫 RPC
RESULT=$(curl -s -X POST $BSC_RPC \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_call",
    "params": [
      {
        "to": "'$VRF_COORDINATOR'",
        "data": "'$CALLDATA'"
      },
      "latest"
    ],
    "id": 1
  }')

echo ""
echo "📊 RPC 回應："
echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"

# 檢查是否有錯誤
if echo "$RESULT" | grep -q "error"; then
    echo ""
    echo "❌ 查詢失敗！可能的原因："
    echo "1. Subscription ID 不存在"
    echo "2. VRF Coordinator 地址錯誤"
    echo "3. 網路連線問題"
    echo ""
    echo "🔧 建議操作："
    echo "1. 訪問 https://vrf.chain.link/bsc 確認訂閱狀態"
    echo "2. 檢查管理員錢包是否有權限查看訂閱"
else
    echo ""
    echo "✅ VRF 訂閱查詢成功！"
    echo "📝 請查看上方回應中的餘額和 consumer 列表"
fi

echo ""
echo "🔗 相關連結："
echo "  VRF 管理面板: https://vrf.chain.link/bsc"
echo "  BSC 瀏覽器: https://bscscan.com/address/$VRF_COORDINATOR"