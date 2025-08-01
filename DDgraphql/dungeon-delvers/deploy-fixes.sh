#!/bin/bash

# DungeonDelvers 子圖修復部署腳本

echo "🔧 開始部署子圖修復..."

# 1. 生成代碼
echo "📝 生成 TypeScript 代碼..."
npm run codegen

if [ $? -ne 0 ]; then
    echo "❌ 代碼生成失敗"
    exit 1
fi

# 2. 構建子圖
echo "🏗️ 構建子圖..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 構建失敗"
    exit 1
fi

# 3. 部署到 The Graph Studio
echo "🚀 部署到 The Graph Studio..."
echo "請確保你已經登錄 graph auth"

# 使用 version label 來追踪這次修復
DEPLOY_VERSION="v3.3.0-fix-stats"

graph deploy --studio dungeon-delvers \
  --version-label $DEPLOY_VERSION \
  --deploy-key $GRAPH_DEPLOY_KEY

if [ $? -eq 0 ]; then
    echo "✅ 子圖部署成功！"
    echo "📊 版本: $DEPLOY_VERSION"
    echo "🔍 修復內容:"
    echo "   - PlayerProfile.totalRewardsEarned 現在會正確更新"
    echo "   - 數據同步於 PlayerStats"
    echo ""
    echo "⏳ 請等待子圖同步完成..."
    echo "🌐 查看狀態: https://thegraph.com/studio/subgraph/dungeon-delvers"
else
    echo "❌ 部署失敗"
    exit 1
fi