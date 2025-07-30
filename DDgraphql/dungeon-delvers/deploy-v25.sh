#!/bin/bash

# 部署 V25 子圖的自動化腳本

echo "🚀 開始部署 DungeonDelvers V25 子圖..."

# 確保在正確的目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤：請在子圖根目錄運行此腳本"
    exit 1
fi

# 檢查 networks.json 是否包含新地址
echo "📋 檢查合約地址..."
HERO_ADDRESS=$(grep -o '"0x2F9c6EF3B2447417E633fD9e05E30B152dC691EE"' networks.json)
if [ -z "$HERO_ADDRESS" ]; then
    echo "❌ 錯誤：networks.json 中沒有找到 V25 合約地址"
    echo "請先執行 v25-sync-all.js 同步合約地址"
    exit 1
fi

echo "✅ 確認使用 V25 合約地址"

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

# 3. 部署到 The Graph Studio
echo "📤 部署到 The Graph Studio..."

# 檢查是否設置了 access token
if [ -z "$GRAPH_ACCESS_TOKEN" ]; then
    echo "⚠️  未設置 GRAPH_ACCESS_TOKEN 環境變數"
    echo "請運行: export GRAPH_ACCESS_TOKEN=你的access_token"
    echo "或使用: GRAPH_ACCESS_TOKEN=你的token ./deploy-v25.sh"
    exit 1
fi

# 部署並指定版本標籤
VERSION="v3.2.5"
echo "📌 部署版本: $VERSION"

graph deploy dungeon-delvers \
  --version-label $VERSION \
  --access-token $GRAPH_ACCESS_TOKEN \
  --node https://api.studio.thegraph.com/deploy/

if [ $? -eq 0 ]; then
    echo "✅ 成功部署 V25 子圖！"
    echo "📊 版本: $VERSION"
    echo "🔗 Studio URL: https://thegraph.com/studio/subgraph/dungeon-delvers"
    echo ""
    echo "📝 下一步："
    echo "1. 在 The Graph Studio 中檢查同步狀態"
    echo "2. 等待索引完成（新合約需要等待鏈上活動）"
    echo "3. 執行 v25-sync-all.js $VERSION 更新前端配置"
    echo ""
    echo "⚠️  注意事項："
    echo "- 新部署的合約可能需要時間才有鏈上活動"
    echo "- Studio 版本有 15-30 分鐘延遲"
    echo "- 去中心化版本需要額外部署步驟"
else
    echo "❌ 部署失敗"
    exit 1
fi