#!/bin/bash
# 子圖修復腳本
# 由診斷工具自動生成

echo "🚀 開始修復子圖同步問題..."

# 1. 同步地址
echo "📦 同步合約地址..."
npm run sync-addresses

# 2. 重新構建
echo "🔨 重新構建子圖..."
npx graph build

# 3. 部署到 The Graph Studio
echo "🚀 部署到 The Graph Studio..."
npx graph deploy --node https://api.studio.thegraph.com/deploy/ dungeon-delvers

echo "✅ 修復腳本執行完成"
echo "請在 The Graph Studio 中監控部署狀態"
