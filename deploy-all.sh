#!/bin/bash

# Dungeon Delvers 統一部署腳本
# 使用方法: ./deploy-all.sh [environment]

set -e

ENVIRONMENT=${1:-development}
echo "🚀 開始部署 Dungeon Delvers 到 $ENVIRONMENT 環境..."

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# 檢查必要的工具
check_dependencies() {
    log "檢查依賴項..."
    
    if ! command -v node &> /dev/null; then
        error "Node.js 未安裝"
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm 未安裝"
    fi
    
    if ! command -v docker &> /dev/null; then
        warning "Docker 未安裝，子圖功能將無法使用"
    fi
    
    success "依賴項檢查完成"
}

# 更新配置
update_config() {
    log "更新配置文件..."
    node manage.js update-config
    success "配置更新完成"
}

# 安裝依賴
install_dependencies() {
    log "安裝前端依賴..."
    if [ -f "package.json" ]; then
        npm install
        success "前端依賴安裝完成"
    fi
    
    log "安裝後端依賴..."
    if [ -d "dungeon-delvers-metadata-server" ] && [ -f "dungeon-delvers-metadata-server/package.json" ]; then
        cd dungeon-delvers-metadata-server
        npm install
        cd ..
        success "後端依賴安裝完成"
    fi
    
    log "安裝子圖依賴..."
    if [ -d "DDgraphql/dungeon-delvers" ] && [ -f "DDgraphql/dungeon-delvers/package.json" ]; then
        cd DDgraphql/dungeon-delvers
        npm install
        cd ../..
        success "子圖依賴安裝完成"
    fi
}

# 構建項目
build_project() {
    if [ "$ENVIRONMENT" = "production" ]; then
        log "構建生產版本..."
        npm run build
        success "構建完成"
    fi
}

# 部署合約 (如果需要)
deploy_contracts() {
    if [ "$ENVIRONMENT" = "production" ] && [ -d "contracts" ]; then
        log "部署智能合約..."
        # 這裡可以添加合約部署邏輯
        warning "合約部署需要手動執行"
    fi
}

# 部署子圖
deploy_subgraph() {
    if [ -d "DDgraphql/dungeon-delvers" ]; then
        log "部署子圖..."
        cd DDgraphql/dungeon-delvers
        
        if [ "$ENVIRONMENT" = "development" ]; then
            docker-compose up -d
            sleep 10
            npm run create-local
            npm run deploy-local
        else
            # 生產環境部署到 The Graph Studio
            warning "生產環境子圖部署需要手動執行"
        fi
        
        cd ../..
        success "子圖部署完成"
    fi
}

# 啟動服務
start_services() {
    log "啟動服務..."
    
    if [ "$ENVIRONMENT" = "development" ]; then
        node manage.js start
    else
        # 生產環境使用 PM2 或其他進程管理器
        warning "生產環境服務啟動需要手動配置"
    fi
}

# 健康檢查
health_check() {
    log "執行健康檢查..."
    sleep 5
    node manage.js status
}

# 主部署流程
main() {
    log "開始 Dungeon Delvers 部署流程..."
    
    check_dependencies
    update_config
    install_dependencies
    build_project
    deploy_contracts
    deploy_subgraph
    start_services
    health_check
    
    success "🎉 部署完成！"
    
    if [ "$ENVIRONMENT" = "development" ]; then
        echo ""
        echo "📍 開發環境訪問地址:"
        echo "   前端: http://localhost:5173"
        echo "   後端: http://localhost:3001"
        echo "   子圖: http://localhost:8000"
        echo ""
        echo "🔧 管理命令:"
        echo "   查看狀態: node manage.js status"
        echo "   停止服務: node manage.js stop"
        echo "   重啟服務: node manage.js restart"
    fi
}

# 錯誤處理
trap 'error "部署過程中發生錯誤"' ERR

# 執行主流程
main

echo ""
echo "🎮 Dungeon Delvers 部署完成！"
echo "📚 查看文檔: https://github.com/your-repo/dungeon-delvers" 