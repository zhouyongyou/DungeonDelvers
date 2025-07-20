#!/bin/bash

echo "🚀 部署 DungeonDelvers V12 子圖..."
echo "================================"

# 1. 安裝依賴（如果需要）
echo "📦 檢查依賴..."
npm install

# 2. 生成代碼
echo "🔧 生成 AssemblyScript 代碼..."
npm run codegen

# 3. 構建子圖
echo "🏗️ 構建子圖..."
npm run build

# 4. 部署到 The Graph
echo "📤 部署到 The Graph..."
# 注意：請確保已經登錄 graph-cli
# graph auth --product hosted-service YOUR_ACCESS_TOKEN

# 部署命令（請根據你的子圖名稱修改）
# graph deploy --product hosted-service YOUR_GITHUB_USERNAME/dungeon-delvers

echo "✅ 部署準備完成！"
echo ""
echo "📝 請執行以下命令完成部署："
echo "1. graph auth --product hosted-service YOUR_ACCESS_TOKEN"
echo "2. graph deploy --product hosted-service YOUR_GITHUB_USERNAME/dungeon-delvers"
echo ""
echo "🔍 V12 更新內容："
echo "- 所有合約地址已更新為 V12"
echo "- 起始區塊號更新為 54670894"
echo "- DungeonMaster 使用 V8 ABI"
echo "- Party 使用 V3 ABI"