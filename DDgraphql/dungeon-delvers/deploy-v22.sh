#!/bin/bash

# 部署 V22 子圖的自動化腳本

echo "🚀 開始部署 DungeonDelvers V22 子圖..."

# 確保在正確的目錄
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤：請在子圖根目錄運行此腳本"
    exit 1
fi

# 檢查是否安裝了 js-yaml
if ! npm list js-yaml --depth=0 > /dev/null 2>&1; then
    echo "📦 安裝 js-yaml..."
    npm install --save-dev js-yaml
fi

# 1. 生成新的 subgraph.yaml
echo "📝 從 v22-config.js 生成 subgraph.yaml..."
node scripts/generate-subgraph-from-v22.js

if [ $? -ne 0 ]; then
    echo "❌ 生成 subgraph.yaml 失敗"
    exit 1
fi

# 2. 運行 codegen
echo "🔧 運行 graph codegen..."
npm run codegen

if [ $? -ne 0 ]; then
    echo "❌ Codegen 失敗"
    exit 1
fi

# 3. 構建子圖
echo "🏗️  構建子圖..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 構建失敗"
    exit 1
fi

# 4. 部署到 The Graph Studio
echo "📤 部署到 The Graph Studio..."

# 檢查是否設置了 access token
if [ -z "$GRAPH_ACCESS_TOKEN" ]; then
    echo "⚠️  未設置 GRAPH_ACCESS_TOKEN 環境變數"
    echo "請運行: export GRAPH_ACCESS_TOKEN=你的access_token"
    echo "或使用: GRAPH_ACCESS_TOKEN=你的token ./deploy-v22.sh"
    exit 1
fi

# 部署並指定版本標籤
VERSION="v22.0.0"
echo "📌 部署版本: $VERSION"

graph deploy dungeon-delvers \
  --version-label $VERSION \
  --access-token $GRAPH_ACCESS_TOKEN \
  --node https://api.studio.thegraph.com/deploy/

if [ $? -eq 0 ]; then
    echo "✅ 成功部署 V22 子圖！"
    echo "📊 版本: $VERSION"
    echo "🔗 Studio URL: https://thegraph.com/studio/subgraph/dungeon-delvers"
    echo ""
    echo "📝 下一步："
    echo "1. 在 The Graph Studio 中檢查同步狀態"
    echo "2. 等待索引完成"
    echo "3. 更新前端的 THE_GRAPH_API_URL 到新版本"
else
    echo "❌ 部署失敗"
    exit 1
fi