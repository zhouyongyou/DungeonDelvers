#!/bin/bash

# DungeonDelvers V15 子圖部署腳本（自動生成）
# 版本: V15
# 生成時間: 2025-07-23T13:03:51.178Z
# 從 master-config.json 自動生成

echo "🚀 開始部署 DungeonDelvers V15 子圖..."
echo "=====================================\n"

# 顯示配置信息
echo "📋 配置版本: V15"
echo "📅 最後更新: 2025-07-23"
echo "🔢 起始區塊: 55018576"
echo ""

# 檢查是否已登錄
echo "📝 檢查 The Graph CLI 登錄狀態..."
graph auth --product hosted-service || {
    echo "❌ 請先使用 'graph auth' 登錄"
    exit 1
}

# 清理舊的構建文件
echo "\n🧹 清理舊的構建文件..."
rm -rf build/
rm -rf generated/

# 編譯子圖
echo "\n📦 編譯子圖..."
graph codegen && graph build || {
    echo "❌ 編譯失敗"
    exit 1
}

echo "\n✅ 編譯成功！"

# 部署到 The Graph Studio
echo "\n🌐 部署到 The Graph Studio..."
echo "版本: V15"

# 使用 graph deploy 並指定版本標籤
graph deploy --studio dungeon-delvers --version-label "V15" || {
    echo "❌ 部署失敗"
    exit 1
}

echo "\n✅ 部署成功！"
echo "\n📊 查詢端點："
echo "Studio: https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.9"
echo "Decentralized: https://gateway.thegraph.com/api/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs"
echo "\n📝 注意事項："
echo "1. 新交易會立即被索引"
echo "2. 子圖同步需要時間（可能數小時）"
echo "3. 請在 The Graph Studio 控制台查看同步進度"
echo "\n🎉 V15 子圖部署完成！"
