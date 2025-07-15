#!/bin/bash

# RPC 代理 curl 測試腳本
# 用於快速測試 RPC 代理功能

set -e

# 配置
RPC_PROXY_URL="${RPC_PROXY_URL:-http://localhost:3000/api/rpc}"
VERCEL_URL="${VERCEL_URL:-https://your-vercel-app.vercel.app/api/rpc}"

echo "🧪 DungeonDelvers RPC 代理 curl 測試"
echo "=================================="

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 輔助函數
log_test() {
    echo -e "\n${BLUE}🔍 $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

# 測試 OPTIONS 請求 (CORS)
test_cors() {
    log_test "測試 CORS 設置"
    
    echo "發送 OPTIONS 請求..."
    response=$(curl -s -w "\n%{http_code}" -X OPTIONS \
        -H "Origin: http://localhost:3000" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        "$RPC_PROXY_URL")
    
    http_code=$(echo "$response" | tail -n1)
    headers=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        log_success "OPTIONS 請求成功 (HTTP $http_code)"
        
        # 檢查 CORS 標頭
        if echo "$headers" | grep -i "access-control-allow-origin" > /dev/null; then
            log_success "發現 Access-Control-Allow-Origin 標頭"
        else
            log_error "缺少 Access-Control-Allow-Origin 標頭"
        fi
        
        if echo "$headers" | grep -i "access-control-allow-methods" > /dev/null; then
            log_success "發現 Access-Control-Allow-Methods 標頭"
        else
            log_error "缺少 Access-Control-Allow-Methods 標頭"
        fi
    else
        log_error "OPTIONS 請求失敗 (HTTP $http_code)"
        echo "$response"
    fi
}

# 測試基本 RPC 請求
test_rpc_request() {
    local method=$1
    local params=$2
    local description=$3
    
    log_test "測試 $description ($method)"
    
    local request_body=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "method": "$method",
    "params": $params,
    "id": 1
}
EOF
)
    
    echo "發送 $method 請求..."
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$request_body" \
        "$RPC_PROXY_URL")
    
    http_code=$(echo "$response" | tail -n1)
    json_response=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        log_success "HTTP 請求成功 (HTTP $http_code)"
        
        # 檢查是否有錯誤
        if echo "$json_response" | grep -q '"error"'; then
            log_error "RPC 響應包含錯誤"
            echo "$json_response" | python3 -m json.tool 2>/dev/null || echo "$json_response"
        elif echo "$json_response" | grep -q '"result"'; then
            log_success "RPC 請求成功"
            echo "$json_response" | python3 -m json.tool 2>/dev/null || echo "$json_response"
        else
            log_warning "響應格式異常"
            echo "$json_response"
        fi
    else
        log_error "HTTP 請求失敗 (HTTP $http_code)"
        echo "$response"
    fi
}

# 測試錯誤處理
test_error_handling() {
    log_test "測試錯誤處理"
    
    # 測試無效 JSON
    echo "測試無效 JSON..."
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "invalid json" \
        "$RPC_PROXY_URL")
    
    http_code=$(echo "$response" | tail -n1)
    json_response=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "500" ] || [ "$http_code" = "400" ]; then
        log_success "正確處理無效 JSON (HTTP $http_code)"
        if echo "$json_response" | grep -q '"error"'; then
            log_success "錯誤響應格式正確"
        else
            log_warning "錯誤響應格式可能有問題"
        fi
    else
        log_error "無效 JSON 處理異常 (HTTP $http_code)"
    fi
    
    # 測試無效方法
    echo "測試無效 RPC 方法..."
    invalid_request=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "method": "invalid_method",
    "params": [],
    "id": 999
}
EOF
)
    
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$invalid_request" \
        "$RPC_PROXY_URL")
    
    http_code=$(echo "$response" | tail -n1)
    json_response=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        if echo "$json_response" | grep -q '"error"'; then
            log_success "正確處理無效 RPC 方法"
        else
            log_warning "無效方法可能沒有正確處理"
        fi
    else
        log_error "無效方法處理異常 (HTTP $http_code)"
    fi
}

# 測試 API 金鑰輪換
test_key_rotation() {
    log_test "測試 API 金鑰輪換"
    
    local success_count=0
    local total_requests=5
    
    for i in $(seq 1 $total_requests); do
        echo "發送請求 $i/$total_requests..."
        
        request_body=$(cat <<EOF
{
    "jsonrpc": "2.0",
    "method": "eth_blockNumber",
    "params": [],
    "id": $i
}
EOF
)
        
        response=$(curl -s -w "\n%{http_code}" \
            -X POST \
            -H "Content-Type: application/json" \
            -d "$request_body" \
            "$RPC_PROXY_URL")
        
        http_code=$(echo "$response" | tail -n1)
        json_response=$(echo "$response" | head -n -1)
        
        if [ "$http_code" = "200" ] && echo "$json_response" | grep -q '"result"'; then
            success_count=$((success_count + 1))
            echo "  ✅ 請求 $i 成功"
        else
            echo "  ❌ 請求 $i 失敗"
        fi
        
        # 短暫延遲
        sleep 0.2
    done
    
    local success_rate=$(echo "scale=1; $success_count * 100 / $total_requests" | bc)
    
    if [ "$success_count" -ge 4 ]; then
        log_success "金鑰輪換測試通過 ($success_count/$total_requests 成功, ${success_rate}%)"
    else
        log_error "金鑰輪換測試失敗 ($success_count/$total_requests 成功, ${success_rate}%)"
    fi
}

# 測試超時處理
test_timeout() {
    log_test "測試超時處理"
    
    echo "發送帶有短超時的請求..."
    
    start_time=$(date +%s%N)
    
    response=$(timeout 5s curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        "$RPC_PROXY_URL" 2>/dev/null)
    
    end_time=$(date +%s%N)
    duration=$(echo "scale=2; ($end_time - $start_time) / 1000000" | bc)
    
    if [ $? -eq 0 ]; then
        log_success "請求在 5 秒內完成 (${duration}ms)"
    else
        log_error "請求超時或失敗"
    fi
}

# 主測試流程
main() {
    echo "🔗 測試 URL: $RPC_PROXY_URL"
    echo ""
    
    # 檢查依賴
    if ! command -v curl &> /dev/null; then
        log_error "curl 命令未找到"
        exit 1
    fi
    
    if ! command -v bc &> /dev/null; then
        log_warning "bc 命令未找到，某些計算可能無法正常工作"
    fi
    
    # 執行測試
    test_cors
    test_rpc_request "eth_chainId" "[]" "獲取鏈 ID"
    test_rpc_request "eth_blockNumber" "[]" "獲取區塊號"
    test_rpc_request "eth_gasPrice" "[]" "獲取 Gas 價格"
    test_rpc_request "eth_getBalance" '["0x0000000000000000000000000000000000000000", "latest"]' "獲取餘額"
    test_error_handling
    test_key_rotation
    test_timeout
    
    echo ""
    echo "🎉 測試完成！"
    echo ""
    echo "💡 提示:"
    echo "  - 如果測試失敗，請檢查 RPC 代理是否正在運行"
    echo "  - 確保環境變量 ALCHEMY_API_KEY_N 已正確設置"
    echo "  - 可以使用 RPC_PROXY_URL 環境變量指定不同的測試 URL"
}

# 檢查參數
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "用法: $0 [選項]"
    echo ""
    echo "選項:"
    echo "  --help, -h     顯示此幫助信息"
    echo "  --vercel       使用 Vercel URL 進行測試"
    echo ""
    echo "環境變量:"
    echo "  RPC_PROXY_URL  自定義 RPC 代理 URL (默認: http://localhost:3000/api/rpc)"
    echo "  VERCEL_URL     Vercel 部署的 URL"
    echo ""
    echo "示例:"
    echo "  $0                                    # 測試本地開發環境"
    echo "  $0 --vercel                           # 測試 Vercel 部署"
    echo "  RPC_PROXY_URL=http://localhost:8080/api/rpc $0  # 自定義 URL"
    exit 0
fi

if [ "$1" = "--vercel" ]; then
    if [ -z "$VERCEL_URL" ]; then
        log_error "請設置 VERCEL_URL 環境變量"
        exit 1
    fi
    RPC_PROXY_URL="$VERCEL_URL"
fi

# 執行主程序
main