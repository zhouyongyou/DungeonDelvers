#!/bin/bash

# V25 完整部署腳本 - 一鍵部署
# 
# 功能：
# 1. 環境檢查
# 2. 部署合約
# 3. 驗證合約
# 4. 同步配置
# 5. 部署子圖（可選）
# 
# 使用方式：
# bash scripts/active/v25-full-deploy.sh
# bash scripts/active/v25-full-deploy.sh --skip-subgraph
# bash scripts/active/v25-full-deploy.sh --test-mode

# 載入 .env 文件
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "已載入 .env 環境變數"
fi

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# 配置
SKIP_SUBGRAPH=false
TEST_MODE=false
DEPLOYMENT_LOG="scripts/deployments/v25-deployment-$(date +%Y%m%d-%H%M%S).log"

# 解析參數
for arg in "$@"
do
    case $arg in
        --skip-subgraph)
        SKIP_SUBGRAPH=true
        shift
        ;;
        --test-mode)
        TEST_MODE=true
        shift
        ;;
        *)
        shift
        ;;
    esac
done

# 日誌函數
log() {
    echo -e "$1" | tee -a "$DEPLOYMENT_LOG"
}

log_info() {
    log "${BLUE}[INFO]${NC} $(date '+%H:%M:%S') $1"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $(date '+%H:%M:%S') $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $(date '+%H:%M:%S') $1"
}

log_warning() {
    log "${YELLOW}[WARNING]${NC} $(date '+%H:%M:%S') $1"
}

# 標題
clear
echo -e "${BOLD}"
echo "=================================================="
echo "🚀 V25 完整部署腳本 - 正式上線版本"
echo "=================================================="
echo -e "${NC}"

# 創建日誌目錄
mkdir -p scripts/deployments

# 顯示配置
log_info "部署配置："
log_info "- 跳過子圖: $SKIP_SUBGRAPH"
log_info "- 測試模式: $TEST_MODE"
log_info "- 日誌文件: $DEPLOYMENT_LOG"
echo ""

# 1. 環境檢查
log_info "執行環境檢查..."

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js 未安裝"
    exit 1
fi
NODE_VERSION=$(node -v)
log_success "Node.js 版本: $NODE_VERSION"

# 檢查環境變數
if [ -z "$PRIVATE_KEY" ]; then
    log_error "PRIVATE_KEY 環境變數未設置"
    log_info "請執行: export PRIVATE_KEY=\"你的私鑰\""
    exit 1
fi
log_success "PRIVATE_KEY 已設置"

if [ -z "$BSCSCAN_API_KEY" ]; then
    log_warning "BSCSCAN_API_KEY 未設置，將跳過自動驗證"
else
    log_success "BSCSCAN_API_KEY 已設置"
fi

# 檢查網路連接
log_info "檢查 BSC 網路連接..."
npx hardhat run scripts/utils/check-network.js --network bsc &> /dev/null
if [ $? -eq 0 ]; then
    log_success "BSC 網路連接正常"
else
    log_error "無法連接到 BSC 網路"
    exit 1
fi

echo ""

# 2. 編譯合約
log_info "編譯合約..."
npx hardhat compile --force
if [ $? -eq 0 ]; then
    log_success "合約編譯成功"
else
    log_error "合約編譯失敗"
    exit 1
fi

echo ""

# 3. 部署合約
log_info "開始部署 V25 合約 (順序執行版本)..."
if [ "$TEST_MODE" = true ]; then
    log_warning "測試模式：跳過實際部署"
else
    npx hardhat run scripts/active/v25-deploy-complete-sequential.js --network bsc
    if [ $? -eq 0 ]; then
        log_success "V25 合約部署成功"
    else
        log_error "V25 合約部署失敗"
        exit 1
    fi
fi

echo ""

# 4. 等待區塊確認（生產環境）
if [ "$TEST_MODE" = false ]; then
    log_info "等待 30 秒讓交易確認..."
    sleep 30
fi

# 5. 驗證合約（如果有 API key）
if [ ! -z "$BSCSCAN_API_KEY" ] && [ "$TEST_MODE" = false ]; then
    log_info "開始驗證合約..."
    node scripts/active/v25-verify-contracts.js
    if [ $? -eq 0 ]; then
        log_success "合約驗證完成"
    else
        log_warning "部分合約驗證失敗，請稍後手動驗證"
    fi
else
    log_warning "跳過合約驗證"
fi

echo ""

# 6. 同步配置
log_info "同步配置到各項目..."
node scripts/active/v25-sync-all.js
if [ $? -eq 0 ]; then
    log_success "配置同步成功"
else
    log_error "配置同步失敗"
    exit 1
fi

echo ""

# 7. 部署子圖（可選）
if [ "$SKIP_SUBGRAPH" = false ] && [ "$TEST_MODE" = false ]; then
    log_info "準備部署子圖..."
    
    # 切換到子圖目錄
    cd /Users/sotadic/Documents/GitHub/DungeonDelvers/DDgraphql/dungeon-delvers
    
    # Codegen
    log_info "執行子圖 codegen..."
    npm run codegen
    if [ $? -eq 0 ]; then
        log_success "子圖 codegen 成功"
    else
        log_error "子圖 codegen 失敗"
        cd -
        exit 1
    fi
    
    # Build
    log_info "構建子圖..."
    npm run build
    if [ $? -eq 0 ]; then
        log_success "子圖構建成功"
    else
        log_error "子圖構建失敗"
        cd -
        exit 1
    fi
    
    # Deploy
    log_info "部署子圖..."
    log_warning "請在提示時輸入版本標籤（如 v25.0.0）"
    npm run deploy
    
    # 返回原目錄
    cd -
else
    log_warning "跳過子圖部署"
fi

echo ""

# 8. 生成部署總結
log_info "生成部署總結..."

if [ -f "config/v25-config.js" ]; then
    echo -e "${BOLD}"
    echo "=================================================="
    echo "📊 V25 部署總結"
    echo "=================================================="
    echo -e "${NC}"
    
    # 使用 node 讀取並顯示關鍵地址
    node -e "
    const config = require('./config/v25-config.js');
    console.log('主要合約地址：');
    console.log('- DungeonCore:', config.contracts.DUNGEONCORE?.address || 'N/A');
    console.log('- Hero:', config.contracts.HERO?.address || 'N/A');
    console.log('- Relic:', config.contracts.RELIC?.address || 'N/A');
    console.log('- SoulShard:', config.contracts.SOULSHARD?.address || 'N/A');
    console.log('');
    console.log('部署區塊:', config.startBlock);
    "
fi

echo ""

# 9. 顯示下一步
echo -e "${BOLD}"
echo "=================================================="
echo "🎯 下一步行動"
echo "=================================================="
echo -e "${NC}"

echo "1. 測試前端功能："
echo "   cd /Users/sotadic/Documents/GitHub/DungeonDelvers"
echo "   npm run dev"
echo ""

echo "2. 啟動後端服務："
echo "   cd /Users/sotadic/Documents/dungeon-delvers-metadata-server"
echo "   npm start"
echo ""

if [ "$SKIP_SUBGRAPH" = true ]; then
    echo "3. 手動部署子圖："
    echo "   cd /Users/sotadic/Documents/GitHub/DungeonDelvers/DDgraphql/dungeon-delvers"
    echo "   npm run codegen && npm run build && npm run deploy"
    echo ""
fi

echo "4. 監控部署："
echo "   查看日誌: cat $DEPLOYMENT_LOG"
echo "   查看配置: cat config/v25-config.js"
echo ""

# 10. 完成
log_success "🎉 V25 部署流程完成！"
log_info "完整日誌已保存至: $DEPLOYMENT_LOG"

# 如果有錯誤，顯示錯誤摘要
if grep -q "ERROR" "$DEPLOYMENT_LOG"; then
    echo ""
    log_warning "部署過程中有錯誤發生："
    grep "ERROR" "$DEPLOYMENT_LOG" | tail -5
fi

exit 0