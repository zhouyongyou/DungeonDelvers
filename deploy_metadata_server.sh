#!/bin/bash

# 部署 Metadata Server 腳本
echo "🚀 開始部署 Metadata Server..."

# 檢查是否在正確的目錄
if [ ! -f "dungeon-delvers-metadata-server/package.json" ]; then
    echo "❌ 請在專案根目錄執行此腳本"
    exit 1
fi

# 進入 metadata server 目錄
cd dungeon-delvers-metadata-server

# 檢查 .env 文件
if [ ! -f ".env" ]; then
    echo "❌ .env 文件不存在，請先創建並配置"
    exit 1
fi

# 安裝依賴
echo "📦 安裝依賴..."
npm install

# 停止現有容器（如果存在）
echo "🛑 停止現有容器..."
docker-compose down || true

# 構建並啟動容器
echo "🔨 構建並啟動容器..."
docker-compose up -d --build

# 等待服務啟動
echo "⏳ 等待服務啟動..."
sleep 10

# 檢查健康狀態
echo "🔍 檢查健康狀態..."
for i in {1..30}; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ 服務健康檢查通過！"
        break
    fi
    echo "⏳ 等待服務... (嘗試 $i/30)"
    sleep 2
done

# 測試 API 端點
echo "🧪 測試 API 端點..."
if curl -f http://localhost:3001/api/hero/1 > /dev/null 2>&1; then
    echo "✅ Hero API 測試通過"
else
    echo "❌ Hero API 測試失敗"
fi

if curl -f http://localhost:3001/api/relic/1 > /dev/null 2>&1; then
    echo "✅ Relic API 測試通過"
else
    echo "❌ Relic API 測試失敗"
fi

if curl -f http://localhost:3001/api/party/1 > /dev/null 2>&1; then
    echo "✅ Party API 測試通過"
else
    echo "❌ Party API 測試失敗"
fi

echo "🎉 Metadata Server 部署完成！"
echo "📍 服務地址: http://localhost:3001"
echo "💊 健康檢查: http://localhost:3001/health" 