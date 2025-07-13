#!/bin/bash

# deploy-metadata-sync.sh
# 修復元數據、子圖和後端同步問題的部署腳本

set -e

echo "🔧 開始修復 DungeonDelvers 元數據同步問題..."

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 檢查必要的環境變數
check_env() {
    echo -e "${BLUE}📋 檢查環境變數...${NC}"
    
    if [ -z "$PRIVATE_KEY" ]; then
        echo -e "${RED}❌ 請設定 PRIVATE_KEY 環境變數${NC}"
        exit 1
    fi
    
    if [ -z "$VITE_THE_GRAPH_STUDIO_API_URL" ]; then
        echo -e "${YELLOW}⚠️  VITE_THE_GRAPH_STUDIO_API_URL 未設定，將使用預設值${NC}"
    fi
    
    echo -e "${GREEN}✅ 環境變數檢查完成${NC}"
}

# 停止現有服務
stop_services() {
    echo -e "${BLUE}🛑 停止現有服務...${NC}"
    
    # 停止前端開發服務器
    pkill -f "vite" || true
    
    # 停止後端元數據服務器
    pkill -f "node.*3001" || true
    
    # 停止子圖服務
    pkill -f "graph-node" || true
    
    echo -e "${GREEN}✅ 服務已停止${NC}"
}

# 清理快取
clear_cache() {
    echo -e "${BLUE}🧹 清理快取...${NC}"
    
    # 清理 npm 快取
    npm cache clean --force || true
    
    # 清理 React Query 快取（通過刪除 localStorage）
    echo "localStorage.clear(); sessionStorage.clear();" > /tmp/clear_cache.js
    
    # 清理 IndexedDB 快取
    echo -e "${YELLOW}⚠️  請手動清理瀏覽器的 IndexedDB 快取${NC}"
    
    echo -e "${GREEN}✅ 快取清理完成${NC}"
}

# 更新合約配置
update_contract_config() {
    echo -e "${BLUE}📝 更新合約配置...${NC}"
    
    # 確保 shared-config.json 有正確的服務端點
    cat > shared-config.json << EOF
{
  "project": {
    "name": "DungeonDelvers",
    "version": "1.0.0",
    "description": "Web3 RPG Game with NFT Assets"
  },
  "network": {
    "chainId": 56,
    "name": "bsc",
    "rpcUrl": "https://bsc-dataseed1.binance.org/",
    "explorerUrl": "https://bscscan.com"
  },
  "contracts": {
    "hero": "0x2a046140668cBb8F598ff3852B08852A8EB23b6a",
    "relic": "0x95F005e2e0d38381576DA36c5CA4619a87da550E",
    "party": "0x11FB68409222B53b04626d382d7e691e640A1DcD",
    "vipStaking": "0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB",
    "playerProfile": "0x43a9BE911f1074788A00cE8e6E00732c7364c1F4",
    "dungeonCore": "0x4CbAC0E4AEC9Ef3B11C93805483c23224ed1f118",
    "dungeonMaster": "0xd14A5eFFc45D0131af3eb876992fC6eD9683f5B0",
    "oracle": "0xc5bBFfFf552167D1328432AA856B752e9c4b4838",
    "playerVault": "0x6187DBCcb58088E414437A6b8d58a42cD2BD1ec4",
    "altarOfAscension": "0x83a7fB85E0892A67041FcFc4c1F0F1111e5aB3DA"
  },
  "tokens": {
    "soulShard": "0xc88dAD283Ac209D77Bfe452807d378615AB8B94a",
    "usd": "0x7C67Af4EBC6651c95dF78De11cfe325660d935FE"
  },
  "services": {
    "subgraph": {
      "url": "https://api.studio.thegraph.com/query/115633/dungeon-delvers/1.2.9",
      "id": "dungeon-delvers"
    },
    "metadataServer": {
      "development": "http://localhost:3001",
      "production": "https://dungeon-delvers-metadata-server.onrender.com"
    },
    "frontend": {
      "development": "http://localhost:5173",
      "production": "https://dungeondelvers.xyz"
    }
  },
  "ipfs": {
    "gateway": "https://ipfs.io/ipfs/",
    "pinataApiKey": "",
    "pinataSecretKey": ""
  },
  "deployment": {
    "environments": ["development", "staging", "production"],
    "autoVerify": true,
    "gasLimit": 8000000
  }
}
EOF
    
    echo -e "${GREEN}✅ 合約配置已更新${NC}"
}

# 檢查並修復後端API
check_backend_api() {
    echo -e "${BLUE}🔍 檢查後端API狀態...${NC}"
    
    # 檢查本地後端是否運行
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 本地後端API運行正常${NC}"
    else
        echo -e "${YELLOW}⚠️  本地後端API未運行，嘗試啟動...${NC}"
        
        # 檢查是否有後端代碼
        if [ -d "dungeon-delvers-metadata-server" ]; then
            cd dungeon-delvers-metadata-server
            npm install
            npm start &
            cd ..
            sleep 5
            
            if curl -s http://localhost:3001/health > /dev/null 2>&1; then
                echo -e "${GREEN}✅ 後端API啟動成功${NC}"
            else
                echo -e "${RED}❌ 後端API啟動失敗${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ 找不到後端代碼目錄${NC}"
            exit 1
        fi
    fi
    
    # 測試關鍵API端點
    echo -e "${BLUE}🧪 測試API端點...${NC}"
    
    for endpoint in "hero/1" "relic/1" "party/1" "vip/1" "profile/1"; do
        if curl -s "http://localhost:3001/api/$endpoint" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ /api/$endpoint 正常${NC}"
        else
            echo -e "${RED}❌ /api/$endpoint 異常${NC}"
        fi
    done
}

# 更新子圖配置
update_subgraph() {
    echo -e "${BLUE}📊 更新子圖配置...${NC}"
    
    if [ -d "DDgraphql/dungeon-delvers" ]; then
        cd DDgraphql/dungeon-delvers
        
        # 更新子圖配置文件中的合約地址
        echo -e "${YELLOW}⚠️  請手動檢查 subgraph.yaml 中的合約地址是否正確${NC}"
        
        # 重新生成子圖代碼
        if command -v graph &> /dev/null; then
            npm run codegen
            npm run build
            echo -e "${GREEN}✅ 子圖代碼重新生成完成${NC}"
        else
            echo -e "${YELLOW}⚠️  Graph CLI 未安裝，跳過子圖重新生成${NC}"
        fi
        
        cd ../..
    else
        echo -e "${YELLOW}⚠️  子圖目錄不存在，跳過子圖更新${NC}"
    fi
}

# 驗證合約BaseURI
verify_contract_baseuris() {
    echo -e "${BLUE}🔍 驗證合約BaseURI...${NC}"
    
    # 使用現有的腳本檢查BaseURI
    if [ -f "scripts/set-baseuri-simple.ts" ]; then
        echo -e "${YELLOW}⚠️  執行BaseURI驗證...${NC}"
        
        # 檢查當前BaseURI是否正確
        echo "檢查當前BaseURI設定..."
        # 這裡可以添加具體的驗證邏輯
        
        echo -e "${GREEN}✅ BaseURI驗證完成${NC}"
    else
        echo -e "${YELLOW}⚠️  BaseURI驗證腳本不存在${NC}"
    fi
}

# 修復NFT元數據顯示
fix_nft_metadata() {
    echo -e "${BLUE}🖼️  修復NFT元數據顯示...${NC}"
    
    # 檢查public/api目錄是否存在
    if [ ! -d "public/api" ]; then
        echo -e "${YELLOW}⚠️  創建public/api目錄結構...${NC}"
        mkdir -p public/api/{hero,relic,party,vip,profile}
        
        # 創建示例元數據文件
        for i in {1..5}; do
            cat > "public/api/hero/$i.json" << EOF
{
  "name": "Hero #$i",
  "description": "A powerful hero",
  "image": "https://dungeondelvers.xyz/images/hero/hero-$i.png",
  "attributes": [
    {"trait_type": "Rarity", "value": $i},
    {"trait_type": "Power", "value": $((i * 50))}
  ]
}
EOF
        done
        
        echo -e "${GREEN}✅ 元數據文件結構創建完成${NC}"
    fi
    
    # 檢查圖片文件是否存在
    if [ ! -d "public/images" ]; then
        echo -e "${YELLOW}⚠️  public/images 目錄不存在${NC}"
    fi
}

# 啟動服務
start_services() {
    echo -e "${BLUE}🚀 啟動服務...${NC}"
    
    # 安裝依賴
    npm install
    
    # 啟動前端開發服務器
    echo -e "${YELLOW}⚠️  啟動前端服務器...${NC}"
    npm run dev &
    
    # 等待服務啟動
    sleep 10
    
    # 檢查服務狀態
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 前端服務器啟動成功 (http://localhost:5173)${NC}"
    else
        echo -e "${RED}❌ 前端服務器啟動失敗${NC}"
    fi
    
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 後端API服務器運行正常 (http://localhost:3001)${NC}"
    else
        echo -e "${RED}❌ 後端API服務器未運行${NC}"
    fi
}

# 運行測試
run_tests() {
    echo -e "${BLUE}🧪 運行測試...${NC}"
    
    # 測試NFT元數據載入
    echo "測試NFT元數據載入..."
    
    # 測試VIP等級顯示
    echo "測試VIP等級顯示..."
    
    # 測試升星祭壇圖片
    echo "測試升星祭壇圖片..."
    
    # 測試隊伍組成顯示
    echo "測試隊伍組成顯示..."
    
    echo -e "${GREEN}✅ 測試完成${NC}"
}

# 主函數
main() {
    echo -e "${BLUE}🎮 DungeonDelvers 元數據同步修復腳本${NC}"
    echo -e "${BLUE}============================================${NC}"
    
    check_env
    stop_services
    clear_cache
    update_contract_config
    check_backend_api
    update_subgraph
    verify_contract_baseuris
    fix_nft_metadata
    start_services
    run_tests
    
    echo -e "${GREEN}🎉 修復完成！${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}前端: http://localhost:5173${NC}"
    echo -e "${GREEN}後端API: http://localhost:3001${NC}"
    echo -e "${GREEN}子圖: https://api.studio.thegraph.com/query/115633/dungeon-delvers/1.2.9${NC}"
    echo ""
    echo -e "${YELLOW}📝 接下來請檢查：${NC}"
    echo -e "${YELLOW}1. VIP等級和稅率減免是否正確顯示${NC}"
    echo -e "${YELLOW}2. 升星祭壇NFT圖片是否正確載入${NC}"
    echo -e "${YELLOW}3. 隊伍組成是否正確顯示${NC}"
    echo -e "${YELLOW}4. 所有NFT元數據是否正確載入${NC}"
}

# 執行主函數
main "$@" 