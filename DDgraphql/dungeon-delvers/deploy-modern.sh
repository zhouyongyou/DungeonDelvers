#!/bin/bash

# 🚀 現代化 DungeonDelvers 子圖部署腳本
# 支援 Graph CLI 0.97.1 的最新功能

set -e  # 遇到錯誤立即停止

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函數：彩色輸出
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# 檢查環境
check_environment() {
    log_info "檢查部署環境..."
    
    # 檢查是否在正確目錄
    if [ ! -f "package.json" ]; then
        log_error "請在子圖根目錄運行此腳本"
        exit 1
    fi
    
    # 檢查 Graph CLI 版本
    CLI_VERSION=$(npx graph --version 2>/dev/null | head -n1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' || echo "unknown")
    log_info "Graph CLI 版本: $CLI_VERSION"
    
    # 檢查必要文件
    local required_files=("subgraph.yaml" "schema.graphql")
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "缺少必要文件: $file"
            exit 1
        fi
    done
    
    # 檢查 access token
    if [ -z "$GRAPH_ACCESS_TOKEN" ]; then
        log_warning "未設置 GRAPH_ACCESS_TOKEN 環境變數"
        log_info "請設置: export GRAPH_ACCESS_TOKEN=你的access_token"
        read -p "是否要繼續？(y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "環境檢查完成"
}

# 構建子圖
build_subgraph() {
    log_info "開始構建子圖..."
    
    # 清理舊的構建
    if [ -d "build" ]; then
        rm -rf build
        log_info "清理舊構建文件"
    fi
    
    # 運行 codegen
    log_info "生成 TypeScript 類型..."
    npm run codegen || {
        log_error "類型生成失敗"
        exit 1
    }
    
    # 構建
    log_info "編譯子圖..."
    npm run build || {
        log_error "子圖編譯失敗"
        exit 1
    }
    
    log_success "子圖構建完成"
}

# 部署子圖
deploy_subgraph() {
    local version=${1:-"v$(date +%Y%m%d-%H%M%S)"}
    local subgraph_name="dungeon-delvers"
    
    log_info "開始部署到 The Graph Studio..."
    log_info "子圖名稱: $subgraph_name"
    log_info "版本標籤: $version"
    
    # 使用新版 CLI 的推薦方式
    if [ -n "$GRAPH_ACCESS_TOKEN" ]; then
        npx graph deploy "$subgraph_name" \
            --version-label "$version" \
            --node "https://api.studio.thegraph.com/deploy/" \
            --access-token "$GRAPH_ACCESS_TOKEN" || {
            log_error "部署失敗"
            exit 1
        }
    else
        # 交互式部署（會提示輸入 token）
        npx graph deploy "$subgraph_name" \
            --version-label "$version" \
            --node "https://api.studio.thegraph.com/deploy/" || {
            log_error "部署失敗"
            exit 1
        }
    fi
    
    log_success "子圖部署成功！"
    log_info "版本: $version"
    log_info "Studio URL: https://thegraph.com/studio/subgraph/$subgraph_name"
}

# 後部署檢查
post_deploy_check() {
    log_info "執行部署後檢查..."
    
    # 檢查子圖是否可以被查詢（簡單測試）
    local studio_url="https://api.studio.thegraph.com/query/115633/dungeon-delvers/version/latest"
    
    log_info "測試子圖端點連接..."
    if curl -s -o /dev/null -w "%{http_code}" "$studio_url" | grep -q "200\|400"; then
        log_success "子圖端點可訪問"
    else
        log_warning "子圖端點暫時無法訪問（這在新部署後是正常的）"
    fi
    
    log_info "下一步建議："
    echo "  1. 前往 Studio 查看同步狀態"
    echo "  2. 等待索引完成（通常需要 5-15 分鐘）"
    echo "  3. 更新前端應用中的子圖端點"
    echo "  4. 測試關鍵查詢功能"
}

# 主函數
main() {
    local version="$1"
    
    log_info "🚀 開始現代化子圖部署流程"
    log_info "時間: $(date)"
    
    check_environment
    build_subgraph
    deploy_subgraph "$version"
    post_deploy_check
    
    log_success "🎉 部署流程完成！"
}

# 如果直接運行腳本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi