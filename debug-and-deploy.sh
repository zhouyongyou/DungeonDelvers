#!/bin/bash

# DungeonDelvers 一鍵調試與部署腳本

echo "🤖 DungeonDelvers 自動調試與部署系統"
echo "======================================"
echo ""

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 路徑設置
FRONTEND_PATH="/Users/sotadic/Documents/GitHub/DungeonDelvers"
BACKEND_PATH="/Users/sotadic/Documents/GitHub/dungeondelvers-backend"
SUBGRAPH_PATH="/Users/sotadic/Documents/GitHub/dungeondelvers-subgraph"
CONTRACTS_PATH="/Users/sotadic/Documents/DungeonDelversContracts"

# 1. 前端調試
echo -e "${BLUE}📱 開始前端調試...${NC}"
echo "------------------------"

cd $FRONTEND_PATH

# TypeScript 類型檢查
echo -n "  檢查 TypeScript 類型... "
if npm run type-check > /tmp/typecheck.log 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo -e "${YELLOW}  警告: 發現類型錯誤，查看 /tmp/typecheck.log${NC}"
fi

# ESLint 檢查
echo -n "  運行 ESLint 檢查... "
if npm run lint > /tmp/eslint.log 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo -e "${YELLOW}  警告: 發現代碼風格問題${NC}"
fi

# 檢查環境變數
echo -n "  檢查環境變數... "
if [ -f ".env" ]; then
    if grep -q "VITE_WALLETCONNECT_PROJECT_ID=" .env && grep -q "VITE_GRAPHQL_URL=" .env; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠ 缺少必要的環境變數${NC}"
    fi
else
    echo -e "${RED}✗ 缺少 .env 文件${NC}"
fi

# 2. 後端調試
echo ""
echo -e "${BLUE}🖥️  開始後端調試...${NC}"
echo "------------------------"

cd $BACKEND_PATH

# 檢查後端是否運行
echo -n "  測試健康檢查端點... "
if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓ 後端正在運行${NC}"
else
    echo -e "${RED}✗ 後端未運行${NC}"
    echo -e "${YELLOW}  提示: 運行 'cd $BACKEND_PATH && npm run dev'${NC}"
fi

# 測試 NFT 端點
echo -n "  測試 NFT 元數據端點... "
if curl -s http://localhost:3000/api/hero/1 | grep -q "name"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ API 響應異常${NC}"
fi

# 3. 子圖調試
echo ""
echo -e "${BLUE}📊 開始子圖調試...${NC}"
echo "------------------------"

cd $SUBGRAPH_PATH

# 檢查構建
echo -n "  測試子圖構建... "
if npm run build > /tmp/subgraph-build.log 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ 構建失敗${NC}"
    echo -e "${YELLOW}  查看 /tmp/subgraph-build.log${NC}"
fi

# 4. 生成報告
echo ""
echo -e "${BLUE}📋 調試報告${NC}"
echo "======================================"

# 統計問題
ISSUES_COUNT=0
CRITICAL_COUNT=0

# 檢查各個日誌文件
if [ -f "/tmp/typecheck.log" ] && [ -s "/tmp/typecheck.log" ]; then
    ISSUES_COUNT=$((ISSUES_COUNT + 1))
    echo -e "${RED}❌ TypeScript 類型錯誤${NC}"
fi

if [ -f "/tmp/eslint.log" ] && [ -s "/tmp/eslint.log" ]; then
    ISSUES_COUNT=$((ISSUES_COUNT + 1))
    echo -e "${YELLOW}⚠️  ESLint 警告${NC}"
fi

if [ $ISSUES_COUNT -eq 0 ]; then
    echo -e "${GREEN}✅ 沒有發現嚴重問題！${NC}"
else
    echo -e "${YELLOW}發現 $ISSUES_COUNT 個問題需要關注${NC}"
fi

# 5. 詢問是否部署
echo ""
echo -e "${BLUE}🚀 部署選項${NC}"
echo "======================================"
echo "1) 部署前端 (Git push -> Vercel)"
echo "2) 部署後端 (Git push -> Render)"
echo "3) 部署子圖 (Graph deploy)"
echo "4) 全部部署"
echo "5) 退出"
echo ""
read -p "請選擇 (1-5): " choice

case $choice in
    1)
        echo -e "${GREEN}部署前端...${NC}"
        cd $FRONTEND_PATH
        git add .
        git commit -m "自動部署: $(date '+%Y-%m-%d %H:%M:%S')"
        git push origin main
        echo -e "${GREEN}✓ 前端已推送到 GitHub，Vercel 將自動部署${NC}"
        ;;
    2)
        echo -e "${GREEN}部署後端...${NC}"
        cd $BACKEND_PATH
        git add .
        git commit -m "自動部署: $(date '+%Y-%m-%d %H:%M:%S')"
        git push origin main
        echo -e "${GREEN}✓ 後端已推送到 GitHub，Render 將自動部署${NC}"
        ;;
    3)
        echo -e "${GREEN}部署子圖...${NC}"
        cd $SUBGRAPH_PATH
        graph deploy --studio dungeondelvers
        ;;
    4)
        echo -e "${GREEN}全部部署...${NC}"
        
        # 前端
        cd $FRONTEND_PATH
        git add . && git commit -m "自動部署: $(date '+%Y-%m-%d %H:%M:%S')" && git push origin main
        
        # 後端
        cd $BACKEND_PATH
        git add . && git commit -m "自動部署: $(date '+%Y-%m-%d %H:%M:%S')" && git push origin main
        
        # 子圖
        cd $SUBGRAPH_PATH
        echo "請手動運行: graph deploy --studio dungeondelvers"
        
        echo -e "${GREEN}✓ 部署完成！${NC}"
        ;;
    5)
        echo "退出..."
        exit 0
        ;;
    *)
        echo "無效選擇"
        ;;
esac

echo ""
echo -e "${BLUE}📝 後續步驟：${NC}"
echo "1. 訪問 https://vercel.com 查看前端部署狀態"
echo "2. 訪問 https://render.com 查看後端部署狀態"
echo "3. 訪問 https://thegraph.com/studio 查看子圖狀態"
echo ""
echo "完成！"