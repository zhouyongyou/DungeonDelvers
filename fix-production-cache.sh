#!/bin/bash

# DungeonDelvers V25 生產環境快取修復腳本
# 解決前端仍顯示舊合約資料的問題

set -e

echo "🚀 DungeonDelvers V25 生產環境快取修復腳本"
echo "=================================================="

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 檢查必要工具
check_requirements() {
    echo -e "${BLUE}🔍 檢查必要工具...${NC}"
    
    if ! command -v vercel &> /dev/null; then
        echo -e "${RED}❌ Vercel CLI 未安裝${NC}"
        echo "請執行: npm install -g vercel"
        exit 1
    fi
    
    if ! vercel whoami > /dev/null 2>&1; then
        echo -e "${RED}❌ 請先登錄 Vercel${NC}"
        echo "請執行: vercel login"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 工具檢查完成${NC}"
}

# 1. 更新 Vercel 環境變數
update_vercel_env() {
    echo -e "${BLUE}🔧 更新 Vercel 環境變數...${NC}"
    
    # V25 配置
    declare -A env_vars=(
        ["VITE_THE_GRAPH_STUDIO_API_URL"]="https://api.studio.thegraph.com/query/115633/dungeon-delvers---bsc/v3.3.6"
        ["VITE_THE_GRAPH_DECENTRALIZED_API_URL"]="https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs"
        ["VITE_USE_DECENTRALIZED_GRAPH"]="true"
    )

    for var_name in "${!env_vars[@]}"; do
        var_value="${env_vars[$var_name]}"
        echo -e "  更新 ${YELLOW}$var_name${NC}"
        
        # 先嘗試刪除舊的環境變數
        vercel env rm "$var_name" production --yes 2>/dev/null || true
        
        # 添加新的環境變數
        echo "$var_value" | vercel env add "$var_name" production 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "    ${GREEN}✅ 成功${NC}"
        else
            echo -e "    ${RED}❌ 失敗${NC}"
        fi
        
        sleep 1
    done
}

# 2. 清除可能的舊環境變數
clean_old_env_vars() {
    echo -e "${BLUE}🧹 清除舊的環境變數...${NC}"
    
    local old_vars=(
        "VITE_THE_GRAPH_API_URL"
        "VITE_THEGRAPH_API_URL" 
        "VITE_GRAPH_STUDIO_URL"
        "VITE_GRAPH_DECENTRALIZED_URL"
        "VITE_THE_GRAPH_NETWORK_URL"
    )

    for var_name in "${old_vars[@]}"; do
        echo -e "  清除 ${YELLOW}$var_name${NC}"
        vercel env rm "$var_name" production --yes 2>/dev/null || true
    done
}

# 3. 觸發 Vercel 重新部署
trigger_deployment() {
    echo -e "${BLUE}🚀 觸發 Vercel 重新部署...${NC}"
    
    # 強制重新部署
    vercel --prod --force
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ 部署已觸發${NC}"
    else
        echo -e "${RED}❌ 部署觸發失敗${NC}"
        exit 1
    fi
}

# 4. 生成快取清除指令
generate_cache_clear_instructions() {
    echo -e "${BLUE}📝 生成快取清除指令...${NC}"
    
    cat > cache-clear-instructions.md << 'EOF'
# 🗑️ DungeonDelvers 快取清除指令

## 用戶端快取清除

### 1. 瀏覽器快取清除
- **Chrome/Edge**: Ctrl+Shift+Del → 選擇「全部時間」→ 勾選所有項目 → 清除
- **Firefox**: Ctrl+Shift+Del → 選擇「全部」→ 勾選所有項目 → 立即清除
- **Safari**: Cmd+Option+E → 清空快取

### 2. 強制重新載入
- **所有瀏覽器**: Ctrl+F5 或 Cmd+Shift+R

### 3. 使用開發者工具
1. 按 F12 開啟開發者工具
2. 右鍵點擊重新載入按鈕
3. 選擇「強制重新載入並清除快取」

### 4. 使用專用清除工具
在瀏覽器中開啟：https://dungeondelvers.xyz/clear-all-cache.html

## CDN 快取清除 (管理員)

### Cloudflare
1. 登入 Cloudflare Dashboard
2. 選擇 dungeondelvers.xyz 域名
3. 前往「快取」→「設定」
4. 點擊「清除全部」

### Vercel Edge Cache
```bash
# 清除特定路徑
vercel env add PURGE_CACHE "true" production
vercel --prod
```

## 驗證步驟

1. 開啟 https://dungeondelvers.xyz
2. 按 F12 → Network 標籤
3. 重新載入頁面
4. 檢查 GraphQL 請求是否指向 v3.3.6
5. 檢查合約地址是否為 V25 版本

## 預期結果

- 子圖 URL: `v3.3.6`
- DungeonMaster: `0x2F78de7Fdc08E95616458038a7A1E2EE28e0fa85`
- Hero: `0x785a8b7d7b2E64c5971D8f548a45B7db3CcA5797`
- 所有頁面都應顯示最新資料
EOF

    echo -e "${GREEN}✅ 快取清除指令已生成: cache-clear-instructions.md${NC}"
}

# 5. 驗證配置
verify_config() {
    echo -e "${BLUE}🔍 驗證生產環境配置...${NC}"
    
    echo "檢查配置文件..."
    local config_url="https://www.dungeondelvers.xyz/config/v25.json"
    local config_data=$(curl -s "$config_url")
    
    if echo "$config_data" | grep -q "v3.3.6"; then
        echo -e "${GREEN}✅ 配置文件版本正確${NC}"
    else
        echo -e "${RED}❌ 配置文件版本不正確${NC}"
    fi
    
    if echo "$config_data" | grep -q "0x2F78de7Fdc08E95616458038a7A1E2EE28e0fa85"; then
        echo -e "${GREEN}✅ V25 合約地址正確${NC}"
    else
        echo -e "${RED}❌ V25 合約地址不正確${NC}"
    fi
}

# 主執行流程
main() {
    echo -e "${YELLOW}開始執行快取修復流程...${NC}"
    
    check_requirements
    clean_old_env_vars
    update_vercel_env
    trigger_deployment
    generate_cache_clear_instructions
    
    echo ""
    echo -e "${GREEN}🎉 修復腳本執行完成！${NC}"
    echo ""
    echo -e "${BLUE}下一步驟：${NC}"
    echo "1. 等待 Vercel 部署完成（約 2-3 分鐘）"
    echo "2. 查看 cache-clear-instructions.md 了解用戶端快取清除方法"
    echo "3. 使用 https://dungeondelvers.xyz/clear-all-cache.html 清除瀏覽器快取"
    echo "4. 驗證所有頁面都顯示最新的 V25 資料"
    
    echo ""
    echo -e "${YELLOW}⚠️  重要提醒：${NC}"
    echo "- 部署完成後需要等待 5-10 分鐘讓 CDN 快取更新"
    echo "- 建議通知所有用戶清除瀏覽器快取"
    echo "- 可以使用無痕模式驗證修復效果"
}

# 執行主流程
main "$@"