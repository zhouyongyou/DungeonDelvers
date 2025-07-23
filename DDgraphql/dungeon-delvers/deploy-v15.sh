#!/bin/bash

# DungeonDelvers V15 子圖部署腳本

echo "🚀 開始部署 DungeonDelvers V15 子圖..."
echo "=====================================\n"

# 檢查是否已登錄
echo "📝 檢查 The Graph CLI 登錄狀態..."
graph auth --product hosted-service || {
    echo "❌ 請先使用 'graph auth' 登錄"
    exit 1
}

# 編譯子圖
echo "\n📦 編譯子圖..."
graph codegen && graph build || {
    echo "❌ 編譯失敗"
    exit 1
}

echo "\n✅ 編譯成功！"

# 部署到 The Graph Studio
echo "\n🌐 部署到 The Graph Studio..."
echo "版本: v15.0.0"
echo "合約地址已更新為 V15 部署"

# 使用 graph deploy 並指定版本標籤
graph deploy --studio dungeon-delvers --version-label "v15.0.0" || {
    echo "❌ 部署失敗"
    exit 1
}

echo "\n✅ 部署成功！"
echo "\n📊 查詢端點："
echo "https://api.studio.thegraph.com/query/115633/dungeon-delvers/v15.0.0"
echo "\n📝 注意事項："
echo "1. 新交易會立即被索引"
echo "2. 歷史數據同步可能需要一些時間"
echo "3. 請在 The Graph Studio 控制台查看同步進度"
echo "\n🎉 V15 子圖部署完成！"