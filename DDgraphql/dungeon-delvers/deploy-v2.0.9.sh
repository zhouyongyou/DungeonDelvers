#!/bin/bash
# 部署子圖 v2.0.9 - 從最新區塊開始索引

echo "🚀 開始部署 Dungeon Delvers 子圖 v2.0.9..."
echo "📊 起始區塊: 54440794 (當前區塊 - 10)"
echo ""

# 檢查環境變數
if [ -z "$GRAPH_ACCESS_TOKEN" ]; then
    echo "❌ 錯誤: 請設置 GRAPH_ACCESS_TOKEN 環境變數"
    echo "export GRAPH_ACCESS_TOKEN=your-access-token"
    exit 1
fi

# 步驟 1: 生成代碼
echo "1️⃣ 生成 TypeScript 代碼..."
npm run codegen
if [ $? -ne 0 ]; then
    echo "❌ codegen 失敗"
    exit 1
fi

# 步驟 2: 構建子圖
echo ""
echo "2️⃣ 構建子圖..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ build 失敗"
    exit 1
fi

# 步驟 3: 部署到 The Graph Studio
echo ""
echo "3️⃣ 部署到 The Graph Studio..."
echo "版本標籤: v2.0.9"
graph deploy dungeon-delvers \
    --version-label v2.0.9 \
    --access-token $GRAPH_ACCESS_TOKEN \
    --node https://api.studio.thegraph.com/deploy/

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 部署成功！"
    echo ""
    echo "📋 下一步："
    echo "1. 訪問 The Graph Studio 查看部署狀態"
    echo "2. 等待同步完成（預計只需幾分鐘）"
    echo "3. 更新前端 .env 中的子圖 URL 為 v2.0.9"
    echo ""
    echo "新的子圖端點將是:"
    echo "https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.9"
else
    echo "❌ 部署失敗"
    exit 1
fi