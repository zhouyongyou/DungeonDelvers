#!/bin/bash

# Dungeon Delvers IPFS 部署腳本 v2
# 使用獨立的 JSON 檔案進行部署

set -e

echo "🚀 開始 IPFS 部署流程 v2..."

# 檢查必要工具
if ! command -v ipfs &> /dev/null; then
    echo "❌ 請先安裝 IPFS CLI"
    echo "安裝指令: https://docs.ipfs.io/install/command-line/"
    exit 1
fi

# 檢查 IPFS 節點是否運行
if ! ipfs id &> /dev/null; then
    echo "❌ IPFS 節點未運行，請先啟動 IPFS daemon"
    echo "啟動指令: ipfs daemon"
    exit 1
fi

# 創建臨時目錄結構
echo "📁 創建目錄結構..."
mkdir -p ipfs-upload/images/{hero,relic,party,vip,profile}
mkdir -p ipfs-upload/metadata

# 複製圖片檔案
echo "🖼️  複製圖片檔案..."
cp ../DungeonDelvers/public/images/hero/hero-*.png ipfs-upload/images/hero/
cp ../DungeonDelvers/public/images/relic/relic-*.png ipfs-upload/images/relic/
cp ../DungeonDelvers/public/images/party/party.png ipfs-upload/images/party/
cp ../DungeonDelvers/public/images/vip/vip.png ipfs-upload/images/vip/
cp ../DungeonDelvers/public/images/profile/profile.png ipfs-upload/images/profile/

# 複製 metadata JSON 檔案
echo "📝 複製 metadata JSON 檔案..."
cp ipfs-metadata/*.json ipfs-upload/metadata/

echo "📤 上傳圖片到 IPFS..."
cd ipfs-upload/images
IMAGES_HASH=$(ipfs add -r . | tail -n 1 | awk '{print $2}')
echo "✅ 圖片上傳完成，Hash: $IMAGES_HASH"

echo "📤 上傳 metadata 到 IPFS..."
cd ../metadata
METADATA_HASH=$(ipfs add -r . | tail -n 1 | awk '{print $2}')
echo "✅ Metadata 上傳完成，Hash: $METADATA_HASH"

echo "🔄 更新 metadata 中的圖片路徑..."
# 更新所有 metadata 檔案中的圖片路徑
find . -name "*.json" -exec sed -i '' "s/PLACEHOLDER_HASH/$IMAGES_HASH/g" {} \;

echo "📤 重新上傳更新後的 metadata..."
METADATA_FINAL_HASH=$(ipfs add -r . | tail -n 1 | awk '{print $2}')
echo "✅ 最終 metadata 上傳完成，Hash: $METADATA_FINAL_HASH"

echo ""
echo "🎉 IPFS 部署完成！"
echo ""
echo "📊 部署摘要："
echo "  圖片 Hash: $IMAGES_HASH"
echo "  Metadata Hash: $METADATA_FINAL_HASH"
echo ""
echo "📁 部署的檔案："
echo "  Hero: 5 個稀有度 (1-5)"
echo "  Relic: 5 個稀有度 (1-5)"
echo "  Party: 1 個"
echo "  VIP: 1 個"
echo "  Profile: 1 個"
echo "  總計: 13 個 JSON 檔案"
echo ""
echo "🔗 訪問連結："
echo "  圖片: https://ipfs.io/ipfs/$IMAGES_HASH"
echo "  Metadata: https://ipfs.io/ipfs/$METADATA_FINAL_HASH"
echo ""
echo "📝 合約設定："
echo "  請將合約的 baseURI 設定為: ipfs://$METADATA_FINAL_HASH/"
echo ""
echo "🔗 具體檔案連結："
echo "  Hero Common: ipfs://$METADATA_FINAL_HASH/hero-1.json"
echo "  Hero Uncommon: ipfs://$METADATA_FINAL_HASH/hero-2.json"
echo "  Hero Rare: ipfs://$METADATA_FINAL_HASH/hero-3.json"
echo "  Hero Epic: ipfs://$METADATA_FINAL_HASH/hero-4.json"
echo "  Hero Legendary: ipfs://$METADATA_FINAL_HASH/hero-5.json"
echo "  Relic Common: ipfs://$METADATA_FINAL_HASH/relic-1.json"
echo "  Relic Uncommon: ipfs://$METADATA_FINAL_HASH/relic-2.json"
echo "  Relic Rare: ipfs://$METADATA_FINAL_HASH/relic-3.json"
echo "  Relic Epic: ipfs://$METADATA_FINAL_HASH/relic-4.json"
echo "  Relic Legendary: ipfs://$METADATA_FINAL_HASH/relic-5.json"
echo "  Party: ipfs://$METADATA_FINAL_HASH/party.json"
echo "  VIP: ipfs://$METADATA_FINAL_HASH/vip.json"
echo "  Profile: ipfs://$METADATA_FINAL_HASH/profile.json"
echo ""
echo "🧹 清理臨時檔案..."
cd ../..
rm -rf ipfs-upload

echo "✅ 部署流程完成！" 