#!/bin/bash

# 快速部署子圖腳本（用於本地開發）

echo "🚀 部署 DungeonDelvers 子圖..."
echo "⚠️  注意：此腳本用於本地開發，生產環境請使用 deploy-v25.sh"

# 確保在正確的目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤：請在子圖根目錄運行此腳本"
    exit 1
fi

# 1. 運行 codegen
echo "🔧 運行 graph codegen..."
npm run codegen

if [ $? -ne 0 ]; then
    echo "❌ Codegen 失敗"
    exit 1
fi

# 2. 構建子圖
echo "🏗️  構建子圖..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 構建失敗"
    exit 1
fi

echo "✅ 構建成功！"
echo ""
echo "📌 部署信息："
echo "- Schema 已更新（包含 VIP tier 欄位）"
echo "- 子圖已構建完成"
echo ""
echo "🔗 查詢端點："
echo "Studio: https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.2.0"
echo "Decentralized: https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs"
echo ""
echo "📝 下一步："
echo "1. 如需部署到 The Graph Studio，請設置 GRAPH_ACCESS_TOKEN 環境變數"
echo "2. 運行: export GRAPH_ACCESS_TOKEN=你的token"
echo "3. 然後運行: ./deploy-v25.sh"
echo ""
echo "💡 提示：tier 欄位已添加到 VIP 實體，前端可以正確顯示 VIP 等級了"