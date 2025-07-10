#!/bin/bash

# Dungeon Delvers Admin Access Setup Script
# 此腳本幫助您快速設置管理員訪問權限

echo "🚀 Dungeon Delvers 管理員訪問設置腳本"
echo "========================================"

# 檢查是否存在 .env 文件
if [ ! -f ".env" ]; then
    echo "❌ 未找到 .env 文件"
    echo "📋 正在從模板創建 .env 文件..."
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ 已創建 .env 文件"
        echo "⚠️  請編輯 .env 文件並填入您的實際合約地址"
        echo "   將所有 0x0000000000000000000000000000000000000000 替換為真實地址"
    else
        echo "❌ 未找到 .env.example 模板文件"
        echo "請手動創建 .env 文件"
        exit 1
    fi
else
    echo "✅ 找到 .env 文件"
fi

# 檢查關鍵環境變數
echo ""
echo "🔍 檢查關鍵環境變數..."

# 檢查 DUNGEONCORE 地址
DUNGEONCORE_ADDRESS=$(grep "VITE_MAINNET_DUNGEONCORE_ADDRESS" .env | cut -d'=' -f2)
if [ -z "$DUNGEONCORE_ADDRESS" ] || [ "$DUNGEONCORE_ADDRESS" = "0x0000000000000000000000000000000000000000" ]; then
    echo "❌ DUNGEONCORE 地址未設置或為佔位符"
    echo "   請在 .env 文件中設置 VITE_MAINNET_DUNGEONCORE_ADDRESS"
else
    echo "✅ DUNGEONCORE 地址已設置: $DUNGEONCORE_ADDRESS"
fi

# 檢查依賴項
echo ""
echo "📦 檢查依賴項..."
if [ ! -d "node_modules" ]; then
    echo "❌ 未找到 node_modules，正在安裝依賴項..."
    npm install
    if [ $? -eq 0 ]; then
        echo "✅ 依賴項安裝成功"
    else
        echo "❌ 依賴項安裝失敗"
        exit 1
    fi
else
    echo "✅ 依賴項已安裝"
fi

# 檢查網路連接
echo ""
echo "🌐 檢查 BSC 主網連接..."
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://bsc-dataseed1.binance.org/ > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ BSC 主網連接正常"
else
    echo "❌ BSC 主網連接失敗"
    echo "   請檢查您的網路連接"
fi

# 提供後續步驟指導
echo ""
echo "📋 下一步操作指南："
echo "1. 🔧 編輯 .env 文件，填入您的實際合約地址"
echo "2. 💰 確保錢包連接到 BSC 主網 (Chain ID: 56)"
echo "3. 🔐 確認您的錢包地址是合約擁有者"
echo "4. 🚀 運行 'npm run dev' 啟動應用程式"
echo "5. 🔍 如果仍有問題，請查看 admin_access_troubleshooting_guide.md"

echo ""
echo "🎯 快速測試指令："
echo "npm run dev"

echo ""
echo "🔗 有用的連結："
echo "- BSC 瀏覽器: https://bscscan.com/"
echo "- BSC 主網設置: https://docs.binance.org/smart-chain/wallet/metamask.html"
echo "- 故障排除指南: ./admin_access_troubleshooting_guide.md"

echo ""
echo "✨ 設置完成！如果您需要進一步協助，請查看故障排除指南。"