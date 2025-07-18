#!/bin/bash
# 更新前端使用子圖 v2.0.9

echo "📝 更新前端配置到子圖 v2.0.9..."

# 更新 .env 文件
sed -i '' 's/v2.0.8/v2.0.9/g' .env

echo "✅ 更新完成！"
echo ""
echo "更新內容："
grep -n "v2.0.9" .env

echo ""
echo "📋 記得："
echo "1. 重啟開發服務器 (npm run dev)"
echo "2. 如果已部署到 Vercel，需要更新環境變數"